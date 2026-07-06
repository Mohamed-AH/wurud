#!/usr/bin/env node
/**
 * Restore admin role for a user who was accidentally downgraded
 * Usage: node scripts/restore-admin-role.js <email>
 */

require('dotenv').config();
const mongoose = require('mongoose');

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/restore-admin-role.js <email>');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

async function restoreAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const { Admin } = require('../models');

    const normalizedEmail = email.toLowerCase().trim();

    const user = await Admin.findOne({ email: normalizedEmail }, null, { lean: false });

    if (!user) {
      console.error(`User not found: ${normalizedEmail}`);
      process.exit(1);
    }

    console.log(`Found user: ${user.email}`);
    console.log(`Current role: ${user.role}`);

    if (user.role === 'admin') {
      console.log('User is already an admin. No changes needed.');
      process.exit(0);
    }

    const result = await Admin.findByIdAndUpdate(
      user._id,
      { role: 'admin' },
      { new: true }
    );

    console.log(`✅ Restored ${result.email} to role: ${result.role}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

restoreAdmin();
