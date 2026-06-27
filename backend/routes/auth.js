import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role, subRole, latitude, longitude, address, city, district, state, pinCode } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password || !role || !subRole) {
      return res.status(400).json({ message: 'Please provide all required fields including phone number' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role,
      subRole,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      address,
      city,
      district,
      state,
      pinCode
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      subRole: user.subRole,
      points: user.points,
      trustScore: user.trustScore,
      pickupCount: user.pickupCount,
      certificates: user.certificates,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error: ' + error.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User already exists with this email or phone' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Login - supports email or phone
router.post('/login', async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    // Find user by email or phone
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (phone) {
      user = await User.findOne({ phone });
    } else {
      return res.status(400).json({ message: 'Please provide email or phone number' });
    }

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        subRole: user.subRole,
        points: user.points,
        pickupCount: user.pickupCount,
        certificates: user.certificates,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify certificate (Public)
router.get('/verify-certificate/:certId', async (req, res) => {
  try {
    const user = await User.findOne({ 'certificates._id': req.params.certId });
    if (!user) {
      return res.status(404).send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 100px; padding: 20px;">
          <h1 style="color: #EF4444; font-size: 48px;">❌ Invalid Certificate</h1>
          <p style="font-size: 18px; color: #4B5563;">This certificate ID was not found or has been revoked.</p>
          <a href="http://localhost:5173" style="display: inline-block; margin-top: 20px; background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px;">Back to HungerBridge</a>
        </div>
      `);
    }
    const cert = user.certificates.id(req.params.certId);
    res.send(`
      <div style="font-family: sans-serif; max-width: 600px; margin: 80px auto; padding: 30px; border: 2px solid #10B981; border-radius: 16px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="width: 80px; height: 80px; background: #E6F4EA; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
          <svg width="40" height="40" fill="#10B981" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
          </svg>
        </div>
        <h1 style="color: #10B981; margin-bottom: 10px;">✅ Verified Certificate</h1>
        <p style="color: #6B7280; margin-bottom: 30px;">This certificate is officially verified by the Hunger Bridge Platform.</p>
        
        <div style="background: #F9FAFB; padding: 20px; border-radius: 12px; text-align: left; border: 1px solid #E5E7EB;">
          <div style="margin-bottom: 15px;">
            <span style="font-size: 12px; color: #9CA3AF; text-transform: uppercase; font-weight: bold;">Recipient</span>
            <div style="font-size: 18px; color: #111827; font-weight: bold; margin-top: 2px;">${user.name}</div>
          </div>
          ${user.orgName ? `
          <div style="margin-bottom: 15px;">
            <span style="font-size: 12px; color: #9CA3AF; text-transform: uppercase; font-weight: bold;">Organization</span>
            <div style="font-size: 16px; color: #111827; margin-top: 2px;">${user.orgName}</div>
          </div>
          ` : ''}
          <div style="margin-bottom: 15px;">
            <span style="font-size: 12px; color: #9CA3AF; text-transform: uppercase; font-weight: bold;">Achievement</span>
            <div style="font-size: 16px; color: #111827; font-weight: bold; margin-top: 2px; color: #1E40AF;">${cert.title}</div>
          </div>
          <div style="margin-bottom: 15px;">
            <span style="font-size: 12px; color: #9CA3AF; text-transform: uppercase; font-weight: bold;">Certificate ID</span>
            <div style="font-size: 14px; color: #374151; font-family: monospace; margin-top: 2px;">${cert._id}</div>
          </div>
          <div style="margin-bottom: 15px;">
            <span style="font-size: 12px; color: #9CA3AF; text-transform: uppercase; font-weight: bold;">Earned At</span>
            <div style="font-size: 14px; color: #374151; margin-top: 2px;">${new Date(cert.earnedAt).toLocaleString()}</div>
          </div>
          <div>
            <span style="font-size: 12px; color: #9CA3AF; text-transform: uppercase; font-weight: bold;">Status</span>
            <div style="font-size: 14px; color: #10B981; font-weight: bold; margin-top: 2px;">Active & Official</div>
          </div>
        </div>
        
        <a href="http://localhost:5173" style="display: inline-block; margin-top: 30px; background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; transition: background 0.2s;">Visit Hunger Bridge</a>
      </div>
    `);
  } catch (error) {
    res.status(500).send(`<h3>Error verifying certificate: ${error.message}</h3>`);
  }
});

// Forgot Password - Request OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();
    
    // In a real app, send OTP via email
    console.log(`\n📧 [EMAIL MOCK] To: ${user.email} | Subject: Password Reset OTP`);
    console.log(`Your OTP for password reset is: ${otp}\n`);
    
    res.json({ message: 'OTP sent to your email (check console in development)' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ 
      email, 
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    
    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ 
      email, 
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    
    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
