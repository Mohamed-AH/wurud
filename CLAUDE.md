# Wurud Project - Claude Code Context

## Project Overview
Islamic audio archive website for Sheikh Hasan bin Mohammed Mansour Dhaghriri. Server-side rendered with EJS templates, Express.js backend, MongoDB database.

**CRITICAL: This is a PRODUCTION database. Do not run destructive operations.**

## Current Branch
`claude/fix-homepage-tests-ovChk`

## Recent Work Completed

### 1. Fixed Featured Section Links (Commit: dce89f5)
- **Problem**: Series in featured sections redirected to `/series/` listing instead of specific series pages when slug was undefined
- **Fix**: Added `_id` fallback: `href="/series/<%= s.slug ? encodeURIComponent(s.slug) : s._id %>"`
- **Files**: `views/public/index.ejs` (lines 2478, 2492, 2499, 2513)

### 2. Articles Feature (Commit: 5480c13)
Created complete articles/blog infrastructure:

**Model** - `models/Article.js`:
- Fields: shortId, type (Asdaa/TelegramArticle), publishedAt, sourceUrl, title, summary, content, slug, slug_ar, isPublished
- Auto-generates shortId and slugs on save
- Added to `models/index.js` exports

**Import Script** - `scripts/import-articles.js`:
- Usage: `node scripts/import-articles.js <path-to-json-file>`
- Expected JSON format:
```json
[
  {
    "type": "Asdaa" | "TelegramArticle",
    "date": "DD.MM.YYYY",
    "url": "https://...",
    "title": "Arabic title",
    "summary": "Short summary",
    "full_text": "Full article content"
  }
]
```

**Routes** - `routes/articles.js`:
- GET `/articles` - paginated list with caching
- GET `/articles/:slugOrId` - detail page
- Registered in `server.js`

**Views**:
- `views/public/articles.ejs` - list with search, pagination, Hijri dates
- `views/public/article-detail.ejs` - full article with reading progress bar, related articles

**Homepage Integration** - `routes/index.js`:
- Added `fetchRecentArticles()` function
- Added articles to homepage Promise.all() with caching
- Passes `recentArticles` to template

### 3. Mobile Redesign (Commit: a9c2c10)
Implemented design from `/tmp/design-handoff/audio-archives-redesign/project/Audio Archive Redesign.dc.html`

**Bottom Navigation** - `views/partials/bottomNav.ejs`:
- 5 items: 🏠 الرئيسية, 📚 السلاسل, 🔍 بحث, ✍️ مقالات, 📅 الجدول
- Mobile only (max-width: 768px)
- Included in `views/layout.ejs`

**Featured Articles Section** - Added to `views/public/index.ejs`:
- Shows up to 4 recent articles
- Responsive grid layout
- Type badges (Asdaa/Telegram)

**New CSS** - `public/css/main.css`:
```css
/* New Design Color Variables */
--redesign-brown-dark: #2C1508;
--redesign-gold-primary: #C49A3C;
--redesign-gold-light: #DEC99A;
--redesign-badge-bg: #E8D5A0;
--redesign-sage: #6B7A4E;
--redesign-cream-bg: #F5EDE0;
--redesign-text-mid: #7A5C3A;
--redesign-text-muted: #A89070;
--redesign-card-bg: #FDF8F2;
```

**Partials Created**:
- `views/partials/bottomNav.ejs` - Bottom navigation bar
- `views/partials/articlesSidebar.ejs` - Articles sidebar for 65/35 layout

### 4. RTL Architecture & Critical Fix (Commit: c4d2580)
**IMPORTANT**: This site is **RTL-first** (Arabic is the default).

- Base CSS styles are written for RTL/Arabic
- LTR overrides use `html[dir="ltr"]` selectors
- Do NOT add `[dir="rtl"]` overrides - they conflict with base RTL styles

**ROOT CAUSE FIX**: The critical CSS in `layout.ejs` had `body{direction:rtl}` hardcoded, but the LTR override was in async-loaded `main.css`. This caused a race condition where English pages started with RTL direction, then flipped to LTR when main.css loaded, causing layout differences.

