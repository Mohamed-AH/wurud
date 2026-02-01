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

// Google OAuth Strategy - only configure if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
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

        console.log('\n🔐 [OAuth Debug] Google login attempt:');
        console.log('  Email:', email);
        console.log('  Google ID:', profile.id);
        console.log('  Display Name:', profile.displayName);

        // Check if email is whitelisted OR if user already exists in database (pre-created editor)
        const isWhitelisted = Admin.isEmailWhitelisted(email);
        console.log('  In whitelist:', isWhitelisted);

        // Check if user exists in database (pre-created by admin)
        const existingUser = await Admin.findOne({ email: email });
        console.log('  Pre-created in DB:', existingUser ? 'YES' : 'NO');

        if (!isWhitelisted && !existingUser) {
          console.log('  ❌ REJECTED: Email not in whitelist AND not pre-created');
          return done(null, false, {
            message: 'Unauthorized: Email not in admin whitelist or pre-created editors'
          });
        }

        // Find or create admin user
        // First try to find by googleId
        console.log('  🔍 Searching by googleId...');
        let admin = await Admin.findOne({ googleId: profile.id });
        console.log('  Found by googleId:', admin ? 'YES' : 'NO');

        if (!admin) {
          // Use the existingUser we already found above
          admin = existingUser;
          console.log('  Using pre-created user:', admin ? 'YES' : 'NO');

          if (admin) {
            console.log('  ℹ️  Pre-created editor found');
            console.log('    Current role:', admin.role);
            console.log('    Current isActive:', admin.isActive);
          }
        }

        if (admin) {
          // Update existing admin
          console.log('  ✏️  Updating existing admin...');
          admin.googleId = profile.id; // Link Google account if not already linked
          admin.email = email;
          admin.displayName = profile.displayName;
          admin.firstName = profile.name?.givenName || '';
          admin.lastName = profile.name?.familyName || '';
          admin.profilePhoto = profile.photos?.[0]?.value || '';
          await admin.updateLastLogin();
          console.log('  ✅ Admin updated successfully');
        } else {
          // Create new admin (only if email is whitelisted)
          console.log('  ➕ Creating new admin...');
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
          console.log('  ✅ New admin created');
        }

        console.log('  ✅ LOGIN SUCCESSFUL');
        console.log('    User ID:', admin._id);
        console.log('    Role:', admin.role);
        console.log('    Active:', admin.isActive);
        console.log('');

        return done(null, admin);
      } catch (error) {
        console.error('❌ [OAuth Debug] Google OAuth error:', error);
        console.error('   Stack:', error.stack);
        return done(error, null);
      }
    }
  )
  );
} else {
  console.log('⚠️ Google OAuth not configured - admin authentication will be disabled');
}

module.exports = passport;
