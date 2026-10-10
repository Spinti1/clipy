// Video Exporter Module
(function() {
    window.VideoExporter = {
        async exportAndDownload(c) {
            const btn = $('[data-a=download]', c.el);
            const lab = $('.dl-lab', btn);
            btn.disabled = true;
            lab.textContent = 'Randez videoul MP4...';

            const main = $('video.main', c.el);

            try {
                toast('Generez videoclipul MP4 în fundal (fără blocare ecran) ⚡');

                const res = await api(`/api/jobs/${c.job.jobId}/export`, {
                    method: 'POST',
                    body: { tools: c.tools }
                });

                if (res && res.exp && res.exp.url) {
                    const downloadUrl = window.resolveUrl ? window.resolveUrl(res.exp.url) : res.exp.url;
                    this.triggerFileDownload(downloadUrl, 'clipy_export.mp4');
                    toast('Videoclipul MP4 a fost descărcat cu succes! ⚡');
                    return;
                }

                // If no exp url returned, fallback to main src
                if (main && main.src) {
                    this.triggerFileDownload(main.src, 'clipy_video.mp4');
                    toast('Videoclipul a fost descărcat direct ⚡');
                }
            } catch (err) {
                console.warn('[VideoExporter] Server export error, falling back:', err.message);
                if (main && main.src) {
                    this.triggerFileDownload(main.src, 'clipy_video.mp4');
                    toast('Videoclipul a fost descărcat direct ⚡');
                } else {
                    toast('Eroare la descărcare: ' + err.message);
                }
            } finally {
                btn.disabled = false;
                lab.textContent = 'Exportă & descarcă';
            }
        },

        triggerFileDownload(url, filename) {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'clipy_video.mp4';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };
})();