**Solution**: Added `html[dir="ltr"] body{direction:ltr;text-align:left}` directly in critical CSS (layout.ejs line 107) so LTR direction applies immediately on page load.

**Bottom Navigation** - `views/partials/bottomNav.ejs`:
- Uses `direction: ltr` to keep icon order consistent across languages
- This is an exception because icon order should be fixed regardless of text direction

**Removed**: Redundant categories grid section from homepage

### 5. Search Container Width Fix (Commit: aabc9b9/7924dd1)
**Problem**: Arabic and English mobile layouts rendered search box differently despite identical CSS:
- Arabic: 361px (full width - correct)
- English: 191px (narrow - incorrect)

**Root Cause**: Flex behavior differences between RTL and LTR. The `flex: 1` on search-input relies on flexbox width distribution which behaves differently under different direction contexts.

**Solution**: Added explicit `width: 100%` and `box-sizing: border-box` to both `.search-input` and `.search-btn` within the 768px media query. This forces consistent full-width rendering regardless of direction.

**Files Modified**:
- `views/public/index.ejs` - lines 615-619 (768px media query)
- `public/css/main.css` - lines 94-102 (768px media query)

### 6. Articles Page Mobile Redesign (Commit: 7b386ad)
Aligned `/articles` page with design handoff specs:
- Header: 18px title (was 24px), 11px subtitle (was 13px)
- Search: Added magnifier icon with styled wrapper container
- Cards: Tighter padding (12px 14px), 10px gap between cards
- Title: 14px font-size, line-height 1.4
- Summary: 12px font-size, line-height 1.55
- Read more: 11px font-size, 3px gap
- Added 480px breakpoint for smaller phones

**Files Modified**: `views/public/articles.ejs`

### 7. Articles Import (Completed)
338 articles imported successfully using `scripts/import-articles.js`.

### 8. Articles RTL/LTR Layout Fix (Commit: 046fc52)
Arabic article content now stays RTL even in English (LTR) UI mode:
- Article titles, summaries, body text always `direction: rtl; text-align: right`
- UI elements (meta, navigation, buttons) adjust to page direction
- Arrows flip appropriately in LTR mode
- Related article titles stay RTL

**Files Modified**: `views/public/articles.ejs`, `views/public/article-detail.ejs`

### 9. Lecture Page Mobile Redesign (Commit: 9fe52fb)
Implemented mobile-first lecture player per design handoff:
- **Mobile nav bar**: Sticky with back button ← and truncated title
- **Sticky player**: Below nav, shows play button, title, duration, series
- **Action grid**: Download/Share in `grid-template-columns: 1fr 1fr`
- **Hidden on mobile**: Breadcrumb, hero section, desktop play section
- Breakpoint: 768px

**Files Modified**: `views/public/lecture.ejs`

### 10. Homepage Stats Display (Commit: 183cd9d, d71e0a1)
Added article count alongside lecture count on homepage:
- Pill-style badges with icons: 🎧 992 Lectures | ✍️ 338 Articles
- High contrast white text on dark semi-transparent background
- Responsive: stacks vertically on mobile (480px)
- Cached articleCount query (10 min TTL)

**Files Modified**: `routes/index.js`, `views/public/index.ejs`

### 11. Pagination & Bottom Nav Fixes (Commit: 6f6de03)
**Pagination overflow fix**:
- Added `flex-wrap: wrap` for page numbers to wrap to next line
- Smaller buttons on mobile (480px breakpoint)
- Prevents horizontal scrolling with 300+ pages

**Bottom navigation visibility fix**:
- z-index: 9999 (was 1000)
- GPU acceleration with `transform: translateZ(0)`
- `backface-visibility: hidden` to prevent jitter
- Main content z-index: 1 to prevent overlap

**Files Modified**: `views/public/articles.ejs`, `views/partials/bottomNav.ejs`

## Completed Tasks

### 13. Article SEO Implementation (Commit: 0126457, 0bdc0af)
Comprehensive SEO for 338 articles:

