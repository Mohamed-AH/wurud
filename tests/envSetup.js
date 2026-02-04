/**
 * Jest Environment Setup
 *
 * This file runs BEFORE test files are imported (via setupFiles).
 * Configure environment variables here that must be available
 * before any test modules are loaded.
 */

// Load environment variables from .env.test
require('dotenv').config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Configure MongoMemoryServer version BEFORE any test imports it
// This prevents download failures when default versions are unavailable
// for the CI platform (e.g., ubuntu2204)
process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || '7.0.11';
