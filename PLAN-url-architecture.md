# URL Architecture & Slug Management - Implementation Plan

## Current State Analysis

### Existing Infrastructure
- **Lecture Model** (`models/Lecture.js`): Has a `slug` field (unique, sparse indexed)
- **Series Model** (`models/Series.js`): Has a `slug` field (unique, sparse indexed)
- **No shortId field exists** in any model
- **Only single slug** field exists (no `slug_en`/`slug_ar` separation)
- **Existing slugify utility** (`utils/slugify.js`): Transliterates Arabic to Latin
- **Current URL Pattern**: `/lectures/:idOrSlug` - accepts either ObjectId or slug
- **Existing redirect logic**: `utils/findByIdOrSlug.js` handles 301 redirects from ID to slug

### Current URL Examples
```
/lectures/679c1234abc...   (ObjectId - ugly)
/lectures/sharh-altawhid-adars-5  (transliterated Arabic - no Arabic slug)
```

### Problem
- No `shortId` for clean, permanent identifiers
- Raw Arabic in URLs causes social media encoding issues
- Missing dual-language slug structure

---

## Proposed URL Pattern

```
/lectures/:shortId/:slug_en/:slug_ar
```

**Example:**
```
/lectures/102/explanation-of-tawhid-lesson-5/شرح-التوحيد-الدرس-5
```

**Benefits:**
- `102` is permanent, human-readable, shareable
- English slug is SEO-friendly and social-media safe
- Arabic slug provides native readability
- Controller queries by `shortId` only (fast, indexed)

---

## Implementation Phases

### Phase 1: Database Schema Updates

#### 1.1 Add `shortId` to Lecture Model
```javascript
// models/Lecture.js
shortId: {
  type: Number,
  unique: true,
  index: true,
  required: true
}
```

#### 1.2 Add Dual Slug Fields to Lecture Model
```javascript
slug_en: {
  type: String,
  trim: true,
  index: true
},
slug_ar: {
  type: String,
  trim: true,
  index: true
}
```

#### 1.3 Add Counter Collection for Auto-Incrementing shortId
```javascript
// models/Counter.js
const counterSchema = new mongoose.Schema({
  _id: String,  // e.g., 'lecture'
  seq: { type: Number, default: 0 }
});
```

#### 1.4 Similar Updates for Series & Sheikh Models
- Add `shortId` to Series model
- Add `shortId` to Sheikh model
- Add dual slugs if needed for Series/Sheikh

---

### Phase 2: Slug Generation Logic

#### 2.1 Update `utils/slugify.js`

**Add New Functions:**
```javascript
// Generate English slug (transliterated from Arabic)
function generateSlugEn(text) {
  return transliterateArabic(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Generate Arabic slug (kebab-case Arabic)
function generateSlugAr(text) {
  return text
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FF\u0750-\u077F0-9-]/g, '') // Keep Arabic + numbers + hyphens
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
```

#### 2.2 Mandatory English Slug Logic
```javascript
// Before save middleware
lectureSchema.pre('save', async function(next) {
  // Auto-generate slug_en if missing
  if (!this.slug_en) {
    if (this.titleEnglish) {
      this.slug_en = generateSlugEn(this.titleEnglish);
    } else {
      // Fallback: transliterate Arabic title
      this.slug_en = generateSlugEn(this.titleArabic);
    }
    // Ultimate fallback: use shortId
    if (!this.slug_en) {
      this.slug_en = `lecture-${this.shortId}`;
    }
  }

  // Auto-generate slug_ar if missing
  if (!this.slug_ar && this.titleArabic) {
    this.slug_ar = generateSlugAr(this.titleArabic);
  }

  next();
});
```

---

### Phase 3: Routing Updates

#### 3.1 Update `routes/index.js`

