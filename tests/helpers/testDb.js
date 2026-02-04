/**
 * Test Database Helper
 *
 * Provides MongoDB connection for tests that works in both:
 * - Local development (uses mongodb-memory-server)
 * - CI environment (uses external MongoDB from MONGODB_URI)
 */

const mongoose = require('mongoose');

let mongoServer = null;
let connectionPromise = null;

/**
 * Connect to test database
 * Uses MONGODB_URI env var if available (CI), otherwise starts mongodb-memory-server (local)
 */
async function connect() {
  // Reuse existing connection if available
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If already connecting, wait for that
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    const mongoUri = process.env.MONGODB_URI;

    if (mongoUri) {
      // CI environment - use external MongoDB
      await mongoose.connect(mongoUri);
    } else {
      // Local development - use mongodb-memory-server
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri);
    }

    return mongoose.connection;
  })();

  return connectionPromise;
}

/**
 * Disconnect and cleanup
 */
async function disconnect() {
  connectionPromise = null;

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

/**
 * Clear all collections in the database
 * Useful for cleaning up between tests
 */
async function clearDatabase() {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

/**
 * Drop the database entirely
 * Use with caution - only for test cleanup
 */
async function dropDatabase() {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  await mongoose.connection.db.dropDatabase();
}

module.exports = {
  connect,
  disconnect,
  clearDatabase,
  dropDatabase
};
