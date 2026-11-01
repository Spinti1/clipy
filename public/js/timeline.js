// Clipy Studio - Interactive Multi-Track Timeline Controller
(function() {
    window.Timeline = {
        state: {
            duration: 0.0,
            currentTime: 0.0,
            zoom: 60, // pixels per second
            snapping: true,
            selectedTrack: 'video',
            selectedClipId: null,
            clips: [],
            subtitles: [],
            audioTrack: null,
            blurBoxes: [],
            isPlaying: false
        },

        init() {
            this.bindEvents();
            this.renderRuler();
            this.renderTracks();
            this.updatePlayhead();
        },

        bindEvents() {
            // Split button and 'S' keyboard shortcut
            const splitBtn = document.getElementById('tmSplitBtn');
            if (splitBtn) splitBtn.onclick = () => this.splitAtPlayhead();

            // Delete button and 'Delete' key
            const delBtn = document.getElementById('tmDeleteBtn');
            if (delBtn) delBtn.onclick = () => this.deleteSelectedClip();

            // Duplicate button
            const dupBtn = document.getElementById('tmDuplicateBtn');
            if (dupBtn) dupBtn.onclick = () => this.duplicateSelectedClip();

            // Snapping toggle
            const snapBtn = document.getElementById('tmSnapBtn');
            if (snapBtn) {
                snapBtn.onclick = () => {
                    this.state.snapping = !this.state.snapping;
                    snapBtn.classList.toggle('active', this.state.snapping);
                };
            }

            // Zoom controls
            const zoomInBtn = document.getElementById('tmZoomInBtn');
            if (zoomInBtn) zoomInBtn.onclick = () => this.setZoom(this.state.zoom * 1.25);

            const zoomOutBtn = document.getElementById('tmZoomOutBtn');
            if (zoomOutBtn) zoomOutBtn.onclick = () => this.setZoom(this.state.zoom / 1.25);

            const fitBtn = document.getElementById('tmFitBtn');
            if (fitBtn) fitBtn.onclick = () => this.fitToWidth();

            const zoomSlider = document.getElementById('tmZoomSlider');
            if (zoomSlider) {
                zoomSlider.oninput = (e) => this.setZoom(parseFloat(e.target.value));
            }

            // Keyboard shortcuts
            window.addEventListener('keydown', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                if (e.key === 's' || e.key === 'S') {
                    e.preventDefault();
                    this.splitAtPlayhead();
                } else if (e.key === 'Delete' || e.key === 'Backspace') {
                    if (this.state.selectedClipId && this.state.clips.length > 1) {
                        e.preventDefault();
                        this.deleteSelectedClip();
                    }
                } else if (e.code === 'Space') {
                    e.preventDefault();
                    window.toggleStudioPlay && window.toggleStudioPlay();
                }
            });

            // Scrubber dragging
            this.bindScrubberDrag();
        },

        bindScrubberDrag() {
            const tracksViewport = document.getElementById('timelineTracksViewport');
            if (!tracksViewport) return;

            let isDragging = false;

            const updateTimeFromPointer = (e) => {
                if (this.state.duration <= 0) return;
                const rect = tracksViewport.getBoundingClientRect();
                const scrollLeft = tracksViewport.scrollLeft;
                const offsetX = (e.clientX - rect.left + scrollLeft) - 125; // header offset (115px + padding)
                const newTime = Math.max(0, Math.min(this.state.duration, offsetX / this.state.zoom));
                this.setTime(newTime, true);
            };

            tracksViewport.addEventListener('pointerdown', (e) => {
                if (e.target.closest('.clip-item')) return;
                isDragging = true;
                updateTimeFromPointer(e);
                try { tracksViewport.setPointerCapture(e.pointerId); } catch (_) {}
            });

            tracksViewport.addEventListener('pointermove', (e) => {
                if (!isDragging) return;
                updateTimeFromPointer(e);
            });

            const stopDrag = (e) => {
                if (isDragging) {
                    isDragging = false;
                    try { tracksViewport.releasePointerCapture(e.pointerId); } catch (_) {}
                }
            };
            tracksViewport.addEventListener('pointerup', stopDrag);
            tracksViewport.addEventListener('pointercancel', stopDrag);
        },

        loadJob(job) {
            if (!job || !job.result) return;
            const dur = Math.max(1.0, parseFloat(job.result.duration || 15.0));
            this.state.duration = dur;
            this.state.currentTime = 0.0;
            this.state.clips = [
                { id: 'clip-1', start: 0.0, end: dur, name: job.uploadName || job.result.title || 'Clip Video' }
            ];
            this.state.selectedClipId = 'clip-1';

            if (job.captions && job.captions.words) {
                this.state.subtitles = job.captions.words;
            } else {
                this.state.subtitles = [];
            }
            this.state.audioTrack = job.result.video || null;
            this.state.blurBoxes = (job.tools && job.tools.blur) || [];

            this.fitToWidth();
            this.renderRuler();
            this.renderTracks();
            this.updatePlayhead();
        },

        loadLocalClip(name, dur = 15.0) {
            const d = Math.max(1.0, parseFloat(dur));
            this.state.duration = d;
            this.state.currentTime = 0.0;
            this.state.clips = [
                { id: 'clip-1', start: 0.0, end: d, name: name || 'Video Clip' }
            ];
            this.state.selectedClipId = 'clip-1';
            this.state.subtitles = [];
            this.state.audioTrack = null;
            this.state.blurBoxes = [];

            this.fitToWidth();
            this.renderRuler();
            this.renderTracks();
            this.updatePlayhead();
        },

        setZoom(newZoom) {
            this.state.zoom = Math.max(15, Math.min(250, newZoom));
            const zoomSlider = document.getElementById('tmZoomSlider');
            if (zoomSlider) zoomSlider.value = this.state.zoom;
            this.renderRuler();
            this.renderTracks();
            this.updatePlayhead();
        },

        fitToWidth() {
            const viewport = document.getElementById('timelineTracksViewport');
            if (!viewport || this.state.duration <= 0) return;
            const availableWidth = Math.max(300, viewport.clientWidth - 120);
            this.setZoom(availableWidth / this.state.duration);
        },

        setTime(sec, syncVideo = false) {
            if (this.state.duration <= 0) return;
            this.state.currentTime = Math.max(0, Math.min(this.state.duration, sec));
            this.updatePlayhead();

            // Sync main active video player
            if (syncVideo) {
                const vid = document.querySelector('video.main');
                if (vid && isFinite(vid.duration) && vid.duration > 0) {
                    vid.currentTime = this.state.currentTime;
                }
            }

            // Update Timecode displays
            const tcEl = document.getElementById('studioTimecode');
            if (tcEl) {
                tcEl.innerHTML = `${this.formatTime(this.state.currentTime)} <span style="color:#64748b">/ ${this.formatTime(this.state.duration)}</span>`;
            }
        },

        updatePlayhead() {
            const needle = document.getElementById('timelinePlayheadNeedle');
            if (!needle) return;
            const xPos = 125 + (this.state.currentTime * this.state.zoom);
            needle.style.left = `${xPos}px`;
        },

        renderRuler() {
            const ruler = document.getElementById('timelineTimeRuler');
            if (!ruler) return;
            const maxDur = Math.max(15.0, this.state.duration || 0);
            const totalWidth = Math.max(600, maxDur * this.state.zoom);
            ruler.style.width = `${totalWidth}px`;

            // Step interval based on zoom
            let step = 1;
            if (this.state.zoom < 25) step = 10;
            else if (this.state.zoom < 50) step = 5;
            else if (this.state.zoom < 100) step = 2;
            else step = 1;

            let html = '';
            for (let t = 0; t <= maxDur; t += step) {
                const left = t * this.state.zoom;
                html += `
                    <div style="position:absolute; left:${left}px; bottom:2px; font-size:0.58rem; color:#525866; font-family:'JetBrains Mono',monospace;">
                        ${this.formatTime(t)}
                    </div>
                    <div style="position:absolute; left:${left}px; bottom:0; height:4px; width:1px; background:rgba(255,255,255,0.15);"></div>
                `;
            }
            ruler.innerHTML = html;
        },

        renderTracks() {
            this.renderSubtitleTrack();
            this.renderVideoTrack();
            this.renderAudioTrack();
            this.renderBlurTrack();
        },

        renderSubtitleTrack() {
            const track = document.getElementById('trackSubtitles');
            if (!track) return;
            const words = this.state.subtitles;
            if (!words || !words.length) {
                track.innerHTML = `<div style="height:100%; display:flex; align-items:center; padding:0 12px; font-size:0.65rem; color:#64748b; font-style:italic;">No captions yet</div>`;
                return;
            }

            // Group into 4-word segments
            const segments = [];
            for (let i = 0; i < words.length; i += 4) {
                const chunk = words.slice(i, i + 4);
                segments.push({
                    start: chunk[0].s,
                    end: chunk[chunk.length - 1].e,
                    text: chunk.map(w => w.w).join(' ')
                });
            }

            track.innerHTML = segments.map((seg, idx) => {
                const left = seg.start * this.state.zoom;
                const width = Math.max(16, (seg.end - seg.start) * this.state.zoom);
                const isSelected = this.state.currentTime >= seg.start && this.state.currentTime <= seg.end;
                const bg = isSelected ? '#7c3aed' : '#6366f1';
                const border = isSelected ? '1.5px solid #c4b5fd' : '1px solid rgba(255,255,255,0.1)';
                return `
                    <div class="clip-item" data-seg="${idx}" style="position:absolute; left:${left}px; width:${width}px; height:24px; background:${bg}; border:${border}; border-radius:4px; padding:2px 6px; font-size:0.62rem; font-weight:700; color:#fff; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; cursor:pointer;" title="${this.escapeHtml(seg.text)}">
                        ${this.escapeHtml(seg.text)}
                    </div>
                `;
            }).join('');
        },

        renderVideoTrack() {
            const track = document.getElementById('trackVideo');
            if (!track) return;
            const clips = this.state.clips;

            if (!clips || !clips.length) {
                track.innerHTML = `
                    <div style="height:100%; display:flex; align-items:center; padding:0 14px; font-size:0.68rem; color:#64748b; font-style:italic; gap:6px;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        No video media on timeline. Upload a video or paste a link above.
                    </div>
                `;
                return;
            }

            track.innerHTML = clips.map(clip => {
                const left = clip.start * this.state.zoom;
                const width = Math.max(20, (clip.end - clip.start) * this.state.zoom);
                const isSelected = clip.id === this.state.selectedClipId;
                const border = isSelected ? '2px solid #a78bfa' : '1px solid #3b82f6';
                const shadow = isSelected ? '0 0 12px rgba(124,58,237,0.45)' : 'none';

                return `
                    <div class="clip-item clip-video" data-id="${clip.id}" onclick="Timeline.selectClip('${clip.id}')" style="position:absolute; left:${left}px; width:${width}px; height:44px; background:linear-gradient(135deg, #1e3a8a, #2563eb); border:${border}; border-radius:6px; padding:4px 8px; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; cursor:pointer; box-shadow:${shadow};">
                        <div style="display:flex; justify-content:space-between; font-size:0.66rem; font-weight:700; color:#fff;">
                            <span>${this.escapeHtml(clip.name)}</span>
                            <span style="color:#93c5fd; font-family:'JetBrains Mono',monospace; font-size:0.58rem;">${this.formatTime(clip.start)} - ${this.formatTime(clip.end)}</span>
                        </div>
                        <div style="height:12px; background:rgba(0,0,0,0.25); border-radius:3px; display:flex; gap:4px; padding:1px; opacity:0.6;">
                            <div style="flex:1; background:rgba(255,255,255,0.18); border-radius:1px;"></div>
                            <div style="flex:1; background:rgba(255,255,255,0.18); border-radius:1px;"></div>
                            <div style="flex:1; background:rgba(255,255,255,0.18); border-radius:1px;"></div>
                        </div>
                    </div>
                `;
            }).join('');
        },

        renderAudioTrack() {
            const track = document.getElementById('trackAudio');
            if (!track) return;
            if (!this.state.audioTrack) {
                track.innerHTML = `<div style="height:100%; display:flex; align-items:center; padding:0 12px; font-size:0.65rem; color:#64748b; font-style:italic;">Original audio (no AI dubbing yet)</div>`;
                return;
            }
            const dur = this.state.duration;
            const width = Math.max(60, dur * this.state.zoom);

            track.innerHTML = `
                <div style="position:absolute; left:0; width:${width}px; height:28px; background:linear-gradient(90deg, #065f46, #059669); border:1px solid #10b981; border-radius:5px; padding:2px 10px; display:flex; align-items:center; justify-content:space-between; color:#fff; overflow:hidden;">
                    <span style="font-size:0.65rem; font-weight:700; white-space:nowrap;">AI Dubbed Voice (Synced)</span>
                    <svg width="220" height="18" viewBox="0 0 220 18" fill="none" stroke="#a7f3d0" stroke-width="1.8" stroke-linecap="round" style="flex-shrink:0;">
                        <path d="M2 9h4M10 5v8M16 2v14M22 6v6M28 8v2M34 4v10M40 1v16M46 7v4M52 9h4M60 4v10M66 2v14M72 7v4M78 9h4M86 5v8M92 1v16M98 6v6M104 8v2M110 3v12M116 1v16M122 7v4M128 9h4M136 4v10M142 2v14M148 7v4M154 9h4M162 6v6M168 2v14M174 8v2M182 5v8M188 1v16M194 7v4M200 9h4M208 4v10M214 2v14"></path>
                    </svg>
                </div>
            `;
        },

        renderBlurTrack() {
            const track = document.getElementById('trackBlur');
            if (!track) return;
            if (!this.state.blurBoxes || !this.state.blurBoxes.length) {
                track.innerHTML = `<div style="height:100%; display:flex; align-items:center; padding:0 12px; font-size:0.65rem; color:#64748b; font-style:italic;">No blur zones</div>`;
                return;
            }
            const dur = this.state.duration;
            const left = dur * 0.15 * this.state.zoom;
            const width = Math.max(40, (dur * 0.4) * this.state.zoom);

            track.innerHTML = `
                <div style="position:absolute; left:${left}px; width:${width}px; height:22px; background:repeating-linear-gradient(45deg, #7c3aed, #7c3aed 8px, #6d28d9 8px, #6d28d9 16px); border:1px solid #c4b5fd; border-radius:4px; padding:2px 6px; display:flex; align-items:center; font-size:0.62rem; font-weight:700; color:#fff; overflow:hidden; white-space:nowrap;">
                    Blur Box Zone
                </div>
            `;
        },

        selectClip(id) {
            this.state.selectedClipId = id;
            this.renderVideoTrack();
        },

        splitAtPlayhead() {
            if (!this.state.clips || this.state.clips.length === 0) {
                if (window.toast) window.toast('Please import a video before splitting.');
                return;
            }
            const t = this.state.currentTime;
            // Find which clip currently covers t
            const clipIdx = this.state.clips.findIndex(c => t > (c.start + 0.1) && t < (c.end - 0.1));
            if (clipIdx === -1) {
                if (window.toast) window.toast('Move playhead inside a clip to Split.');
                return;
            }

            const orig = this.state.clips[clipIdx];
            const oldEnd = orig.end;
            orig.end = t;

            const newClip = {
                id: 'clip-' + Date.now().toString(36),
                start: t,
                end: oldEnd,
                name: `${orig.name} (Part 2)`
            };

            this.state.clips.splice(clipIdx + 1, 0, newClip);
            this.state.selectedClipId = newClip.id;

            this.renderVideoTrack();
            if (window.toast) window.toast('Clip split at ' + this.formatTime(t) + ' ⚡');
        },

        deleteSelectedClip() {
            if (!this.state.clips || this.state.clips.length <= 1) {
                if (window.toast) window.toast('Cannot delete the only clip in project.');
                return;
            }

            const idx = this.state.clips.findIndex(c => c.id === this.state.selectedClipId);
            if (idx === -1) return;

            const deleted = this.state.clips.splice(idx, 1)[0];
            const gap = deleted.end - deleted.start;

            // Ripple shift remaining clips
            for (let i = idx; i < this.state.clips.length; i++) {
                this.state.clips[i].start -= gap;
                this.state.clips[i].end -= gap;
            }

            this.state.duration = Math.max(1.0, this.state.duration - gap);
            this.state.selectedClipId = this.state.clips[Math.max(0, idx - 1)].id;
            this.setTime(Math.min(this.state.currentTime, this.state.duration), true);

            this.renderRuler();
            this.renderTracks();
            if (window.toast) window.toast('Sequence deleted and ripple shifted.');
        },

        duplicateSelectedClip() {
            if (!this.state.clips || this.state.clips.length === 0) return;
            const idx = this.state.clips.findIndex(c => c.id === this.state.selectedClipId);
            if (idx === -1) return;
            const orig = this.state.clips[idx];
            const length = orig.end - orig.start;

            const newClip = {
                id: 'clip-' + Date.now().toString(36),
                start: this.state.duration,
                end: this.state.duration + length,
                name: `${orig.name} (Copy)`
            };

            this.state.clips.push(newClip);
            this.state.duration += length;
            this.state.selectedClipId = newClip.id;

            this.renderRuler();
            this.renderTracks();
            if (window.toast) window.toast('Clip duplicated to timeline.');
        },

        formatTime(sec) {
            const s = Math.max(0, sec || 0);
            const m = Math.floor(s / 60);
            const remSec = Math.floor(s % 60);
            const cs = Math.floor((s % 1) * 100);
            return `${String(m).padStart(2, '0')}:${String(remSec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
        },

        escapeHtml(str) {
            return String(str || '').replace(/[&<>'"]/g, tag => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
            }[tag] || tag));
        }
    };
})();
