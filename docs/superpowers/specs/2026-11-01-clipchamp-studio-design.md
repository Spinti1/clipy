# Clipy Studio: Clipchamp-Style Online Video Editor Specification

## 1. Intent & Context
Clipy is expanding from an automated AI video downloader/translator into a complete, modern web-based video editor inspired by **Microsoft Clipchamp** (Fluent Dark UI). The editor supports both normal 5–10 minute long-form videos (with split, cut, trimming, multi-track audio/subtitles) and 1-minute viral vertical shorts (TikTok/Reels/Shorts) with precision settings.

All legacy AI features (neural voice translation, word-by-word karaoke subtitles, blur bounding boxes, and top title capsule) remain fully intact and are adapted into this studio as first-class native timeline tools and a dedicated "Generator Rapid" workspace section.

## 2. Architectural Decisions & Scope

### 1. Timeline Composition Model: Precision Video EDL
- The timeline operates as an Edit Decision List (EDL) on the imported/generated video.
- Users can scrub, split at any timestamp (`S` key or button), trim in/out points, and delete dead/boring sections (or use 1-click Auto-Cut silence).
- Playback in browser is instant and non-blocking using continuous interval mapping on the `<video>` element.

### 2. Lockstep Multi-Track Ripple Synchronization
- When a video slice is cut, trimmed, or deleted, its corresponding voiceover cues and karaoke subtitles split and ripple-shift in lockstep.
- This guarantees that AI dubbing and subtitles never desynchronize from the video action.
- Individual subtitle and audio properties (volume, style, text) remain independently editable in the Inspector panel.

### 3. Production Infrastructure: Hybrid Architecture
- **Frontend:** Hosted on Vercel (`https://clipy.space` and `https://clipy-mocha.vercel.app`), serving the static SPA assets.
- **Backend:** Node.js + system FFmpeg + Python (`server.js`) running on dedicated host / tunnel, communicating via CORS with automatic `API_BASE` resolution.

### 4. Persistence Model: Client-Side Autosave
- Timeline tracks, edit points, subtitle styles, and tool settings are continuously autosaved to browser `localStorage` / `IndexedDB`.
- If the user reloads or returns later, the project state restores instantly without requiring complex database account logins.

### 5. Aspect Ratio & Video Framing: Smart Auto-Fit
- Toggling between `9:16`, `16:9`, and `1:1` automatically adjusts canvas viewports.
- Standard letterboxing or blurred zoomed background (configured via Mask tool) fills the canvas without distorting the video.

## 3. UI Component Structure
1. **Top Navbar (50px):**
   - Brand logo (Clipy Studio).
   - Editable project title.
   - Undo/Redo (`↶` / `↷`).
   - Aspect ratio selector (`9:16`, `16:9`, `1:1`).
   - Save status indicator.
   - Export 1080p button.
2. **Left Tool Ribbon (60px):**
   - Pure SVG vector icons: `AI Studio`, `Media`, `Subtitrări`, `Măști/Blur`, `Audio`, and `Generator Rapid`.
3. **Left Flyout Drawer (270px):**
   - For `Generator Rapid`: hosts the legacy quick-paste URL & voice settings panel, feeding directly into the studio.
   - For `AI Studio`: neural voiceover selector, karaoke subtitle preset generator, auto-silence cut.
   - For `Media`: dropzone for file upload and YouTube link input.
4. **Center Preview Canvas:**
   - 9:16 / 16:9 aspect-ratio player with smooth rounded corners and dark shadow.
   - Interactive transform bounding box with 8 handles for repositioning subtitles and blur masks.
   - Floating glassmorphism playback control pill (`⏮ 5s`, `▶`, `5s ⏭`, `JetBrains Mono` timecode, volume, fullscreen).
5. **Right Property Inspector (250px):**
   - Contextual tabs for Subtitles (preset cards, position slider, size, all-caps toggle), Audio (voiceover volume vs original video balance), and Speed.
6. **Bottom Multi-Track Timeline (195px):**
   - Toolbar: Split at cursor (`S`), Delete, Duplicate, Magnet snap, zoom slider, fit to width.
   - Time ruler with second tick marks.
   - Draggable scrubber playhead needle.
   - Track 1: Subtitle capsules.
   - Track 2: Video clip with filmstrip frames.
   - Track 3: Audio track with vector waveform.
   - Track 4: Blur & mask areas.

## 4. Verification & Testing Plan
- Execute complete automated test suite (`npm test`).
- Test video splitting and playback seeking across intervals.
- Verify 1:1 WYSIWYG export via FFmpeg.
- Deploy frontend to Vercel production (`npx vercel --prod --yes`).
