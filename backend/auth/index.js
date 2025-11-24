import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import authRoutes from './routes/auth.js';

dotenv.config();

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI is not set');
}

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set');
}

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.use((_, res) => res.status(404).json({ message: 'Not found' }));

const port = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(port, () => {
      console.log(`Auth service listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  });
