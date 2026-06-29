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

### 4. RTL Layout Fixes (Commit: 8daa5d9)
Fixed Arabic mobile layout issues:

**Search Hero Section** - `views/public/index.ejs`:
- Added `[dir="rtl"]` CSS selectors for text alignment and padding
- Fixed text overflow/clipping in search hero quote and subheading
- Proper padding for RTL at 768px, 480px, and 360px breakpoints

**Header & Logo** - `views/layout.ejs`:
- RTL header content flex-direction: row-reverse
- Logo overflow handling for Arabic text
- Mobile nav slides from left in RTL mode

**Bottom Navigation** - `views/partials/bottomNav.ejs`:
- Set `direction: ltr` to keep icon order consistent
- Added `min-width: 0` for flex item shrinking
- Horizontal padding to prevent overflow

**Other Fixes**:
- Navigation tabs RTL direction
- Filter chips RTL alignment
- Title search input icon positioning for RTL
- Removed redundant categories grid section

## Pending Tasks

### Articles Import
User has 338 articles to import. Need JSON file path, then run:
```bash
node scripts/import-articles.js /path/to/articles.json
```

### Additional Mobile Redesign (from design handoff)
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
