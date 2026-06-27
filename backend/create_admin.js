import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const createAdmin = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/hunger-bridge');
    console.log('Connected to MongoDB');

    const email = 'vijayalakshmi@gmail.com';
    
    // Check if user exists and delete them if they do
    await User.deleteOne({ email });

    // Create Admin User
    const admin = await User.create({
      name: 'Vijayalakshmi',
      email: email,
      phone: '9876543210',
      password: '123',
      role: 'admin',
      subRole: 'System Admin'
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email:', admin.email);
    console.log('Password: 123');
    console.log('Role:', admin.role);

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();
