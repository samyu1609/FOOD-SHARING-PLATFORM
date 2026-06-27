import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Food from '../models/Food.js';
import Review from '../models/Review.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if user is admin
const adminOnly = async (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // For setup purposes, allow creating an admin if none exists and specific secret is provided
    if (req.body.adminSecret === process.env.ADMIN_SECRET) {
      const adminExists = await User.findOne({ email });
      if (!adminExists) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newAdmin = await User.create({
          name: 'Super Admin',
          email,
          phone: '0000000000',
          password: hashedPassword,
          role: 'admin',
          subRole: 'System'
        });
        
        return res.json({
          _id: newAdmin._id,
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role,
          token: jwt.sign({ id: newAdmin._id }, process.env.JWT_SECRET, { expiresIn: '30d' })
        });
      }
    }

    const user = await User.findOne({ email, role: 'admin' });
    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' })
      });
    } else {
      res.status(401).json({ message: 'Invalid admin credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user status (suspend/activate)
router.put('/user/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.status = req.body.status;
    await user.save();
    
    res.json({ message: `User status updated to ${user.status}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Advanced System Analytics
router.get('/analytics', protect, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
    const totalDonors = await User.countDocuments({ role: 'donor' });
    const totalReceivers = await User.countDocuments({ role: 'receiver' });
    const totalVolunteers = await User.countDocuments({ role: 'receiver', subRole: 'Volunteer' });
    const totalRestaurants = await User.countDocuments({ role: 'donor', subRole: 'Restaurant' });
    const totalNGOs = await User.countDocuments({ role: 'receiver', subRole: 'NGO' });
    
    const mealsStats = await Food.aggregate([
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalMealsDonated: { $sum: '$totalQuantity' },
                totalMealsDelivered: {
                  $sum: {
                    $sum: {
                      $map: {
                        input: {
                          $filter: {
                            input: "$requests",
                            as: "req",
                            cond: { $eq: ["$$req.status", "delivered"] }
                          }
                        },
                        as: "validReq",
                        in: "$$validReq.quantity"
                      }
                    }
                  }
                },
                totalFoodWastePrevented: {
                  $sum: {
                    $multiply: ['$totalQuantity', 0.5] // Approx 0.5kg per meal
                  }
                }
              }
            }
          ],
          activeCount: [
            { $match: { status: { $in: ['available', 'urgent'] } } },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const statsResult = mealsStats[0];
    const totals = statsResult?.totals?.[0] || { totalMealsDonated: 0, totalMealsDelivered: 0, totalFoodWastePrevented: 0 };
    const activeFoodListings = statsResult?.activeCount?.[0]?.count || 0;

    res.json({
      totalUsers,
      totalDonors,
      totalReceivers,
      totalVolunteers,
      totalRestaurants,
      totalNGOs,
      totalMealsDonated: totals.totalMealsDonated,
      totalMealsDelivered: totals.totalMealsDelivered,
      totalFoodWastePrevented: totals.totalFoodWastePrevented,
      activeFoodListings,
      successRate: totals.totalMealsDonated > 0 ? Math.round((totals.totalMealsDelivered / totals.totalMealsDonated) * 100) : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all donations
router.get('/donations', protect, adminOnly, async (req, res) => {
  try {
    const donations = await Food.find().populate('donorId', 'name email orgName phone').sort({ createdAt: -1 });
    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all certificates for approval
router.get('/certificates/pending', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ 'certificates.isApproved': { $exists: false } }).select('name role certificates');
    // For simplicity in this demo, let's just return all users with certificates
    const allCertificates = [];
    users.forEach(user => {
      user.certificates.forEach(cert => {
        allCertificates.push({
          userId: user._id,
          userName: user.name,
          userRole: user.role,
          certId: cert._id,
          title: cert.title,
          url: cert.url,
          earnedAt: cert.earnedAt,
          isApproved: cert.isApproved || true // Default to true if not present for legacy
        });
      });
    });
    res.json(allCertificates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

import Notification from '../models/Notification.js';

// Get all notifications for admin monitoring
router.get('/notifications', protect, adminOnly, async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate('userId', 'name role')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all requests
router.get('/requests', protect, adminOnly, async (req, res) => {
  try {
    const foodItems = await Food.find({ 'requests.0': { $exists: true } })
      .populate('donorId', 'name')
      .populate('requests.receiverId', 'name')
      .populate('requests.volunteerId', 'name');
    
    let allRequests = [];
    foodItems.forEach(food => {
      food.requests.forEach(req => {
        allRequests.push({
          foodId: food._id,
          foodType: food.foodType,
          donor: food.donorId?.name,
          quantity: req.quantity,
          status: req.status,
          receiver: req.receiverId?.name,
          volunteer: req.volunteerId?.name,
          requestedAt: req.requestedAt,
          pickedAt: req.pickedAt,
          deliveredAt: req.deliveredAt
        });
      });
    });

    // Sort by requestedAt desc
    allRequests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
    res.json(allRequests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve certificate
router.put('/certificates/:userId/:certId/approve', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const cert = user.certificates.id(req.params.certId);
    if (!cert) return res.status(404).json({ message: 'Certificate not found' });

    cert.isApproved = true;
    await user.save();

    res.json({ message: 'Certificate approved successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reject certificate
router.put('/certificates/:userId/:certId/reject', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const cert = user.certificates.id(req.params.certId);
    if (!cert) return res.status(404).json({ message: 'Certificate not found' });

    cert.isApproved = false;
    await user.save();

    res.json({ message: 'Certificate rejected successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reset Database (Admin only)
router.post('/reset-database', protect, adminOnly, async (req, res) => {
  try {
    await Food.deleteMany({});
    await Review.deleteMany({});
    await User.deleteMany({ role: { $ne: 'admin' } });
    res.json({ message: 'Database reset successfully! All non-admin users, food listings, and reviews have been deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
