require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const connectDB = require('./config/database');
const passport = require('./config/passport');
const { i18nMiddleware } = require('./utils/i18n');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Will configure properly later
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  }
}));

// Passport middleware (must be after session)
app.use(passport.initialize());
app.use(passport.session());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Cookie parser (for locale storage)
app.use(cookieParser());

// i18n middleware (must be before routes)
app.use(i18nMiddleware);

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
const publicRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const lecturesApiRoutes = require('./routes/api/lectures');
const sheikhsApiRoutes = require('./routes/api/sheikhs');
const seriesApiRoutes = require('./routes/api/series');
const streamRoutes = require('./routes/stream');
const downloadRoutes = require('./routes/download');

app.use('/', publicRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/api/lectures', lecturesApiRoutes);
app.use('/api/sheikhs', sheikhsApiRoutes);
app.use('/api/series', seriesApiRoutes);
app.use('/stream', streamRoutes);
app.use('/download', downloadRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Duroos server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});
