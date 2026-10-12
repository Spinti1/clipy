// Video Exporter Module - Direct MP4 Download Engine
(function() {
    window.VideoExporter = {
        async exportAndDownload(c) {
            const btn = $('[data-a=download]', c.el);
            const lab = $('.dl-lab', btn);
            btn.disabled = true;
            lab.textContent = 'Randez videoul MP4 HD...';

            const main = $('video.main', c.el);
            const jobTitle = (c.job && c.job.result && c.job.result.title) || 'clipy_video';
            const cleanFilename = (jobTitle.replace(/[^\w\s\-\.]/gi, '_').replace(/\s+/g, '_').trim().slice(0, 50) || 'clipy_video') + '.mp4';

            try {
                toast('Randez videoclipul MP4 HD cu subtitrări și efecte... ⏳');

                const toolsWithTitle = Object.assign({}, c.tools, { title: jobTitle });
                const res = await api(`/api/jobs/${c.job.jobId}/export`, {
                    method: 'POST',
                    body: { tools: toolsWithTitle }
                });

                if (res && res.exp && res.exp.url) {
                    const directUrl = window.resolveUrl ? window.resolveUrl(res.exp.url) : res.exp.url;
                    await this.triggerFileDownload(directUrl, cleanFilename, c.job.jobId);
                    toast('Videoclipul ' + cleanFilename + ' a fost descărcat cu succes! ⚡');
                    return;
                }

                // If no exp url returned, download main video directly
                if (main && main.src) {
                    await this.triggerFileDownload(main.src, cleanFilename, c.job.jobId);
                    toast('Videoclipul a fost descărcat direct ⚡');
                }
            } catch (err) {
                console.warn('[VideoExporter] Server export error, încerc descărcare directă:', err.message);
                const fallbackDownloadUrl = window.resolveUrl
                    ? window.resolveUrl(`/api/jobs/${c.job.jobId}/download`)
                    : `/api/jobs/${c.job.jobId}/download`;
                await this.triggerFileDownload(fallbackDownloadUrl, cleanFilename, c.job.jobId);
                toast('Videoclipul se descarcă direct... ⚡');
            } finally {
                btn.disabled = false;
                lab.textContent = 'Exportă & descarcă';
            }
        },

        async triggerFileDownload(url, filename, jobId) {
            try {
                toast('Descarc fișierul MP4 pe dispozitiv... ⏳');
                // Fetch as blob to guarantee immediate local file download on any browser
                const downloadTarget = url.includes('?') ? `${url}&download=1` : `${url}?download=1`;
                const response = await fetch(downloadTarget);
                if (!response.ok) throw new Error('HTTP ' + response.status);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename || 'clipy_video.mp4';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
            } catch (e) {
                console.warn('[VideoExporter] Blob download fallback to link:', e);
                // Fallback to direct anchor navigation with attachment endpoint
                const a = document.createElement('a');
                a.href = jobId && window.resolveUrl
                    ? window.resolveUrl(`/api/jobs/${jobId}/download`)
                    : url;
                a.download = filename || 'clipy_video.mp4';
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        }
    };
})();
