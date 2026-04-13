/**
 * Jest Global Setup
 *
 * Starts a single MongoMemoryServer instance shared across all test suites.
 * This prevents port conflicts when multiple test files run in parallel.
 *
 * Uses file-based config sharing since globalSetup runs in a separate process.
 */

const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const CONFIG_PATH = path.join(__dirname, '.mongo-config.json');

module.exports = async function globalSetup() {
  // Skip if MONGODB_URI is already set (CI environment with external MongoDB)
  if (process.env.MONGODB_URI) {
    // Write config so tests know to use external MongoDB
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ uri: process.env.MONGODB_URI, external: true }));
    return;
  }

  // Create a single MongoMemoryServer instance
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Write URI to config file for test workers to read
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ uri, external: false }));

  // Store server instance globally for teardown
  global.__MONGO_SERVER__ = mongoServer;
};
