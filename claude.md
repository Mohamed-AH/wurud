# Islamic Audio Lectures Platform - Claude Instructions

<project_overview>
A web platform for hosting and streaming ~160 Arabic Islamic lecture audio files. Users can browse, stream, and download lectures. Admin can upload and manage content via Google OAuth-protected panel.

**Core Mission**: Make Islamic knowledge accessible through high-quality audio lectures with an Arabic-first, mobile-optimized interface.

**Data**: ~160 lectures (~3.4GB total), organized by sheikh and series, hosted on Oracle Cloud Object Storage.
</project_overview>

---

## 📌 Project State

**Current Phase**: LIVE - Security & Content Updates
**Last Updated**: 2026-02-03
**Active Branch**: `claude/fix-homepage-tests-ovChk`
**Live URL**: https://rasmihassan.com
**Status**: 🚀 **PRODUCTION LIVE** - Google Search Console verified, indexing in progress

### ✅ SITE IS NOW LIVE

The Sheikh Hasan Dhaghriri Islamic lectures platform is now live at **rasmihassan.com** with:
- ✅ All lectures streaming from Oracle Cloud Object Storage
- ✅ Mobile-optimized responsive design
- ✅ Bilingual support (Arabic/English)
- ✅ SEO fully implemented
- ✅ Branding updated to Sheikh Hasan Dhaghriri

### ✅ SEO Implementation Complete

**Meta Tags & Open Graph:**
- Description, keywords, author, robots meta tags
- Open Graph tags for Facebook sharing
- Twitter Cards for Twitter sharing
- Canonical URLs for all pages

**Structured Data (JSON-LD):**
- WebSite schema with search potential
- Person schema for Sheikh Hasan Dhaghriri
- sameAs linking to Telegram channel

**Search Engine Optimization:**
- Dynamic `/sitemap.xml` route (all lectures, series, sheikh pages)
- `/robots.txt` route with proper directives
- Google Search Console ready for verification

**Key Files:**
- `views/layout.ejs` - SEO meta tags, JSON-LD schemas
- `routes/index.js` - sitemap.xml, robots.txt routes
- `utils/i18n.js` - currentPath for canonical URLs

### ✅ Mobile UI Refinements Complete

All mobile issues have been fixed:
1. ✅ **Main Page Title** - Proper scaling with responsive CSS
2. ✅ **Language Selector** - Anchored in header corner, row layout
3. ✅ **Player Touch Isolation** - Touch events don't scroll background
4. ✅ **Playback Controls** - Clear SVG skip icons with "15" indicator
5. ✅ **Download Button** - Polished with centered SVG icon

### ✅ Branding Updates

- Header: "موقع الشيخ حسن الدغريري" / "Sheikh Hasan Dhaghriri"
- Footer: Sheikh bio, Telegram link (t.me/daririhasan), location
- Title tag: Matches header branding
- Copyright: Sheikh Hasan bin Mohamed Dhaghriri

### ✅ Hijri Date Display

- Arabic numeral formatting (٢٨ / ٧ / ١٤٤٧)
- `toArabicNumerals()` utility function
- `formatHijriDate()` for proper formatting
- Displayed on lecture cards using `dateRecordedHijri`

### ✅ Recently Completed

- **SEO Implementation** - Full meta tags, JSON-LD, sitemap, robots.txt
- **Branding Update** - Sheikh Hasan Dhaghriri across site
- **Hijri Date Display** - Arabic numerals in lecture cards
- **Mobile UI Polish** - All touch/display issues fixed
- **OCI Integration** - Audio streaming from Oracle Cloud Object Storage
- **Audio Optimization** - HE-AAC encoding, silence trimming
- **Render Deployment** - Production on Frankfurt region
- **Bulk Audio Scripts** - fix-lectures-audio.js, update-two-lectures.js

---

## 📋 ROADMAP (Prioritized To-Do List)

### Priority 1: CRITICAL

#### 1.1 Security Audit ⬜ NOT STARTED
**Priority**: HIGHEST | **Status**: Pending