**Add New Route Pattern:**
```javascript
// New route: /lectures/:shortId/:slug_en?/:slug_ar?
router.get('/lectures/:shortId/:slug_en?/:slug_ar?', async (req, res) => {
  const { shortId, slug_en, slug_ar } = req.params;

  // Query by shortId only (numeric, indexed)
  const lecture = await Lecture.findOne({ shortId: parseInt(shortId, 10) })
    .populate('sheikhId', 'nameArabic nameEnglish honorific slug shortId')
    .populate('seriesId', 'titleArabic titleEnglish slug shortId')
    .lean();

  if (!lecture || !lecture.published) {
    return res.status(404).send('Lecture not found');
  }

  // SEO Redirect: if slugs don't match current values, 301 redirect
  const correctSlugEn = lecture.slug_en;
  const correctSlugAr = lecture.slug_ar;

  if (slug_en !== correctSlugEn || slug_ar !== correctSlugAr) {
    const correctUrl = `/lectures/${shortId}/${correctSlugEn}/${encodeURIComponent(correctSlugAr)}`;
    return res.redirect(301, correctUrl);
  }

  res.render('public/lecture', {
    title: lecture.titleArabic,
    lecture,
    canonicalPath: `/lectures/${shortId}/${correctSlugEn}/${encodeURIComponent(correctSlugAr)}`
  });
});

// Keep legacy route for backwards compatibility
router.get('/lectures/:idOrSlug', async (req, res) => {
  // ... existing logic ...
  // If found, 301 redirect to new URL format
  if (lecture) {
    const newUrl = `/lectures/${lecture.shortId}/${lecture.slug_en}/${encodeURIComponent(lecture.slug_ar)}`;
    return res.redirect(301, newUrl);
  }
});
```

#### 3.2 Similar Updates for Series Routes
```
/series/:shortId/:slug_en/:slug_ar
```

---

### Phase 4: Open Graph & Metadata Updates

#### 4.1 Update `views/layout.ejs`

**Enhanced OG Tags:**
```html
<!-- Open Graph / Facebook -->
<meta property="og:type" content="<%= typeof lecture !== 'undefined' ? 'article' : 'website' %>">
<meta property="og:url" content="https://rasmihassan.com<%= canonicalPath %>">
<meta property="og:title" content="<%= title %>">
<meta property="og:description" content="<%= typeof lecture !== 'undefined' && lecture.descriptionArabic ? lecture.descriptionArabic.substring(0, 200) : 'الموقع الرسمي للشيخ حسن بن محمد الدغريري' %>">
<meta property="og:locale" content="ar_SA">
<meta property="og:locale:alternate" content="en_US">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:url" content="https://rasmihassan.com<%= canonicalPath %>">
<meta name="twitter:title" content="<%= title %>">
```

#### 4.2 Add Lecture-Specific OG Tags in `views/public/lecture.ejs`
```html
<%# Override layout OG tags for lecture-specific metadata %>
<%
  const ogTitle = lecture.titleArabic;
  const ogDesc = lecture.descriptionArabic || lecture.seriesId?.titleArabic || '';
  const ogUrl = `https://rasmihassan.com/lectures/${lecture.shortId}/${lecture.slug_en}/${encodeURIComponent(lecture.slug_ar)}`;
%>
```

---

### Phase 5: Frontend Share/Copy Link Updates

#### 5.1 Update `views/public/lecture.ejs` Share Function

```javascript
function shareLecture() {
  // Construct clean URL using new format
  const shortId = '<%= lecture.shortId %>';
  const slugEn = '<%= lecture.slug_en %>';
  const slugAr = encodeURIComponent('<%= lecture.slug_ar %>');
  const url = `${window.location.origin}/lectures/${shortId}/${slugEn}/${slugAr}`;

  const title = '<%= lecture.titleArabic.replace(/'/g, "\\'") %>';

  if (navigator.share) {
    navigator.share({ title, url });
  } else {
    navigator.clipboard.writeText(url).then(() => {
      alert('<%= locale === "ar" ? "تم نسخ الرابط!" : "Link copied!" %>');
    });
  }
}
```

#### 5.2 Update `public/js/share.js`
Add utility function for constructing lecture URLs.

---

### Phase 6: Migration Script

#### 6.1 Create Migration Script: `scripts/migrate-url-architecture.js`

```javascript
/**
 * Migration Script for URL Architecture
 *
 * Tasks:
 * 1. Assign unique shortIds to all lectures
 * 2. Generate slug_en for all lectures
 * 3. Generate slug_ar for all lectures
 * 4. Same for Series
 */

