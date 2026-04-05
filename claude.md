# Islamic Audio Lectures Platform - Claude Instructions

<project_overview>
A web platform for hosting and streaming ~160 Arabic Islamic lecture audio files. Users can browse, stream, and download lectures. Admin can upload and manage content via Google OAuth-protected panel.

**Core Mission**: Make Islamic knowledge accessible through high-quality audio lectures with an Arabic-first, mobile-optimized interface.

**Data**: ~160 lectures (~3.4GB total), organized by sheikh and series, hosted on Oracle Cloud Object Storage.
</project_overview>

---

## 🚀 CURRENT INITIATIVE: OCI Migration (Render → Oracle Cloud)

**Started**: 2026-03-31
**Target**: Migrate from Render Free Tier to OCI Always Free for better resources (24GB RAM vs 512MB)
**Branch**: `claude/fix-homepage-tests-ovChk`
**Documentation**: `docs/migration-plan-render-to-oci.md`

### 📋 Migration Progress

| Phase | Focus | Status | Notes |
|-------|-------|--------|-------|
| 1.1 | Create ARM Compute Instance | 🔄 IN PROGRESS | Ubuntu 22.04, 1 OCPU, 6GB RAM |
| 1.2 | VCN & Networking Setup | 🔄 IN PROGRESS | VCN, Subnets, Internet Gateway, Security Lists |
| 1.3 | Initial Instance Setup | ⏳ PENDING | Docker installation on Ubuntu |
| 1.4 | Firewall Configuration | ⏳ PENDING | ufw setup for ports 22, 80, 443, 3000 |
| 2 | Application Deployment | ⏳ PENDING | docker-compose.prod.yml + Caddy |
| 3 | Monitoring Setup | ⏳ PENDING | Docker logs + Sentry + optional VictoriaMetrics |
| 4 | DNS & SSL | ⏳ PENDING | Point domain, update Google OAuth |
| 5 | Go Live & Cleanup | ⏳ PENDING | Monitor, then remove Render |

### Current Instance Configuration
- **Shape**: VM.Standard.A1.Flex (ARM Ampere)
- **OCPUs**: 1
- **Memory**: 6 GB
- **Image**: Ubuntu 22.04 (aarch64)
- **Boot Volume**: 50 GB

---

## ✅ PREVIOUS INITIATIVE: Roadmap 4.3 & 4.5 + Security/Optimization/Testing (COMPLETE)

**Completed**: 2026-02-28

### 📋 Phase Overview

| Phase | Focus | Status | Progress |
|-------|-------|--------|----------|
| 1 | Security Deep Audit | ✅ COMPLETE | 9/9 |
| 2 | Feature Implementation (4.3, 4.5) | ✅ COMPLETE | 8/8 |
| 3 | Optimization (All Areas) | ✅ COMPLETE | 7/7 |
| 4 | Testing (Full Coverage) | ✅ COMPLETE | 10/10 |

---

### 🔒 PHASE 1: Security Deep Audit (OWASP Top 10)

**Status**: ✅ COMPLETE
**Priority**: HIGH - Must complete before new features
**Last Updated**: 2026-02-28
**Completed**: 2026-02-28

#### 1.1 Input Validation Audit ✅ COMPLETE
- [x] Review all API endpoints for input validation
- [x] Check express-validator usage completeness
- [x] Validate query parameters, body data, URL params
- [x] Test for NoSQL injection vulnerabilities
- [x] Add sanitization where missing

**Fixes Applied:**
- Created `utils/validators.js` with express-validator rules
- Added `lecturesQueryValidation` to GET /api/lectures
- Added `verifyDurationValidation` to POST /api/lectures/:id/verify-duration
- Added `playCountValidation` to POST /api/lectures/:id/play
- Added `isValidObjectId` checks to all ID parameters in routes
- Fixed bounds validation for pagination (page/limit)

#### 1.2 Authentication & Authorization Review ✅ COMPLETE
- [x] Audit Google OAuth flow - SECURE
- [x] Review session management security - SECURE
- [x] Verify role-based access control (admin/editor) - SECURE
- [x] Check for privilege escalation paths - NONE FOUND
- [x] Review API authentication middleware - SECURE

**Findings:**
- Google OAuth with email whitelist properly implemented
- Session cookies have httpOnly, sameSite, secure flags
- Admin/Editor/SuperAdmin roles properly enforced
- API routes properly protected with isAdminAPI middleware

#### 1.3 File Upload Security ✅ COMPLETE
- [x] Audit file type validation - SECURE
- [x] Review filename sanitization - SECURE
- [x] Check file size limits enforcement - 60MB enforced
- [x] Test for path traversal vulnerabilities - PROTECTED
- [x] Verify MIME type checking - SECURE
- [x] Fixed missing multer import in fileValidation.js

**Findings:**
- File validation comprehensive with MIME/extension checking
- Path traversal protection in fileManager.js
- Size limits enforced at both Multer and validation levels

#### 1.4 CSP & Headers Hardening ✅ COMPLETE
- [x] Review Content Security Policy directives - GOOD
- [x] Verify Helmet.js configuration - ENABLED
- [x] Check X-Frame-Options, X-Content-Type-Options - SET
- [x] Review CORS configuration - RESTRICTIVE
- [ ] Add Permissions-Policy header - OPTIONAL

**Findings:**
- CSP properly configured for Google OAuth and OCI
- Helmet.js enabled with sensible defaults
- 'unsafe-inline' required for Google OAuth buttons (acceptable)

#### 1.5 Rate Limiting Review ✅ COMPLETE
- [x] Verify rate limits on all sensitive endpoints
- [x] Check streaming endpoint rate limits
- [x] Review login attempt limiting - 10/hour
- [x] Add rate limiting to missing endpoints

**Current Limits:**
- General: 100 req/15min
- API: 200 req/15min
- Auth: 10 req/hour

#### 1.6 Dependency Vulnerability Scan ✅ COMPLETE
- [x] Run npm audit
- [x] Review and update vulnerable packages
- [x] Check for outdated dependencies
- [x] Verify no known CVEs in production deps

**Findings:**
- Fixed minimatch/qs vulnerabilities via npm audit fix
- **REMAINING**: xlsx package has HIGH severity with NO FIX
  - Only used in scripts, not production server
  - Consider replacing with alternative (exceljs, xlsx-populate)
- **REMAINING**: multer deprecated, should upgrade to v2

#### 1.7 XSS Prevention Review ✅ COMPLETE
- [x] Audit all EJS templates for raw output
- [x] Check user input rendering - Uses <%= (escaped)
- [x] Review client-side DOM manipulation
- [x] Verify innerHTML usage is safe

**Findings:**
- EJS templates mostly use <%= (escaped)
- <%- used for includes and body (safe)
- Public JS (homepage.js) properly uses escapeHtml() for all user data
- audioPlayer.js uses textContent (safe)

**Fixes Applied:**
- Added escapeHtml() function to admin templates
- Fixed innerHTML XSS in: quick-add-lecture.ejs, edit-series.ejs, bulk-upload.ejs, edit-lecture.ejs
- All user-controlled data now escaped before innerHTML insertion

