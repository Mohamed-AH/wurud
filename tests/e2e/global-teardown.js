/**
 * Playwright Global Teardown - Cleans up the test database after E2E tests.
 */

const mongoose = require('mongoose');

async function globalTeardown() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/wurud_test';

  try {
    await mongoose.connect(mongoUri);

    const { Sheikh, Series, Lecture } = require('../../models');

    await Sheikh.deleteMany({});
    await Series.deleteMany({});
    await Lecture.deleteMany({});

    await mongoose.disconnect();

    console.log('E2E global teardown: Database cleaned up');
  } catch (error) {
    console.error('E2E global teardown error:', error.message);
  }
}

module.exports = globalTeardown;
