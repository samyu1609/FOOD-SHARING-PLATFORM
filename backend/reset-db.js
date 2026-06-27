import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import Food from './models/Food.js';
import Review from './models/Review.js';
import Notification from './models/Notification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const resetDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hunger-bridge');
    console.log('MongoDB Connected');

    // Delete all users EXCEPT admins
    const userRes = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`✅ Deleted ${userRes.deletedCount} Donors/Receivers`);

    // Delete all food items
    const foodRes = await Food.deleteMany({});
    console.log(`✅ Deleted ${foodRes.deletedCount} Food listings`);

    // Delete all reviews
    const revRes = await Review.deleteMany({});
    console.log(`✅ Deleted ${revRes.deletedCount} Reviews`);

    // Delete all notifications
    const notifRes = await Notification.deleteMany({});
    console.log(`✅ Deleted ${notifRes.deletedCount} Notifications`);

    console.log('\nDatabase has been completely reset! Your admin account is safe.');
    console.log('You can now test the real-time flow from scratch.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

resetDatabase();