async function migrate() {
  // 1. Initialize counter
  await Counter.findByIdAndUpdate(
    'lecture',
    { $setOnInsert: { seq: 0 } },
    { upsert: true }
  );

  // 2. Get all lectures without shortId
  const lectures = await Lecture.find({ shortId: { $exists: false } })
    .populate('seriesId')
    .sort({ createdAt: 1 });

  console.log(`Found ${lectures.length} lectures to migrate`);

  for (const lecture of lectures) {
    // Get next shortId
    const counter = await Counter.findByIdAndUpdate(
      'lecture',
      { $inc: { seq: 1 } },
      { new: true }
    );

    // Generate slugs
    const slug_en = generateSlugEn(lecture.titleEnglish || lecture.titleArabic);
    const slug_ar = generateSlugAr(lecture.titleArabic);

    await Lecture.updateOne(
      { _id: lecture._id },
      {
        $set: {
          shortId: counter.seq,
          slug_en: slug_en || `lecture-${counter.seq}`,
          slug_ar: slug_ar
        }
      }
    );

    console.log(`Migrated: ${counter.seq} - ${lecture.titleArabic}`);
  }
}
```

---

## File Changes Summary

| File | Changes |
|------|---------|
| `models/Lecture.js` | Add `shortId`, `slug_en`, `slug_ar` fields + pre-save middleware |
| `models/Series.js` | Add `shortId`, `slug_en`, `slug_ar` fields |
| `models/Counter.js` | New file for auto-increment counter |
| `utils/slugify.js` | Add `generateSlugEn()`, `generateSlugAr()` functions |
| `utils/findByIdOrSlug.js` | Update to handle new shortId lookups |
| `routes/index.js` | Add new route pattern + legacy redirect |
| `views/layout.ejs` | Enhanced OG meta tags |
| `views/public/lecture.ejs` | Update share function + add lecture-specific OG tags |
| `public/js/share.js` | Add URL construction utilities |
| `scripts/migrate-url-architecture.js` | New migration script |

---

## Testing Checklist

- [ ] shortId auto-increments correctly for new lectures
- [ ] slug_en is always present (never empty)
- [ ] slug_ar preserves Arabic characters correctly
- [ ] SEO redirects work (old URLs → new URLs with 301)
- [ ] Legacy ObjectId URLs redirect to new format
- [ ] Open Graph previews show correctly on WhatsApp/Facebook/Twitter
- [ ] Share button copies clean URL
- [ ] Sitemap generates correct new URLs
- [ ] No duplicate shortIds after migration
- [ ] No duplicate slugs conflict

---

## Rollback Plan

1. Keep `slug` field (don't delete immediately)
2. Add feature flag to switch between old/new routing
3. Maintain legacy route handler for backwards compatibility
4. Database migration is additive (doesn't delete data)

---

## Questions to Clarify

1. **shortId format**: Should it be numeric (`102`) or alphanumeric (`xJ9v2`)?
   - Numeric is simpler and more memorable
   - Alphanumeric is shorter for large datasets

2. **Series URLs**: Apply same pattern to series? `/series/:shortId/:slug_en/:slug_ar`

3. **Existing slugs**: What to do with current `slug` field?
   - Option A: Migrate to `slug_en` and delete
   - Option B: Keep as fallback for legacy links

4. **URL Priority**: Which comes first - English or Arabic slug?
   - Suggested: English first (social media safe)