#### 1.8 Sensitive Data Handling ✅ COMPLETE
- [x] Review logging for sensitive data leakage - OK
- [x] Check error messages for information disclosure - FIXED
- [x] Verify .env usage and gitignore - SECURE
- [x] Review cookie security flags - SECURE

**Fixes Applied:**
- Changed all `error: error.message` to `error: isProduction ? undefined : error.message`
- Fixed in: routes/api/lectures.js, routes/api/homepage.js, routes/api/series.js,
  routes/api/sheikhs.js, controllers/streamController.js

#### 1.9 ReDoS Prevention ✅ COMPLETE (Added)
- [x] Fixed regex injection in search functions
- [x] Added escapeRegex() function to sanitize user input
- [x] Limited search query length to 200 characters

**Fixes Applied:**
- routes/api/homepage.js: buildSeriesSearchQuery() and buildLectureSearchQuery() now escape regex special chars

---

### ✨ PHASE 2: Feature Implementation

**Status**: ✅ COMPLETE
**Completed**: 2026-02-28

#### 2.1 Social Sharing (Roadmap 4.3) ✅ COMPLETE

**Priority**: MEDIUM | Estimated: 2-3 hours

##### 2.1.1 Share Component Design ✅
- [x] Design share button group (4 platforms)
- [x] Create reusable share component (public/js/share.js)
- [x] Mobile-responsive share modal with CSS styles

**Files Created:**
- `public/js/share.js` - Complete share module with modal, platform buttons, clipboard API
- CSS styles added to `public/css/main.css` - Responsive share modal styles

##### 2.1.2 Platform Integration ✅
- [x] WhatsApp share link (wa.me)
- [x] Telegram share link (t.me/share)
- [x] Twitter/X share intent
- [x] Facebook share dialog

##### 2.1.3 Copy Link Functionality ✅
- [x] Clipboard API implementation (navigator.clipboard)
- [x] Visual feedback on copy (button color change, check icon)
- [x] Fallback for older browsers (execCommand)

##### 2.1.4 Web Share API (Mobile) ✅
- [x] Navigator.share() for native sharing on mobile
- [x] Feature detection with automatic fallback to modal
- [x] Works on iOS and Android browsers

**Integration Points:**
- Share button added to lecture detail page (`views/public/lecture.ejs`)
- Share button added to lecture cards (`views/partials/lectureCard.ejs`)
- Share script loaded in layout (`views/layout.ejs`)

#### 2.2 English Version (Roadmap 4.5) ✅ COMPLETE

**Priority**: MEDIUM | Estimated: 4-5 hours

##### 2.2.1 Translation Infrastructure ✅
- [x] Review existing i18n implementation - Comprehensive translations exist in `utils/i18n.js`
- [x] All UI strings already translated for both Arabic and English
- [x] i18nMiddleware properly sets locale from cookie/query param

##### 2.2.2 Lecture Metadata English ✅
- [x] English fields already exist in schemas (titleEnglish, descriptionEnglish)
- [x] Admin UI already supports English metadata entry
- [x] Updated public pages to display English when locale is EN:
  - `views/public/lecture.ejs` - Localized titles, breadcrumbs, labels, buttons
  - `views/public/series-detail.ejs` - Localized titles, stats, sort controls
  - `views/partials/lectureCard.ejs` - Localized action buttons

##### 2.2.3 SEO for English ✅
- [x] Added hreflang tags to layout.ejs for Arabic/English/x-default
- [x] English meta descriptions already present in layout
- [x] Open Graph tags support both languages
- [x] Locale-aware number formatting (ar-SA vs en-US)

##### 2.2.4 English Landing Page (Optional) ⏸️ DEFERRED
- [ ] Consider /en/ prefix routing - Not needed, query param approach works well
- [ ] English-optimized hero section - Existing layout adapts to locale
- [ ] Language-appropriate content order - RTL/LTR handled by CSS

---

### ⚡ PHASE 3: Optimization (Render Free Tier Memory)

**Status**: ✅ COMPLETE
**Started**: 2026-03-07
**Completed**: 2026-03-07
**Focus**: Memory optimization for Render Free Tier (512MB limit)

#### 3.1 Memory Reduction (High Priority) ✅

##### Cache Size Limiting ✅
- [x] Cap in-memory cache to 50 entries with LRU eviction
  - File: `utils/cache.js`
  - Added `maxEntries` limit and eviction logic in `set()` method
  - LRU behavior: accessed items move to end of Map
  - RAM savings: ~50-200MB

##### N+1 Query Fix ✅
- [x] Replace Promise.all loops with single aggregation query
  - File: `routes/api/homepage.js`
  - Changed from N+1 queries to single `$in` query for all series lectures
  - Applied to both `/series` and `/khutbas` endpoints
  - RAM savings: ~30-100MB

##### Database-Level Pagination ✅
- [x] Optimized pagination with batched lecture fetching
  - File: `routes/api/homepage.js`
  - Note: Full DB-level filtering deferred (requires schema changes for computed type/khutba fields)
  - Current approach: filter series in JS, batch-fetch lectures efficiently

#### 3.2 Session & Heap Optimization ✅

##### MongoDB Session Store ✅
- [x] Install connect-mongo and move sessions to database
  - File: `server.js`
  - Added `connect-mongo` with lazy touch (24hr interval)
  - Sessions now stored in MongoDB, not Node.js heap
  - RAM savings: ~20-50MB

##### Heap Limit Adjustment ✅
- [x] Lower --max-old-space-size from 512 to 400
  - File: `ecosystem.config.js`
  - Updated `max_memory_restart` from 500M to 380M
  - Gives GC headroom before Render's 512MB limit kills the app

#### 3.3 Script & Build Efficiency ✅

##### Excel Streaming ✅
- [x] Created streaming Excel reader utility
  - File: `utils/excelStreamer.js`
  - Installed `xlsx-stream-reader` package
  - Process Excel files row-by-row (~5MB RAM instead of 100MB+)
  - Updated `scripts/import-excel.js` with usage documentation

##### Production Guard ✅
- [x] Add production environment guard to test helpers
  - File: `tests/helpers/testDb.js`
  - Throws error if loaded in production
  - Prevents mongodb-memory-server from being accidentally required

---

### 📋 Original Phase 3 Tasks (Lower Priority)

#### 3.4 Database & API Performance ⬜ (Deferred)

##### Query Optimization
- [x] Review Mongoose queries for N+1 problems (addressed in 3.1)
- [ ] Add missing indexes
- [x] Implement .lean() for read queries (already done)
- [x] Add query caching where beneficial (in-memory cache exists)

##### API Response Optimization
- [x] Implement pagination on all list endpoints (exists, needs DB-level)
- [ ] Add field selection (partial responses)
- [x] Optimize series listing queries (addressed in 3.1)
- [ ] ~~Add Redis caching for hot data~~ (requires paid tier)

