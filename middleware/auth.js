const { Admin } = require('../models');

/**
 * Middleware to check if user is authenticated
 * Use this for routes that require any logged-in user
 */
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }

  // Redirect to login page
  res.redirect('/admin/login');
};

/**
 * Middleware to check if user is an active admin
 * Use this for admin-only routes
 */
const isAdmin = async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      return res.redirect('/admin/login');
    }

    // Check if user exists and is active
    const admin = await Admin.findById(req.user._id);

    if (!admin || !admin.isActive) {
      req.logout((err) => {
        if (err) {
          console.error('Logout error:', err);
        }
        res.redirect('/admin/login?error=inactive');
      });
      return;
    }

    // Check if email is still whitelisted
    if (!Admin.isEmailWhitelisted(admin.email)) {
      req.logout((err) => {
        if (err) {
          console.error('Logout error:', err);
        }
        res.redirect('/admin/login?error=unauthorized');
      });
      return;
    }

    // User is authorized admin
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).send('Authentication error');
  }
};

/**
 * Middleware for API routes - returns JSON instead of redirecting
 */
const isAuthenticatedAPI = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }

  res.status(401).json({
    success: false,
    message: 'Authentication required'
  });
};

/**
 * Middleware for admin API routes - returns JSON instead of redirecting
 */
const isAdminAPI = async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const admin = await Admin.findById(req.user._id);

    if (!admin || !admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User is not an active admin'
      });
    }

    if (!Admin.isEmailWhitelisted(admin.email)) {
      return res.status(403).json({
        success: false,
        message: 'User is not authorized'
      });
    }

    next();
  } catch (error) {
    console.error('Admin API auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Middleware to check if user is an editor or admin
 * Use this for content management routes (lectures, series, sheikhs)
 */
const isEditor = async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      return res.redirect('/admin/login');
    }

    const admin = await Admin.findById(req.user._id);

    if (!admin || !admin.isActive) {
      req.logout((err) => {
        if (err) {
          console.error('Logout error:', err);
        }
        res.redirect('/admin/login?error=inactive');
      });
      return;
    }

    // Check role - both admin and editor can access
    if (admin.role !== 'admin' && admin.role !== 'editor') {
      return res.status(403).send('Insufficient permissions');
    }

    next();
  } catch (error) {
    console.error('Editor auth middleware error:', error);
    res.status(500).send('Authentication error');
  }
};

/**
 * Middleware to check if user is a super admin (admin role)
 * Use this for admin/editor management routes only
 */
const isSuperAdmin = async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      return res.redirect('/admin/login');
    }

    const admin = await Admin.findById(req.user._id);

    if (!admin || !admin.isActive || admin.role !== 'admin') {
      return res.status(403).send('Only super admins can access this page');
    }

    next();
  } catch (error) {
    console.error('Super admin auth middleware error:', error);
    res.status(500).send('Authentication error');
  }
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isEditor,
  isSuperAdmin,
  isAuthenticatedAPI,
  isAdminAPI
};
