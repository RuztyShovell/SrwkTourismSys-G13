import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memServer;

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set. Copy .env.example to .env and configure it.');

  mongoose.set('strictQuery', true);

  if (uri.startsWith('memory://')) {
    // Dev fallback: embedded in-memory MongoDB, no install required.
    memServer = await MongoMemoryServer.create();
    await mongoose.connect(memServer.getUri('sts'));
    console.log('MongoDB connected (in-memory)');
    return;
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected');
};
