import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Food from './models/Food.js';

dotenv.config();

const clearAllData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    console.log('\n⚠️  WARNING: This will delete ALL user and food data!\n');
    
    // Count documents before deletion
    const userCount = await User.countDocuments();
    const foodCount = await Food.countDocuments();
    
    console.log(`Found ${userCount} users and ${foodCount} food donations\n`);
    
    // Delete all data
    console.log('Deleting all users...');
    await User.deleteMany({});
    console.log('✓ All users deleted\n');
    
    console.log('Deleting all food donations...');
    await Food.deleteMany({});
    console.log('✓ All food donations deleted\n');
    
    console.log('✅ All data cleared successfully!');
    console.log('Database is now empty.\n');
    
  } catch (error) {
    console.error('Error clearing data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

clearAllData();