**Meta Tags** - `views/layout.ejs`, `routes/articles.js`:
- Dynamic `og:type` (article vs website)
- `article:published_time` and `article:modified_time`
- `article:author` meta tag
- Meta description from summary or first 160 chars of content
- Canonical URLs for article list and detail pages

**Article JSON-LD Schema** - `views/layout.ejs`:
- Full Article schema with headline, description, dates
- Links to Person schema (@id reference)
- Publisher organization info
- mainEntityOfPage for canonical URL

**Sitemap Enhancement** - `routes/index.js`:
- Added `/articles` listing page (priority 0.8, daily changefreq)
- Added all published articles with lastmod dates
- Articles get priority 0.7, monthly changefreq

**Related Articles** - Already implemented in `views/public/article-detail.ejs`:
- Shows 3 related articles (same type) at bottom of each article
- Hijri date formatting

### 14. Article Title Update Script (Commit: d88706a)
Created `scripts/update-article-titles.js`:
- Matches articles by sourceUrl (exact match)
- Dry-run mode by default (no DB changes)
- `--apply` flag to execute updates
- Only updates title field, nothing else
- Detailed logging with old vs new titles

### 15. Google Search Console Submission (Manual)
SEO implementation deployed and submitted to Google:
- Sitemap submitted: `sitemap.xml` with 338 articles
- Priority articles manually submitted for indexing:
  - جوهر العقيدة الإسلامية وأثرها (Core Aqeedah)
  - وجوب تعلم المسائل الثلاث والعمل بها (Three Fundamentals)
  - منهج السلف الصالح (Salafi Methodology)
  - أخطاء شائعة في الصلاة (Prayer Corrections)
  - شروط قبول العبادة في الإسلام (Worship Conditions)
  - صلاح القلب وأثره في استقامة العمل (Heart Purification)
  - أحكام زيارة القبور وآدابها (Grave Visiting Rules)
  - فضل الاستغفار (Istighfar Virtues)
  - الأمر بالمعروف والنهي عن المنكر (Enjoining Good)
  - لزوم السنة والتحذير من البدع (Following Sunnah)

### 16. Series List Search (Commit: a5041ba)
Added real-time search to `/series` page:
- Search box with magnifier icon and clear button
- Filters by: Arabic title, English title, sheikh name, category
- Arabic normalization (أإآا → ا, ة → ه, ى → ي)
- Shows "X of Y series" count while filtering
- "No results" state with suggestion
- Escape key clears search
- Responsive mobile design

**Files Modified**: `views/public/series.ejs`

### 17. Weekly Schedule Redesign (Commit: 4a55303)
Replaced table-based schedule with modern card design:
- Day tabs (Sat-Fri) for quick navigation
- Session cards showing time, series title, lesson count
- Location toggle (In-Person / Online)
- Disabled state for days with no sessions
- Horizontal scrollable tabs on mobile
- Cards link directly to series pages
- Responsive design for all screen sizes

**Files Modified**: `views/public/index.ejs`

### 18. Schedule Layout A/B Test (Commit: e3139b6)
Added admin setting to switch between new card layout and classic table layout:

**Model** - `models/SiteSettings.js`:
- Added `homepage.scheduleLayout` field: 'cards' (default) or 'table'

**Admin UI** - `views/admin/homepage-config.ejs`:
- Added dropdown to select layout under "Page Sections"
- Options: 🃏 Cards (New) | 📊 Table (Classic)

**Routes**:
- `routes/admin/index.js` - POST handler saves scheduleLayout setting
- `routes/index.js` - Passes scheduleLayout to homepage template

**Template** - `views/public/index.ejs`:
- Conditional rendering based on `homepageConfig.scheduleLayout`
- Table layout: Uses existing CSS for `.schedule-tabs`, `.schedule-table`, `.schedule-panel`
- Card layout: Uses `.schedule-location-toggle`, `.session-cards`, `.day-tab`

**Usage**:
1. Go to Admin > Sections > Homepage Configuration
2. Select "Schedule Layout" option
3. Save settings to switch between layouts

