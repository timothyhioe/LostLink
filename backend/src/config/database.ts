import mongoose from 'mongoose';

import { env } from './env';

export async function connectDatabase(): Promise<typeof mongoose> {
  if (!env.MONGODB_URI) {
    throw new Error('Missing MongoDB connection string');
  }

  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected');
  });

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error);
  });

  return mongoose.connect(env.MONGODB_URI);
}

