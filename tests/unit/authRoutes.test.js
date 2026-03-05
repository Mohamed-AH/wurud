/**
 * Unit Tests for auth routes
 * Tests authentication endpoints: logout, status
 */

const express = require('express');
const request = require('supertest');

// Mock passport before requiring routes
jest.mock('../../config/passport', () => ({
  authenticate: jest.fn(() => (req, res, next) => next())
}));

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());

    // Mock session and user
    app.use((req, res, next) => {
      req.session = {
        destroy: jest.fn((cb) => cb())
      };
      req.logout = jest.fn((cb) => cb());
      req.isAuthenticated = jest.fn(() => false);
      next();
    });

    const authRoutes = require('../../routes/auth');
    app.use('/auth', authRoutes);
  });

  describe('GET /auth/status', () => {
    it('should return authenticated: false when not logged in', async () => {
      const response = await request(app)
        .get('/auth/status')
        .expect(200);

      expect(response.body).toEqual({
        authenticated: false
      });
    });

    it('should return user info when authenticated', async () => {
      // Override middleware for this test
      const authenticatedApp = express();
      authenticatedApp.use(express.json());

      authenticatedApp.use((req, res, next) => {
        req.session = { destroy: jest.fn((cb) => cb()) };
        req.logout = jest.fn((cb) => cb());
        req.isAuthenticated = jest.fn(() => true);
        req.user = {
          _id: '507f1f77bcf86cd799439011',
          email: 'admin@test.com',
          displayName: 'Test Admin',
          profilePhoto: 'https://example.com/photo.jpg'
        };
        next();
      });

      const authRoutes = require('../../routes/auth');
      authenticatedApp.use('/auth', authRoutes);

      const response = await request(authenticatedApp)
        .get('/auth/status')
        .expect(200);

      expect(response.body).toEqual({
        authenticated: true,
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'admin@test.com',
          displayName: 'Test Admin',
          profilePhoto: 'https://example.com/photo.jpg'
        }
      });
    });
  });

  describe('GET /auth/logout', () => {
    it('should logout and redirect to login page', async () => {
      const response = await request(app)
        .get('/auth/logout')
        .expect(302);

      expect(response.headers.location).toBe('/admin/login');
    });

    it('should handle logout errors', async () => {
      const errorApp = express();
      errorApp.use(express.json());

      errorApp.use((req, res, next) => {
        req.session = { destroy: jest.fn((cb) => cb()) };
        req.logout = jest.fn((cb) => cb(new Error('Logout error')));
        req.isAuthenticated = jest.fn(() => false);
        next();
      });

      // Error handler
      errorApp.use((err, req, res, next) => {
        res.status(500).json({ error: err.message });
      });

      const authRoutes = require('../../routes/auth');
      errorApp.use('/auth', authRoutes);

      const response = await request(errorApp)
        .get('/auth/logout')
        .expect(500);

      expect(response.body.error).toBe('Logout error');
    });

    it('should handle session destruction errors gracefully', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const sessionErrorApp = express();
      sessionErrorApp.use(express.json());

      sessionErrorApp.use((req, res, next) => {
        req.session = {
          destroy: jest.fn((cb) => cb(new Error('Session error')))
        };
        req.logout = jest.fn((cb) => cb());
        req.isAuthenticated = jest.fn(() => false);
        next();
      });

      const authRoutes = require('../../routes/auth');
      sessionErrorApp.use('/auth', authRoutes);

      // Should still redirect despite session error
      const response = await request(sessionErrorApp)
        .get('/auth/logout')
        .expect(302);

      expect(response.headers.location).toBe('/admin/login');
    });
  });

  describe('GET /auth/google', () => {
    it('should initiate Google OAuth flow', async () => {
      const passport = require('../../config/passport');

      await request(app)
        .get('/auth/google')
        .expect(200); // Our mock just calls next()

      expect(passport.authenticate).toHaveBeenCalledWith('google', {
        scope: ['profile', 'email']
      });
    });
  });

  describe('GET /auth/google/callback', () => {
    it('should handle Google OAuth callback', async () => {
      const passport = require('../../config/passport');

      const response = await request(app)
        .get('/auth/google/callback')
        .expect(302);

      expect(passport.authenticate).toHaveBeenCalledWith('google', {
        failureRedirect: '/admin/login?error=unauthorized',
        failureMessage: true
      });
      expect(response.headers.location).toBe('/admin/dashboard');
    });
  });
});