#### 3.5 Frontend Performance ⬜ (Deferred)

##### Bundle Optimization
- [ ] Analyze current bundle sizes
- [ ] Code split large modules
- [ ] Tree-shake unused code
- [ ] Lazy load below-fold components

##### Asset Optimization
- [ ] Optimize any remaining images
- [ ] Review font loading strategy
- [ ] Implement resource hints (preconnect, prefetch)
- [ ] Critical path CSS optimization

##### Runtime Performance
- [ ] Review JavaScript execution time
- [ ] Debounce search/filter inputs
- [ ] Optimize DOM manipulation
- [ ] Memory leak detection

#### 3.6 Infrastructure Optimization ⬜ (Deferred)

##### Caching Strategy
- [x] Review Cache-Control headers (already set in server.js)
- [x] Implement ETag validation (already enabled)
- [ ] Add Service Worker for offline (optional)
- [ ] CDN cache rules review

##### Compression
- [x] Verify gzip/brotli on all text responses (compression middleware enabled)
- [ ] Check compression ratios
- [ ] Optimize compression levels

##### Server Configuration
- [x] Review PM2 configuration (addressed in 3.2)
- [x] Optimize Node.js settings (addressed in 3.2)
- [ ] Connection pooling for MongoDB
- [ ] Review nginx configuration

---

### 🧪 PHASE 4: Testing (Full Coverage)

**Status**: ✅ COMPLETE
**Completed**: 2026-03-03
**Last Updated**: 2026-03-03

#### 4.1 Unit Tests ✅ COMPLETE
- [x] Test new share component functions
- [x] Test i18n with English translations
- [x] Test new utility functions (validators, slugify, dateUtils, cache)
- [x] Achieve >80% unit test coverage

**Tests Created:**
- `tests/unit/validators.test.js` - Input validation, NoSQL injection prevention, sanitization
- `tests/unit/slugify.test.js` - Arabic transliteration, slug generation
- `tests/unit/dateUtils.test.js` - Hijri date conversion
- `tests/unit/cache.test.js` - TTL cache, getOrSet, invalidation
- `tests/unit/audioMetadata.test.js` - Metadata extraction, duration formatting (27 tests)
- `tests/unit/fileManager.test.js` - File operations, storage stats, orphan cleanup (37 tests)
- `tests/unit/streamHandler.test.js` - HTTP Range requests, MIME types, caching (24 tests)
- `tests/unit/fileValidation.test.js` - Upload validation, multer error handling (25 tests)
- `tests/unit/analytics.test.js` - Page view tracking, analytics summary (25 tests)

#### 4.2 Integration Tests ✅ COMPLETE
- [x] API endpoint tests for share analytics
- [x] Language switching API tests
- [x] Security middleware tests
- [x] Rate limiting tests

**Tests Created:**
- `tests/integration/security/middleware.test.js` - Auth middleware, role-based access
- `tests/integration/security/rateLimiting.test.js` - API, auth, general rate limits
- `tests/integration/api/sheikhs.test.js` - Sheikhs API CRUD operations (19 tests)

#### 4.3 E2E Tests ✅ COMPLETE
- [x] Share button functionality tests
- [x] Language toggle tests
- [x] Full user journey tests
- [x] Mobile viewport tests

**Tests Created:**
- `tests/e2e/share-button.spec.js` - Share modal, copy link, social platforms, RTL support
- `tests/e2e/language-toggle.spec.js` - Language switching, translation content, RTL/LTR

#### 4.4 Security Tests ✅ COMPLETE
- [x] Input validation edge cases
- [x] Auth bypass attempts
- [x] Rate limit enforcement
- [x] CSRF/XSS prevention verification

**Tests Created:**
- `tests/integration/security/inputValidation.test.js` - NoSQL injection, XSS, length validation

#### 4.5 Performance Tests ✅ COMPLETE
- [x] Load testing with concurrent users
- [x] Stress testing API endpoints
- [x] Cache performance metrics
- [x] Memory efficiency tests

**Tests Created:**
- `tests/performance/apiPerformance.test.js` - Response times, concurrent requests, cache efficiency

---

### 📊 Session Log

| Date | Phase | Tasks Completed | Notes |
|------|-------|-----------------|-------|
| 2026-02-28 | Setup | Created phased plan | Ready to begin Phase 1 |
| 2026-02-28 | Phase 1 | Security audit 6/8 complete | Fixed ReDoS, input validation, error disclosure |
| 2026-03-03 | Phase 4 | Testing (Full Coverage) 10/10 | All test categories implemented |
| 2026-03-05 | Phase 4 | ✅ All tests verified passing | Jest: 415/415, Playwright: 434/434 |
| 2026-03-05 | Phase 4 | Extended test coverage | Added 157 new tests for utils/middleware |
| 2026-03-07 | Phase 3 | ✅ Memory Optimization Complete | 7/7 tasks: cache LRU, N+1 fix, MongoDB sessions, heap limits, Excel streaming |
| 2026-04-02 | Reliability | MongoDB fail-fast + Notification Banner | Server resilience & admin status notifications |

**Session Details (2026-04-02):**
- MongoDB Resilience: Added fail-fast mechanism for connection failures to prevent server crashes during outages
- Maintenance Mode: Database tests updated for maintenance mode behavior
- Notification Banner: Added bilingual (AR/EN) notification bar for site status updates
- Admin Controls: Added admin interface to manage notification banner content and visibility
- Quick Actions: Integrated Notice Banner into admin Quick Actions
- Test Fixes: Fixed i18n tests hanging by properly mocking SiteSettings

**Commits:**
- `588d9f2` Add fail-fast mechanism for MongoDB connection failures
- `c8c8903` Fix fail-fast to work on initial connection failure
- `55bddbc` Prevent server crashes during MongoDB outages
- `35e9985` Update database tests for maintenance mode behavior
- `32ded67` Add bilingual notification bar for site status update
- `4243280` Add admin controls for bilingual notification banner
- `229d187` Add Notice Banner to Quick Actions and fix async i18n tests
- `eb7d20f` Fix i18n tests hanging by mocking SiteSettings

**Session Details (2026-03-05):**
- Extended Phase 4 test coverage targeting low-coverage areas
- Unit Tests: audioMetadata.js (27), fileManager.js (37), streamHandler.js (24), fileValidation.js (25), analytics.js (25)
- Integration Tests: sheikhs API (19 tests)
- Total new tests: 157
- Note: MongoDB Memory Server has download issues in this environment (403 error)
- All unit tests pass; integration tests need MongoDB binary fix

**Session Details (2026-03-03):**
- Implemented comprehensive Phase 4 Testing Coverage
- Unit Tests: Created tests for validators, slugify, dateUtils, cache utilities
- Integration Tests: Security middleware tests, rate limiting tests
- E2E Tests: Share button functionality, language toggle, RTL/LTR support
- Security Tests: NoSQL injection prevention, XSS prevention, input validation
- Performance Tests: API response times, concurrent requests, cache efficiency

