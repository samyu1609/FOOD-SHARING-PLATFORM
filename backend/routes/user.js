import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import QRCode from 'qrcode';

const router = express.Router();

// Get profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Generate User QR Code
router.post('/generate-qr', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Create QR data with user info
    const qrData = JSON.stringify({
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      subRole: user.subRole,
      trustScore: user.trustScore,
      type: 'user_profile'
    });
    
    // Generate QR code as base64
    const qrCodeDataUrl = await QRCode.toDataURL(qrData);
    
    // Save to user
    user.qrCode = qrCodeDataUrl;
    user.qrCodeData = qrData;
    await user.save();
    
    res.json({
      message: 'QR Code generated successfully',
      qrCode: qrCodeDataUrl,
      user: {
        _id: user._id,
        name: user.name,
        qrCode: qrCodeDataUrl
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get User QR Code
router.get('/my-qr', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('qrCode qrCodeData name');
    
    // If no QR code exists, generate one
    if (!user.qrCode) {
      const qrData = JSON.stringify({
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        subRole: user.subRole,
        trustScore: user.trustScore,
        type: 'user_profile'
      });
      
      const qrCodeDataUrl = await QRCode.toDataURL(qrData);
      user.qrCode = qrCodeDataUrl;
      user.qrCodeData = qrData;
      await user.save();
    }
    
    res.json({
      qrCode: user.qrCode,
      name: user.name
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get points
router.get('/points', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('points pickupCount');
    res.json({
      points: user.points,
      pickupCount: user.pickupCount,
      nextDonorMilestone: user.points < 100 ? 100 : user.points < 500 ? 500 : user.points < 1000 ? 1000 : user.points < 5000 ? 5000 : 'max',
      nextReceiverMilestone: user.pickupCount < 10 ? 10 : user.pickupCount < 50 ? 50 : user.pickupCount < 100 ? 100 : user.pickupCount < 500 ? 500 : 'max'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get certificates
router.get('/certificates', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('certificates');
    res.json(user.certificates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get notifications
import Notification from '../models/Notification.js';

router.get('/notifications', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', protect, async (req, res) => {
  try {
    if (req.params.id === 'all') {
      await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    } else {
      await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Save push subscription
router.post('/push-subscribe', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.pushSubscription = req.body.subscription;
    await user.save();
    res.json({ success: true, message: 'Push subscription saved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update Notification Preferences
router.put('/preferences', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { smsOptIn, pushOptIn, emailOptIn, inAppOptIn } = req.body;
    
    if (smsOptIn !== undefined) user.smsOptIn = smsOptIn;
    if (pushOptIn !== undefined) user.pushOptIn = pushOptIn;
    if (emailOptIn !== undefined) user.emailOptIn = emailOptIn;
    if (inAppOptIn !== undefined) user.inAppOptIn = inAppOptIn;

    await user.save();
    res.json({ message: 'Preferences updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