## Pending Tasks

### ACTIVE: Design Redesign Implementation (June 2026)

**Design Source Files**:
- Desktop: `/.claude/uploads/.../Desktop_Redesign.dc.html`
- Mobile: `/.claude/uploads/.../Audio_Archive_Redesign.dc.html`

**Design System Colors (from handoff)**:
```css
--redesign-brown-dark: #2C1508;    /* Primary dark */
--redesign-gold-primary: #C49A3C;  /* Accent gold */
--redesign-gold-light: #DEC99A;    /* Light gold */
--redesign-badge-bg: #E8D5A0;      /* Badge/chip background */
--redesign-sage: #6B7A4E;          /* Hero green gradient */
--redesign-cream-bg: #F5EDE0;      /* Page background */
--redesign-text-mid: #7A5C3A;      /* Mid-tone text */
--redesign-text-muted: #A89070;    /* Muted text */
--redesign-card-bg: #FDF8F2;       /* Card backgrounds */
```

**Typography**: Cairo font family (Google Fonts), weights: 400, 500, 600, 700, 800

---

#### Phase 1: Design System Foundation
**Status**: ✅ COMPLETED (Commit: ec3535d)

1. **Cairo Font Loading** (`views/layout.ejs`)
   - Added Google Fonts preconnect and Cairo import
   - Updated `--font-arabic-display` and `--font-arabic-body` to use Cairo with fallbacks
   - Added `--font-cairo` variable for direct use

2. **CSS Variables** (`public/css/main.css`)
   - Verified all redesign variables exist (lines 773-781)

---

#### Phase 2: Header Navigation
**Status**: ✅ COMPLETED (Commit: ec3535d)

1. **Desktop Header** - Added "مقالات" (Articles) to navigation
   - File: `views/partials/header.ejs`
   - Added between Series and Biography links

2. **Mobile Menu** - Added Articles to hamburger menu
   - File: `views/partials/header.ejs` (mobile section)
   - Same position as desktop

**Admin Impact**: None - nav is not admin-controlled

---

#### Phase 3: Homepage Redesign
**Status**: ✅ COMPLETED (Commits: ec3535d, 2e30b43)

**3.1 Latest Articles Section** ✅
- Card grid: 4 columns desktop, 2 tablet, 1 mobile
- Cards with type badge, date, title, excerpt, "قراءة المقال" link
- Gradient divider above section
- Uses existing `recentArticles` (admin-controlled)