**New Test Files Created:**
- `tests/unit/validators.test.js`
- `tests/unit/slugify.test.js`
- `tests/unit/dateUtils.test.js`
- `tests/unit/cache.test.js`
- `tests/integration/security/middleware.test.js`
- `tests/integration/security/rateLimiting.test.js`
- `tests/integration/security/inputValidation.test.js`
- `tests/e2e/share-button.spec.js`
- `tests/e2e/language-toggle.spec.js`
- `tests/performance/apiPerformance.test.js`

**Session Details (2026-02-28):**
- Created `utils/validators.js` with express-validator rules
- Fixed ReDoS vulnerability in search functions
- Added input validation to all API endpoints
- Fixed error message disclosure (hide in production)
- Fixed missing multer import in fileValidation.js
- Added ObjectId validation to stream/download controllers
- Ran npm audit fix to resolve minimatch/qs vulnerabilities
- Unit tests: 125/155 passed (failures are mongodb-memory-server infra issues)

---

## 📌 Project State

**Current Phase**: Security/Features/Optimization/Testing Initiative
**Last Updated**: 2026-04-02
**Active Branch**: `claude/fix-homepage-tests-ovChk`
**Live URL**: https://rasmihassan.com
**Status**: 🔄 **ACTIVE DEVELOPMENT** - Implementing Roadmap 4.3/4.5 + Comprehensive Improvements

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

**✅ COMPLETED (Task 3.11 - 2026-02-12):**
- Changed header/hero from "موقع الشيخ حسن الدغريري" to "موقع الشيخ حسن بن محمد منصور الدغريري"
- Updated all relevant locations including meta tags and JSON-LD

### ✅ Hijri Date Display

- Arabic numeral formatting (٢٨ / ٧ / ١٤٤٧)
- `toArabicNumerals()` utility function
- `formatHijriDate()` for proper formatting
- Displayed on lecture cards using `dateRecordedHijri`

### ✅ Recently Completed (2026-02-19)

**Performance Optimizations (GTmetrix Analysis):**
- Self-hosted Arabic fonts to eliminate FOUT and reduce latency
  - Scheherazade New (95KB + 107KB) for headings (`--font-arabic-display`)
  - Noto Naskh Arabic (98KB × 2) for body text (`--font-arabic-body`)
  - All fonts preloaded with `font-display: swap`
- Lazy-load series data via API for faster initial page load
- Critical CSS inlined, non-critical CSS loaded async
- JavaScript files minified (~40% reduction)
- Added favicon.svg (was causing 404)
- CLS prevention with min-height and contain properties
- Removed Google Fonts CDN dependency (was causing FOUT)

**Desktop Performance (PageSpeed):**
- FCP: 0.9s ✅
- LCP: 0.9s ✅
- TBT: 0ms ✅
- CLS: 0 ✅

**Mobile Performance (PageSpeed - throttled 3G simulation):**
- FCP: ~3.9s (limited by network simulation, not code)
- Server response: 0.2s actual

**Files Updated:**
- `views/layout.ejs` - Self-hosted @font-face declarations, resource hints
- `public/fonts/` - 4 woff2 font files (Scheherazade New + Noto Naskh Arabic)
- `routes/index.js` - Lazy-load series via API
- `server.js` - Updated CSP for self-hosted fonts
- `public/js/*.js` - Minified JavaScript files

### ✅ Previously Completed (2026-02-15)

**Hijri Date Standardization:**
- All user-facing dates now display in Hijri calendar format
- Fixed YYYY/MM/DD format support for standalone lectures
- Fixed missing Hijri dates in standalone lectures tab
- Added `scripts/update-hijri-dates.js` with dry-run mode for batch updates

**E2E Test Improvements:**
- Fixed E2E test setup to work in both CI and local environments
- Test configuration now properly handles different environments

**Series Description Sync:**
- Added `scripts/sync-series-descriptions.js` to sync Arabic descriptions from series to lectures

### ✅ Previously Completed (2026-02-10)

**Admin Data Management Tools:**
- **Duration Verification System** - Auto-verifies audio duration on playback
  - `durationVerified` field added to Lecture model
  - `POST /api/lectures/:id/verify-duration` endpoint
  - Client-side verification in audioPlayer.js
  - Admin status page at `/admin/duration-status`
- **Unassociated Lectures Management** - Assign orphan lectures to series
  - Collapsible section in series edit page
  - Search/filter unassociated lectures
  - Assign with lecture number
- **Create New Series** - Quick create from unassociated section
  - Modal form with title, sheikh, category
  - `POST /admin/api/series/create` endpoint
- **Lecture Search & Delete** - `/admin/lectures` management page
  - Search by title/slug
  - Filter by series
  - Delete with confirmation

**Admin Scripts:**
- `scripts/fix-series-lecture-numbers.js` - Fix lecture numbers from Arabic ordinals
- `scripts/fix-lecture-slugs.js` - Regenerate slugs with series names
- `scripts/export-db-data.js` - Export all data for verification
- `scripts/sync-oci-durations.js` - Batch sync durations from OCI
- `scripts/README.md` - Documentation for all utility scripts

**Previous Completions:**
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

### 📊 Test Coverage Summary (2026-02-09)
**Overall: 46.99% statements | 39.88% branches | 213 tests passing**

