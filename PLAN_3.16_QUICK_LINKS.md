# Task 3.16: Quick Links / Featured Collections Section

## Overview

Add a "Featured Collections" section on the homepage, positioned directly below the Weekly Class Schedule and before the series Navigation Tabs. This section provides admin-curated quick navigation to grouped content.

---

## Questions to Clarify

1. **Scope of MVP**: Should we start with a simplified version (just links to filtered views) or the full model with individual series/lecture assignments?

2. **Collection Detail Page**: Is `/collections/:slug` necessary for MVP, or can collections simply link to filtered homepage views (e.g., `/?type=archive`)?

3. **Drag-drop reordering**: Is this essential for MVP or can we use simple up/down arrows initially?

---

## Proposed Approach: Simplified MVP

Based on the existing filter system on the homepage (which already supports `archive`, `archive-ramadan`, `online`, `masjid` types), I recommend a **simplified approach** for faster delivery:

### Option A: Filter-Based Collections (Simpler)
- Collections are essentially **saved filters** with custom icons/titles
- Clicking a collection applies that filter to the homepage
- No new public page needed - just homepage filter presets
- Admin manages: title (ar/en), icon, filter type, display order, active status

### Option B: Full Model (As Specified)
- Collections can contain arbitrary series/lectures
- Requires new `/collections/:slug` public page
- More complex admin UI with series/lecture picker
- More flexible but more development work

**My Recommendation**: Start with **Option A** for MVP, then extend to Option B if needed.

---

## Implementation Plan (Option A - MVP)

### Phase 1: Data Model
**File**: `models/FeaturedCollection.js`

```javascript
{
  title: { ar: String, en: String },        // Collection name
  description: { ar: String, en: String },  // Optional subtitle
  icon: String,                              // Emoji (e.g., "📁", "🌙", "✅")
  filterType: String,                        // Maps to existing homepage filter
  // Options: 'archive', 'archive-ramadan', 'online', 'completed', 'custom'
  customFilter: {                            // For 'custom' type only
    category: String,                        // Fiqh, Aqeedah, etc.
    seriesType: String,                      // archive, online, etc.
    search: String                           // Search term
  },
  displayOrder: Number,                      // Sort order (0 = first)
  isActive: Boolean,                         // Show/hide toggle
  backgroundColor: String,                   // Optional custom color
  timestamps: true
}
```

**Estimated count**: 10-15 fields, simple schema

### Phase 2: Admin Routes
**File**: `routes/admin/index.js` (add to existing)

| Route | Method | Description |
|-------|--------|-------------|
| `/admin/collections` | GET | List all collections |
| `/admin/collections/new` | GET | Create collection form |
| `/admin/collections/new` | POST | Create collection |
| `/admin/collections/:id/edit` | GET | Edit collection form |
| `/admin/collections/:id` | POST | Update collection |
| `/admin/collections/:id/delete` | POST | Delete collection |
| `/admin/collections/reorder` | POST | Update display order |

### Phase 3: Admin Views
**Files to create**:

1. `views/admin/collections.ejs` - List page with reorder
   - Table with: Icon, Title (AR), Title (EN), Filter Type, Status, Actions
   - Simple up/down buttons for reordering (not drag-drop for MVP)
   - Add new button

2. `views/admin/collection-form.ejs` - Create/Edit form
   - Title (AR/EN) inputs
   - Description (AR/EN) textareas
   - Icon picker (emoji dropdown or text input)
   - Filter type dropdown
   - Custom filter fields (conditional)
   - Background color picker
   - Active toggle

### Phase 4: Homepage Integration
**File**: `views/public/index.ejs`

Add new section between Weekly Schedule (line ~1097) and Navigation Tabs (line ~1099):

```html
<!-- Featured Collections Section -->
<% if (featuredCollections && featuredCollections.length > 0) { %>
<section class="featured-collections-section">
  <h2 class="section-title">
    📚 <%= locale === 'ar' ? 'المجموعات المميزة' : 'Featured Collections' %>
  </h2>
  <div class="collections-grid">
    <% featuredCollections.forEach(collection => { %>
    <a href="/?filter=<%= collection.filterType %>" class="collection-card">
      <span class="collection-icon"><%= collection.icon %></span>
      <span class="collection-title">
        <%= locale === 'ar' ? collection.title.ar : collection.title.en %>
      </span>
      <span class="collection-count"><%= collection.count %> سلسلة</span>
    </a>
    <% }) %>
  </div>
</section>
<% } %>
```

