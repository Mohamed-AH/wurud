# Wurud Project Notes

## Recent Fixes

### Transcript Timestamp Seeking (2026-03-11)
- **Issue**: Clicking timestamps in transcript view caused error: "Failed to set the 'currentTime' property on 'HTMLMediaElement': The provided double value is non-finite"
- **Root cause**: `AudioPlayer.seek(e)` expected an event object with `clientX`, but `seekToTime(seconds)` was passing a number directly
- **Fix**: Added `seekToTime(seconds)` method to AudioPlayer that validates input and handles audio readiness
- **Files changed**:
  - `public/js/audioPlayer.js` - Added `seekToTime()` method
  - `public/js/audioPlayer.min.js` - Minified version updated
  - `views/public/lecture.ejs` - Updated to call `seekToTime()` instead of `seek()`

## Search Functionality

### Current Status
- Full-text search implemented using MongoDB Atlas Search
- Separate `searchdb` database with transcript segments
- Search API at `/api/search`
- Search page at `/search`

### Components
- **Backend**: `routes/search.js`, `routes/api/lectures.js`
- **Frontend**: `public/js/search.js`, `views/public/search.ejs`
- **Models**: `models/Transcript.js` (connects to searchdb)

### Features
- Arabic text search with diacritics handling
- Search results show matching transcript segments with timestamps
- Click-to-play functionality for search results
- Pagination support

### Known Issues
- None currently tracked

## Audio Player

### Features
- Sticky player that persists across page navigation
- Play/pause, skip forward/back (15s)
- Progress bar with drag support (mouse and touch)
- Playback speed control (0.5x to 2x)
- Volume control with mute toggle
- Keyboard shortcuts (Space, Arrow keys, M)
- Position saving per lecture (localStorage)
- Duration verification with server

### Methods
- `play(lectureId, lectureData)` - Start playing a lecture
- `seekToTime(seconds)` - Seek to specific time (validates input)
- `seek(e)` - Seek based on mouse/touch event on progress bar
- `skip(seconds)` - Skip forward/backward by seconds
- `togglePlayPause()` - Toggle play/pause state

## Development Notes

### Branch
- Working branch: `claude/fix-homepage-tests-ovChk`

### Testing
- Unit tests: `npm run test:unit`
- Integration tests: `npm run test:integration`
- E2E tests: `npm run test:e2e`