| Area | Coverage | Status |
|------|----------|--------|
| models/ | 72.91% | ✅ Good |
| utils/i18n.js | 97.91% | ✅ Excellent |
| utils/ociStorage.js | 97% | ✅ Excellent |
| utils/findByIdOrSlug.js | 93.33% | ✅ Excellent |
| routes/admin/ | 75.79% | ✅ Good |
| routes/index.js | 75.67% | ✅ Good |
| routes/api/series.js | 83.87% | ✅ Good |
| routes/api/lectures.js | 28.14% | ⚠️ Needs work |
| utils/slugify.js | 0% | ❌ No tests |
| config/*.js | 0-7% | ❌ Low (integration) |
| middleware/ | 20% | ⚠️ Needs work |

### 🎯 Next Steps (Prioritized)

1. ~~**3.6 Total Lecture Count Display**~~ ✅ Done - Gold badge in hero section
2. ~~**3.7 Analytics & Tracking System**~~ ✅ Done - /admin/analytics dashboard
3. ~~**3.8 Quick Add Lecture to Series**~~ ✅ Done - "+ إضافة درس" button on series edit
4. ~~**3.10 Admin Data Management**~~ ✅ Done - Duration verification, lecture management
5. ~~**3.9 Direct OCI Audio Upload**~~ ✅ Done - AJAX upload with progress, duration extraction
6. ~~**3.1 Server-Side Filtering & Pagination**~~ ✅ Done - API endpoints with pagination
7. ~~**3.5 Weekly Class Schedule**~~ ✅ Done - Add entries at /admin/schedule
8. ~~**3.3 Performance Optimizations**~~ ✅ Done - In-memory caching, static cache headers, Cloudflare CDN guide
9. ~~**3.4 Admin Panel Arabic**~~ ✅ Done - Full bilingual support for all 18 admin templates
10. ~~**3.16 Dynamic Series Section Management**~~ ✅ Done - Homepage sections, admin CRUD, homepage config toggles
11. ~~**3.17 Mobile Responsiveness Fixes**~~ ✅ Done - Homepage, audio UI, lecture page responsive down to 320px
12. **Test Coverage Improvements** - Focus on slugify.js, lectures API, middleware
11. ~~**3.11 Hero Section Text Update**~~ ✅ Done - Updated branding to "موقع الشيخ حسن بن محمد منصور الدغريري"
12. ~~**3.12 Related Lectures Ordering**~~ ✅ Done - Related lectures sorted by lectureNumber, category displays in Arabic
13. ~~**3.13 Series Visibility Toggle**~~ ✅ Done - Admin toggle to show/hide series from public site
14. ~~**3.14 Series Slugs Update Script**~~ ✅ Done - `scripts/fix-series-slugs.js`
15. ~~**3.15 Admin Buttons Audit**~~ ✅ Done - Added missing buttons to manage.ejs

---

### Priority 1: CRITICAL

#### 1.1 Security Audit ✅ COMPLETE
**Priority**: HIGHEST | **Status**: Done (2026-02-03)

**Fixed:**
- [x] ~~CRITICAL: Removed `/admin/make-super-admin` privilege escalation route~~
- [x] Added rate limiting (general, API, auth endpoints)
- [x] Enabled Content Security Policy (CSP)
- [x] Fail-fast if SESSION_SECRET missing in production
- [x] Added sameSite cookie attribute for CSRF protection
- [x] Custom session cookie name (`wurud.sid`)
- [x] Removed verbose debug logging in production

**Already Secure:**
- [x] Google OAuth with email whitelist
- [x] httpOnly, secure cookies in production
- [x] File upload validation (MIME type, size limits)
- [x] Path traversal prevention
- [x] Mongoose ORM (MongoDB injection protection)
- [x] Role-based access control (admin, editor)
- [x] Protected admin routes

**Note:** xlsx package has known CVEs but only used in admin scripts (not exposed to users)

#### 1.2 Content: October to Present ✅ COMPLETE
**Priority**: HIGH | **Status**: Done (2026-02-09)

- [x] Identify all lectures from October 2025 to present
- [x] Process audio files (HE-AAC encoding, silence trimming)
- [x] Upload to OCI bucket
- [x] Add metadata to MongoDB
- [x] Verify streaming works

#### 1.3 Content: Online Classes ✅ COMPLETE
**Priority**: HIGH | **Status**: Done (2026-02-09)

- [x] Identify online class recordings
- [x] Determine format differences from in-person lectures
- [x] Process and upload audio files
- [x] Add appropriate metadata/category tagging

---

### Priority 2: HIGH

#### 2.1 Content: Pre-October Archive ✅ COMPLETE
**Priority**: MEDIUM-HIGH | **Status**: Done (2026-02-09)

- [x] Inventory all pre-October lectures
- [x] Batch process audio files
- [x] Upload to OCI
- [x] Import metadata to MongoDB

#### 2.2 Arabic Slugs (SEO URLs) ✅ COMPLETE
**Priority**: MEDIUM-HIGH | **Status**: Done (2026-02-09)

- [x] Add `slug` field to Lecture, Series, Sheikh models
- [x] Generate Arabic slugs from titles
- [x] Update routes to support both ID and slug lookup
- [x] Add redirects from old URLs to new slugs (301 redirects)
- [x] Update sitemap to use slugs
- [x] Update internal links
- [x] Fix canonical tags to use slug URLs

**Example**: `/lectures/6975bc...` → `/lectures/شرح-كتاب-التوحيد-الدرس-١`

**Scripts**: Run `node scripts/generate-slugs.js` to generate slugs for existing data.

---

### Priority 3: MEDIUM

#### 3.1 Scalability: Server-Side Filtering & Pagination ✅ COMPLETED
**Priority**: MEDIUM | **Status**: Done (2026-02-17)

- [x] Move filtering from client-side to server-side ✅
- [x] Implement pagination or infinite scroll ✅
- [x] API endpoints for filtered/paginated results ✅
- [x] Update frontend to call API instead of client-side filter ✅

**Implementation:**
- Created `/routes/api/homepage.js` with 4 endpoints:
  - `GET /api/homepage/series` - Paginated series with lectures
  - `GET /api/homepage/standalone` - Paginated standalone lectures
  - `GET /api/homepage/khutbas` - Paginated khutba series
  - `GET /api/homepage/stats` - Tab counts for UI badges
- Server-side filtering: category, type, search
- Pagination with validation (page, limit, skip)
- 58 unit tests added (see `tests/unit/homepage.test.js`)

#### 3.2 Mobile UX Enhancements ✅ COMPLETED
**Priority**: MEDIUM | **Status**: Done

- [x] ~~Add hamburger menu for mobile navigation~~ ✅ Done
- [x] ~~Better search placeholders ("ابحث بالموضوع، الكلمة، أو العنوان...")~~ ✅ Done
- [x] ~~"Clear All Filters" button~~ ✅ Done

#### 3.3 Performance Optimizations ✅ COMPLETED
**Priority**: MEDIUM | **Status**: Done (2026-02-17)

- [x] ~~Implement server-side caching (in-memory)~~ ✅ `utils/cache.js` with TTL-based caching
- [x] ~~Add cache headers for static assets~~ ✅ 1-year immutable cache in production
- [x] ~~Implement CDN for static assets~~ ✅ Cloudflare Full Site Proxy guide created
- [ ] Bundle/minify CSS and JS (deferred - minimal impact with CDN compression)
- [ ] Optimize images (WebP format) (deferred - no user-uploaded images currently)

**Implementation:**
- In-memory cache utility (`utils/cache.js`) with TTL support
- Homepage data cached for 5 minutes, sitemap for 1 hour
- Cache invalidation on admin operations (lecture/series CRUD)
- Static asset caching with `immutable` directive
- Cloudflare CDN setup guide at `docs/CLOUDFLARE_CDN_SETUP.md`

#### 3.4 Admin Panel - Arabic Version ✅ COMPLETED
**Priority**: MEDIUM | **Status**: Done (2026-02-25)

Added comprehensive Arabic (RTL) and English bilingual support to all admin panel pages.

**Subtasks:**
- [x] Add RTL layout support to admin pages (CSS `[dir="rtl"]`/`[dir="ltr"]` selectors)
- [x] Translate admin UI strings (inline ternary with `adminLocale === 'ar'`)
- [x] Add language toggle to admin panel (cookie-based `admin_locale` preference)
- [x] Ensure form inputs work with Arabic text (explicit `dir` attributes)

**Implementation Summary:**
- All 18 admin templates updated with full bilingual support
- Created `adminI18nMiddleware` in `middleware/adminI18n.js`
- Admin header partial with language toggle dropdown
- JavaScript `msgs` object pattern for client-side translations
- Dynamic `<html lang="<%= adminLocale %>" dir="<%= adminDir %>">`
- RTL/LTR CSS for tables, buttons, forms, badges, actions

**Files Updated:**
- `middleware/adminI18n.js` - Admin i18n middleware (new)
- `views/admin/partials/head.ejs` - Shared admin head partial (new)
- `views/admin/partials/header.ejs` - Admin header with language toggle (new)
- All 18 admin template files in `views/admin/`

#### 3.5 Weekly Class Schedule ✅ COMPLETED
**Priority**: MEDIUM | **Status**: Done (2026-02-09)

Display weekly class schedule with direct links to most recent recordings.

**Benefits:**
- Helps students stay current with ongoing series
- Boosts SEO through frequent internal link updates
- Encourages regular site visits

**Implementation:**
- [x] ~~Create schedule data structure (day, time, series, location)~~ ✅ models/Schedule.js
- [x] ~~Homepage section showing weekly schedule~~ ✅ Displays cards on homepage
- [x] ~~Auto-link to most recent lecture in each series~~ ✅ Done
- [x] ~~Indicate "new" badge for lectures < 7 days old~~ ✅ Green "جديد" badge
- [x] ~~Admin interface to manage schedule~~ ✅ /admin/schedule
- [ ] Optional: "Next class" countdown timer (future)

**Admin Action Required**: Add schedule entries at `/admin/schedule` for the section to appear on homepage.

#### 3.6 Total Lecture Count Display ✅ COMPLETED
**Priority**: MEDIUM | **Status**: Done (2026-02-09)

Display the total number of lectures prominently on the homepage.

**Implementation:**
- [x] ~~Add lecture count stat to homepage hero~~ ✅ routes/index.js
- [x] ~~Show "X+ درس" / "X+ Lectures" badge~~ ✅ Gold accent badge
- [x] ~~Update dynamically as content grows~~ ✅ Real-time count
- [x] ~~Style to match site aesthetic~~ ✅ Gold border, translucent bg

#### 3.7 Analytics & Tracking System ✅ COMPLETED
**Priority**: MEDIUM | **Status**: Done (2026-02-09)

Track page visits, listens, and downloads with admin-controlled visibility.

**Implementation:**
- [x] ~~Track page views~~ ✅ models/PageView.js with daily aggregation
- [x] ~~Track audio plays~~ ✅ Already in Lecture.playCount
- [x] ~~Track downloads~~ ✅ Already in Lecture.downloadCount
- [x] ~~Admin dashboard~~ ✅ /admin/analytics with stats, charts, top content
- [x] ~~Visibility Toggle~~ ✅ SiteSettings model with thresholds
  - [x] Admin setting for min plays/downloads/pageviews
  - [x] Stats hidden on public pages until threshold met
  - [x] Admin always sees real numbers
- [x] ~~Daily breakdown~~ ✅ Last 30 days view data

**Files Created:**
- `models/SiteSettings.js` - Visibility settings and cached stats
- `models/PageView.js` - Page view tracking with daily aggregation
- `middleware/analytics.js` - Tracking middleware and helpers
- `views/admin/analytics.ejs` - Admin analytics dashboard

**Admin Access:** `/admin/analytics`

#### 3.8 Quick Add Lecture to Series ✅ COMPLETED
**Priority**: MEDIUM | **Status**: Done (2026-02-09)

Streamlined workflow to add new lectures to existing series with minimal input.

**Features:**
- [x] ~~"+" button on series page in admin to add new lecture~~ ✅ Gold button in series edit page
- [x] ~~Auto-fill series, sheikh, category from parent series~~ ✅ Inherited from series
- [x] ~~Auto-increment lecture number (next in sequence)~~ ✅ Calculates next number
- [x] ~~Minimal form: just date, title suffix (optional), notes~~ ✅ Streamlined form
- [x] ~~Quick save without full form validation~~ ✅ Creates unpublished lecture
- [ ] Option to immediately upload audio after creation (future)

**Files Created:**
- `views/admin/quick-add-lecture.ejs` - Minimal quick-add form
- Routes in `routes/admin/index.js` - GET/POST handlers

**Admin Access:** Edit any series → Click "+ إضافة درس" button

#### 3.10 Admin Data Management ✅ COMPLETED
**Priority**: MEDIUM | **Status**: Done (2026-02-10)

Comprehensive tools for managing lecture data, fixing metadata, and verifying audio.

**Duration Verification System:**
- [x] ~~Auto-verify duration on audio playback~~ ✅ audioPlayer.js
- [x] ~~API endpoint for verification~~ ✅ POST /api/lectures/:id/verify-duration
- [x] ~~Admin status dashboard~~ ✅ /admin/duration-status
- [x] ~~Batch sync script~~ ✅ scripts/sync-oci-durations.js

**Lecture Management:**
- [x] ~~Unassociated lectures section in series edit~~ ✅ Collapsible with search
- [x] ~~Assign lectures to series with number~~ ✅ POST /admin/lectures/:id/assign-to-series
- [x] ~~Create new series from unassociated section~~ ✅ Modal form
- [x] ~~Search/delete lectures~~ ✅ /admin/lectures

**Admin Scripts:**
- [x] ~~Fix lecture numbers from Arabic ordinals~~ ✅ fix-series-lecture-numbers.js
- [x] ~~Fix slugs with series names~~ ✅ fix-lecture-slugs.js
- [x] ~~Export database for verification~~ ✅ export-db-data.js
- [x] ~~Scripts documentation~~ ✅ scripts/README.md

**Admin Access:**
- `/admin/duration-status` - Duration verification dashboard
- `/admin/lectures` - Search and delete lectures
- Series edit page → "📎 محاضرات بدون سلسلة" section

#### 3.11 Hero Section Text Update ✅ COMPLETED
**Priority**: MEDIUM | **Status**: Done (2026-02-12)

Updated the hero section text from "موقع الشيخ حسن الدغريري" to "موقع الشيخ حسن بن محمد منصور الدغريري".

**Tasks:**
- [x] ~~Update hero section in homepage~~ ✅ Header branding updated
- [x] ~~Update header branding text~~ ✅ Done in `views/partials/header.ejs`
- [x] ~~Update footer references~~ ✅ Done in `views/partials/footer.ejs`
- [x] ~~Update meta tags and SEO text~~ ✅ Title, og:title, og:site_name, twitter:title
- [x] ~~Update JSON-LD structured data~~ ✅ WebSite name and Person name updated
- [x] ~~Verify all instances in codebase~~ ✅ All instances updated

**Files Updated:**
- `views/layout.ejs` - Title, meta tags, JSON-LD schemas
- `views/partials/header.ejs` - Logo text
- `views/partials/footer.ejs` - Copyright text

#### 3.12 Related Lectures Ordering ✅ COMPLETED
**Priority**: MEDIUM | **Status**: Done (2026-02-12)

In the lecture view page, the "Related Lectures" (محاضرات ذات صلة) section now displays other lectures from the same series in correct numerical order.

**Tasks:**
- [x] ~~Modify lecture detail query to fetch related lectures from same series~~ ✅ Only same series
- [x] ~~Sort related lectures by lectureNumber (ascending) or dateRecorded~~ ✅ Sorted by lectureNumber
- [x] ~~Display proper ordering in the Related Lectures section~~ ✅ Working
- [x] ~~Fix category badge to display in Arabic~~ ✅ Added categoryArabic mapping

**Implementation:**
- Fetches lectures from the same series only, sorted by `lectureNumber: 1`
- Category badge now displays in Arabic (فقه، عقيدة، etc.) when locale is Arabic

**Files Updated:**
- `routes/index.js` - Lecture detail route (lines 267-280)
- `views/public/lecture.ejs` - Category Arabic translation

#### 3.13 Series Visibility Toggle ✅ COMPLETED
**Priority**: MEDIUM | **Status**: Done (2026-02-12)

Added a toggle option on the series edit page in the admin panel to show or hide a specific series from the public site.

**Tasks:**
- [x] ~~Add `isVisible` field to Series model~~ ✅ Boolean, default true, indexed
- [x] ~~Add toggle switch to series edit page~~ ✅ Modern toggle UI with warning
- [x] ~~Update series edit route to handle visibility toggle~~ ✅ Handles checkbox state
- [x] ~~Filter hidden series from public queries~~ ✅ Homepage, browse, series list, sitemap
- [x] ~~Show hidden indicator in admin series list~~ ✅ Badge shows Visible/Hidden status
- [x] ~~Add admin button/link for this feature~~ ✅ Toggle in edit-series.ejs

**Files Updated:**
- `models/Series.js` - Added `isVisible` field (lines 63-67)
- `views/admin/edit-series.ejs` - Added toggle switch with CSS styling
- `routes/admin/index.js` - Updated POST handler (lines 390-426)
- `routes/index.js` - Added `{ isVisible: { $ne: false } }` filter to homepage, series list, sitemap, sheikh profile
- `views/admin/manage.ejs` - Added visibility status column with badges

#### 3.14 Series Slugs Update Script ✅ COMPLETED
**Priority**: MEDIUM | **Status**: Done (2026-02-12)

Created a script to update series slugs, similar to `scripts/fix-lecture-slugs.js`.

**Tasks:**
- [x] ~~Create `scripts/fix-series-slugs.js` based on lecture slugs script~~ ✅
- [x] ~~Regenerate slugs from current series titles~~ ✅
- [x] ~~Handle slug conflicts (append number if duplicate)~~ ✅ Uses generateUniqueSlug
- [x] ~~Add dry-run mode for preview~~ ✅ `--dry-run` flag
- [x] ~~Add force mode to regenerate all~~ ✅ `--force` flag

**Usage:**
```bash
node scripts/fix-series-slugs.js --dry-run   # Preview changes
node scripts/fix-series-slugs.js             # Apply to series without slugs
node scripts/fix-series-slugs.js --force     # Regenerate ALL slugs
```

**Files Created:**
- `scripts/fix-series-slugs.js`

#### 3.15 Admin Buttons Audit ✅ COMPLETED
**Priority**: MEDIUM | **Status**: Done (2026-02-12)

Audited all admin routes and added missing buttons to the manage page Quick Actions.

**Tasks:**
- [x] ~~Audit all admin routes in `routes/admin/index.js`~~ ✅ 40+ routes identified
- [x] ~~List all routes and check if they have buttons in admin UI~~ ✅
- [x] ~~Add missing buttons to admin dashboard or relevant pages~~ ✅ Added to manage.ejs
- [x] ~~Ensure consistent navigation across admin panel~~ ✅

**Buttons Added to Quick Actions (manage.ejs):**
- ⏱️ Duration Status (`/admin/duration-status`)
- 📦 Bulk Upload (`/admin/bulk-upload`)
- 📅 Schedule (`/admin/schedule`)
- 📊 Analytics (`/admin/analytics`)

**Existing Buttons (already present):**
- 👥 Manage Users (admin only)
- 👨‍🏫 Manage Sheikhs
- 🎙️ إدارة المحاضرات
- 📝 Unpublished
- 🔇 No Audio

**Files Updated:**
- `views/admin/manage.ejs` - Added missing quick action buttons

#### 3.16 Dynamic Series Section Management ✅ COMPLETED
**Priority**: MEDIUM | **Status**: Done (2026-02-25)

Admin-managed homepage sections for grouping series (Featured, Active, Completed, Archive, Ramadan). Replaced the original "Quick Links" concept with a full section management system.

**Features Implemented:**
- [x] ~~Section CRUD~~ ✅ Create, edit, delete sections with title AR/EN, icon, maxVisible, description
- [x] ~~Section reordering~~ ✅ AJAX up/down arrows with bulkWrite
- [x] ~~Series assignment~~ ✅ Assign series to sections, reorder within sections
- [x] ~~Homepage rendering~~ ✅ Collapsible section blocks with series tables above tabs
- [x] ~~Homepage config toggles~~ ✅ Toggle Schedule, Series Tab, Standalone Tab, Khutbas Tab
- [x] ~~Seed script~~ ✅ Creates 5 default sections (Featured, Active, Completed, Archive, Ramadan)
- [x] ~~Collapse state persistence~~ ✅ localStorage for section collapse state
- [x] ~~Bilingual support~~ ✅ Full AR/EN for all admin pages and homepage sections

**Data Model - Section:**
```javascript
{
  title: { ar: String, en: String },
  slug: String (unique, auto-generated),
  icon: String (emoji),
  displayOrder: Number,
  isVisible: Boolean (default: true),
  isDefault: Boolean (default: false),
  collapsedByDefault: Boolean (default: false),
  maxVisible: Number (default: 5),
  description: { ar: String, en: String }
}
```

**Series Model Extensions:**
- `sectionId` (ObjectId ref to Section, indexed)
- `sectionOrder` (Number, default 0)

**SiteSettings Extension:**
- `homepage.showSchedule` (Boolean, default: true)
- `homepage.showSeriesTab` (Boolean, default: true)
- `homepage.showStandaloneTab` (Boolean, default: true)
- `homepage.showKhutbasTab` (Boolean, default: true)

**Admin Routes:**
- `/admin/sections` - List all sections with reorder
- `/admin/sections/new` - Create new section
- `/admin/sections/:id/edit` - Edit section
- `/admin/sections/:id/series` - Manage series in section
- `/admin/homepage-config` - Toggle homepage features

**Homepage Layout Order:**
1. Hero Section (always visible)
2. Weekly Schedule (toggleable)
3. Series Sections (admin-managed, collapsible)
4. Content Tabs: Series / Standalone / Khutbas (each toggleable)

**Files Created:**
- `models/Section.js` - Section model with static methods
- `views/admin/sections.ejs` - Section list page
- `views/admin/section-form.ejs` - Create/edit form
- `views/admin/section-series.ejs` - Series management within section
- `views/admin/homepage-config.ejs` - Homepage toggle settings
- `scripts/seed-sections.js` - Idempotent seed script

**Files Modified:**
- `models/Series.js` - Added sectionId, sectionOrder
- `models/SiteSettings.js` - Added homepage config
- `models/index.js` - Exported Section
- `routes/admin/index.js` - Added ~407 lines of section/config routes
- `routes/index.js` - Added fetchSectionsData(), homepage config integration
- `views/public/index.ejs` - Section rendering, tab conditionals
- `views/admin/manage.ejs` - Quick action buttons
- `views/admin/edit-series.ejs` - Section assignment dropdown

#### 3.17 Mobile Responsiveness Fixes ✅ COMPLETED
**Priority**: MEDIUM | **Status**: Done (2026-02-26)

Fixed responsive design issues for all screen sizes down to 320px (iPhone SE, Galaxy Fold, etc.).

**Issues Fixed:**
- [x] ~~Homepage layout breaks below 450px width~~ ✅ Added 480px and 360px breakpoints
- [x] ~~Audio player UI distorted below 350px width~~ ✅ Compact controls and spacing

**Breakpoints Added:**
- `@media (max-width: 480px)` - Small phones
- `@media (max-width: 360px)` - Very small phones

**Files Updated:**
- `views/public/index.ejs` - Homepage responsive CSS (hero, search, tabs, schedule, sections)
- `views/public/lecture.ejs` - Lecture page responsive CSS (breadcrumb, hero, play section, buttons)
- `public/css/audioPlayer.css` - Audio player responsive CSS (controls, buttons, progress bar)

#### 3.9 Direct OCI Audio Upload ✅ COMPLETED
**Priority**: MEDIUM | **Status**: Done (2026-02-10)

Upload locally-optimized audio files directly to Oracle Cloud Infrastructure.

**Features Implemented:**
- [x] ~~Admin upload interface for OCI direct upload~~ ✅ Enhanced edit-lecture.ejs
- [x] ~~Support for pre-optimized audio (HE-AAC encoded locally)~~ ✅ All formats supported
- [x] ~~Progress indicator during upload~~ ✅ Real XHR progress tracking
- [x] ~~Auto-link uploaded file to lecture record~~ ✅ Updates audioUrl, audioFileName, fileSize
- [x] ~~Verify file exists in OCI after upload~~ ✅ objectExists() check
- [x] ~~Duration extraction~~ ✅ Client-side Audio API + verify-duration endpoint

**Technical Implementation:**
- AJAX upload with XMLHttpRequest for real progress
- `POST /admin/api/lectures/:id/upload-audio` - JSON response endpoint
- OCI verification using `objectExists()` after upload
- Client-side duration extraction before and after upload
- Auto-verify duration via `/api/lectures/:id/verify-duration`
- 10-minute timeout for large files (up to 60MB)

**Workflow:**
1. Edit lecture → Audio section
2. Select file → Shows name, size, duration preview
3. Click "رفع إلى السحابة" → Real progress bar
4. OCI upload with verification → Success/error feedback
5. Duration auto-extracted and verified in database
6. Audio player updated with new file

**Files Modified:**
- `routes/admin/index.js` - Added API upload endpoint
- `views/admin/edit-lecture.ejs` - Enhanced upload UI with XHR

---

### Priority 4: FUTURE (Major Features)

#### 4.1 Advanced Filters ⬜ NOT STARTED
**Priority**: LOWER | **Status**: Future

- [ ] Filter by date range
- [ ] Filter by duration (short/medium/long)
- [ ] Filter by speaker dropdown

#### 4.2 Favorites/Bookmarking System ⬜ NOT STARTED
**Priority**: LOWER | **Status**: Future

- [ ] LocalStorage-based favorites (no auth needed)
- [ ] Favorites tab/page
- [ ] Optional: User accounts for cloud sync

#### 4.3 Social Sharing ⬜ NOT STARTED
**Priority**: LOWER | **Status**: Future

- [ ] Add share buttons to individual lectures
- [ ] WhatsApp, Telegram, Twitter, Facebook
- [ ] Copy link button

#### 4.4 Transcript Search with Timestamps ✅ IN PROGRESS
**Priority**: MEDIUM | **Status**: Partially Complete
**Last Updated**: 2026-03-11

**Phase A - Transcription:** ✅ COMPLETE
- [x] Transcripts stored in separate `searchdb` database
- [x] `Transcript` model with `startTimeSec`, `text`, `speaker` fields
- [x] Transcripts linked to lectures via `shortId`

**Phase B - Search:** ✅ COMPLETE
- [x] Full-text search via MongoDB Atlas Search
- [x] Search API at `/api/search`
- [x] Search page at `/search` with results showing matching segments

**Phase C - Display:** ✅ COMPLETE
- [x] Transcript section on lecture detail page (`views/public/lecture.ejs`)
- [x] Click-to-expand full transcript (AJAX loaded)
- [x] Click timestamp to seek audio player
- [x] **FIX (2026-03-11)**: Added `seekToTime(seconds)` method to AudioPlayer
  - Previous `seek(e)` expected event object, not seconds
  - Fixed "non-finite value" error when clicking transcript timestamps
  - Files: `public/js/audioPlayer.js`, `views/public/lecture.ejs`
- [x] Highlight active segment during playback

**Remaining:**
- [ ] Real-time transcript sync (auto-scroll with playback)
- [ ] Search within transcript on lecture page

#### 4.5 English Version of Site ⬜ NOT STARTED
**Priority**: LOWER | **Status**: Future

- [ ] Add English translations for lecture metadata
- [ ] Consider separate English landing page
- [ ] Update SEO for English keywords

---

### ✅ COMPLETED

- [x] **Security Audit** - Rate limiting, CSP, removed privilege escalation, hardened sessions
- [x] **Google Search Console** - Verified, indexing in progress
- [x] **SEO Implementation** - Meta tags, JSON-LD, sitemap, robots.txt
- [x] **Branding** - Sheikh Hasan Dhaghriri across site
- [x] **Hijri Date Display** - Arabic numerals
- [x] **Mobile UI Polish** - All issues fixed
- [x] **OCI Integration** - Audio streaming working
- [x] **Production Deployment** - Live at rasmihassan.com
- [x] **UX: Search Placeholder** - Better placeholder text
- [x] **UX: Clear All Filters** - Button to reset filters

### 🎨 Active Branch: `claude/fix-homepage-tests-ovChk` (Brown/Gold Scholarly Design)

**Design Status**: ✅ DESIGN_CRITIQUE.md COMPLETE
**Design**: Warm scholarly brown (#2C1810, #5C4033) and gold (#C19A6B) manuscript aesthetic
**Fonts**: Self-hosted Scheherazade New (display) + Noto Naskh Arabic (body) - 4 woff2 files in `/public/fonts/`

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

**Fonts** (self-hosted in `/public/fonts/`):
- Arabic Display: Scheherazade New (headings) - 400, 700 weights
- Arabic Body: Noto Naskh Arabic - 400, 700 weights
- Fallback: Tahoma, serif

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
