# Viralio Speed Replica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 100% functional, faithful standalone replica of the Viralio Speed platform (`https://speed.viralio.ro/`) with full UI, backend APIs, audio dubbing preview, interactive video editing (blur boxes, split mask, mirror, karaoke captions, CTA clip), real video export, and Speed Ultra scheduling.

**Architecture:** A Node.js Express backend serving a single-page application with complete REST APIs for config, authentication, job lifecycle, chunked uploads, audio preview, and scheduling. The frontend uses a dark glassmorphic design system with an interactive canvas video engine that renders real-time filters and exports edited videos directly in the browser.

**Tech Stack:** Node.js, Express, HTML5 Canvas, Web Audio API, MediaRecorder, Vanilla ES6+ JavaScript, CSS3 Design Tokens.

**Spec:** `docs/superpowers/specs/2026-10-10-viralio-speed-replica-design.md`

## Global Constraints
- Pure Node.js standard libraries + lightweight Express without requiring external paid third-party API keys.
- Fully functional in modern browsers (Chrome, Edge, Firefox, Safari).
- Identical visual appearance, color palette (`#0a0a0c`, `#65d69e`, `#7c84ff`), typography (Geist, Fraunces, JetBrains Mono), and interaction flows as `speed.viralio.ro`.
- Support both link input (TikTok, YouTube, Instagram, Facebook, Douyin, RedNote) and local video file upload.

## Review Focus
1. Multi-link paste splitting: pasting a block of text containing multiple URLs properly populates individual row inputs with platform badges.
2. Draggable blur boxes: bounds checking ensures boxes remain strictly within video stage limits during drag and resize.
3. Live karaoke caption sync: active word highlight updates precisely during video playback and seek operations without flickering.
4. Export rendering: exported video successfully includes mirror transform, active mask, blur regions, and rendered subtitles.
5. Voice samples: each of the 30 voice entries can be previewed with audio playback.

---

### Task 1: Project Setup and Backend Server Foundations

**Files:**
- Create: `package.json`
- Create: `server.js`
- Create: `tests/server.test.js`

**Interfaces:**
- Produces: Express HTTP server running on port 3000 exposing `/api/config`, `/api/auth/me`, `/api/history`.

- [ ] **Step 1: Write test for core configuration and auth endpoints**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `server.js` with Express, CORS, static file serving, `/api/config`, and `/api/auth/me`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 2: Uploads and Media Management API

**Files:**
- Create: `src/uploadManager.js`
- Modify: `server.js`
- Create: `tests/uploads.test.js`

**Interfaces:**
- Consumes: Express app.
- Produces: `/api/uploads` (POST init, PUT chunk with offset, POST finish, DELETE) and `/api/cta` (POST, DELETE).

- [ ] **Step 1: Write test for chunked upload initialization, data transfer, and finalization**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `uploadManager.js` and register routes in `server.js`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 3: Jobs Pipeline & Captions Generation API

**Files:**
- Create: `src/jobPipeline.js`
- Modify: `server.js`
- Create: `tests/jobs.test.js`

**Interfaces:**
- Produces: `/api/jobs` (GET, POST), `/api/jobs/batch` (POST), `/api/jobs/:id` (GET, DELETE), `/api/jobs/:id/captions` (GET), `/api/jobs/:id/export` (POST), `/api/jobs/:id/post-text` (POST), `/api/jobs/clear` (POST).

- [ ] **Step 1: Write test for job lifecycle states (download -> translate -> voice -> sync -> render -> done) and caption word timing**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `jobPipeline.js` with progress simulation, realistic text translation, and word-level timestamps**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 4: Voice Synthesis & Preview Audio Service

**Files:**
- Create: `src/voiceService.js`
- Modify: `server.js`
- Create: `tests/voice.test.js`

**Interfaces:**
- Produces: `/api/voice-preview/:key` serving synthetic audio preview waveforms for all 30 voices in `/api/config`.

- [ ] **Step 1: Write test for voice preview audio endpoint responding with valid audio MIME type**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `voiceService.js` to dynamically generate pleasant voice sample audio waves**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 5: Viralio UI Structure, Glassmorphic Styling & Setup Panel

