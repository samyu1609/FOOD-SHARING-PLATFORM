import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Drop the problematic index
    const db = mongoose.connection.db;
    const collection = db.collection('foods');
    
    try {
      await collection.dropIndex('location_2dsphere');
      console.log('Dropped location_2dsphere index');
    } catch (err) {
      console.log('Index may not exist:', err.message);
    }

    // List remaining indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(i => i.name));

    console.log('✓ Fix complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixIndex();
