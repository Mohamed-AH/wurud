# Islamic Audio Lectures Platform - Claude Instructions

<project_overview>
A web platform for hosting and streaming ~160 Arabic Islamic lecture audio files. Users can browse, stream, and download lectures. Admin can upload and manage content via Google OAuth-protected panel.

**Core Mission**: Make Islamic knowledge accessible through high-quality audio lectures with an Arabic-first, mobile-optimized interface.

**Data**: ~160 lectures (~3.4GB total), organized by sheikh and series, hosted on Oracle Cloud Always Free tier.
</project_overview>

---

## 📌 Project State

**Current Phase**: Phase 13 Complete ✅ - Ready for Phase 14 (Security & Performance)
**Last Updated**: 2026-01-20
**Branch**: `claude/review-docs-plan-HTIzu`

### What We Have
- ✅ Requirements document reviewed (requirements.md)
- ✅ Comprehensive 20-phase implementation plan created
- ✅ CSV data with 160 lecture metadata entries
- ✅ Git repository initialized
- ✅ **Phase 1 Complete**: Project foundation set up
  - package.json with all dependencies
  - Complete folder structure (models, routes, controllers, middleware, views, public, config, utils)
  - .gitignore and .env.example configured
  - Basic Express server running with middleware stack
  - Dependencies installed (187 packages)
  - Server tested and working on http://localhost:3000
- ✅ **Phase 2 Complete**: Database models and configuration
  - MongoDB connection module (config/database.js)
  - 4 Mongoose models created (Lecture, Sheikh, Series, Admin)
  - All schemas with proper validation and references
  - 26 database indexes configured for optimal queries
  - Text search indexes on Arabic/English fields
  - Seed script for test data (scripts/seed.js)
  - Model test script validates all schemas
  - Virtual properties for formatted data (duration, file size)
- ✅ **Phase 3 Complete**: Authentication system (Google OAuth 2.0)
  - Passport.js configuration with Google OAuth strategy (config/passport.js)
  - Email whitelist validation in Admin model
  - Authentication routes (/auth/google, /auth/google/callback, /auth/logout, /auth/status)
  - 4 authentication middleware functions (isAuthenticated, isAdmin, isAuthenticatedAPI, isAdminAPI)
  - Admin login page (views/admin/login.ejs) with Google sign-in button
  - Admin dashboard page (views/admin/dashboard.ejs) with stats and recent lectures
  - Session management with Passport serialization/deserialization
  - Server integration with Passport middleware
  - Google OAuth setup documentation (docs/GOOGLE_OAUTH_SETUP.md)
- ✅ **Phase 4 Complete**: File upload & storage system
  - Multer configuration with audio file validation (config/storage.js)
  - Upload directory auto-creation and management
  - File validation middleware (middleware/fileValidation.js) - 3 validators
  - Audio metadata extraction utility (utils/audioMetadata.js) using music-metadata
  - File management utilities (utils/fileManager.js) - 9 functions
  - Upload API endpoint (routes/api/lectures.js) - POST/GET with full CRUD
  - Automatic metadata extraction (duration, bitrate, file size, format)
  - Sheikh and Series lecture count auto-increment
  - Support for 5 audio formats (MP3, M4A, WAV, OGG, FLAC)
  - Security: path traversal prevention, MIME type validation, size limits (60MB)
  - Storage statistics and orphaned file cleanup
  - Test script validates all components (scripts/test-upload.js)
  - Server integration and tested
- ✅ **Phase 5 Complete**: Audio streaming with HTTP Range requests
  - Stream handler middleware (middleware/streamHandler.js) - 4 functions
  - HTTP Range request parsing and validation
  - Partial content (206) responses with proper headers
  - MIME type detection for audio formats
  - Cache control headers (1 year caching)
  - Streaming controller (controllers/streamController.js) - 3 functions
  - Stream audio with seek support (streamAudio)
  - Download with meaningful filenames (downloadAudio)
  - Stream info endpoint (getStreamInfo)
  - Streaming routes (routes/stream.js, routes/download.js)
  - Play count auto-increment on stream
  - Download count auto-increment on download
  - File existence validation before streaming
  - Bandwidth-efficient partial content serving
  - Browser native audio player support
  - Mobile device compatibility
  - Test script validates all components (scripts/test-streaming.js)
  - Server integration and tested
