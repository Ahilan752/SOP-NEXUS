import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { logger } from './logger';

let mongoMemoryServer: MongoMemoryServer | null = null;

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri) {
      logger.info(`Connecting to MongoDB at URI: ${mongoUri}`);
      await mongoose.connect(mongoUri);
      logger.info('MongoDB connected successfully.');
    } else {
      logger.warn('No MONGODB_URI found in environment. Initializing in-memory MongoDB fallback...');
      mongoMemoryServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'digital-sop-platform'
        }
      });
      const uri = mongoMemoryServer.getUri();
      logger.info(`In-memory MongoDB started at: ${uri}`);
      await mongoose.connect(uri);
      logger.info('Mongoose connected to in-memory database.');
    }
  } catch (error) {
    logger.error('Database connection error:', error);
    process.exit(1);
  }
};

export const closeDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
      logger.info('In-memory MongoDB stopped.');
    }
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};