**3.2 Featured Series Section** ✅
- Collapsible gold header (#E8D5A0) with star icon
- Count badge in dark pill
- List items with title, sheikh name, lesson count badge
- Uses first `homepageSection` (admin-controlled)

**3.3 Content Tabs** ✅
- Underline indicator style for tabs
- Compact filter chips with new color scheme
- SVG search icon integrated into filter panel
- Max-width 960px per design

**3.4 Episode Item Styling** ✅ (Commit: e5b2832)
- Episode row layout: gold number badge | title | action buttons
- Compact gold play/download buttons (side by side)
- Hidden episode meta for cleaner mobile design
- Responsive: 768px and 480px breakpoints
- Title truncation with ellipsis

**3.5 Lucide Icons & UI Polish** ✅ (Commits: d54910f, 28eb102, 8fada05, 6b11d62, 2281bff, 0e518c6, 8c9938a)

**CSP Fix** (server.js):
- Added `https://fonts.googleapis.com` to styleSrc
- Added `https://fonts.gstatic.com` to fontSrc  
- Added `https://unpkg.com` to scriptSrc for Lucide icons

**Lucide Icons** (layout.ejs, index.ejs, partials):
- Added Lucide icons library from unpkg CDN
- Replaced ALL emoji icons with Lucide SVG icons:
  - Stats: 🎧→headphones, ✍️→pen-line
  - Tabs: 📚→library, 🎙️→mic, 🕌→building-2
  - Episodes: ⏱️→clock, 📅→calendar, ▶→play, ⬇→download
  - Schedule: 🕌→building-2, 💻→monitor, 📭→inbox
  - Bottom nav: 🏠→home, 📚→library, 🔍→search, ✍️→pen-line, 📅→calendar-days
- Simplified expand button from text ("عرض الدروس ▼") to clean +/- icon

**homepage.js Updates**:
- Updated all dynamic content to use Lucide icons
- Added `refreshIcons()` helper to reinitialize Lucide after dynamic render
- Fixed formatTime scope issue (was in wrong IIFE)
- Styled sort bar with .episode-sort-bar and .sort-chip classes

**Font Fix** (main.css):
- Updated all font-family rules to use `var(--font-cairo)`
- Removed hardcoded Spectral, Cormorant Garamond, Noto Naskh Arabic

**Admin Impact**: All existing admin controls preserved

**3.6 Mobile Layout Fixes** ✅ (Commit: 4b2dc2a)

Six mobile-specific layout improvements:

1. **Horizontal filter scroll** - Filter chips now scroll horizontally on mobile
   - Added `flex-wrap: nowrap; overflow-x: auto` to `.filter-group`
   - Hidden scrollbar with vendor prefixes
   
2. **Remove diamond grid background** - Hidden decorative diagonal pattern on mobile
   - Added `@media (max-width: 768px) { body::before { display: none; } }` to main.css

3. **Episode title text wrapping** - Titles wrap naturally instead of truncating
   - Changed `white-space: normal; overflow: visible;` on `.episode-title`

4. **Icon-only buttons** - Play/Download buttons show only icons on mobile
   - Used `font-size: 0` to hide text labels
   - Set explicit width/height (32px on tablet, 28px on phone)

5. **RTL alignment for articles section** - Fixed header layout
   - Added `flex-direction: row-reverse` to `.featured-articles-header`

6. **RTL layout for featured series** - Fixed flex direction for Arabic text
   - Changed `.featured-series-item` to use `flex-direction: row-reverse`
   - Used `margin-inline-start: auto` for lessons badge positioning

**3.7 Series Cards Design Match** ✅ (Commits: e2c249b, c9601e4, 7255159, 4dcfdca)

Restructured series cards in content tabs to match design specification:

1. **Vertical card layout**:
   - Button (+) on far LEFT
   - Content area with vertical stacking on RIGHT:
     * Title at top (bold, 16px, weight 700)
     * Sheikh name below (lighter, 13px)
     * Lesson count + category badge at bottom right
   
2. **HTML restructure**:
   - Added `.series-content` wrapper div
   - Button moved before content in HTML
   - Sheikh name shown (was hidden)
   - `.series-info` contains lesson count + badge

3. **CSS updates**:
   - `.series-header`: `flex-direction: row-reverse` (button on left)
   - `.series-content`: vertical flex column
   - `.series-info`: `flex-direction: row-reverse; justify-content: flex-start` (right-aligned)
   - `.category-badge`: gold background (#C49A3C) with white text

4. **Dynamic cards** (homepage.js):
   - Updated `createSeriesCard()` to match new structure
   - Minified homepage.min.js

5. **CSP fix**:
   - Added `https://unpkg.com` to `connect-src` for Lucide source maps

**3.8 Mobile Mini-Player** ✅ (Commit: 4dcfdca)

Solved audio player + bottom navigation overlap on mobile:

**Problem**: Sticky audio player and sticky bottom nav overlapped on mobile.

**Solution**: Mini-player that collapses when scrolling.

**Implementation**:
- `views/partials/audioPlayer.ejs`:
  - Added `.mini-player` div with title + play/pause button
  - Mini-player sits above bottom nav (64px from bottom)

- `public/css/audioPlayer.css`:
  - `.audio-player.minimized` state
  - Mini-player styles (compact bar)
  - Expand handle indicator

- `public/js/audioPlayer.js`:
  - `minimize()` / `expand()` methods
  - Scroll listener auto-minimizes on scroll down
  - Click mini-player to expand
  - Play/pause icons sync between mini and full player
  - Auto-expand on desktop resize

**3.9 Critical Bug Fixes** ✅ (Commits: 7112c36, 57b9018)

Three critical issues fixed:

1. **Series-info alignment** - Tags (lesson count + category badge) were left-aligned instead of right-aligned
   - **Root Cause**: `flex-direction: row-reverse` in RTL context reverses back to LTR, making `flex-start` = LEFT
   - **Fix**: Use physical positioning instead - `width: fit-content; margin-left: auto; margin-right: 0`
   - **File**: `views/public/index.ejs` (lines 435-445)
   - **Why physical not logical**: Design requires VISUAL right alignment regardless of writing direction

2. **Mini-player not appearing on mobile** - Clicking play showed full player instead of mini-player
   - **Root Cause**: `show()` removed `hidden` class BEFORE adding `minimized` class, causing flash
   - **Fix**: Refactored `show()` to add `minimized` class first, then remove `hidden`
   - **Additional fix**: Added `!important` to ensure `display: flex` is applied
   - **File**: `public/js/audioPlayer.js`, `public/css/audioPlayer.css`
   - **Debug**: Added console logging to trace show/minimize flow

3. **Audio player layout** - Icons were misaligned and unprofessional
   - **Fix**: Restructured HTML with close button in top-right corner, new `.action-btn` class for secondary controls (speed, volume, download)
   - **Files**: `views/partials/audioPlayer.ejs`, `public/css/audioPlayer.css`

**IMPORTANT**: Always minify after editing JS files:
- `npx terser public/js/audioPlayer.js -o public/js/audioPlayer.min.js --compress --mangle`
- `npx terser public/js/homepage.js -o public/js/homepage.min.js --compress --mangle`

---

#### Phase 4: Series Pages
**Status**: ✅ 4.1 COMPLETED (Commit: 4533b44), 4.2 Pending

**4.1 Series List Page** (`views/public/series.ejs`) ✅
- Grid: 3 columns desktop, 2 tablet, 1 mobile
- Cards with icon, title, subtitle, category badge, lesson count
- New gradient header with gold divider
- Container max-width 960px

**4.2 Series Detail Page** (`views/public/series-detail.ejs`)
- Hero section with gradient
- Stats bar (lesson count + play all button)
- Lesson cards with action buttons
- Status: Pending

---

#### Phase 5: Lecture Player Page
**Status**: Pending

**File**: `views/public/lecture.ejs`
- Mobile redesign already done (earlier commit)
- Desktop: Player card, waveform/progress
- Pending: Desktop styling audit

---

#### Phase 6: Articles Page Audit
**Status**: Pending

**File**: `views/public/articles.ejs`
- Already redesigned in earlier commits
- Audit for: Category filter chips (if needed), pagination styling

---

### Implementation Order (Recommended)
1. Phase 1 (Foundation) - Quick, no functional changes
2. Phase 2 (Header) - Small scope, visible impact
3. Phase 3.1-3.2 (Articles + Featured) - Medium scope, uses existing data
4. Phase 4.1 (Series List) - Already partially done
5. Phase 3.3 (Content Tabs) - New feature, largest scope
6. Phase 4.2, 5, 6 - Polish passes

### Critical Constraints
1. **Do NOT break admin controls** - All dynamic content must continue working
2. **RTL-first** - Base styles are RTL, use `html[dir="ltr"]` for LTR overrides
3. **Mobile-first** - Design is mobile-optimized, scale up for desktop
4. **Test both locales** - Arabic (RTL) and English (LTR) must work

---

### P3 - Enhancements (Remaining)

1. **Cairo Font** (Being addressed in Phase 1)
   - Design uses Cairo from Google Fonts
   - Added to Phase 1 implementation

### 12. Admin Panel for Articles (Phase 1 Complete)
Implemented full article management in admin panel:

**Navigation & Dashboard**:
- Added "Articles" link to `views/admin/partials/header.ejs` (between Manage and Schedule)
- Added articles stats card to dashboard with quick action buttons
- Dashboard shows total articles count alongside lectures, series, sheikhs

**Routes** - `routes/admin/index.js`:
- GET `/admin/articles` - Paginated list with search, filters, sorting
- GET `/admin/articles/new` - Create form
- POST `/admin/articles/new` - Create article
- GET `/admin/articles/:id/edit` - Edit form
- POST `/admin/articles/:id/edit` - Update article
- POST `/admin/articles/:id/delete` - Delete article
- POST `/admin/articles/:id/toggle-published` - Toggle publish status (AJAX)
- POST `/admin/articles/bulk` - Bulk delete/publish/unpublish

**Views Created**:
- `views/admin/articles-list.ejs`:
  - Stats row: Total, Published, Draft, Asdaa count, Telegram count
  - Search by title/summary
  - Filter by type (Asdaa/Telegram), published status
  - Sort by date (newest/oldest), title, last updated
  - Pagination with smart ellipsis
  - Bulk select with checkboxes
  - Actions: Edit, View, Delete
  
- `views/admin/article-form.ejs`:
  - Title (required, RTL)
  - Summary (textarea, RTL)
  - Content (large textarea, RTL)
  - Type dropdown (Asdaa/Telegram)
  - Published date picker
  - Source URL
  - Slug (auto-generated, editable on edit)
  - Is Published checkbox

**i18n Keys Added** - `utils/i18n.js`:
- Arabic & English translations for all article admin strings
- `admin_articles`, `admin_total_articles`, `admin_articles_add`, etc.

**CSS Updates** - `public/css/admin.css`:
- Added `.quick-actions-grid` and `.quick-action-btn` styles

**Files Modified**:
- `routes/admin/index.js` - Added all article routes
- `views/admin/partials/header.ejs` - Added Articles nav link
- `views/admin/dashboard.ejs` - Added articles stat card + quick actions
- `utils/i18n.js` - Added article admin translations
- `public/css/admin.css` - Added quick action button styles

**Tests Created** - `tests/integration/routes/adminArticles.test.js`:
- 37 integration tests covering all admin article routes
- List view: pagination, search, filters (type, status), sorting
- CRUD: create, read, update, delete articles
- Toggle published status
- Bulk operations: delete, publish, unpublish
- Dashboard stats integration
- Authentication requirements
- Graceful skip when MongoDB unavailable (cloud env)

## Key Files Reference

### Models
- `models/Article.js` - Article schema
- `models/Series.js` - Series with shortId, slugs
- `models/Lecture.js` - Lecture with audio
- `models/index.js` - Model exports

### Routes
- `routes/index.js` - Homepage, series, lectures, sheikhs
- `routes/articles.js` - Articles list and detail
- `server.js` - Route registration (line ~275-288)

### Views
- `views/layout.ejs` - Main layout with header, footer, bottom nav
- `views/public/index.ejs` - Homepage (very large, ~3200 lines)
- `views/public/articles.ejs` - Articles list
- `views/public/article-detail.ejs` - Article detail
- `views/partials/bottomNav.ejs` - Mobile bottom navigation
- `views/partials/header.ejs` - Site header
- `views/partials/footer.ejs` - Site footer

### CSS
- `public/css/main.css` - Main styles including redesign variables
- Inline styles in layout.ejs (critical CSS)

## URL Architecture
- Series: `/series/:shortId/:slug_en?/:slug_ar?` (new) or `/series/:idOrSlug` (legacy)
- Lectures: `/lectures/:shortId/:slug_en?/:slug_ar?` (new) or `/lectures/:idOrSlug` (legacy)
- Articles: `/articles` (list) or `/articles/:slugOrId` (detail)

## Caching
Uses `utils/cache.js` with TTLs:
- HOMEPAGE: 300s (5 min)
- SCHEDULE: 300s (5 min)
- ARTICLES: 600s (10 min)
- SERIES_LIST: 600s (10 min)
- SITEMAP: 3600s (1 hour)

## Testing
Tests use MongoDB Memory Server which may fail in this environment due to download restrictions. Unit tests are in `tests/` directory.

## Design Handoff Location
`/tmp/design-handoff/audio-archives-redesign/project/Audio Archive Redesign.dc.html`
Contains all screen mockups and developer notes.
