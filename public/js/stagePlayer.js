// Stage Player & Real-time Video Tool Controller
(function() {
    window.StagePlayer = {
        buildBody(c) {
            const r = c.job.result, el = c.el;
            const body = $('.job-body', el);
            body.innerHTML = `
            <div class="player" style="width:min(440px, 100%)">
                <div class="stage" style="aspect-ratio:9/16; width:100%">
                    <div class="flip">
                        <video class="mask-bg" muted playsinline preload="auto" src="${r.video}" hidden></video>
                        <video class="main" playsinline preload="metadata" src="${r.video}"></video>
                    </div>
                    <audio class="voiceover" preload="auto" src="${r.audio || ''}" hidden></audio>
                    <div class="boxes"></div>
                    <div class="capview"></div>
                    <div class="lay-sw" hidden>
                        <button type="button" data-a="layer" data-lay="blur"><i class="fa-solid fa-droplet"></i> Blur</button>
                        <button type="button" data-a="layer" data-lay="text" class="on"><i class="fa-solid fa-closed-captioning"></i> Text</button>
                    </div>
                    <video class="cta-prev" playsinline preload="none" hidden></video>
                    <button class="big-play" data-a="play"><i class="fa-solid fa-play"></i></button>
                </div>
                <div class="pbar">
                    <button class="icon-btn" data-a="play"><i class="fa-solid fa-play"></i></button>
                    <span class="seek-wrap"><input type="range" class="seek" min="0" max="1000" value="0"><i class="cta-mark" hidden></i></span>
                    <span class="tm mono">0:00 / ${fmtTime(r.duration)}</span>
                </div>
            </div>
            <div class="tools">
                <div class="field-label" style="margin:0"><i class="fa-solid fa-wand-magic-sparkles"></i> Unelte Video & Caption</div>
                <div class="tool-row">
                    <button class="tbtn" data-a="blurTool"><i class="fa-solid fa-droplet"></i>Blur</button>
                    <button class="tbtn" data-a="maskTool"><i class="fa-solid fa-masks-theater"></i>Mask</button>
                    <button class="tbtn" data-a="mirrorTool"><i class="fa-solid fa-left-right"></i>Mirror</button>
                </div>
                <div class="tpanel" data-p="blur" hidden>
                    <p class="muted">Trage zona peste text, redimensionează din colț (max 4 zone).</p>
                    <div class="trow">
                        <button class="ghost-btn" data-a="addBlur"><i class="fa-solid fa-plus"></i> Zonă</button>
                        <button class="ghost-btn" data-a="clearBlur"><i class="fa-solid fa-trash"></i> Șterge</button>
                    </div>
                </div>
                <div class="tpanel" data-p="mask" hidden>
                    <label class="ctl"><span class="top">Poziție bandă <b data-o="posY">50%</b></span><input type="range" min="0" max="1" step="0.01" data-m="posY" value="0.5"></label>
                    <label class="ctl"><span class="top">Grosime bandă <b data-o="thickness">50%</b></span><input type="range" min="0.1" max="1" step="0.01" data-m="thickness" value="0.5"></label>
                    <label class="ctl"><span class="top">Zoom fundal <b data-o="zoom">1.60×</b></span><input type="range" min="1" max="3" step="0.05" data-m="zoom" value="1.6"></label>
                    <label class="chk"><input type="checkbox" data-m="blackBg"> Fundal negru</label>
                </div>

                <div class="capsec">
                    <div class="cap-hd">
                        <div class="field-label" style="margin:0"><i class="fa-solid fa-closed-captioning"></i> Caption pe video</div>
                        <label class="switch"><input type="checkbox" data-cap="enabled" checked><span></span></label>
                    </div>
                    <div class="cap-body">
                        <div class="cap-grid">
                            ${(CFG.captionPresets || []).map(p => `
                                <button type="button" class="cap-chip${p.key === c.tools.captions.preset ? ' on' : ''}" data-a="capPreset" data-k="${p.key}">
                                    <span class="smp" style="font-family:'${p.font}',sans-serif;color:${p.text}">${p.label}</span>
                                    <span class="nm">${p.label}</span>
                                </button>
                            `).join('')}
                        </div>
                        <div class="ctl">
                            <span class="top">Poziția textului <b data-o="capPos">72%</b></span>
                            <div class="posrow">
                                <button type="button" class="nudge" data-a="capNudge" data-d="-1"><i class="fa-solid fa-chevron-up"></i></button>
                                <input type="range" min="0.05" max="0.95" step="0.01" data-cap="posY" value="0.72">
                                <button type="button" class="nudge" data-a="capNudge" data-d="1"><i class="fa-solid fa-chevron-down"></i></button>
                            </div>
                        </div>
                        <div class="row2">
                            <div><div class="mini-lab">Mărime</div><div class="seg" data-capseg="size">${['s','m','l'].map(v => `<button type="button" class="${v === 'm' ? 'on' : ''}" data-a="capSeg" data-f="size" data-v="${v}">${v.toUpperCase()}</button>`).join('')}</div></div>
                            <div><div class="mini-lab">Cuvinte</div><div class="seg" data-capseg="per">${[1,2,3].map(v => `<button type="button" class="${v === 2 ? 'on' : ''}" data-a="capSeg" data-f="per" data-v="${v}">${v}</button>`).join('')}</div></div>
                        </div>
                    </div>
                </div>

                <div class="capsec">
                    <div class="cap-hd">
                        <div class="field-label" style="margin:0"><i class="fa-solid fa-film"></i> Clipul tău (CTA)</div>
                        <label class="switch"><input type="checkbox" data-cta><span></span></label>
                    </div>
                    <div class="cta-body" hidden>
                        <div class="seg cta-pos">
                            <button type="button" data-a="ctaPos" data-p="start">Început</button>
                            <button type="button" data-a="ctaPos" data-p="here">Aici</button>
                            <button type="button" data-a="ctaPos" data-p="end" class="on">Final</button>
                        </div>
                    </div>
                </div>

                <button class="gen-btn" data-a="download"><i class="fa-solid fa-download"></i> <span class="dl-lab">Exportă & descarcă</span></button>
                <button class="sched-btn" data-a="schedule"><i class="fa-solid fa-calendar-plus"></i> Programează (Speed Ultra)</button>
                <details class="txt"><summary>Textul tradus</summary><p>${esc(r.text)}</p></details>
            </div>
            `;
            body.hidden = false;
            c.built = true;

            const main = $('video.main', el);
            const voice = $('audio.voiceover', el);
            const seek = $('.seek', el);
            const tm = $('.tm', el);
            main.ontimeupdate = () => {
                if (main.duration) seek.value = Math.round(main.currentTime / main.duration * 1000);
                tm.textContent = `${fmtTime(main.currentTime)} / ${fmtTime(main.duration || r.duration)}`;
                if (voice && voice.src && !voice.paused && Math.abs(voice.currentTime - main.currentTime) > 0.25) {
                    voice.currentTime = main.currentTime;
                }
                this.renderKaraoke(c);
            };
            main.onended = () => {
                if (voice) { voice.pause(); voice.currentTime = 0; }
                const icon = $('[data-a=play] i', el);
                if (icon) icon.className = 'fa-solid fa-play';
                const bigPlay = $('.big-play', el);
                if (bigPlay) bigPlay.hidden = false;
            };

            const stage = $('.stage', el);
            stage.onclick = e => {
                if (e.target.closest('.bbox') || e.target.closest('.rm') || e.target.closest('.rs')) return;
                window.togglePlayCard && window.togglePlayCard(c);
            };

            this.wireStageInteractions(c);
            this.loadCaptions(c);
        },

        wireStageInteractions(c) {
            const stage = $('.stage', c.el);
            let drag = null;
            stage.onpointerdown = e => {
                const boxEl = e.target.closest('.bbox');
                if (!boxEl || e.target.closest('.rm')) return;
                e.stopPropagation();
                e.preventDefault();
                const i = +boxEl.dataset.i;
                const b = c.tools.blur[i];
                if (!b) return;
                const isResize = e.target.classList.contains('rs');
                const rect = stage.getBoundingClientRect();
                drag = { i, b, isResize, startX: e.clientX, startY: e.clientY, initX: b.x, initY: b.y, initW: b.w, initH: b.h, rect, pointerId: e.pointerId };
                try { stage.setPointerCapture(e.pointerId); } catch (_) {}
            };
            stage.onpointermove = e => {
                if (!drag) return;
                e.stopPropagation();
                e.preventDefault();
                const dx = (e.clientX - drag.startX) / drag.rect.width * 100;
                const dy = (e.clientY - drag.startY) / drag.rect.height * 100;
                if (drag.isResize) {
                    drag.b.w = clamp(drag.initW + dx, 5, 100 - drag.b.x);
                    drag.b.h = clamp(drag.initH + dy, 4, 100 - drag.b.y);
                } else {
                    drag.b.x = clamp(drag.initX + dx, 0, 100 - drag.b.w);
                    drag.b.y = clamp(drag.initY + dy, 0, 100 - drag.b.h);
                }
                const el = $(`.bbox[data-i="${drag.i}"]`, stage);
                if (el) {
                    el.style.left = drag.b.x + '%';
                    el.style.top = drag.b.y + '%';
                    el.style.width = drag.b.w + '%';
                    el.style.height = drag.b.h + '%';
                }
            };
            stage.onpointerup = e => {
                if (drag) {
                    try { stage.releasePointerCapture(drag.pointerId); } catch (_) {}
                    drag = null;
                    this.renderBlurBoxes(c);
                }
            };
            stage.onpointercancel = () => { drag = null; };
        },

        addBlurBox(c) {
            if (c.tools.blur.length >= 4) { toast('Maxim 4 zone de blur.'); return; }
            const i = c.tools.blur.length;
            c.tools.blur.push({ x: 10, y: 65 + i * 6, w: 80, h: 12 });
            this.renderBlurBoxes(c);
        },

        renderBlurBoxes(c) {
            $('.boxes', c.el).innerHTML = c.tools.blur.map((b, i) => `
                <div class="bbox" data-i="${i}" style="left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%">
                    <span class="rm" data-a="rmBox" data-i="${i}">×</span>
                    <span class="rs"></span>
                </div>
            `).join('');
            $('[data-a=blurTool]', c.el).classList.toggle('on', c.tools.blur.length > 0);
        },

        applyMask(c) {
            const m = c.tools.mask;
            const main = $('video.main', c.el);
            const bg = $('video.mask-bg', c.el);
            if (m.enabled) {
                const top = Math.max(0, (m.posY - m.thickness / 2) * 100);
                const bot = Math.min(100, (m.posY + m.thickness / 2) * 100);
                const g = `linear-gradient(to bottom, transparent ${top}%, #000 ${top}%, #000 ${bot}%, transparent ${bot}%)`;
                main.style.webkitMaskImage = g;
                main.style.maskImage = g;
                if (m.blackBg) {
                    bg.hidden = true;
                } else {
                    bg.hidden = false;
                    bg.style.transform = `scale(${m.zoom})`;
                }
            } else {
                main.style.webkitMaskImage = '';
                main.style.maskImage = '';
                bg.hidden = true;
            }
        },

        async loadCaptions(c) {
            const d = await api(`/api/jobs/${c.job.jobId}/captions`);
            c.captionsData = d;
            this.recomputeCaptionGroups(c);
            this.renderKaraoke(c);
        },

        recomputeCaptionGroups(c) {
            if (!c.captionsData || !c.captionsData.words) return;
            const cap = c.tools.captions;
            const preset = (CFG.captionPresets || []).find(p => p.key === cap.preset) || CFG.captionPresets[0];
            const fit = window.Captions ? window.Captions.fitFor(preset, 1080, 50) : null;
            c.computedGroups = window.Captions
                ? window.Captions.groupWords(c.captionsData.words, cap.per || 2, fit)
                : [];
        },

        renderKaraoke(c) {
            const view = $('.capview', c.el);
            if (!view) return;
            const cap = c.tools.captions;
            if (!cap.enabled || !c.computedGroups || !c.computedGroups.length) {
                view.hidden = true;
                return;
            }
            view.hidden = false;
            view.style.top = (cap.posY * 100) + '%';

            const v = $('video.main', c.el);
            const t = v ? v.currentTime : 0;
            const groups = c.computedGroups;

            let curGroup = groups.find(g => t >= g.s && t < g.e);
            if (!curGroup && v && v.paused) curGroup = groups[0];
            if (!curGroup) {
                view.innerHTML = '';
                return;
            }

            const preset = (CFG.captionPresets || []).find(p => p.key === cap.preset) || CFG.captionPresets[0];
            const fontSize = cap.size === 's' ? '18px' : cap.size === 'l' ? '28px' : '23px';
            const hl = preset.active.toLowerCase() !== preset.text.toLowerCase();

            view.innerHTML = `
                <span style="font-family:'${preset.font}',Impact,sans-serif;font-size:${fontSize};letter-spacing:${(preset.spacing||0)*20}px;-webkit-text-stroke:${(preset.outline||0)*20}px #000;text-shadow:0 2px 4px rgba(0,0,0,0.8);${preset.box ? `background:${preset.box};padding:4px 8px;border-radius:6px;` : ''}">
                    ${curGroup.words.map(w => {
                        const isActive = t >= w.s && t <= w.e;
                        const wordColor = (isActive && hl) ? preset.active : preset.text;
                        const wordText = preset.upper ? w.w.toUpperCase() : w.w;
                        return `<span style="color:${wordColor}">${esc(wordText)}</span>`;
                    }).join(' ')}
                </span>
            `;
        }
    };
})();
