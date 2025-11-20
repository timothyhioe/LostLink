import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../src/models/User';

dotenv.config();

//script to test creation of user schema in mongo

const testUserModel = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB Atlas');

    const testUser = new User({
      email: 'test@stud.h-da.de',
      passwordHash: 'test-hash-12345',
      name: 'Test User',
      emailVerified: false
    });

    await testUser.save();
    console.log('Test user created:', testUser._id);
    console.log('Collection "users" now exists in your database');

    //cleanup
    await User.deleteOne({ email: 'test@stud.h-da.de' });
    console.log('Test user deleted');

    await mongoose.disconnect();
    console.log('Disconnected');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testUserModel();