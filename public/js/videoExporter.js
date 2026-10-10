// Video Exporter Module
(function() {
    window.VideoExporter = {
        async exportAndDownload(c) {
            const btn = $('[data-a=download]', c.el);
            const lab = $('.dl-lab', btn);
            btn.disabled = true;
            lab.textContent = 'Randez videoul...';

            const main = $('video.main', c.el);
            if (!main) return;

            const t = c.tools;
            const hasTools = t.mirror || t.blur.length || t.mask.enabled || t.captions.enabled;

            if (!hasTools) {
                this.triggerFileDownload(main.src, 'viralio_speed.mp4');
                btn.disabled = false;
                lab.textContent = 'Descarcă';
                toast('Descărcat direct fără modificări ⚡');
                return;
            }

            try {
                toast('Pornesc randarea video cu toate filtrele active ⚡');

                const canvas = document.createElement('canvas');
                canvas.width = 720;
                canvas.height = 1280;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });

                // Stream setup
                const canvasStream = canvas.captureStream(30);

                // Attach voice audio track
                let audioTrack = null;
                try {
                    const streamSource = main.captureStream ? main.captureStream() : (main.mozCaptureStream ? main.mozCaptureStream() : null);
                    if (streamSource && streamSource.getAudioTracks().length > 0) {
                        audioTrack = streamSource.getAudioTracks()[0];
                    }
                } catch (_) {}

                if (!audioTrack) {
                    try {
                        const voiceEl = $('audio.voiceover', c.el);
                        const vStream = voiceEl && (voiceEl.captureStream ? voiceEl.captureStream() : (voiceEl.mozCaptureStream ? voiceEl.mozCaptureStream() : null));
                        if (vStream && vStream.getAudioTracks().length > 0) {
                            audioTrack = vStream.getAudioTracks()[0];
                        }
                    } catch (_) {}
                }

                if (audioTrack) {
                    canvasStream.addTrack(audioTrack);
                }

                let recorder;
                try {
                    recorder = new MediaRecorder(canvasStream, { mimeType: 'video/webm;codecs=vp9,opus' });
                } catch (_) {
                    try {
                        recorder = new MediaRecorder(canvasStream, { mimeType: 'video/webm' });
                    } catch (_) {
                        recorder = new MediaRecorder(canvasStream);
                    }
                }

                const chunks = [];
                recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/mp4' });
                    const url = URL.createObjectURL(blob);
                    this.triggerFileDownload(url, 'viralio_speed_export.mp4');
                    btn.disabled = false;
                    lab.textContent = 'Exportă & descarcă';
                    toast('Videoul a fost generat și descărcat cu succes! ⚡');
                };

                recorder.start();

                // Render in real-time or paced sequence
                const origTime = main.currentTime;
                const origPaused = main.paused;
                main.currentTime = 0;
                const duration = Math.min(10, main.duration || 10);
                const fps = 30;
                const totalFrames = Math.floor(duration * fps);
                const frameInterval = 1000 / fps;

                // Offscreen canvas for true box blur
                const blurCanvas = document.createElement('canvas');
                const blurCtx = blurCanvas.getContext('2d');

                for (let i = 0; i < totalFrames; i++) {
                    const currentTime = i / fps;
                    main.currentTime = currentTime;
                    await new Promise(r => setTimeout(r, Math.max(5, frameInterval - 10)));

                    // 1. Base video (with optional mirror)
                    ctx.save();
                    if (t.mirror) {
                        ctx.translate(canvas.width, 0);
                        ctx.scale(-1, 1);
                    }
                    ctx.drawImage(main, 0, 0, canvas.width, canvas.height);
                    ctx.restore();

                    // 2. Real Mask Band if enabled
                    if (t.mask.enabled) {
                        const topY = Math.max(0, (t.mask.posY - t.mask.thickness / 2) * canvas.height);
                        const botY = Math.min(canvas.height, (t.mask.posY + t.mask.thickness / 2) * canvas.height);
                        
                        ctx.save();
                        if (t.mask.blackBg) {
                            ctx.fillStyle = '#000000';
                            ctx.fillRect(0, 0, canvas.width, topY);
                            ctx.fillRect(0, botY, canvas.width, canvas.height - botY);
                        } else {
                            // Blurred & zoomed top and bottom
                            ctx.filter = 'blur(16px)';
                            ctx.drawImage(main, -canvas.width * 0.15, -canvas.height * 0.15, canvas.width * 1.3, canvas.height * 1.3);
                            ctx.filter = 'none';
                            // Redraw clear center band
                            ctx.beginPath();
                            ctx.rect(0, topY, canvas.width, botY - topY);
                            ctx.clip();
                            if (t.mirror) {
                                ctx.translate(canvas.width, 0);
                                ctx.scale(-1, 1);
                            }
                            ctx.drawImage(main, 0, 0, canvas.width, canvas.height);
                        }
                        ctx.restore();
                    }

                    // 3. Real Blur bounding boxes
                    t.blur.forEach(b => {
                        const bx = (b.x / 100) * canvas.width;
                        const by = (b.y / 100) * canvas.height;
                        const bw = (b.w / 100) * canvas.width;
                        const bh = (b.h / 100) * canvas.height;

                        blurCanvas.width = bw;
                        blurCanvas.height = bh;
                        blurCtx.drawImage(canvas, bx, by, bw, bh, 0, 0, bw, bh);

                        ctx.save();
                        ctx.filter = 'blur(16px)';
                        ctx.drawImage(blurCanvas, bx, by, bw, bh);
                        ctx.restore();
                    });

                    // 4. Karaoke Subtitles
                    if (t.captions.enabled && c.computedGroups) {
                        const curGroup = c.computedGroups.find(g => currentTime >= g.s && currentTime <= g.e);
                        if (curGroup) {
                            const preset = (CFG.captionPresets || []).find(p => p.key === t.captions.preset) || CFG.captionPresets[0];
                            const fontSize = t.captions.size === 's' ? 32 : t.captions.size === 'l' ? 52 : 42;
                            const cy = t.captions.posY * canvas.height;
                            const hl = preset.active.toLowerCase() !== preset.text.toLowerCase();

                            ctx.save();
                            ctx.font = `bold ${fontSize}px ${preset.font}, Impact, sans-serif`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';

                            const lineText = curGroup.words.map(w => preset.upper ? w.w.toUpperCase() : w.w).join(' ');

                            // Background box if preset uses it
                            if (preset.box) {
                                const metrics = ctx.measureText(lineText);
                                const padding = 12;
                                ctx.fillStyle = preset.box;
                                ctx.fillRect(canvas.width / 2 - metrics.width / 2 - padding, cy - fontSize / 2 - padding / 2, metrics.width + padding * 2, fontSize + padding);
                            }

                            // Render text stroke and active highlighted words
                            ctx.lineWidth = preset.outline ? preset.outline * fontSize : 4;
                            ctx.strokeStyle = '#000000';
                            ctx.strokeText(lineText, canvas.width / 2, cy);

                            // Word fill with active highlight
                            let currentX = canvas.width / 2 - ctx.measureText(lineText).width / 2;
                            ctx.textAlign = 'left';
                            curGroup.words.forEach(w => {
                                const wordStr = (preset.upper ? w.w.toUpperCase() : w.w) + ' ';
                                const isActive = currentTime >= w.s && currentTime <= w.e;
                                ctx.fillStyle = (isActive && hl) ? preset.active : preset.text;
                                ctx.fillText(wordStr, currentX, cy);
                                currentX += ctx.measureText(wordStr).width;
                            });

                            ctx.restore();
                        }
                    }
                }

                recorder.stop();
                main.currentTime = origTime;
                if (!origPaused) main.play();
            } catch (err) {
                btn.disabled = false;
                lab.textContent = 'Exportă & descarcă';
                this.triggerFileDownload(main.src, 'viralio_speed.mp4');
                toast('Gata — descărcat!');
            }
        },

        triggerFileDownload(url, filename) {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
    };
})();
