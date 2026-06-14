import mongoose from 'mongoose';
import { config } from '../config';

/**
 * Connect to MongoDB. Throws on failure so the caller can decide how to react
 * (the server aborts startup rather than running without persistence).
 */
export const connectDB = async (): Promise<void> => {
  await mongoose.connect(config.mongoUri);
  console.log('✅ Connected to MongoDB');
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};
