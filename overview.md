comprehensive plan for your audio streaming website. 
key components:

## Technical Architecture Plan

### Backend Stack
- **Node.js + Express** for the server
- **SQLite** database (lightweight, perfect for Oracle free tier)
- **Passport.js** with Google OAuth for admin authentication
- **Multer** for file uploads
- **express-range** middleware for HTTP range requests (streaming from timestamps)

### Storage Strategy
Given Oracle Cloud Always Free tier limitations:
- **Block Volume**: 200GB total available (more than enough for 3.4GB)
- Store audio files in a dedicated `/audio` directory
- Database stores metadata: filename, title, duration, upload date, file size, mime type

### Frontend Design
- **Vanilla JS** or lightweight framework (Alpine.js or Petite Vue)
- **Tailwind CSS** for modern, responsive design
- Two main interfaces:
  1. **Public Player Interface**: Browse, stream, download
  2. **Admin Panel**: Upload management, file organization

### Key Features to Implement

#### Public Interface
- **Grid/List view** of all audio files with cover art placeholders
- **Custom audio player** with:
  - Play/pause, seek bar, volume control
  - Current time / total duration
  - Playback speed control
  - Download button per track
- **Search/filter** functionality
- **Responsive design** (mobile-friendly)

#### Admin Panel (Google Auth Protected)
- **Login page** with "Sign in with Google"
- **Upload interface**:
  - Drag & drop or file picker
  - Progress bar for uploads
  - Bulk upload support
  - File validation (type, size)
- **Management dashboard**:
  - List all files with edit/delete options
  - Add metadata (title, description, tags)
  - View storage usage
  - Upload history

#### Streaming Capabilities
- **HTTP Range requests** support for:
  - Seeking to specific timestamps
  - Bandwidth-efficient streaming
  - Resume capability
- **Stream endpoint**: `/api/stream/:fileId?start=timestamp`

### Database Schema (SQLite)

```
Audio Files Table:
- id (primary key)
- filename (original)
- stored_filename (sanitized)
- title
- description
- duration (seconds)
- file_size (bytes)
- mime_type
- upload_date
- uploader_email
- play_count
- tags (JSON)

Admin Users Table:
- id
- google_id
- email
- name
- profile_picture
- last_login
- is_active
```

### File Structure
```
project/
├── server.js (main Express app)
├── config/
│   ├── database.js
│   ├── google-auth.js
│   └── storage.js
├── routes/
│   ├── public.js (browse, stream, download)
│   ├── admin.js (upload, manage)
│   └── auth.js (Google OAuth)
├── middleware/
│   ├── auth.js (verify admin)
│   └── stream.js (range requests)
├── models/
│   └── audio.js (database operations)
├── uploads/ (audio files storage)
├── public/
│   ├── index.html (public player)
│   ├── admin.html (admin panel)
│   ├── css/
│   └── js/
│       ├── player.js
│       └── admin.js
└── package.json
```

### Oracle Cloud Deployment Strategy

**Instance Configuration:**
- **Compute**: VM.Standard.E2.1.Micro (1 OCPU, 1GB RAM) - Always Free
- **Block Storage**: Attach 50GB block volume for audio files
- **OS**: Ubuntu 22.04 LTS

**Setup Steps:**
1. Set up firewall rules (ports 80, 443, 22)
2. Install Node.js, PM2 (process manager)
3. Set up Nginx as reverse proxy
4. Configure SSL with Let's Encrypt (free)
5. PM2 to keep Node app running
6. Mount block volume to `/mnt/audio`

### Security Considerations
- **Rate limiting** on all endpoints
- **File type validation** (only audio: mp3, wav, m4a, flac, ogg)
- **File size limits** enforced (60MB max)
- **Sanitize filenames** to prevent directory traversal
- **CORS** properly configured
- **Helmet.js** for HTTP security headers
- **Session management** with secure cookies
- **Google OAuth** whitelist specific admin emails

### Performance Optimizations
- **Streaming** uses chunked transfer for memory efficiency
- **Gzip compression** for API responses
- **Static file caching** headers
- **Database indexing** on frequently queried fields
- **Lazy loading** for audio list on frontend
- **Service worker** for offline capability (optional)

### UI/UX Design Concepts

**Color Scheme**: Modern dark/light mode toggle
- Primary: Deep blue/purple gradient
- Accent: Vibrant orange/pink
- Background: Dark charcoal or clean white

**Public Player Page:**
- Hero section with site title/description
- Audio library grid with album-art style cards
- Sticky player bar at bottom
- Smooth animations and transitions

**Admin Panel:**
- Clean dashboard with statistics cards
- Drag-drop upload zone (prominent)
- Table view of all files with actions
- Modal dialogs for edit/delete confirmations

### Development Phases

**Phase 1**: Backend Core (Days 1-2)
- Express server setup
- SQLite database initialization
- File upload endpoint with Multer
- Basic CRUD operations

**Phase 2**: Streaming & Auth (Days 3-4)
- HTTP range request handling
- Google OAuth integration
- Admin middleware protection
- Download endpoints

**Phase 3**: Frontend Public (Days 5-6)
- Public player interface
- Custom audio player component
- Browse/search functionality
- Responsive design

**Phase 4**: Admin Panel (Days 7-8)
- Admin dashboard UI
- Upload interface with progress
- File management features
- Metadata editing

**Phase 5**: Deployment & Testing (Days 9-10)
- Oracle Cloud setup
- Nginx configuration
- SSL setup
- End-to-end testing
- Performance optimization
