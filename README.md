# Wurud — Islamic Audio Archive

Server-rendered archive of Islamic lectures, series, articles, and PDF publications.
Node.js / Express / EJS / MongoDB, with audio + PDFs hosted on Cloudflare R2 (and legacy OCI).

> **Production database.** Do not run destructive operations. See `CLAUDE.md` for full, up-to-date
> project context and the current work log (start at the **"📌 RESUME HERE"** section).

---

## Two-Realm Architecture

The site hosts **two scholars in fully separated realms** — zero content bleed:

| Realm | Scholar | Palette | Routes |
|-------|---------|---------|--------|
| **Hasan** (default) | الشيخ حسن بن محمد الدغريري (حفظه الله) | Gold / Brown (`#C49A3C` / `#2C1508`) | `/`, `/series`, `/browse`, `/articles`, `/sheikhs`, … |
| **Najmi** | العلامة أحمد بن يحيى النجمي (رحمه الله) | Teal / Emerald (`#2E6E5B` / `#14231D`) | `/najmi`, `/najmi/series`, `/najmi/library`, … |

- **Realm detection**: `middleware/realm.js` sets `res.locals.realm` (`najmi` for `/najmi/*`, else `hasan`).
- **Theming**: `public/css/najmi.css` — all teal overrides scoped to `[data-realm="najmi"]` (Hasan CSS untouched).
- **Isolation**: `utils/realmFilter.js` keeps Najmi content out of the default-side queries; Najmi routes filter
  strictly by the Najmi `sheikhId` (resolved + cached by `utils/najmiSheikh.js`).
- **Cross-links**: teal invite banner under Hasan's hero → `/najmi`; the Najmi header "Home" returns to `/`.

`/najmi` is a single **Content page** (Hero → About the Sheikh → series grouped by category). The 116 PDFs live
in `/najmi/library` (searchable row list, 4 categories: الكتب · التعليقات · الرسائل · من السيرة الذاتية).

---

## Project Layout

```
server.js                 Express app, middleware order, route registration
middleware/realm.js       res.locals.realm (najmi | hasan)
models/                   Lecture, Series, Sheikh, Section, Publication, Article, SiteSettings, …
routes/
  index.js                homepage, /series, /browse, /sheikhs, sitemap.xml
  najmi/index.js          the entire /najmi realm (content, series, library, downloads)
  admin/index.js          admin panel (single file; ~3.5k lines)
  api/homepage.js         homepage content tabs (lazy-loaded)
utils/
  najmiSheikh.js          resolve + cache the Najmi sheikh
  realmFilter.js          exclude Najmi from default-side queries
  sheikhName.js           title-prefix formatting (no double-titling)
  cache.js                in-memory getOrSet + pattern invalidation
views/
  layout.ejs              public layout: realm-aware SEO (OG + JSON-LD), head
  najmi/*.ejs             teal realm pages (index=Content, series, library, bio)
  admin/*.ejs             admin pages (each a full HTML doc; rendered with layout:false)
  public/*.ejs            Hasan realm pages
public/css/               main.css (Hasan) + najmi.css (teal overrides) + admin.css
scripts/                  import + maintenance scripts (see docs/IMPORT_WORKFLOW.md)
docs/najmi-bio.md         source-accurate biography (used on /najmi + Sheikh record)
```

---

## Setup & Run

```bash
npm install
cp .env.example .env        # fill in MONGODB_URI, R2_*, session, OAuth, Telegram, etc.
npm run dev                 # nodemon
npm start                   # production
npm test                    # jest (unit + integration; integration needs MongoMemoryServer)
```

Key env vars: `MONGODB_URI`, `SESSION_SECRET`, `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` /
`R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_PUBLIC_URL`, Google OAuth, `TELEGRAM_*`.

**Deploy**: Render, built from git. The filesystem is **ephemeral** — assets (e.g. OG images) must be committed
to `public/`, not uploaded to the running container.

---

## Content Import

Full workflow in **`docs/IMPORT_WORKFLOW.md`**. Najmi-specific scripts:

```bash
# Audio (real per-lecture titles preserved; auto-creates series with category mapping)
node scripts/import-najmi-lectures.js lectures_metadata_final.csv --batch najmi
node scripts/upload-to-r2-local.js /path/to/audio --skip-existing      # then verify + publish
# PDFs (recurses sub-folders; flat R2 keys under pdf/)
node scripts/upload-pdfs-to-r2.js /path/to/pdfs --skip-existing
node scripts/import-publications.js --catalog pdf_catalog_updated.csv --manifest pdf-upload-manifest.json
```

---

## SEO

- **Sitemap** `GET /sitemap.xml` includes both realms (Najmi guarded by `getNajmiSheikh()`).
- **OpenGraph + JSON-LD** are realm-aware in `views/layout.ejs`: distinct Person `@id` IRIs
  (`#person-hasan` / `#person-najmi`); Najmi emits `CollectionPage` + `Person`.
- **OG images** (`public/og-hasan.png`, `public/og-najmi.png`, 1200×630): must be committed to the repo;
  keep **< ~300 KB** for WhatsApp previews. Validate JSON-LD via `validator.schema.org` (Code-snippet tab —
  Cloudflare challenges third-party fetchers), preview social cards via the Facebook Sharing Debugger.

---

## Conventions

- **RTL-first**: base CSS is Arabic/RTL; LTR overrides use `html[dir="ltr"]`. Do not add `[dir="rtl"]` overrides.
- **Minify JS after edits**: `npx terser public/js/<f>.js -o public/js/<f>.min.js --compress --mangle`.
- **Do not disturb the Hasan palette**; scope realm styling to `[data-realm="najmi"]`.
- Detailed history, decisions, and the live TODO list live in **`CLAUDE.md`**.