- [ ] Review authentication (Google OAuth, session handling)
- [ ] Check for XSS vulnerabilities in user inputs
- [ ] Audit file upload validation
- [ ] Review MongoDB injection prevention
- [ ] Check admin route protection
- [ ] Review OCI access controls
- [ ] Add rate limiting to API endpoints
- [ ] Implement CSRF protection
- [ ] Audit environment variable handling

#### 1.2 Content: October to Present ⬜ NOT STARTED
**Priority**: HIGH | **Status**: Pending

- [ ] Identify all lectures from October 2025 to present
- [ ] Process audio files (HE-AAC encoding, silence trimming)
- [ ] Upload to OCI bucket
- [ ] Add metadata to MongoDB
- [ ] Verify streaming works

#### 1.3 Content: Online Classes ⬜ NOT STARTED
**Priority**: HIGH | **Status**: Pending

- [ ] Identify online class recordings
- [ ] Determine format differences from in-person lectures
- [ ] Process and upload audio files
- [ ] Add appropriate metadata/category tagging

---

### Priority 2: HIGH

#### 2.1 Content: Pre-October Archive ⬜ NOT STARTED
**Priority**: MEDIUM-HIGH | **Status**: Pending

- [ ] Inventory all pre-October lectures
- [ ] Batch process audio files
- [ ] Upload to OCI
- [ ] Import metadata to MongoDB

#### 2.2 Arabic Slugs (SEO URLs) ⬜ NOT STARTED
**Priority**: MEDIUM-HIGH | **Status**: Pending

- [ ] Add `slug` field to Lecture, Series, Sheikh models
- [ ] Generate Arabic slugs from titles
- [ ] Update routes to support both ID and slug lookup
- [ ] Add redirects from old URLs to new slugs
- [ ] Update sitemap to use slugs
- [ ] Update internal links

**Example**: `/lectures/6975bc...` → `/lectures/شرح-كتاب-التوحيد-الدرس-١`

---

### Priority 3: MEDIUM

#### 3.1 Performance Optimizations ⬜ NOT STARTED
**Priority**: MEDIUM | **Status**: Pending

- [ ] Implement server-side caching
- [ ] Add lazy loading for lecture cards
- [ ] Optimize database queries (indexes, projections)
- [ ] Implement CDN for static assets
- [ ] Add service worker for offline support
- [ ] Bundle/minify CSS and JS

#### 3.2 Admin Panel - Arabic Version ⬜ NOT STARTED
**Priority**: MEDIUM | **Status**: Pending

- [ ] Add RTL layout support to admin pages
- [ ] Translate admin UI strings
- [ ] Add language toggle to admin panel
- [ ] Ensure form inputs work with Arabic text

---

### Priority 4: FUTURE (Major Features)

#### 4.1 Transcript Search with Timestamps ⬜ NOT STARTED
**Priority**: LOWER | **Status**: Future

**Phase A - Transcription:**
- [ ] Choose transcription service (Whisper API, etc.)
- [ ] Process all audio files
- [ ] Store transcripts with timestamps

**Phase B - Search:**
- [ ] Implement full-text search
- [ ] Build search UI with timestamp results
- [ ] Add "jump to timestamp" in player

**Phase C - Display:**
- [ ] Show transcript alongside player
- [ ] Highlight current spoken text

#### 4.2 English Version of Site ⬜ NOT STARTED
**Priority**: LOWER | **Status**: Future

- [ ] Add English translations for lecture metadata
- [ ] Consider separate English landing page
- [ ] Update SEO for English keywords

---

### ✅ COMPLETED

- [x] **Google Search Console** - Verified, indexing in progress
- [x] **SEO Implementation** - Meta tags, JSON-LD, sitemap, robots.txt
- [x] **Branding** - Sheikh Hasan Dhaghriri across site
- [x] **Hijri Date Display** - Arabic numerals
- [x] **Mobile UI Polish** - All issues fixed
- [x] **OCI Integration** - Audio streaming working
- [x] **Production Deployment** - Live at rasmihassan.com

### 🎨 Active Branch: `claude/new-design-usy2P` (Brown/Gold Scholarly Design)

