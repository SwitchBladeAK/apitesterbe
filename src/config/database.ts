import mongoose from 'mongoose';

/**
 * Connects to MongoDB database
 * Follows Single Responsibility Principle - only handles database connection
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI ?? process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not set in environment variables');
    }
    
    await mongoose.connect(mongoUri);
    
    console.log('✅ MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });
    
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

