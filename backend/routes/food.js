import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import Food from '../models/Food.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import { protect } from '../middleware/auth.js';
import generateCertificate from '../utils/certificate.js';
import { 
  notifyReceiversOfNewFood, 
  notifyDonorOfRequest, 
  notifyReceiverOfConfirmation,
  notifyVolunteerAssigned,
  notifyFoodDelivered
} from '../utils/notifications.js';
import { io } from '../server.js';
import { awardPoints } from '../utils/rewards.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'food-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Add food with image upload
router.post('/addFood', protect, upload.single('image'), async (req, res) => {
  try {
    console.log('Add food request received:', req.body);
    console.log('User:', req.user);
    console.log('File:', req.file);

    if (req.user.role !== 'donor') {
      return res.status(403).json({ message: 'Only donors can add food' });
    }

    const { foodType, totalQuantity, expiryTime, description, locationName, latitude, longitude } = req.body;

    // Validate required fields
    if (!foodType || !totalQuantity || !expiryTime || !locationName) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const foodData = {
      foodType,
      totalQuantity: Number(totalQuantity),
      remainingQuantity: Number(totalQuantity),
      expiryTime,
      description,
      locationName,
      donorId: req.user._id
    };

    // Add image URL if image was uploaded
    if (req.file) {
      foodData.imageUrl = `/uploads/${req.file.filename}`;
    }

    // Add GPS coordinates if provided
    if (latitude) {
      foodData.latitude = Number(latitude);
    }
    if (longitude) {
      foodData.longitude = Number(longitude);
    }

    console.log('Creating food with data:', foodData);

    const food = await Food.create(foodData);
    const populatedFood = await Food.findById(food._id).populate('donorId', 'name phone latitude longitude orgName');

    // Notify all receivers about new food via SMS
    try {
      await notifyReceiversOfNewFood(populatedFood, User);
    } catch (notifyError) {
      console.error('Failed to notify receivers:', notifyError);
    }

    io.emit('foodAdded', populatedFood);
    io.emit('dashboardUpdated');

    res.status(201).json(populatedFood);
  } catch (error) {
    console.error('Error adding food:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get available food
router.get('/available', protect, async (req, res) => {
  try {
    const food = await Food.find({ 
      status: 'available',
      remainingQuantity: { $gt: 0 }
    })
      .populate('donorId', 'name subRole phone')
      .sort({ createdAt: -1 });

    res.json(food);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get my donations (donor)
router.get('/myDonations', protect, async (req, res) => {
  try {
    if (req.user.role !== 'donor') {
      return res.status(403).json({ message: 'Only donors can view their donations' });
    }

    const food = await Food.find({ donorId: req.user._id })
      .populate('requests.receiverId', 'name subRole phone')
      .sort({ createdAt: -1 });

    res.json(food);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Donor Stats
router.get('/donor/stats', protect, async (req, res) => {
  try {
    if (req.user.role !== 'donor') return res.status(403).json({ message: 'Access denied' });
    
    const stats = await Food.aggregate([
      { $match: { donorId: req.user._id } },
      { $group: {
          _id: null,
          totalDonations: { $sum: 1 },
          totalMeals: { $sum: "$totalQuantity" },
          completedDonations: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          }
      }}
    ]);
    
    const user = await User.findById(req.user._id).select('points');
    
    if (stats.length > 0) {
      res.json({ ...stats[0], points: user.points });
    } else {
      res.json({ totalDonations: 0, totalMeals: 0, completedDonations: 0, points: user.points });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Receiver Stats
router.get('/receiver/stats', protect, async (req, res) => {
  try {
    if (req.user.role !== 'receiver') return res.status(403).json({ message: 'Access denied' });
    
    const stats = await Food.aggregate([
      { $unwind: "$requests" },
      { $match: { "requests.receiverId": req.user._id, "requests.status": "picked" } },
      { $group: {
          _id: null,
          totalMealsReceived: { $sum: "$requests.quantity" },
          totalPickups: { $sum: 1 }
      }}
    ]);
    
    const user = await User.findById(req.user._id).select('points trustScore');
    
    if (stats.length > 0) {
      res.json({ ...stats[0], points: user.points, trustScore: user.trustScore });
    } else {
      res.json({ totalMealsReceived: 0, totalPickups: 0, points: user.points, trustScore: user.trustScore });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Request food
router.post('/request/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'receiver') {
      return res.status(403).json({ message: 'Only receivers can request food' });
    }

    const { quantity } = req.body;
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }

    if (food.remainingQuantity < quantity) {
      return res.status(400).json({ 
        message: `Only ${food.remainingQuantity} meals available` 
      });
    }

    // Check if already requested
    const existingRequest = food.requests.find(
      r => r.receiverId.toString() === req.user._id.toString()
    );

    if (existingRequest) {
      return res.status(400).json({ message: 'You have already requested this food' });
    }

    food.remainingQuantity -= quantity;

    food.requests.push({
      receiverId: req.user._id,
      quantity
    });

    await food.save();

    // Get receiver details for notification
    const receiver = await User.findById(req.user._id);
    
    // Notify donor about new request via SMS
    try {
      await notifyDonorOfRequest(food, { name: receiver.name, quantity }, 'requested');
    } catch (notifyError) {
      console.error('Failed to notify donor:', notifyError);
    }

    io.emit('foodUpdated', food);
    io.emit('dashboardUpdated');

    res.json({ message: 'Food requested successfully', food });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark as picked up
router.put('/pickup/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'receiver') {
      return res.status(403).json({ message: 'Only receivers can mark pickup' });
    }

    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }

    const request = food.requests.find(
      r => r.receiverId.toString() === req.user._id.toString() && r.status === 'requested'
    );

    if (!request) {
      return res.status(400).json({ message: 'No active request found' });
    }

    request.status = 'picked';

    await food.save();

    // Update receiver points and check certificates
    const user = await User.findById(req.user._id);
    user.pickupCount += 1;
    user.successfulPickups += 1;
    user.trustScore += 5; // increment trust score for successful pickup
    await awardPoints(user, 10, '🏆 Food pickup completed successfully!');

    // Update donor points and check certificates
    const donor = await User.findById(food.donorId);
    await awardPoints(donor, request.quantity, `🎁 Thank you for sharing ${request.quantity} meals!`);

    // Notify donor about pickup
    try {
      await notifyDonorOfRequest(food, { name: user.name, quantity: request.quantity }, 'picked');
    } catch (notifyError) {
      console.error('Failed to notify donor of pickup:', notifyError);
    }

    io.emit('foodUpdated', food);
    io.emit('dashboardUpdated');

    res.json({
      message: 'Pickup confirmed successfully',
      food,
      receiverPoints: user.points,
      donorPoints: donor.points
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Assign Volunteer
router.put('/assign/:foodId/:requestId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'receiver' || req.user.subRole !== 'Volunteer') {
      return res.status(403).json({ message: 'Only volunteers can assign themselves' });
    }

    const food = await Food.findById(req.params.foodId);
    if (!food) return res.status(404).json({ message: 'Food not found' });

    const request = food.requests.id(req.params.requestId);
    if (!request || request.status !== 'requested') {
      return res.status(400).json({ message: 'Request is not available for assignment' });
    }

    request.volunteerId = req.user._id;
    request.status = 'assigned';
    await food.save();

    await notifyVolunteerAssigned(req.user._id, food);
    
    io.emit('foodUpdated', food);
    io.emit('dashboardUpdated');

    res.json({ message: 'Volunteer assigned successfully', food });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark as Delivered
router.put('/deliver/:foodId/:requestId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'receiver' || req.user.subRole !== 'Volunteer') {
      return res.status(403).json({ message: 'Only volunteers can mark delivery' });
    }

    const food = await Food.findById(req.params.foodId);
    if (!food) return res.status(404).json({ message: 'Food not found' });

    const request = food.requests.id(req.params.requestId);
    if (!request || request.status !== 'picked') {
      return res.status(400).json({ message: 'Request must be picked up first' });
    }

    // Must be the assigned volunteer
    if (request.volunteerId?.toString() !== req.user._id.toString()) {
       return res.status(403).json({ message: 'Not authorized' });
    }

    request.status = 'delivered';
    request.deliveredAt = new Date();
    await food.save();

    // Reward Volunteer
    const volunteer = await User.findById(req.user._id);
    volunteer.pickupCount += 1;
    volunteer.successfulPickups += 1;
    volunteer.trustScore += 10;
    await awardPoints(volunteer, 15, '🏆 Delivery completed successfully!');

    await notifyFoodDelivered(food);

    io.emit('foodUpdated', food);
    io.emit('dashboardUpdated');

    res.json({ message: 'Delivery confirmed successfully', food });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 1. SMART FOOD MATCHING SYSTEM - Get suggested receivers for a food donation
router.get('/suggestions/:foodId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'donor') {
      return res.status(403).json({ message: 'Only donors can view suggestions' });
    }

    const food = await Food.findById(req.params.foodId);
    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }

    // Get all receivers sorted by activity and location match
    const receivers = await User.find({ role: 'receiver' })
      .select('name subRole phone trustScore successfulPickups locationName')
      .sort({ successfulPickups: -1, trustScore: -1 });

    // Score and sort receivers based on matching criteria
    const scoredReceivers = receivers.map(receiver => {
      let score = 0;
      let matchReasons = [];

      // Activity score (higher successful pickups = better)
      score += (receiver.successfulPickups || 0) * 2;
      if (receiver.successfulPickups > 5) {
        matchReasons.push('High activity');
      }

      // Trust score bonus
      score += (receiver.trustScore || 0) / 10;
      if (receiver.trustScore >= 50) {
        matchReasons.push('High trust score');
      }

      // Location match (simple text comparison)
      const foodLocation = food.locationName?.toLowerCase() || '';
      const receiverLocation = receiver.locationName?.toLowerCase() || '';
      if (foodLocation && receiverLocation && 
          (foodLocation.includes(receiverLocation) || receiverLocation.includes(foodLocation))) {
        score += 20;
        matchReasons.push('Nearby location');
      }

      // Quantity match - can they handle the quantity
      if (food.remainingQuantity <= 10) {
        matchReasons.push('Small quantity - quick pickup');
      }

      return {
        _id: receiver._id,
        name: receiver.name,
        subRole: receiver.subRole,
        phone: receiver.phone,
        trustScore: receiver.trustScore,
        successfulPickups: receiver.successfulPickups,
        matchScore: score,
        matchReasons: matchReasons,
        trustBadge: receiver.trustScore >= 50 ? 'High Trust' : 
                   receiver.trustScore >= 20 ? 'Medium Trust' : 'New User'
      };
    });

    // Sort by match score and return top 5
    const sortedReceivers = scoredReceivers
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    res.json({
      foodId: food._id,
      foodType: food.foodType,
      location: food.locationName,
      remainingQuantity: food.remainingQuantity,
      suggestions: sortedReceivers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. PARTIAL CLAIM SYSTEM - Enhanced request food (already handles partial in existing route)
// Additional endpoint for cancelling a request
router.put('/cancel/:foodId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'receiver') {
      return res.status(403).json({ message: 'Only receivers can cancel requests' });
    }

    const food = await Food.findById(req.params.foodId);
    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }

    const request = food.requests.find(
      r => r.receiverId.toString() === req.user._id.toString() && r.status === 'requested'
    );

    if (!request) {
      return res.status(400).json({ message: 'No active request found to cancel' });
    }

    // Restore quantity
    food.remainingQuantity += request.quantity;
    request.status = 'cancelled';
    if (food.status === 'completed') {
      food.status = 'available';
    }

    await food.save();

    // Update user trust score (-10 for cancellation)
    const user = await User.findById(req.user._id);
    user.trustScore -= 10;
    user.cancelledRequests += 1;
    await user.save();

    io.emit('foodUpdated', food);
    io.emit('dashboardUpdated');

    res.json({ 
      message: 'Request cancelled successfully', 
      food,
      penalty: 'Trust score -10'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. AUTO REASSIGNMENT SYSTEM - Manual trigger endpoint (cron job runs automatically)
router.post('/check-expired-requests', protect, async (req, res) => {
  try {
    // Only admin or system can trigger this (skip auth check for cron)
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);

    const foods = await Food.find({
      'requests.status': 'requested',
      'requests.requestedAt': { $lt: twentyMinutesAgo }
    });

    let reassignedCount = 0;

    for (const food of foods) {
      const expiredRequests = food.requests.filter(
        r => r.status === 'requested' && r.requestedAt < twentyMinutesAgo
      );

      for (const request of expiredRequests) {
        // Restore quantity
        food.remainingQuantity += request.quantity;
        request.status = 'auto_reassigned';
        reassignedCount++;

        // Penalize receiver
        const receiver = await User.findById(request.receiverId);
        if (receiver) {
          receiver.trustScore -= 5;
          receiver.latePickups += 1;
          await receiver.save();
        }
      }

      if (food.status === 'completed' && food.remainingQuantity > 0) {
        food.status = 'available';
      }

      await food.save();
    }

    res.json({
      message: 'Auto-reassignment check completed',
      reassignedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. FOOD EXPIRY ALERT - Check and mark urgent food
router.post('/check-expiry', protect, async (req, res) => {
  try {
    const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000);
    const now = new Date();

    // Find food expiring within 30 minutes
    const expiringFood = await Food.find({
      status: { $in: ['available', 'urgent'] },
      expiryTime: { $lte: thirtyMinutesFromNow, $gt: now }
    });

    for (const food of expiringFood) {
      food.status = 'urgent';
      await food.save();
    }

    // Mark expired food
    const expiredFood = await Food.find({
      status: { $in: ['available', 'urgent'] },
      expiryTime: { $lte: now }
    });

    for (const food of expiredFood) {
      food.status = 'expired';
      await food.save();
    }

    res.json({
      urgentCount: expiringFood.length,
      expiredCount: expiredFood.length,
      message: 'Expiry check completed'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 5. TRUST SCORE - Get user trust details
router.get('/trust-score/:userId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('name trustScore successfulPickups latePickups cancelledRequests');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let trustBadge = 'New User';
    if (user.trustScore >= 80) trustBadge = '⭐⭐⭐ Trusted Expert';
    else if (user.trustScore >= 50) trustBadge = '⭐⭐ High Trust';
    else if (user.trustScore >= 20) trustBadge = '⭐ Medium Trust';
    else if (user.trustScore < 0) trustBadge = '⚠️ Needs Improvement';

    res.json({
      userId: user._id,
      name: user.name,
      trustScore: user.trustScore,
      trustBadge,
      stats: {
        successfulPickups: user.successfulPickups,
        latePickups: user.latePickups,
        cancelledRequests: user.cancelledRequests
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 6. DONATION IMPACT DASHBOARD - Get impact stats
router.get('/stats/impact', protect, async (req, res) => {
  try {
    console.log('Fetching impact stats...');

    // 1. Total meals donated & total picked up meals
    const mealsStats = await Food.aggregate([
      {
        $project: {
          totalQuantity: 1,
          pickedUpQuantity: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$requests",
                    as: "req",
                    cond: { $eq: ["$$req.status", "picked"] }
                  }
                },
                as: "validReq",
                in: "$$validReq.quantity"
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalMealsDonated: { $sum: "$totalQuantity" },
          totalMealsPicked: { $sum: "$pickedUpQuantity" }
        }
      }
    ]);

    const statsResult = mealsStats.length > 0 ? mealsStats[0] : { totalMealsDonated: 0, totalMealsPicked: 0 };
    const totalMealsDonated = statsResult.totalMealsDonated;
    const totalMealsPicked = statsResult.totalMealsPicked;

    // 2. Food by type stats
    const foodByType = await Food.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$foodType', count: { $sum: 1 }, meals: { $sum: '$totalQuantity' } } },
      { $sort: { meals: -1 } },
      { $limit: 5 }
    ]);

    // 3. Monthly stats
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyStats = await Food.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          donations: { $sum: 1 },
          meals: { $sum: '$totalQuantity' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 4. Top donors
    const topDonors = await User.find({ role: 'donor' })
      .select('name points')
      .sort({ points: -1 })
      .limit(5);

    // 5. Top receivers
    const topReceivers = await User.find({ role: 'receiver' })
      .select('name pickupCount trustScore')
      .sort({ pickupCount: -1 })
      .limit(5);

    // Waste reduced calculation (estimate: 0.5kg per meal)
    const wasteReducedKg = totalMealsPicked * 0.5;

    res.json({
      totalMealsDonated,
      totalMealsPicked,
      wasteReducedKg: Math.round(wasteReducedKg * 10) / 10,
      foodByType,
      monthlyStats,
      topDonors,
      topReceivers,
      completionRate: totalMealsDonated > 0 
        ? Math.round((totalMealsPicked / totalMealsDonated) * 100) 
        : 0
    });
  } catch (error) {
    console.error('Impact Stats Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// 7. QR CODE PICKUP VERIFICATION - Generate QR code for pickup
router.post('/generate-qr/:foodId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'receiver') {
      return res.status(403).json({ message: 'Only receivers can generate QR' });
    }

    const food = await Food.findById(req.params.foodId);
    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }

    const request = food.requests.find(
      r => r.receiverId.toString() === req.user._id.toString() && r.status === 'requested'
    );

    if (!request) {
      return res.status(400).json({ message: 'No active request found' });
    }

    // Generate QR code data
    const qrData = JSON.stringify({
      foodId: food._id,
      requestId: request._id,
      receiverId: req.user._id,
      timestamp: Date.now(),
      code: `HB-${food._id.toString().slice(-6)}-${request._id.toString().slice(-6)}`
    });

    // Generate QR code image
    const qrCodeDataUrl = await QRCode.toDataURL(qrData);
    request.qrCode = qrCodeDataUrl;

    await food.save();

    res.json({
      message: 'QR code generated',
      qrCode: qrCodeDataUrl,
      code: `HB-${food._id.toString().slice(-6)}-${request._id.toString().slice(-6)}`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify QR code and mark as picked
router.post('/verify-qr', protect, async (req, res) => {
  try {
    if (req.user.role !== 'donor') {
      return res.status(403).json({ message: 'Only donors can verify QR' });
    }

    const { qrData } = req.body;
    const parsedData = JSON.parse(qrData);
    const { foodId, requestId } = parsedData;

    const food = await Food.findById(foodId);
    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }

    // Verify donor owns this food
    if (food.donorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this food' });
    }

    const request = food.requests.id(requestId);
    if (!request || request.status !== 'requested') {
      return res.status(400).json({ message: 'Invalid or already processed request' });
    }

    request.status = 'picked';
    request.pickedAt = new Date();

    await food.save();

    // Update receiver stats
    const receiver = await User.findById(request.receiverId);
    receiver.pickupCount += 1;
    receiver.successfulPickups += 1;
    receiver.trustScore += 10; // Bonus for QR pickup
    await awardPoints(receiver, 15, '🏆 QR Verified Food Pickup completed successfully!');

    // Update donor points and check certificates
    const donor = await User.findById(food.donorId);
    await awardPoints(donor, request.quantity, `🎁 Thank you for sharing ${request.quantity} meals!`);

    io.emit('foodUpdated', food);
    io.emit('dashboardUpdated');

    res.json({
      message: 'QR verified and pickup confirmed!',
      food,
      receiverName: receiver.name,
      pointsAwarded: 10,
      trustBonus: 10
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 8. EMERGENCY MODE - Mark food as urgent
router.put('/mark-urgent/:foodId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'donor') {
      return res.status(403).json({ message: 'Only donors can mark urgent' });
    }

    const food = await Food.findById(req.params.foodId);
    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }

    // Verify donor owns this food
    if (food.donorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    food.isUrgent = !food.isUrgent; // Toggle
    food.urgencyMarkedAt = food.isUrgent ? new Date() : null;

    await food.save();

    // Notify all receivers about urgent food
    if (food.isUrgent) {
      try {
        await notifyReceiversOfNewFood(food, User, true);
      } catch (notifyError) {
        console.error('Failed to notify about urgent food:', notifyError);
      }
    }

    res.json({
      message: food.isUrgent ? 'Food marked as URGENT!' : 'Urgent status removed',
      food
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get urgent food list
router.get('/urgent', protect, async (req, res) => {
  try {
    const urgentFood = await Food.find({
      $or: [
        { isUrgent: true },
        { status: 'urgent' }
      ],
      remainingQuantity: { $gt: 0 }
    })
      .populate('donorId', 'name subRole phone')
      .sort({ urgencyMarkedAt: -1 });

    res.json(urgentFood);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== REVIEW ROUTES ====================

// Submit a review for food (receiver only)
router.post('/:foodId/review', protect, async (req, res) => {
  try {
    console.log('Review submission started:', req.params.foodId);
    console.log('User:', req.user._id, 'Role:', req.user.role);
    console.log('Body:', req.body);

    if (req.user.role !== 'receiver') {
      return res.status(403).json({ message: 'Only receivers can submit reviews' });
    }

    const { rating, review, foodQuality, packaging, onTime } = req.body;
    const foodId = req.params.foodId;

    // Validate required fields
    if (!rating || !review) {
      return res.status(400).json({ message: 'Please provide rating and review' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Find the food item
    const food = await Food.findById(foodId);
    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }

    console.log('Food found:', food._id);
    console.log('Food requests:', food.requests.map(r => ({ receiverId: r.receiverId, status: r.status })));

    // Check if receiver has picked up this food
    const receiverRequest = food.requests.find(
      r => r.receiverId.toString() === req.user._id.toString() && r.status === 'picked'
    );

    console.log('Receiver request found:', receiverRequest);

    if (!receiverRequest) {
      return res.status(403).json({ message: 'You can only review food you have picked up' });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      foodId: foodId,
      receiverId: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this food' });
    }

    // Create the review
    const newReview = await Review.create({
      foodId: foodId,
      donorId: food.donorId,
      receiverId: req.user._id,
      rating: Number(rating),
      review: review.trim(),
      foodQuality: foodQuality || 'good',
      packaging: packaging || 'good',
      onTime: onTime !== undefined ? onTime : true
    });

    // Award feedback points
    const user = await User.findById(req.user._id);
    await awardPoints(user, 5, '💬 Feedback submitted successfully!');

    // Populate the review with receiver info for response
    const populatedReview = await Review.findById(newReview._id)
      .populate('receiverId', 'name subRole')
      .populate('foodId', 'foodType');

    res.status(201).json({
      message: 'Review submitted successfully!',
      review: populatedReview
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this food' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Get reviews for a specific food item
router.get('/:foodId/reviews', protect, async (req, res) => {
  try {
    const foodId = req.params.foodId;

    const reviews = await Review.find({ foodId: foodId })
      .populate('receiverId', 'name subRole')
      .populate('donorId', 'name subRole')
      .sort({ createdAt: -1 });

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    res.json({
      reviews,
      count: reviews.length,
      averageRating: avgRating
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: error.message });
  }
});

// Check if current user has reviewed a food item
router.get('/:foodId/has-reviewed', protect, async (req, res) => {
  try {
    const foodId = req.params.foodId;
    const receiverId = req.user._id;

    const review = await Review.findOne({
      foodId: foodId,
      receiverId: receiverId
    });

    res.json({
      hasReviewed: !!review,
      review: review
    });
  } catch (error) {
    console.error('Error checking review status:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all reviews for the logged-in donor's food items
router.get('/donor/reviews', protect, async (req, res) => {
  try {
    console.log('Fetching donor reviews for user:', req.user._id);

    if (req.user.role !== 'donor') {
      return res.status(403).json({ message: 'Only donors can access their reviews' });
    }

    const reviews = await Review.find({ donorId: req.user._id })
      .populate('receiverId', 'name subRole')
      .populate('foodId', 'foodType locationName')
      .sort({ createdAt: -1 });

    console.log('Found reviews:', reviews.length);
    console.log('Reviews:', reviews.map(r => ({ id: r._id, rating: r.rating, food: r.foodId?.foodType })));

    // Calculate statistics
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
      : 0;

    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1;
    });

    res.json({
      reviews,
      stats: {
        totalReviews,
        averageRating: Number(avgRating),
        ratingCounts
      }
    });
  } catch (error) {
    console.error('Error fetching donor reviews:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get receiver's personal impact stats
router.get('/receiver/impact', protect, async (req, res) => {
  try {
    if (req.user.role !== 'receiver') {
      return res.status(403).json({ message: 'Only receivers can access their impact stats' });
    }

    const receiverId = req.user._id;

    // Get all foods where this receiver has picked up
    const pickedFoods = await Food.find({
      'requests.receiverId': receiverId,
      'requests.status': 'picked'
    }).populate('donorId', 'name subRole');

    // Calculate stats
    let totalMealsPicked = 0;
    let totalPointsEarned = 0;
    const foodTypes = {};
    const monthlyStats = {};
    const donorInteractions = {};

    pickedFoods.forEach(food => {
      const request = food.requests.find(r => 
        r.receiverId.toString() === receiverId.toString() && r.status === 'picked'
      );
      
      if (request) {
        totalMealsPicked += request.quantity;
        
        // Count food types
        foodTypes[food.foodType] = (foodTypes[food.foodType] || 0) + 1;
        
        // Count by donor
        const donorName = food.donorId?.name || 'Unknown';
        donorInteractions[donorName] = (donorInteractions[donorName] || 0) + 1;
        
        // Monthly stats
        const month = new Date(request.pickedAt).toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!monthlyStats[month]) {
          monthlyStats[month] = { month, pickups: 0, meals: 0 };
        }
        monthlyStats[month].pickups += 1;
        monthlyStats[month].meals += request.quantity;
      }
    });

    // Get user's points from User model
    const user = await User.findById(receiverId);
    totalPointsEarned = user?.points || 0;

    // Get reviews given by this receiver
    const reviewsGiven = await Review.find({ receiverId })
      .populate('foodId', 'foodType')
      .populate('donorId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // Calculate environmental impact
    const wasteReducedKg = totalMealsPicked * 0.5; // Approx 0.5kg per meal
    const co2SavedKg = wasteReducedKg * 2.5;
    const peopleFed = totalMealsPicked * 3;

    res.json({
      totalMealsPicked,
      totalPointsEarned,
      totalPickups: pickedFoods.length,
      wasteReducedKg: Math.round(wasteReducedKg * 10) / 10,
      co2SavedKg: Math.round(co2SavedKg * 10) / 10,
      peopleFed,
      foodTypes: Object.entries(foodTypes).map(([name, count]) => ({ name, count })),
      monthlyStats: Object.values(monthlyStats).sort((a, b) => new Date(a.month) - new Date(b.month)),
      donorInteractions: Object.entries(donorInteractions).map(([name, count]) => ({ name, count })),
      reviewsGiven: reviewsGiven.length,
      recentReviews: reviewsGiven
    });
  } catch (error) {
    console.error('Error fetching receiver impact:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
