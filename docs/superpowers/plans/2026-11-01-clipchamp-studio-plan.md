# Clipy Studio: Clipchamp-Style Video Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Clipy into a sleek, professional web-based video editor inspired by Microsoft Clipchamp Fluent Dark UI, featuring a multi-track timeline (split/cut/trim), while integrating the legacy AI translation and video generation tools into the new studio shell, and deploy the verified build to Vercel on `clipy.space`.

**Architecture:** The client frontend SPA is modernized into a Clipchamp-style workspace composed of a Top Navbar, a 60px left ribbon, a 270px expandable drawer (housing AI Tools, Media, and the adapted legacy generator), a cinema canvas player with aspect ratio presets and draggable bounding boxes, a right inspector panel, and a multi-track timeline controller managing synchronized playback across edit slices. The backend remains a high-performance FFmpeg rendering engine producing 1:1 WYSIWYG MP4 exports.

**Tech Stack:** Vanilla JavaScript (ES6+), CSS3 with Fluent Dark custom properties, HTML5 Video & Audio APIs, SVG Vector graphics, Node.js, Express, FFmpeg, Vercel CLI.

**Spec:** `docs/superpowers/specs/2026-11-01-clipchamp-studio-design.md`

## Global Constraints
- No emojis anywhere in the user interface — use only clean, crisp SVG vector icons.
- Primary typography: `Plus Jakarta Sans` for UI copy and `JetBrains Mono` for timecodes.
- Fluent Dark color palette: obsidian base (`#0c0d12`), panel surface (`#13151c`), card background (`#1f222e`), borders (`rgba(255, 255, 255, 0.08)`), and purple accent (`#7c3aed`).
- All existing AI features (translated speech synthesis, karaoke subtitles, blur boxes, title pill) must function seamlessly in the studio.
- Complete automated test suite (`npm test`) must pass with 0 failures before deployment.

## Review Focus
- Slicing/splitting video must maintain lockstep synchronization with karaoke subtitles and audio.
- Video aspect ratio changes (`9:16`, `16:9`, `1:1`) must properly update player canvas without distortion.
- Legacy generator workflow must remain accessible and cleanly launch processing jobs directly into the studio timeline.
- Timeline scrubber dragging must seek video smoothly without frame jitter.
- Exported MP4 must match the preview editor visually 1:1 and trigger direct download to disk.

---

### Task 1: Fluent Dark CSS Design System & Typography
**Files:**
- Modify: `public/css/style.css`
- Modify: `public/index.html`

- [ ] Import Google Fonts (`Plus Jakarta Sans` and `JetBrains Mono`).
- [ ] Define Fluent Dark root variables (`--bg-canvas`, `--bg-surface`, `--bg-drawer`, `--accent-purple`, `--accent-emerald`, `--border-subtle`).
- [ ] Style studio layout grid containers (Top bar, Left rail, Drawer, Stage, Inspector, Timeline).
- [ ] Add SVG button styles, range sliders, and active track styles.

### Task 2: Studio Shell, SVG Icons & Workspace Grid
**Files:**
- Modify: `public/index.html`

- [ ] Structure top navbar: logo, project title input, undo/redo buttons, aspect ratio dropdown (`9:16`, `16:9`, `1:1`), cloud status, and Export MP4 button.
- [ ] Implement 60px left ribbon with vector SVG icons (`AI Studio`, `Media`, `Subtitrări`, `Măști`, `Audio`, `Generator Rapid`).
- [ ] Implement 270px flyout drawer supporting multiple tab views.
- [ ] Assemble center cinema canvas with floating transport bar and aspect ratio container.
- [ ] Assemble right-hand contextual inspector panel.

### Task 3: Interactive Multi-Track Timeline Controller
**Files:**
- Create: `public/js/timeline.js`
- Modify: `public/index.html`

- [ ] Build timeline state model: intervals `[{ inPoint, outPoint }]`, current playhead time, zoom level, and active clip selection.
- [ ] Implement time ruler with second tick marks based on zoom.
- [ ] Implement draggable playhead needle that scrubs video playback.
- [ ] Implement Split at cursor (`S` key shortcut) to divide the active video interval into two contiguous segments.
- [ ] Implement Delete segment and ripple-shift remaining intervals.
- [ ] Render 4 visual tracks: Subtitles, Video with thumbnail frames, AI Dubbing with SVG waveform, and Blur masks.

### Task 4: Integrate & Adapt Legacy Generator into Studio Drawer
**Files:**
- Modify: `public/js/setupPanel.js`
- Modify: `public/index.html`

- [ ] Adapt legacy quick generator form into the `Generator Rapid` drawer tab (URL paste, platform detection, voice selector, speed, submit).
- [ ] When a job completes, automatically load the resulting video, subtitles, and audio into Clipy Studio workspace and timeline.
- [ ] Maintain batch processing and card history in the drawer's sub-panel.

### Task 5: Contextual Inspector & Stage Player Bounding Box
**Files:**
- Modify: `public/js/stagePlayer.js`

- [ ] Update stage player to handle aspect ratio toggles (`9:16` vertical, `16:9` widescreen, `1:1` square) seamlessly.
- [ ] Render interactive selection bounding box around active subtitles/blur areas on the video player.
- [ ] Wire right inspector tabs (Subtitles, Audio, Speed) to update timeline state and live preview in real time.

### Task 6: Direct Video Export & Downloader Integration
**Files:**
- Modify: `public/js/videoExporter.js`
- Modify: `src/videoDownloader.js`

- [ ] Ensure `videoExporter.js` packages timeline interval cuts and tools payload.
- [ ] Verify FFmpeg renders split segments, karaoke active words, and title capsule with exact 1:1 WYSIWYG match.
- [ ] Retain direct browser blob download to `.mp4` file.

### Task 7: Full Test Suite Verification & Vercel Production Deployment
**Files:**
- Run: `npm test`
- Command: `npx vercel --prod --yes`

- [ ] Run automated test suite `npm test` and verify all 24+ tests pass.
- [ ] Commit all code changes to Git (`git commit -m "feat(studio): implement Clipchamp-style online video editor with multi-track timeline"`).
- [ ] Deploy live build to Vercel production on `clipy.space`.
