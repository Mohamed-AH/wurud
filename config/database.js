const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Fail fast: 10 second timeout for initial connection
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    // Log error but don't exit - let maintenance mode handle it
    console.error('❌ MongoDB connection failed:', error.message);
    console.warn('⚠️ Server will run in maintenance mode until database is available');
    return null;
  }
};

module.exports = connectDB;
