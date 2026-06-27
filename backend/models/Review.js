import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  foodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food',
    required: true
  },
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  foodQuality: {
    type: String,
    enum: ['excellent', 'good', 'average', 'poor'],
    default: 'good'
  },
  packaging: {
    type: String,
    enum: ['excellent', 'good', 'average', 'poor'],
    default: 'good'
  },
  onTime: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Prevent duplicate reviews for same food by same receiver
reviewSchema.index({ foodId: 1, receiverId: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);
export default Review;
