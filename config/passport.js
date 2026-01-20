const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { Admin } = require('../models');

// Serialize user to session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await Admin.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        // Check if email is whitelisted
        if (!Admin.isEmailWhitelisted(email)) {
          return done(null, false, {
            message: 'Unauthorized: Email not in admin whitelist'
          });
        }

        // Find or create admin user
        let admin = await Admin.findOne({ googleId: profile.id });

        if (admin) {
          // Update existing admin
          admin.email = email;
          admin.displayName = profile.displayName;
          admin.firstName = profile.name?.givenName || '';
          admin.lastName = profile.name?.familyName || '';
          admin.profilePhoto = profile.photos?.[0]?.value || '';
          await admin.updateLastLogin();
        } else {
          // Create new admin
          admin = await Admin.create({
            googleId: profile.id,
            email: email,
            displayName: profile.displayName,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            profilePhoto: profile.photos?.[0]?.value || '',
            lastLogin: new Date(),
            isActive: true
          });
        }

        return done(null, admin);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;
