import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixDocuments = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('foods');
    
    // Find all documents with 'location' field and rename to 'locationName'
    const documents = await collection.find({ location: { $exists: true } }).toArray();
    console.log(`Found ${documents.length} documents with 'location' field`);

    for (const doc of documents) {
      await collection.updateOne(
        { _id: doc._id },
        { 
          $set: { locationName: doc.location },
          $unset: { location: "" }
        }
      );
      console.log(`Updated document ${doc._id}`);
    }

    // Also drop any geo-spatial indexes if they exist
    try {
      await collection.dropIndex('location_2dsphere');
      console.log('Dropped location_2dsphere index');
    } catch (err) {
      console.log('No location_2dsphere index to drop');
    }

    console.log('✓ All documents updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixDocuments();
