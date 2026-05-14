#!/usr/bin/env node
/**
 * Emergency: Disable Maintenance Mode
 * Run this to regain admin access when locked out
 *
 * Usage: node scripts/disable-maintenance-mode.js --env .env
 */

const argsForEnv = process.argv.slice(2);
const envIndex = argsForEnv.indexOf('--env');
const envPath = envIndex !== -1 ? argsForEnv[envIndex + 1] : '.env';

require('dotenv').config({ path: envPath });

const mongoose = require('mongoose');

async function disableMaintenanceMode() {
  console.log('\n🔧 Emergency: Disable Maintenance Mode\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const result = await mongoose.connection.db.collection('sitesettings').updateOne(
      { key: 'global' },
      { $set: { 'maintenanceMode.enabled': false } }
    );

    if (result.matchedCount > 0) {
      console.log('✅ Maintenance mode DISABLED');
      console.log('   You can now access the admin panel.\n');
    } else {
      console.log('⚠️  No settings document found. Creating one...');
      await mongoose.connection.db.collection('sitesettings').updateOne(
        { key: 'global' },
        { $set: { key: 'global', 'maintenanceMode.enabled': false } },
        { upsert: true }
      );
      console.log('✅ Maintenance mode DISABLED\n');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

disableMaintenanceMode();
