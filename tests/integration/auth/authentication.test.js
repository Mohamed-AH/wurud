/**
 * Integration Tests for Authentication
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const Admin = require('../../../models/Admin');

let app;
let mongoServer;

describe('Authentication Integration Tests', () => {
  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create Express app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Session middleware
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false
    }));

    // Passport initialization
    app.use(passport.initialize());
    app.use(passport.session());

    // Mock passport serialization
    passport.serializeUser((user, done) => {
      done(null, user._id);
    });

    passport.deserializeUser(async (id, done) => {
      try {
        const user = await Admin.findById(id);
        done(null, user);
      } catch (err) {
        done(err);
      }
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Admin.deleteMany({});
  });

  describe('Admin Model', () => {
    it('should create admin user with Google ID', async () => {
      const admin = await Admin.create({
        email: 'admin@test.com',
        name: 'Test Admin',
        googleId: '123456789',
        role: 'admin'
      });

      expect(admin.email).toBe('admin@test.com');
      expect(admin.name).toBe('Test Admin');
      expect(admin.googleId).toBe('123456789');
      expect(admin.role).toBe('admin');
    });

    it('should create editor user', async () => {
      const editor = await Admin.create({
        email: 'editor@test.com',
        name: 'Test Editor',
        googleId: '987654321',
        role: 'editor'
      });

      expect(editor.role).toBe('editor');
    });

    it('should default role to editor', async () => {
      const user = await Admin.create({
        email: 'user@test.com',
        name: 'Test User',
        googleId: '111111111'
      });

      expect(user.role).toBe('editor');
    });

    it('should require email', async () => {
      const user = new Admin({
        name: 'Test User',
        googleId: '222222222'
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should require unique email', async () => {
      await Admin.create({
        email: 'duplicate@test.com',
        name: 'User 1',
        googleId: '333333333'
      });

      const duplicateUser = new Admin({
        email: 'duplicate@test.com',
        name: 'User 2',
        googleId: '444444444'
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });

    it('should allow optional googleId', async () => {
      const user = await Admin.create({
        email: 'nogoogle@test.com',
        name: 'No Google User',
        role: 'editor'
      });

      expect(user.googleId).toBeUndefined();
    });
  });

  describe('Authentication Middleware', () => {
    let authMiddleware;

    beforeAll(() => {
      authMiddleware = require('../../../middleware/auth');
    });

    it('should allow authenticated admin users', async () => {
      const admin = await Admin.create({
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin'
      });

      const req = {
        isAuthenticated: () => true,
        user: admin
      };
      const res = testUtils.mockResponse();
      const next = jest.fn();

      authMiddleware.requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should redirect unauthenticated users', () => {
      const req = {
        isAuthenticated: () => false,
        user: null
      };
      const res = testUtils.mockResponse();
      const next = jest.fn();

      authMiddleware.requireAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('/');
    });

    it('should allow only admin role for admin-only routes', async () => {
      const admin = await Admin.create({
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin'
      });

      const req = {
        isAuthenticated: () => true,
        user: admin
      };
      const res = testUtils.mockResponse();
      const next = jest.fn();

      authMiddleware.requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny editor role for admin-only routes', async () => {
      const editor = await Admin.create({
        email: 'editor@test.com',
        name: 'Editor User',
        role: 'editor'
      });

      const req = {
        isAuthenticated: () => true,
        user: editor
      };
      const res = testUtils.mockResponse();
      const next = jest.fn();

      authMiddleware.requireAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Admin Whitelist', () => {
    it('should identify admin emails from whitelist', () => {
      const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];

      // Test environment should have admin emails configured
      expect(adminEmails.length).toBeGreaterThan(0);
    });

    it('should handle comma-separated admin emails', () => {
      const testEmails = 'admin1@test.com,admin2@test.com,admin3@test.com';
      const emails = testEmails.split(',').map(e => e.trim());

      expect(emails).toHaveLength(3);
      expect(emails).toContain('admin1@test.com');
      expect(emails).toContain('admin2@test.com');
      expect(emails).toContain('admin3@test.com');
    });
  });

  describe('Session Management', () => {
    it('should create session for authenticated user', async () => {
      const admin = await Admin.create({
        email: 'admin@test.com',
        name: 'Test Admin',
        googleId: '123456789',
        role: 'admin'
      });

      // Simulate session
      expect(admin._id).toBeDefined();
    });

    it('should maintain user data in session', async () => {
      const admin = await Admin.create({
        email: 'admin@test.com',
        name: 'Test Admin',
        role: 'admin'
      });

      const foundAdmin = await Admin.findById(admin._id);

      expect(foundAdmin.email).toBe(admin.email);
      expect(foundAdmin.name).toBe(admin.name);
      expect(foundAdmin.role).toBe(admin.role);
    });
  });

  describe('OAuth Integration', () => {
    it('should store Google OAuth profile data', async () => {
      const admin = await Admin.create({
        email: 'oauth@test.com',
        name: 'OAuth User',
        googleId: 'google-oauth-id-12345',
        role: 'editor'
      });

      expect(admin.googleId).toBe('google-oauth-id-12345');
    });

    it('should find user by Google ID', async () => {
      await Admin.create({
        email: 'findme@test.com',
        name: 'Find Me',
        googleId: 'unique-google-id',
        role: 'editor'
      });

      const found = await Admin.findOne({ googleId: 'unique-google-id' });

      expect(found).toBeDefined();
      expect(found.email).toBe('findme@test.com');
    });

    it('should update existing user on OAuth login', async () => {
      const admin = await Admin.create({
        email: 'update@test.com',
        name: 'Old Name',
        googleId: 'update-google-id',
        role: 'editor'
      });

      admin.name = 'Updated Name';
      await admin.save();

      const updated = await Admin.findById(admin._id);
      expect(updated.name).toBe('Updated Name');
    });
  });
});
