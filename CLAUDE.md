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

## Pending Tasks

### P1 - SEO Strategy (Remaining)

1. **BreadcrumbList Schema** (Optional)
   - Add breadcrumb structured data to article pages

2. **URL Optimization** (Optional)
   - Ensure all articles have clean Arabic slugs ✅ Auto-generated
   - Canonical URLs ✅ Done

3. **Content Discoverability**
   - Add articles to homepage featured section ✅ Done
   - Create topic/category pages for article groupings (future)
   - Add search functionality within articles (future)

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

### P2 - Important Features

1. **Series List Search**
   - Add search field at top of `/series` page
   - Filter by title (Arabic/English)
   - Real-time filtering

### P3 - Enhancements

1. **Weekly Schedule Redesign**
   - Replace table with clickable day tabs
   - Session cards with lecture info
   - Mobile-friendly layout

2. **Cairo Font** (Optional)
   - Design uses Cairo from Google Fonts
   - Would require font loading strategy update

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
