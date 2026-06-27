import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Food from '../models/Food.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const cleanData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hunger-bridge');
    console.log('MongoDB Connected');

    const now = new Date();

    // 1. Delete Expired Foods
    const expiredFoodsResult = await Food.deleteMany({
      $or: [
        { expiryTime: { $lt: now } },
        { status: 'expired' }
      ]
    });
    console.log(`Deleted ${expiredFoodsResult.deletedCount} expired food records.`);

    // 2. Remove Dummy Test Data (Assuming dummy data has "test" or "dummy" in name/foodType)
    const dummyFoodsResult = await Food.deleteMany({
      $or: [
        { foodType: { $regex: /test|dummy/i } },
        { description: { $regex: /test|dummy/i } }
      ]
    });
    console.log(`Deleted ${dummyFoodsResult.deletedCount} dummy food records.`);

    const dummyUsersResult = await User.deleteMany({
      $or: [
        { name: { $regex: /test|dummy/i } },
        { email: { $regex: /test|dummy/i } }
      ]
    });
    console.log(`Deleted ${dummyUsersResult.deletedCount} dummy user records.`);

    // 3. Clean up food requests referencing deleted receivers
    const allUsers = await User.find({}, '_id');
    const validUserIds = new Set(allUsers.map(u => u._id.toString()));

    let updatedRequestsCount = 0;
    const foods = await Food.find({});
    for (const food of foods) {
      let modified = false;
      const initialRequestsCount = food.requests.length;
      food.requests = food.requests.filter(req => validUserIds.has(req.receiverId.toString()));
      if (food.requests.length !== initialRequestsCount) {
        modified = true;
      }
      
      // Also delete foods whose donor doesn't exist anymore
      if (!validUserIds.has(food.donorId.toString())) {
        await Food.findByIdAndDelete(food._id);
        console.log(`Deleted food record with orphaned donor ID: ${food._id}`);
      } else if (modified) {
        await food.save();
        updatedRequestsCount++;
      }
    }
    console.log(`Cleaned orphaned requests from ${updatedRequestsCount} food records.`);

    console.log('✅ Dummy data cleanup completed successfully!');
  } catch (error) {
    console.error('Error cleaning data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

cleanData();