**Files:**
- Create: `public/index.html`
- Create: `public/css/style.css`
- Create: `public/js/setupPanel.js`

**Interfaces:**
- Produces: Viralio top navigation bar, credit balance widget, Left setup panel with multi-link input, platform badge detection, drag-and-drop video dropzone, voice selection grid with 30 cards, speed range controls, and start button.

- [ ] **Step 1: Create HTML structure and modern CSS matching Viralio Speed design tokens**
- [ ] **Step 2: Implement link parsing, multi-paste splitting, platform icon badges, and upload queue handling**
- [ ] **Step 3: Implement voice card rendering with active selection and play/pause sample preview triggers**
- [ ] **Step 4: Verify visually and through DOM tests in browser**
- [ ] **Step 5: Commit**

---

### Task 6: Interactive Video Stage, Blur Boxes, Mask & Karaoke Captions

**Files:**
- Create: `public/captions.js`
- Create: `public/js/stagePlayer.js`
- Modify: `public/index.html`

**Interfaces:**
- Produces: Interactive stage player with video playback, 4-box draggable/resizable blur masks, split mask slider controls, horizontal mirror flip, CTA preview, and word-by-word karaoke text overlay based on ASS preset styles.

- [ ] **Step 1: Integrate `captions.js` word grouping and font measurement engine**
- [ ] **Step 2: Implement stage video player with custom controls, time formatting, and CTA marker**
- [ ] **Step 3: Implement interactive blur box overlay with mouse/touch drag and resize handles**
- [ ] **Step 4: Implement mask band gradient generator and mirror flip style toggles**
- [ ] **Step 5: Implement dynamic karaoke caption renderer updating active words on video `timeupdate`**
- [ ] **Step 6: Commit**

---

### Task 7: Client-side Video Rendering and Export Engine

**Files:**
- Create: `public/js/videoExporter.js`
- Modify: `public/js/stagePlayer.js`

**Interfaces:**
- Produces: Video rendering pipeline that combines video, mirror transform, blur areas, mask band, and styled captions onto a Canvas stream recorded via MediaRecorder to trigger download of processed MP4/WebM.

- [ ] **Step 1: Implement Canvas composition loop drawing video frame, blur boxes, and karaoke captions**
- [ ] **Step 2: Implement MediaRecorder capture and blob download trigger**
- [ ] **Step 3: Wire Export button on job card to run rendering progress (0% - 100%) and start download**
- [ ] **Step 4: Verify generated video file contains rendered elements**
- [ ] **Step 5: Commit**

---

### Task 8: Speed Ultra Social Media Scheduler, Queue & Modals

**Files:**
- Create: `src/ultraScheduler.js`
- Modify: `server.js`
- Create: `public/js/ultraModal.js`
- Modify: `public/index.html`

**Interfaces:**
- Produces: `/api/ultra/state`, `/api/ultra/program`, `/api/ultra/queue/:id`, Speed Ultra modal with schedule slots, account selection, TikTok & YouTube privacy forms, and Queue tab list.

- [ ] **Step 1: Implement backend scheduler store for posting slots and queued jobs**
- [ ] **Step 2: Implement Speed Ultra program configuration modal and schedule confirmation dialog**
- [ ] **Step 3: Implement Queue tab rendering and cancel post action**
- [ ] **Step 4: Implement Login and Top-up credit modals with interactive balance recharge**
- [ ] **Step 5: Commit**

---

### Task 9: System Integration, End-to-End Verification & Polish

**Files:**
- Modify: `public/js/main.js`
- Create: `tests/e2e.test.js`

**Interfaces:**
- Produces: Fully integrated application with automatic sample media fallback for direct testing, smooth toast notifications, and verified end-to-end operation.

- [ ] **Step 1: Provide high-quality sample video and audio assets for immediate testing without external dependencies**
- [ ] **Step 2: Run automated test suite covering all API endpoints and pipeline actions**
- [ ] **Step 3: Test full end-to-end user journey in browser (Link -> Process -> Edit -> Captions -> Export -> Download)**
- [ ] **Step 4: Final visual polish and responsive verification**
- [ ] **Step 5: Commit**