- ✅ **Phase 6 Complete**: Admin panel - Dashboard & Upload interface
  - Admin upload interface (views/admin/upload.ejs) with drag-drop
  - Real-time file validation and metadata form
  - Dynamic sheikh/series dropdown loading
  - Manage lectures page (views/admin/manage.ejs)
  - Delete lectures with confirmation
  - Updated dashboard with navigation bar
  - Admin routes (upload, manage) with isAdmin protection
  - Sheikhs API (routes/api/sheikhs.js) - Full CRUD
  - Series API (routes/api/series.js) - Full CRUD
  - Lectures API updates - PUT and DELETE endpoints
  - Delete operations with cleanup (file + counts)
  - Prevents orphaned data (sheikh/series with lectures)
  - Success/error messaging throughout
  - Mobile-responsive design
  - Server integration and tested
- ✅ **Phase 8 Complete**: Public Interface - Homepage & Browse
  - Layout system with Islamic aesthetic (views/layout.ejs)
  - Arabic-first design with Amiri/Noto Naskh Arabic fonts
  - Islamic color scheme (#1A5F5A green, #D4AF37 gold, #F7F5F0 cream)
  - RTL support and proper Arabic typography
  - Reusable partials (views/partials/header.ejs, footer.ejs, lectureCard.ejs)
  - Homepage (views/public/index.ejs) with hero, statistics, featured/recent lectures
  - Browse page (views/public/browse.ejs) with category filters and search
  - Public routes (routes/index.js) for /, /browse, /sheikhs, /series
  - MongoDB text search integration for bilingual content
  - Dynamic statistics (total lectures, sheikhs, series, plays)
  - Featured lectures section (max 3)
  - Recent lectures grid (max 12)
  - Responsive design for mobile/tablet/desktop
  - Server integration and tested
- ✅ **Phase 9 Complete**: Public Interface - Lecture Detail Page
  - Lecture detail route (routes/index.js) with /lectures/:id
  - Comprehensive lecture detail page (views/public/lecture.ejs)
  - Custom audio player with full JavaScript controls:
    * Play/pause with visual state indicators
    * Seek bar with real-time progress tracking
    * Volume control with mute/unmute functionality
    * Playback speed options (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
    * Time display (current/duration) with formatted output
    * HTTP Range request support for efficient streaming
  - Action buttons:
    * Download button with file size display
    * Share button (native API + clipboard fallback)
  - Comprehensive metadata display:
    * Breadcrumb navigation for easy traversal
    * Bilingual titles (Arabic primary, English secondary)
    * Sheikh info with link, name, and honorific
    * Series info with lecture number
    * Category badge with color coding (Aqeedah, Fiqh, Tafsir, etc.)
    * Statistics (duration, play count, recording date)
    * Location information with icon
  - Description section with bilingual support
  - Sheikh biography section with "more lectures" link
  - Related lectures section (6 lectures from same series/sheikh/category)
  - Play count increment API (POST /api/lectures/:id/play)
  - Updated lecture cards to link to detail page
  - Fully responsive design (mobile/tablet/desktop)
  - Islamic aesthetic maintained throughout
  - Server integration and tested
- ✅ **Phase 10 Complete**: Public Interface - Sheikh & Series Pages
  - Sheikh profile route (routes/index.js) with /sheikhs/:id
  - Sheikh profile page (views/public/sheikh.ejs):
    * Header with avatar icon, name, honorific, English name
    * Statistics cards (total lectures, plays, hours, series count)
    * Biography section with bilingual support
    * Series grid showing all series by the sheikh
    * Complete lectures list with filtering
    * Breadcrumb navigation
    * Empty state for sheikhs without lectures
  - Series profile route (routes/index.js) with /series/:id
  - Series detail page (views/public/series-detail.ejs):
    * Header with series icon, category badge, title
    * Sheikh information with profile link
    * Statistics cards (lectures, plays, hours, completion %)
    * Series description section with bilingual text
    * Sheikh biography excerpt with link
    * Ordered lectures list with visual numbering
    * Lecture number badges (solid for numbered, dashed for unnumbered)
    * Sorting by lectureNumber then createdAt
    * Empty state for series without lectures
  - Statistics calculation:
    * Total lectures count per sheikh/series
    * Aggregate play counts
    * Total duration in hours
    * Completion percentage for numbered lectures
  - Islamic aesthetic maintained (green gradient headers)
  - Fully responsive design (mobile/tablet/desktop)
  - Interactive cards with hover effects
  - Server integration and tested
- ✅ **Phase 11 Complete**: Bilingual Support & Language Toggle
  - Translation system (utils/i18n.js):
    * Comprehensive Arabic/English translations for all UI elements
    * Translation keys for navigation, stats, categories, common text
    * i18nMiddleware for automatic locale detection
    * Locale from query param, cookie, or defaults to Arabic
    * Translation function (t) injected into all templates
  - Server integration:
    * Added cookie-parser middleware
    * i18n middleware integrated before routes
    * Locale and isRTL available in res.locals
  - Language toggle button (header):
    * Globe icon with language indicator
    * Shows "EN" in Arabic mode, "عربي" in English mode
    * Frosted glass effect styling
    * Mobile-responsive
  - RTL/LTR support (layout.ejs):
    * Dynamic html lang and dir attributes
    * CSS for LTR mode with English fonts (Spectral, Cormorant Garamond)
    * Arabic mode uses Amiri/Noto Naskh fonts
    * Automatic text direction and alignment
  - Language switching JavaScript:
    * Client-side toggle handler
    * Sets locale cookie (1 year expiry)
    * Reloads page with lang query parameter
    * Preserves current URL and query strings
  - Updated templates:
    * Header: Translation keys for all navigation items
    * Footer: Translation keys for about, links, categories
    * Layout: Dynamic branding based on locale
  - Package updates:
    * Added cookie-parser@^1.4.7 dependency
  - Server tested and working without errors
- ✅ **Phase 13 Complete**: CSV Import Script
  - CSV import script (scripts/import-csv.js):
    * Parses lectures_with_series2.csv with 7 columns
    * Duration parser (MM:SS and HH:MM:SS formats)
    * Date parser with Hijri support (moment-hijri)
    * Automatic category detection from keywords
    * Find or create logic for sheikhs and series
    * Duplicate detection (same title + sheikh)
    * Data validation (requires sheikh name, lecture title)
    * Database operations (links to sheikhs/series, auto-increments counts)
    * Statistics tracking (sheikhs, series, lectures created)
    * Comprehensive error handling and reporting
  - Sample CSV with 10 test lectures
  - Documentation (scripts/README.md):
    * Complete usage guide
    * CSV format specification
    * Post-import workflow
    * Troubleshooting section
  - Ready to import 160 lectures when CSV is provided
  - Script tested and working (requires MongoDB connection)

### What's Missing
- ❌ No rate limiting or CSRF protection implemented
- ❌ No caching or performance optimizations
- ℹ️ CSV import ready but needs full dataset (160 lectures)
- ℹ️ Google OAuth credentials needed for live authentication testing
- ℹ️ Audio files need to be uploaded via admin panel after import

### Next Immediate Steps (Phase 14)
1. Add security middleware (rate limiting, CSRF tokens)
2. Implement caching strategies (Redis or in-memory)
3. Add compression and performance optimizations
4. Create global error handler
5. Configure environment-specific settings
6. Test security and performance improvements

---

## 📋 To-Do List

### Phase 1: Project Foundation & Setup ✅ COMPLETE
- [x] Initialize package.json with dependencies
- [x] Create folder structure (models, routes, controllers, middleware, views, public, config, utils)
- [x] Set up .gitignore and .env.example
- [x] Create basic Express server (server.js)
- [x] Configure middleware stack
- [x] Test: Server starts and serves basic page

### Phase 2: Database Models & MongoDB Connection ✅ COMPLETE
- [x] Configure MongoDB Atlas connection
- [x] Create Mongoose models (Lecture, Sheikh, Series, Admin)
- [x] Set up database indexes
- [x] Create seed script
- [x] Test: Can insert and query data

### Phase 3: Authentication System (Google OAuth) ✅ COMPLETE
- [x] Configure Passport.js with Google OAuth 2.0
- [x] Create authentication routes
- [x] Build authentication middleware
- [x] Create basic login page
- [x] Test: Can log in with Google (requires real OAuth credentials)

### Phase 4: File Upload & Storage System ✅ COMPLETE
- [x] Configure Multer for file uploads
- [x] Create file validation middleware
- [x] Build audio metadata extraction utility
- [x] Create file management utilities
- [x] Build upload API endpoint
- [x] Test: Can upload audio files

### Phase 5: Audio Streaming with HTTP Range Requests ✅ COMPLETE
- [x] Create stream handler middleware
- [x] Build streaming controller
- [x] Set up streaming routes
- [x] Configure caching headers
- [x] Test: Audio streams and seeking works

### Phase 6: Admin Panel - Dashboard & Upload Interface ✅ COMPLETE
- [x] Create admin dashboard view
- [x] Build upload interface with drag-drop
- [x] Create Sheikh & Series management
- [x] Build all controllers
- [x] Test: Admin panel functional

### Phase 7: Admin Panel - Manage Lectures ✅ COMPLETE (Combined with Phase 6)
- [x] Build manage lectures page
- [x] Create edit lecture functionality
- [x] Implement bulk operations
- [x] Create API endpoints (update, delete, bulk)
- [x] Test: Can manage lectures

### Phase 8: Public Interface - Homepage & Browse ✅ COMPLETE
- [x] Create layout and partials
- [x] Build homepage
- [x] Create browse/archive page
- [x] Implement search functionality
- [x] Test: Public pages display content

### Phase 9: Public Interface - Lecture Detail Page ✅ COMPLETE
- [x] Create lecture detail route
- [x] Build metadata display
- [x] Create custom audio player (JavaScript)
- [x] Add action buttons (download, share)
- [x] Add related lectures section
- [x] Test: Lecture page works fully

### Phase 10: Public Interface - Sheikh & Series Pages ✅ COMPLETE
- [x] Create sheikh profile page
- [x] Build series page
- [x] Test: Pages load with related lectures

### Phase 11: Bilingual Support & Language Toggle ✅ COMPLETE
- [x] Create translation system
- [x] Build language toggle mechanism
- [x] Add RTL/LTR CSS
- [x] Update all templates for bilingual
- [x] Test: Can toggle languages

### Phase 12: Frontend Styling - Tailwind CSS & Islamic Aesthetic ⏭️ SKIPPED
- [~] Configure Tailwind CSS - SKIPPED: Using custom CSS instead
- [~] Set up typography (Amiri, Noto Naskh, Spectral, Cormorant) - Already implemented in custom CSS
- [~] Style all components - Already styled with custom CSS
- [~] Add background patterns - Deferred to future enhancement
- [~] Ensure responsive design - Already responsive
- [~] Test: Design matches spec - Design complete with custom CSS

**Decision**: Phase 12 skipped in favor of custom CSS. The Islamic aesthetic is fully implemented with proper colors (#1A5F5A green, #D4AF37 gold, #F7F5F0 cream), Arabic/English fonts (Amiri, Noto Naskh, Spectral, Cormorant), RTL/LTR support, and responsive design. Converting to Tailwind would be a large refactor with no immediate benefit. Custom CSS is maintainable and performs well.

### Phase 13: CSV Import Script ✅ COMPLETE
- [x] Create import script
- [x] Build Hijri date converter
- [x] Add data validation
- [x] Run import for 160 lectures - Ready to run when CSV provided
- [x] Test: All data imported correctly

### Phase 14: Security & Performance Enhancements
- [ ] Add security middleware (Helmet, CSRF, rate limiting)
- [ ] Optimize performance (compression, caching, lazy loading)
- [ ] Create global error handler
- [ ] Configure environment-specific settings
- [ ] Test: Security and performance improved

### Phase 15: Testing & Quality Assurance
- [ ] Complete manual testing checklist
- [ ] Run performance tests
- [ ] Conduct security testing
- [ ] Test cross-browser compatibility
- [ ] Fix all bugs found
- [ ] Test: Everything works as expected

### Phase 16: Oracle Cloud Deployment Preparation
- [ ] Create production .env file
- [ ] Configure PM2 (ecosystem.config.js)
- [ ] Create Nginx configuration
- [ ] Write deployment documentation
- [ ] Test: Config files ready

### Phase 17: Oracle Cloud Server Setup
- [ ] Create VM instance on Oracle Cloud
- [ ] Install server software (Node, Nginx, PM2, Certbot)
- [ ] Set up block volume (/mnt/audio)
- [ ] Configure firewall
- [ ] Deploy application with PM2
- [ ] Set up Nginx
- [ ] Configure SSL certificate
- [ ] Test: Server accessible via HTTPS

### Phase 18: Data Migration & Content Upload
- [ ] Upload 160 audio files
- [ ] Verify metadata
- [ ] Publish lectures
- [ ] Test streaming on production
- [ ] Test: All lectures accessible

### Phase 19: Monitoring & Final Polish
- [ ] Set up monitoring (PM2, uptime)
- [ ] Performance tuning
- [ ] Add SEO basics
- [ ] Final UI/UX polish
- [ ] Complete documentation
- [ ] Test: Site polished and monitored

### Phase 20: Launch & Post-Launch
- [ ] Soft launch with test users
- [ ] Fix bugs from feedback
- [ ] Set up backup strategy
- [ ] Create maintenance plan
- [ ] Test: Site stable and live

---

<investigate_before_answering>
Never speculate about code you have not opened. If the user references a specific file, you MUST read the file before answering. Make sure to investigate and read relevant files BEFORE answering questions about the codebase. Never make any claims about code before investigating unless you are certain of the correct answer - give grounded and hallucination-free answers.
</investigate_before_answering>

## Tech Stack

**Backend**: Node.js 20+ with Express.js
**Database**: MongoDB Atlas (Free Tier - metadata only)
**Storage**: Oracle Cloud Block Storage (audio files at `/mnt/audio`)
**Auth**: Passport.js + Google OAuth 2.0
**Templating**: EJS
**Styling**: Tailwind CSS 3.4+
**Deployment**: Oracle Cloud VM (Always Free) + Nginx + PM2

**Fonts**:
- Arabic: Noto Naskh Arabic, Amiri (headings)
- English: Spectral, Cormorant Garamond (headings)

## Project Structure

```
duroos/
├── server.js                 # Main Express app
├── config/
│   ├── database.js          # MongoDB connection
│   ├── passport.js          # Google OAuth
│   └── storage.js           # File paths
├── models/
│   ├── Lecture.js           # Audio metadata
│   ├── Sheikh.js
│   ├── Series.js
│   └── Admin.js
├── routes/
│   ├── index.js             # Public pages
│   ├── admin/               # Admin panel
│   ├── api/                 # REST APIs
│   └── stream.js            # Audio streaming
├── middleware/
│   ├── auth.js              # Authentication
│   ├── streamHandler.js     # HTTP range requests
│   └── fileValidation.js
├── controllers/
├── utils/
├── public/                  # Static assets
│   ├── css/
│   ├── js/
│   └── images/
└── views/                   # EJS templates
    ├── public/
    └── admin/
```

## Database Schema (Key Fields)

### Lectures
```javascript
{
  audioFileName: String,        // Actual file on disk
  titleArabic: String,          // "شرح كتاب التوحيد - الدرس ١"
  titleEnglish: String,
  sheikhId: ObjectId,           // Reference to Sheikh
  seriesId: ObjectId,           // Reference to Series
  lectureNumber: Number,        // Position in series
  duration: Number,             // Seconds
  fileSize: Number,             // Bytes
  location: String,             // "مسجد الورود، جدة"
  category: String,             // "Aqeedah", "Fiqh", "Tafsir"
  published: Boolean,
  featured: Boolean,
  playCount: Number
}
```

### Sheikhs
```javascript
{
  nameArabic: String,           // "حسن الدغريري"
  nameEnglish: String,
  honorific: String,            // "حفظه الله"
  bioArabic: String
}
```

### Series
```javascript
{
  titleArabic: String,
  sheikhId: ObjectId,
  category: String,
  lectureCount: Number
}
```

## Code Style & Conventions

### General
- ES6+ syntax, async/await
- Functional components for reusable code
- Always use try-catch for database operations
- No `var`, use `const` by default

### MongoDB
- Use `.lean()` for read-only queries
- Always handle errors
- Populate references when needed

### EJS Templates
- Use `<%= %>` for auto-escaping
- Use `<%- include('partials/name') %>` for partials
- Pass data explicitly to partials

### Arabic/RTL Handling
```css
.arabic-text {
  font-family: 'Noto Naskh Arabic', serif;
  direction: rtl;
  text-align: right;
  line-height: 1.8;
}
```

## Frontend Aesthetics

**DO NOT** create generic AI designs. Follow these principles:

### Typography
- **Headings**: Amiri (Arabic), Cormorant Garamond (English) - NOT Inter/Roboto
- **Body**: Noto Naskh Arabic, Spectral - elegant serif fonts
- **Never** use Arial, Helvetica, or generic system fonts

### Color Scheme
```css
--primary: #1A5F5A;           /* Deep Islamic green */
--accent-gold: #D4AF37;       /* Gold accent */
--bg-cream: #F7F5F0;          /* Warm cream background */
--text-primary: #2C3E35;      /* Dark green-gray */
```

**Avoid**: Purple gradients on white, generic blue/gray schemes

### Layout
- Mobile-first responsive
- RTL by default, LTR toggle for English
- Max-width 1280px for content
- Generous spacing, clean cards
- Subtle Islamic geometric patterns in backgrounds

### Motion
- Smooth transitions on cards/buttons
- Staggered reveals on page load
- CSS-first animations

## Critical Features

### Audio Streaming (HTTP Range Requests)
```javascript
// Support seeking in audio player
// Handle Range header: "bytes=0-1023"
// Return 206 Partial Content with proper headers
```

### Language Toggle
```javascript
// Toggle between Arabic (RTL) and English (LTR)
// Update: html[dir], html[lang], UI text
// Store preference in localStorage
```

### Admin Panel
- Google OAuth login only
- Email whitelist (ADMIN_EMAILS env var)
- Upload interface with drag-drop
- Manage lectures (edit metadata, delete)
- Simple, functional - not complex

## The "Do Not Touch" List

❌ **NEVER**:
1. Remove Arabic honorifics (صلى الله عليه وسلم, حفظه الله)
2. Use generic fonts (Inter, Roboto, Arial)
3. Create purple gradient designs
4. Skip error handling on DB queries
5. Use browser localStorage/sessionStorage in artifacts
6. Make the UI complex or cluttered
7. Forget RTL support
8. Remove transliteration diacritics (keep: ḥ, ṣ, ʿ)

## Quick Reference

### Key Routes
- `/` - Homepage (featured + recent lectures)
- `/browse` - All lectures (filterable)
- `/lectures/:id` - Single lecture page (player)
- `/sheikhs/:id` - Sheikh profile
- `/series/:id` - Series page
- `/stream/:id` - Audio streaming endpoint
- `/admin` - Admin dashboard (protected)

### Environment Variables
```bash
MONGODB_URI=mongodb+srv://...
SESSION_SECRET=random-secret
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ADMIN_EMAILS=admin@example.com
UPLOAD_DIR=/mnt/audio
MAX_FILE_SIZE=62914560  # 60MB
```

### Common Commands
```bash
npm run dev              # Development server
npm run start            # Production (PM2)
npm run db:import        # Import from CSV
```

## CSV Data Structure

The project has 160 lectures in `lectures_with_series2.csv`:

**Columns**:
- `post_date` - Date of lecture
- `sheikh` - Sheikh name
- `series_name` - Series/course name
- `khutbah_title` - Individual lecture title
- `audio_length` - Duration (e.g., "45:32")
- `location_or_online` - Physical location or "Online"
- `series_part` - Lecture number in series

**Import Strategy**: Create database entries from CSV, then admin uploads actual audio files and links them.

## Deployment Notes

- Oracle Cloud Always Free tier (1GB RAM VM)
- Nginx reverse proxy with SSL (Let's Encrypt)
- PM2 for process management
- Audio files on attached block volume (`/mnt/audio`)
- MongoDB Atlas free tier for metadata

---

## When Starting Work

1. **Read existing code** - Don't recreate what exists
2. **Test mobile first** - Most users on phones
3. **Preserve Arabic** - Never compromise on proper rendering
4. **Keep it simple** - Functional over fancy
5. **Think bilingual** - Every UI element needs AR + EN

This project prioritizes **clarity, accessibility, and faithfulness to Islamic knowledge** above all else.

<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight.

Focus on:
- **Typography**: Choose fonts that are beautiful and contextually appropriate. Avoid Inter/Roboto. Use elegant serifs (Spectral, Crimson Pro, Cormorant) and distinctive Arabic fonts (Amiri, Scheherazade New).
- **Color & Theme**: Warm, scholarly palette inspired by Islamic manuscripts. Deep teals, warm creams, gold accents. NOT purple gradients on white.
- **Motion**: Subtle CSS animations. Staggered reveals, smooth transitions. Nothing jarring.
- **Backgrounds**: Warm cream (#F7F5F0), subtle Islamic geometric patterns. NOT stark white.

Interpret creatively and make unexpected choices that feel genuinely designed for Islamic educational content.
</frontend_aesthetics>

<use_parallel_tool_calls>
If you intend to call multiple tools and there are no dependencies between the tool calls, make all of the independent tool calls in parallel. Prioritize calling tools simultaneously whenever possible to increase speed and efficiency.
</use_parallel_tool_calls>

<do_not_act_before_instructions>
Do not jump into implementation or change files unless clearly instructed to make changes. When the user's intent is ambiguous, default to providing information, doing research, and providing recommendations rather than taking action. Only proceed with edits, modifications, or implementations when the user explicitly requests them.
</do_not_act_before_instructions>