**CSS**: Add to index.ejs styles (matching brown/gold theme)

### Phase 5: Route Updates
**File**: `routes/index.js`

1. Fetch active collections for homepage
2. Calculate counts for each collection based on filter type
3. Pass to template

### Phase 6: Quick Action Button
**File**: `views/admin/manage.ejs`

Add button: `📚 Collections` → `/admin/collections`

### Phase 7: Cache Invalidation
**File**: `routes/admin/index.js`

Add `invalidateHomepageCache()` after collection CRUD operations.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `models/FeaturedCollection.js` | CREATE | New data model |
| `models/index.js` | EDIT | Export new model |
| `routes/admin/index.js` | EDIT | Add collection routes (~100 lines) |
| `views/admin/collections.ejs` | CREATE | List page (~200 lines) |
| `views/admin/collection-form.ejs` | CREATE | Form page (~250 lines) |
| `views/admin/manage.ejs` | EDIT | Add quick action button |
| `views/public/index.ejs` | EDIT | Add collections section (~50 lines CSS, ~30 lines HTML) |
| `routes/index.js` | EDIT | Fetch collections for homepage (~20 lines) |
| `utils/i18n.js` | EDIT | Add translation keys (~10 keys) |

**Total new code**: ~700-800 lines
**Estimated files**: 3 new, 6 modified

---

## UI Design

### Homepage Section (Desktop - 3 columns)
```
┌─────────────────────────────────────────────────────────────────┐
│  📚 المجموعات المميزة                                            │
├───────────────────┬───────────────────┬───────────────────────┤
│  ┌─────────────┐  │  ┌─────────────┐  │  ┌─────────────────┐  │
│  │     📁      │  │  │     ✅      │  │  │       🌙        │  │
│  │   الأرشيف   │  │  │ سلاسل مكتملة │  │  │  أرشيف رمضان    │  │
│  │  45 سلسلة   │  │  │   12 سلسلة  │  │  │    8 سلسلة      │  │
│  └─────────────┘  │  └─────────────┘  │  └─────────────────┘  │
└───────────────────┴───────────────────┴───────────────────────┘
```

### Homepage Section (Mobile - 1 column, horizontal scroll or stacked)
```
┌─────────────────────┐
│ 📚 المجموعات المميزة │
├─────────────────────┤
│ 📁 الأرشيف - 45     │
├─────────────────────┤
│ ✅ سلاسل مكتملة - 12 │
├─────────────────────┤
│ 🌙 أرشيف رمضان - 8  │
└─────────────────────┘
```

### Card Styling
- Background: Cream (#F5EBE0) with gold border
- Icon: Large (32-40px) emoji
- Title: Scheherazade New, 18px
- Count: Muted text, smaller
- Hover: Subtle lift + gold border glow

---

## Default Collections (Pre-populated)

| Icon | Title (AR) | Title (EN) | Filter |
|------|------------|------------|--------|
| 📁 | الأرشيف | Archive | `archive` |
| 🌙 | أرشيف رمضان | Ramadan Archive | `archive-ramadan` |
| 💻 | عن بُعد | Online Classes | `online` |
| 🕌 | جامع الورود | Masjid Classes | `masjid` |

---

## Testing Checklist

- [ ] Model validation works
- [ ] Admin can create/edit/delete collections
- [ ] Reordering works
- [ ] Collections appear on homepage
- [ ] Clicking collection applies filter
- [ ] RTL/LTR display correct
- [ ] Mobile responsive
- [ ] Cache invalidates on changes
- [ ] Empty state when no collections

---

## Future Enhancements (Not MVP)

1. **Series/Lecture Picker**: Allow selecting specific series/lectures instead of filter-based
2. **Drag-drop Reordering**: Replace up/down buttons with drag-drop
3. **Collection Detail Page**: `/collections/:slug` with custom layout
4. **Seasonal Auto-toggle**: Auto-show/hide based on startDate/endDate
5. **Custom Icons**: Upload custom images instead of emoji only
6. **Analytics**: Track collection click-through rates

---

## Questions for User

1. Is the **filter-based approach** (Option A) acceptable for MVP, or do you need the full series/lecture picker from the start?

2. For reordering, are **up/down arrows** acceptable, or is drag-drop essential?

3. Should clicking a collection **apply the filter on homepage** or **go to a separate page**?

4. Any specific collections you want pre-populated beyond the defaults listed?
