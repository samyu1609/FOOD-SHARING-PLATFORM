import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['requested', 'assigned', 'picked', 'delivered', 'cancelled', 'auto_reassigned'],
    default: 'requested'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  volunteerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  pickedAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  qrCode: {
    type: String,
    default: null
  }
});

const foodSchema = new mongoose.Schema({
  foodType: {
    type: String,
    required: true,
    trim: true
  },
  totalQuantity: {
    type: Number,
    required: true,
    min: 1
  },
  remainingQuantity: {
    type: Number,
    required: true
  },
  expiryTime: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true
  },
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  locationName: {
    type: String,
    required: true,
    trim: true
  },
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requests: [requestSchema],
  status: {
    type: String,
    enum: ['available', 'completed', 'expired', 'urgent'],
    default: 'available'
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  urgencyMarkedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

foodSchema.index({ status: 1 });
foodSchema.index({ expiryTime: 1 });
foodSchema.index({ donorId: 1 });

foodSchema.pre('save', function(next) {
  if (this.remainingQuantity <= 0) {
    this.status = 'completed';
  }
  next();
});

const Food = mongoose.model('Food', foodSchema);
export default Food;
