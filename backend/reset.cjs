const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

const resetDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB. Resetting...');
    
    // We keep users (at least admins) or just wipe Food, Requests, Certificates, Rewards etc.
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      if (key !== 'users') {
        await collections[key].deleteMany();
        console.log(`Cleared ${key}`);
      } else {
        // Only delete non-admin users
        await collections[key].deleteMany({ role: { $ne: 'admin' } });
        console.log('Cleared non-admin users');
      }
    }
    console.log('Database reset successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

resetDB();
