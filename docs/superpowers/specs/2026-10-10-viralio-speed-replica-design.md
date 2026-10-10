# Design Specification: Viralio Speed Replica

## Overview
A high-fidelity, fully functional standalone replica of **Viralio Speed** (`https://speed.viralio.ro/`). The platform provides automated video translation and synchronization, dynamic voice dubbing, interactive editing tools (blur bounding boxes, center mask bands, video mirroring, karaoke captions with font presets), CTA video insertion, and post scheduling (Speed Ultra).

## Architecture
The application consists of:
1. **Frontend**: Pure modern HTML5/CSS3/ES6+ web application replicating the dark glassmorphic design system of Viralio (`--bg-base: #0a0a0c`, animated background orbs, Fraunces & Geist typography, Font Awesome icons). Includes an interactive stage canvas player supporting live dragging of blur boxes, split mask sliders, live karaoke caption rendering, and client-side canvas video rendering/export.
2. **Backend**: Lightweight Node.js/Express service that implements the full REST API suite expected by the client:
   - Config & System Metadata (`/api/config`)
   - Authentication & User Profile (`/api/auth/me`)
   - Chunked Video Uploads (`/api/uploads`, `/api/uploads/:id`, `/api/uploads/:id/finish`)
   - Batch & Single Job Processing (`/api/jobs`, `/api/jobs/batch`, `/api/jobs/:id`)
   - Word-level Timed Captions (`/api/jobs/:id/captions`)
   - Video Export Engine (`/api/jobs/:id/export`)
   - AI Post Metadata Generator (`/api/jobs/:id/post-text`)
   - Speed Ultra Social Media Scheduler (`/api/ultra/state`, `/api/ultra/program`, `/api/ultra/queue/:id`)
   - Voice Audio Samples (`/api/voice-preview/:key`)
   - CTA Management (`/api/cta`)
3. **Audio Synthesis & Samples**: Built-in voice generator providing realistic voice previews and synchronized speech for all 30 voices and 6 supported languages (Română, Engleză, Spaniolă, Germană, Franceză, Italiană).
4. **Real Video Exporter**: HTML5 Canvas + MediaStream / MediaRecorder client-side video composition that actually renders uploaded or generated videos with all active filters (mirroring, blur boxes, mask gradient, custom styled captions) and produces downloadable video files.

## Goals
- 100% faithful replication of the visual appearance, micro-interactions, layout, and responsiveness.
- Multi-link paste parser with platform badge recognition (TikTok, YouTube, Instagram, Facebook, Douyin, RedNote).
- Real drag-and-drop file upload with progress bar.
- Voice selection with 30 voices and audible sample previews.
- Interactive video stage with draggable/resizable blur boxes (up to 4), mask band controls (position, thickness, zoom, black background), and mirror toggle.
- Dynamic karaoke captions with 8 visual presets (Clasic, Galben, Comic, Bubble, Box negru, Box verde, Neon, Simplu), size selector, words-per-screen controls, and fine nudge positioning.
- Working download/export mechanism generating actual video downloads.
- Speed Ultra scheduling UI with slot picker, platform settings, and queue view.
- Zero mandatory external paid API keys so the replica works out-of-the-box locally.

## Non-Goals
- Real paid payment gateway (credit top-up simulates balance recharge).
- Requiring real TikTok/YouTube API keys for scheduler (simulates account connectivity and scheduling queue).
