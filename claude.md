# Islamic Audio Lectures Platform - Claude Instructions

<project_overview>
A web platform for hosting and streaming ~160 Arabic Islamic lecture audio files. Users can browse, stream, and download lectures. Admin can upload and manage content via Google OAuth-protected panel.

**Core Mission**: Make Islamic knowledge accessible through high-quality audio lectures with an Arabic-first, mobile-optimized interface.

**Data**: ~160 lectures (~3.4GB total), organized by sheikh and series, hosted on Oracle Cloud Always Free tier.
</project_overview>

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
