import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['donor', 'receiver', 'admin'],
    required: true
  },
  subRole: {
    type: String,
    required: true,
    enum: [
      'Restaurant', 'Event Management', 'Hostel / College', 'Individual Donor',
      'NGO', 'NSS Student', 'Volunteer', 'Individual', 'Admin', 'System Admin', 'System'
    ]
  },
  points: {
    type: Number,
    default: 0
  },
  trustScore: {
    type: Number,
    default: 0,
    min: -100,
    max: 100
  },
  successfulPickups: {
    type: Number,
    default: 0
  },
  latePickups: {
    type: Number,
    default: 0
  },
  cancelledRequests: {
    type: Number,
    default: 0
  },
  badges: [{
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Legend']
  }],
  level: {
    type: Number,
    default: 1
  },
  hoursServed: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  },
  certificates: [{
    title: String,
    url: String,
    earnedAt: {
      type: Date,
      default: Date.now
    }
  }],
  pickupCount: {
    type: Number,
    default: 0
  },
  qrCode: {
    type: String,
    default: null
  },
  qrCodeData: {
    type: String,
    default: null
  },
  pushSubscription: {
    type: Object,
    default: null
  },
  orgName: {
    type: String,
    trim: true,
    default: null
  },
  isPhoneVerified: {
    type: Boolean,
    default: true
  },
  smsOptIn: {
    type: Boolean,
    default: true
  },
  pushOptIn: {
    type: Boolean,
    default: true
  },
  emailOptIn: {
    type: Boolean,
    default: true
  },
  inAppOptIn: {
    type: Boolean,
    default: true
  },
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  address: {
    type: String,
    trim: true,
    default: null
  },
  city: {
    type: String,
    trim: true,
    default: null
  },
  district: {
    type: String,
    trim: true,
    default: null
  },
  state: {
    type: String,
    trim: true,
    default: null
  },
  pinCode: {
    type: String,
    trim: true,
    default: null
  },
  resetPasswordOTP: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

userSchema.index({ role: 1 });
userSchema.index({ points: -1 });
userSchema.index({ pickupCount: -1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