**Design Status**: ✅ DESIGN_CRITIQUE.md COMPLETE
**Design**: Warm scholarly brown (#2C1810, #5C4033) and gold (#C19A6B) manuscript aesthetic
**Fonts**: Scheherazade New (display) + Noto Naskh Arabic (body)

### ✅ **COMPLETED** (All Design Specifications Met):

**Sticky Audio Player** ✅:
- ✅ Global bottom player component (`views/partials/audioPlayer.ejs`)
- ✅ Full JavaScript logic (`public/js/audioPlayer.js`)
- ✅ Brown/gold styling matching design (`public/css/audioPlayer.css`)
- ✅ Play/pause, seek, volume, speed controls (0.5x-2x)
- ✅ Skip ±15 seconds with keyboard shortcuts
- ✅ LocalStorage for resume position, volume, speed
- ✅ Download button for current track
- ✅ Now playing display (title + sheikh)
- ✅ HTTP Range request support for seeking
- ✅ Mobile responsive design
- ✅ Integrated into layout and connected to homepage

**Bulk Upload Feature** ✅:
- ✅ Admin interface (`views/admin/bulk-upload.ejs`)
- ✅ Statistics dashboard (Total/With Audio/Missing)
- ✅ Drag & drop multiple files
- ✅ Auto-matching by filename similarity
- ✅ Manual lecture selection dropdowns
- ✅ Upload all with progress tracking
- ✅ Search/filter lectures without audio
- ✅ API endpoint for bulk upload
- ⚠️ Note: Shows incorrect counts due to bad data (see Data Issues below)

**Homepage (`/`) - FULLY FUNCTIONAL**:
- ✅ Brown→Sage gradient hero with bismillah watermark (﷽)
- ✅ 36px hero quote in Scheherazade New with text shadow
- ✅ Cream search input (#F5EBE0) with 3px gold border
- ✅ Filter section with cream background, gold active chips
- ✅ Series cards with:
  - ✅ Cream background (#F5EBE0)
  - ✅ 3px amber border (#D4A574), 16px radius
  - ✅ 6px vertical gold accent bar with gradient
  - ✅ 24px Scheherazade New series title
  - ✅ **18px gold author names** (CRITICAL FIX ✅)
  - ✅ Gradient header background
  - ✅ Expandable lecture lists
- ✅ Episode items with:
  - ✅ 32px gold rounded number badges
  - ✅ Solid gold play buttons with shadow
  - ✅ Outlined gold download buttons
  - ✅ 24px padding, 2px borders
- ✅ Search functionality (client-side, live filtering)
- ✅ Category filtering (All, Fiqh, Aqeedah, Tafsir, etc.)
- ✅ Language toggle (Arabic ⟷ English) with cookie persistence
- ✅ Mobile responsive design
- ✅ All 162 lectures displayed in 13 series

**Backend Infrastructure**:
- ✅ MongoDB Atlas connected (162 lectures imported from Excel)
- ✅ HTTP Range request streaming (seeking supported)
- ✅ Download controller with proper headers
- ✅ Google OAuth admin authentication
- ✅ File upload system (Multer)
- ✅ Series/Sheikh/Lecture models with relationships

**Fixed Issues**:
- ✅ CSS extractScripts/extractStyles disabled (was blocking rendering)
- ✅ --space-3xl variable added
- ✅ Main padding removed
- ✅ All debug code removed

### ❌ **DATA ISSUES - CRITICAL**:

1. **Incorrect Data Import** (HIGHEST PRIORITY)
   - 162 lectures imported with wrong structure:
     - ❌ Titles use `Serial` instead of `SeriesName`
     - ❌ `audioFileName` set even though files don't exist
     - ❌ Only created series for `Type==='Series'`
     - ❌ No file existence tracking
   - **Fixed Scripts Created**:
     - ✅ `scripts/cleanup-bad-data.js` - Delete bad data
     - ✅ `scripts/import-excel-fixed.js` - Correct import with TEST_MODE
   - **Blocked by**: MongoDB connectivity issue (see above)
   - **See**: `DATA_MIGRATION_GUIDE.md` for complete plan

2. **Other Public Pages** (Need New Design)
   - `/lectures/:id` - Lecture detail page
   - `/browse` - Browse all lectures
   - `/sheikhs/:id` - Sheikh profile
   - `/series/:id` - Series detail
   - All exist with old design, need brown/gold makeover

3. **Audio File Verification**
   - `/uploads` directory status unknown
   - Need to verify streaming endpoints work with real files

### 🌿 Old Branch: `claude/review-claude-md-usy2P` (Green/Gold Design)

**Status**: ✅ Fully functional but OLD DESIGN
**Decision**: Archived - Not returning to this design
**Note**: Kept for reference only

---

### What We Have (Common to Both Branches)
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
- ✅ **Local Testing Setup** (2026-01-21):
  - npm dependencies installed (189 packages)
  - MongoDB Atlas connection string configured in .env
  - test-mongodb.js script created for connection testing
  - Folder structure created (public/css, public/js, public/images, uploads)
  - MongoDB connection verified via Compass (string works correctly)
  - Ready for local server testing on user's PC

### What's Missing
- ❌ No rate limiting or CSRF protection implemented
- ❌ No caching or performance optimizations
- ❌ Local server testing not yet completed (user needs to run on their PC)
- ℹ️ CSV import ready but needs full dataset (160 lectures)
- ℹ️ Google OAuth credentials needed for live authentication testing
- ℹ️ Audio files need to be uploaded via admin panel after import
- ℹ️ No sample data in database yet (seed script available)

---

## 🎯 IMPLEMENTATION PLAN - Make Site Fully Functional

**Last Updated**: 2026-01-22 (Evening)
**Goal**: Complete MVP with sticky audio player and all pages functional

### PHASE 1: STICKY AUDIO PLAYER ✅ **COMPLETE**
**Priority**: HIGHEST | **Status**: ✅ COMPLETE (2026-01-25)

#### Deliverables:
1. ✅ Created `/views/partials/audioPlayer.ejs` - Global player component
2. ✅ Created `/public/js/audioPlayer.js` - Player logic (367 lines)
3. ✅ Created `/public/css/audioPlayer.css` - Brown/gold styling (371 lines)
4. ✅ Modified `/views/layout.ejs` - Included player partial
5. ✅ Modified `/views/public/index.ejs` - Connected play buttons to player

#### Features Implemented:
- ✅ Play/pause with live progress bar
- ✅ Seek bar with HTTP Range support
- ✅ Volume control + mute
- ✅ Playback speed (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
- ✅ Skip ±15 seconds with keyboard shortcuts
- ✅ Now playing: lecture title + sheikh
- ✅ Download current track button
- ✅ LocalStorage: resume position, volume, speed
- ✅ Fixed bottom position, responsive
- ✅ Brown/gold design matching homepage

**Success**: ✅ Click "Play" button → Audio plays in sticky bottom player

**Next**: Phase 1A - Data Migration (see below)

---

### PHASE 1A: DATA MIGRATION ⚠️ **BLOCKED - CRITICAL**
**Priority**: CRITICAL | **Status**: ⚠️ BLOCKED by MongoDB connectivity

#### Problem Identified:
The original import script (`scripts/import-excel.js`) has critical bugs:
1. ❌ Uses `Serial` as title instead of `SeriesName` (line 238)
2. ❌ Only creates series if `Type === 'Series'` (line 171)
3. ❌ Sets `audioFileName` even though files don't exist (line 242)
4. ❌ No file existence tracking

**Result**: 162 lectures in MongoDB have incorrect structure:
- Titles show "Not Available" instead of actual series names
- `audioFileName` populated but files don't exist on disk
- Bulk upload thinks files exist when they don't

#### Solutions Created:
1. ✅ **cleanup-bad-data.js** - Removes all incorrectly imported data
   - Shows preview of bad data
   - Requires `CONFIRM_DELETE=yes` to run
   - Preserves sheikhs, deletes lectures and series

2. ✅ **import-excel-fixed.js** - Correct import logic
   - Uses `SeriesName` as primary title (not `Serial`)
   - Only appends serial number for `Type === 'Series'`
   - Checks file existence before setting `audioFileName`
   - Adds `metadata` field for Excel data tracking
   - Supports `TEST_MODE=yes` for testing first 10 records

3. ✅ **DATA_MIGRATION_GUIDE.md** - Complete migration plan
   - Step-by-step instructions
   - Data structure reference
   - Troubleshooting guide

#### Migration Steps (When MongoDB is Accessible):
1. Run: `node scripts/cleanup-bad-data.js` (preview)
2. Run: `CONFIRM_DELETE=yes node scripts/cleanup-bad-data.js`
3. Test: `TEST_MODE=yes node scripts/import-excel-fixed.js`
4. Verify test data structure
5. Clean test: `CONFIRM_DELETE=yes node scripts/cleanup-bad-data.js`
6. Full import: `node scripts/import-excel-fixed.js`
7. Verify bulk upload shows correct counts

**Blocker**: ⚠️ Cannot connect to MongoDB Atlas
```
Error: querySrv ECONNREFUSED _mongodb._tcp.cluster0.abhqc.mongodb.net
```

**Required Action**:
- Resolve network/DNS connectivity to MongoDB Atlas
- See troubleshooting in `DATA_MIGRATION_GUIDE.md`

**Files**:
- `scripts/cleanup-bad-data.js` (new)
- `scripts/import-excel-fixed.js` (modified with TEST_MODE)
- `DATA_MIGRATION_GUIDE.md` (new documentation)

---

### PHASE 2: CONTENT PAGES - NEW DESIGN
**Priority**: HIGH | **Est. Time**: 2-3 days | **Status**: Not Started

#### 2.1 Lecture Detail Page (`/lectures/:id`)
**File**: `views/public/lecture.ejs`
- Remove inline audio player, use sticky player
- Apply brown/gold color scheme
- Scheherazade New headings
- Cream background cards
- Large "Play" button using sticky player
- Related lectures at bottom
**Complexity**: MEDIUM (template exists, needs restyling)

#### 2.2 Browse Page (`/browse`)
**File**: `views/public/browse.ejs`
- Brown/gold color scheme
- Filter chips matching homepage
- Cream background
- Lecture cards matching series cards style
- Integrate sticky player
**Complexity**: MEDIUM

#### 2.3 Sheikh Profile (`/sheikhs/:id`)
**File**: `views/public/sheikh.ejs`
- Scheherazade New for sheikh name
- Brown/gold styled bio section
- Series cards matching homepage
- Lecture list using sticky player
**Complexity**: MEDIUM

#### 2.4 Series Detail (`/series/:id`)
**File**: `views/public/series-detail.ejs`
- Minimal page (homepage already shows expandable series)
- Apply new design
- Option to redirect to homepage with auto-expand
**Complexity**: LOW

**Success Criteria**: All public pages match brown/gold design, use sticky player

---

### PHASE 3: ADMIN PANEL TESTING
**Priority**: MEDIUM | **Est. Time**: 1-2 days | **Status**: Not Started

#### Tasks:
1. Test admin dashboard displays correct stats
2. Verify file upload works (upload test MP3)
3. Test edit lecture metadata
4. Test delete lecture (+ file cleanup)
5. Test publish/unpublish toggle
6. Optional: Apply brown/gold theme to admin panel

**Files to Test**:
- `views/admin/dashboard.ejs`
- `views/admin/upload.ejs`
- `views/admin/manage.ejs`
- `routes/admin/index.js`

**Success Criteria**: Can upload, edit, delete lectures via admin panel

---

### PHASE 4: MISSING FEATURES & POLISH
**Priority**: MEDIUM | **Est. Time**: 1-2 days | **Status**: Not Started

#### 4.1 Verify Audio File Storage
- Check `/uploads` directory (might be empty/gitignored)
- Verify `process.env.UPLOAD_DIR` config
- Test upload + streaming with real file
- Document storage location

#### 4.2 Download Functionality
- Test download buttons work
- Verify proper filename
- Confirm download count increments

#### 4.3 Share Functionality (Optional)
- Add share buttons to lecture pages
- WhatsApp, Telegram, Copy link
- Web Share API for mobile

#### 4.4 Analytics
- Verify play count increments
- Optional: Admin analytics dashboard

**Success Criteria**: All features work end-to-end

---

### PHASE 5: TESTING & OPTIMIZATION
**Priority**: HIGH | **Est. Time**: 1-2 days | **Status**: Not Started

#### 5.1 Cross-Browser Testing
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Mobile)
- RTL text rendering
- Audio playback compatibility

#### 5.2 Mobile Responsiveness
- Test all pages on mobile
- Sticky player mobile controls
- Touch gestures

#### 5.3 Performance
- gzip compression (already enabled)
- Lazy load lecture cards
- Test streaming performance
- Service worker (optional)

#### 5.4 Accessibility
- Keyboard navigation
- ARIA labels
- Screen reader support

#### 5.5 Security
- Test Google OAuth
- File access permissions
- XSS prevention
- Upload restrictions

**Success Criteria**: Production-ready platform

---

## 📋 Quick To-Do List (Prioritized)

### Week 1 - Core Functionality
- [ ] **Day 1-2**: Create sticky audio player component
- [ ] **Day 2-3**: Implement player JavaScript logic
- [ ] **Day 3**: Connect homepage play buttons to player
- [ ] **Day 4**: Test audio streaming with player
- [ ] **Day 5**: Redesign lecture detail page

### Week 2 - Content Pages
- [ ] **Day 1**: Redesign browse page
- [ ] **Day 2**: Redesign sheikh/series pages
- [ ] **Day 3**: Test admin panel
- [ ] **Day 4**: Verify file upload/download
- [ ] **Day 5**: Polish and bug fixes

### Week 3 - Testing & Launch Prep
- [ ] **Day 1-2**: Cross-browser testing
- [ ] **Day 3**: Mobile testing
- [ ] **Day 4**: Performance optimization
- [ ] **Day 5**: Documentation and deployment prep

---

## 🎯 MVP Definition (Minimum Viable Product)

**Must Have**:
- ✅ Homepage with series cards (DONE)
- [ ] Sticky audio player (IN PROGRESS)
- [ ] Audio streaming works
- [ ] At least lecture detail page redesigned
- [ ] Downloads work
- [ ] Mobile responsive

**Should Have**:
- [ ] All public pages match new design
- [ ] Admin panel tested
- [ ] Cross-browser compatible

**Nice to Have**:
- [ ] Play queue/playlist
- [ ] Resume from last position (per lecture)
- [ ] Share functionality
- [ ] PWA installation

---

## 📊 Progress Tracking

### Overall Completion: ~95%

**Completed** (95%):
- ✅ Homepage design (100%)
- ✅ Backend infrastructure (100%)
- ✅ Data import (100%)
- ✅ Database setup (100%)
- ✅ Audio player (100%)
- ✅ Content pages (100%)
- ✅ Mobile optimization (100%)
- ✅ SEO implementation (100%)
- ✅ OCI audio hosting (100%)
- ✅ Production deployment (100%)

**Remaining** (5%):
- [ ] Google Search Console verification
- [ ] Analytics monitoring setup
- [ ] Arabic URL slugs (future enhancement)

**Site Status**: 🚀 **LIVE at rasmihassan.com**

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

**Current Production Setup:**
- **Web Hosting**: Render.com (Frankfurt region)
- **Audio Storage**: Oracle Cloud Object Storage (Jeddah region)
- **Database**: MongoDB Atlas
- **Domain**: rasmihassan.com (Cloudflare DNS)
- **SSL**: Automatic via Render

**OCI Object Storage:**
- Bucket: `wurud-audio`
- Region: `me-jeddah-1`
- Public access for audio streaming
- ~3.4GB of HE-AAC optimized audio files

**Audio File Matching:**
- Lectures match OCI files via `metadata.excelFilename` field
- Admin bulk upload uses filename similarity matching

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
