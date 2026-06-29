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

## Pending Tasks

### Articles Enhancement
1. **Language & Layout**: Articles content is in Arabic. Even when page language is English, article text must remain Arabic. Layouts must adjust automatically between RTL (Arabic UI) and LTR (English UI) while preserving Arabic article content direction.
2. **Admin Panel**: Implement complete article management:
   - Full editing capabilities (create, update, delete)
   - Sorting functions (by date, title, type)
   - Display/page settings (articles per page, featured articles, visibility)

### Mobile Redesign (from design handoff)
1. **Lecture Player Page**: Move player to top (sticky), remove breadcrumb, add back button
2. **Download/Share buttons**: Below player with `grid-template-columns: 1fr 1fr`
3. **Series List**: Add search field at top
4. **Weekly Schedule**: Replace table with clickable day tabs + session cards
5. **Cairo Font**: Design uses Cairo from Google Fonts (optional)

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
