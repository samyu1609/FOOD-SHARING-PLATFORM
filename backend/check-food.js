import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const checkFood = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('foods');
    
    // Get all food documents
    const foods = await collection.find({}).toArray();
    console.log(`Found ${foods.length} food documents:`);
    
    foods.forEach((food, i) => {
      console.log(`\n--- Food ${i + 1} ---`);
      console.log('ID:', food._id);
      console.log('Food Type:', food.foodType);
      console.log('Location:', food.location);
      console.log('LocationName:', food.locationName);
      console.log('Latitude:', food.latitude);
      console.log('Longitude:', food.longitude);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkFood();
