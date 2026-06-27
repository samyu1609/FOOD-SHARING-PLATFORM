import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const deleteUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hunger-bridge');
    console.log('MongoDB Connected');

    const result = await mongoose.connection.collection('users').deleteMany({});
    console.log(`Deleted ${result.deletedCount} users`);

    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

deleteUsers();
