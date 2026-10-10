// Setup Panel Controller
(function() {
    window.SetupPanel = {
        init() {
            this.bindEvents();
            this.refreshRows();
        },

        bindEvents() {
            $('#addUrlBtn').onclick = () => this.addRow(null, '', true);
            $('#addFileBtn').onclick = () => $('#fileInput').click();
            $('#fileInput').onchange = e => { this.addFiles(e.target.files); e.target.value = ''; };

            $('#urlList').oninput = () => this.refreshRows();
            $('#urlList').onclick = e => {
                const rm = e.target.closest('.remove-btn');
                if (!rm) return;
                const row = rm.closest('.url-row');
                if ($$('#urlList .url-row').length > 1) row.remove();
                else $('input', row).value = '';
                this.refreshRows();
            };

            // Multi-link paste handler (populates current empty row first!)
            $('#urlList').onpaste = e => {
                const text = (e.clipboardData || window.clipboardData).getData('text') || '';
                const links = this.extractLinks(text);
                if (links.length > 1) {
                    e.preventDefault();
                    const inputs = $$('#urlList input');
                    const firstInput = inputs[0];
                    let startIndex = 0;

                    if (firstInput && !firstInput.value.trim()) {
                        firstInput.value = links[0];
                        startIndex = 1;
                    }

                    for (let i = startIndex; i < links.length; i++) {
                        this.addRow(null, links[i], false);
                    }
                    this.refreshRows();
                    toast(`${links.length} linkuri adăugate!`);
                }
            };

            // Drag & drop
            $('#srcBox').ondragover = e => { e.preventDefault(); $('#srcBox').classList.add('drag'); };
            $('#srcBox').ondragleave = () => $('#srcBox').classList.remove('drag');
            $('#srcBox').ondrop = e => {
                e.preventDefault();
                $('#srcBox').classList.remove('drag');
                if (e.dataTransfer && e.dataTransfer.files) this.addFiles(e.dataTransfer.files);
            };

            $('#speed').oninput = e => {
                state.speed = parseFloat(e.target.value);
                $('#speedVal').textContent = state.speed.toFixed(2) + '×';
            };

            $('#presets').onclick = e => {
                const b = e.target.closest('button');
                if (!b) return;
                state.speed = parseFloat(b.dataset.s);
                $('#speed').value = state.speed;
                $('#speedVal').textContent = state.speed.toFixed(2) + '×';
                $$('#presets button').forEach(x => x.classList.toggle('on', x === b));
            };

            $('#fitSeg').onclick = e => {
                const b = e.target.closest('button');
                if (!b) return;
                state.fit = b.dataset.fit;
                $$('#fitSeg button').forEach(x => x.classList.toggle('on', x === b));
            };

            const langSelect = $('#lang');
            if (langSelect) {
                langSelect.onchange = e => {
                    state.lang = e.target.value;
                    this.renderVoices();
                };
            }

            $('#voiceGrid').onclick = e => {
                const play = e.target.closest('.vplay');
                if (play) { window.playVoiceSample(play.dataset.play); return; }
                const chip = e.target.closest('.vchip');
                if (chip) this.selectVoice(chip.dataset.v);
            };

            $('#goBtn').onclick = () => window.startBatchJobs();
        },

        extractLinks(text) {
            return String(text || '').split(/[\s,]+/).map(t => t.trim()).filter(u => /^https?:\/\//i.test(u));
        },

        createRow(val = '') {
            const row = document.createElement('div');
            row.className = 'url-row prompt-wrap';
            row.innerHTML = `
                <i class="fa-solid fa-link url-ico"></i>
                <input type="text" inputmode="url" placeholder="https://youtube.com/... sau tiktok.com/..." class="url-input v-input" value="${esc(val)}">
                <span class="url-plat"></span>
                <button type="button" class="remove-btn" aria-label="Șterge linkul"><i class="fa-solid fa-xmark"></i></button>
            `;
            return row;
        },

        addRow(after, val = '', focus = true) {
            const list = $('#urlList');
            const row = this.createRow(val);
            if (after && after.nextSibling) list.insertBefore(row, after.nextSibling);
            else list.appendChild(row);
            if (focus) $('input', row).focus();
            this.refreshRows();
            return row;
        },

        refreshRows() {
            const rows = $$('#urlList .url-row');
            rows.forEach(row => {
                const val = $('.url-input', row).value.trim();
                const p = platOf(val);
                const pm = p && HPLAT[p];
                const badge = $('.url-plat', row);
                badge.classList.toggle('show', !!pm);
                badge.innerHTML = pm ? (pm.icon ? `<i class="${pm.icon}"></i>` : pm.text) : '';
                if (pm) { badge.style.background = pm.bg; badge.style.color = pm.color; badge.style.borderColor = pm.border; }
                row.classList.toggle.ok = !!p;
                row.classList.toggle('has-del', rows.length > 1);
                $('.remove-btn', row).hidden = rows.length === 1;
            });
            const nf = uploads.size;
            $('#linkCount').textContent = rows.length + (rows.length === 1 ? ' link' : ' linkuri') + (nf ? ` · ${nf} fișiere` : '');
            const n = this.parseLinks().length + uploads.size;
            $('#goCost').textContent = 'Gratuit ⚡';
        },

        parseLinks() {
            return $$('#urlList input').map(i => i.value.trim()).filter(Boolean);
        },

        addFiles(files) {
            for (const f of [...files]) {
                const id = ++upSeq;
                const row = document.createElement('div');
                row.className = 'file-row prompt-wrap ready';
                row.innerHTML = `
                    <i class="fa-solid fa-circle-check f-ico" style="color:var(--accent)"></i>
                    <div class="f-tx">
                        <div class="f-name">${esc(f.name)}</div>
                        <div class="f-sub">${(f.size / 1048576).toFixed(1)} MB · gata de procesare</div>
                    </div>
                    <button type="button" class="remove-btn" aria-label="Șterge"><i class="fa-solid fa-xmark"></i></button>
                `;
                $('#fileList').appendChild(row);
                const obj = { id, file: f, url: URL.createObjectURL(f), uploadName: f.name, el: row };
                uploads.set(id, obj);
                $('.remove-btn', row).onclick = () => { row.remove(); uploads.delete(id); this.refreshRows(); };
            }
            this.refreshRows();
            toast(`${files.length} video adăugat cu succes!`);
        },

        renderVoices() {
            if (!CFG || !CFG.voices) return;
            const currentLang = state.lang || 'română';
            const langVoices = CFG.voices.filter(v => v.lang === currentLang);
            const voicesToShow = langVoices.length ? langVoices : CFG.voices.slice(0, 4);

            if (!voicesToShow.some(v => v.key === state.voice)) {
                state.voice = voicesToShow[0].key;
            }

            $('#voiceGrid').innerHTML = voicesToShow.map(v => `
                <div class="vchip${v.key === state.voice ? ' on' : ''}" data-v="${esc(v.key)}">
                    <div class="vtx"><div class="vn">${esc(v.label)}</div><div class="vt">${esc(v.tag)}</div></div>
                    <span class="vplay" data-play="${esc(v.key)}"><i class="fa-solid fa-play"></i></span>
                </div>
            `).join('');
            $('#voiceCount').textContent = voicesToShow.length + ' voci';
        },

        selectVoice(k) {
            state.voice = k;
            $$('.vchip').forEach(c => c.classList.toggle('on', c.dataset.v === k));
        }
    };
})();
