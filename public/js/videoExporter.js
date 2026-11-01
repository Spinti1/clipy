// Video Exporter Module - Direct MP4 Download Engine
(function() {
    window.VideoExporter = {
        async exportAndDownload(c) {
            const btn = $('[data-a=download]', c.el);
            const lab = $('.dl-lab', btn);
            if (btn) btn.disabled = true;
            if (lab) lab.textContent = 'Rendering MP4 HD video...';

            const main = $('video.main', c.el);
            const jobTitle = (c.job && c.job.result && c.job.result.title) || 'clipy_video';
            const cleanFilename = (jobTitle.replace(/[^\w\s\-\.]/gi, '_').replace(/\s+/g, '_').trim().slice(0, 50) || 'clipy_video') + '.mp4';

            try {
                toast('Rendering MP4 HD video with captions and effects... ⏳');

                const toolsWithTitle = Object.assign({}, c.tools, {
                    title: jobTitle,
                    captionsWords: (c.captionsData && c.captionsData.words) || []
                });
                const res = await api(`/api/jobs/${c.job.jobId}/export`, {
                    method: 'POST',
                    body: { tools: toolsWithTitle }
                });

                if (res && res.exp && res.exp.url) {
                    const directUrl = window.resolveUrl ? window.resolveUrl(res.exp.url) : res.exp.url;
                    await this.triggerFileDownload(directUrl, cleanFilename, c.job.jobId);
                    toast('Video ' + cleanFilename + ' downloaded successfully! ⚡');
                    return;
                }

                // If no exp url returned, download main video directly
                if (main && main.src) {
                    await this.triggerFileDownload(main.src, cleanFilename, c.job.jobId);
                    toast('Video downloaded directly ⚡');
                }
            } catch (err) {
                console.warn('[VideoExporter] Server export error, falling back to direct download:', err.message);
                const fallbackDownloadUrl = window.resolveUrl
                    ? window.resolveUrl(`/api/jobs/${c.job.jobId}/download`)
                    : `/api/jobs/${c.job.jobId}/download`;
                await this.triggerFileDownload(fallbackDownloadUrl, cleanFilename, c.job.jobId);
                toast('Downloading video directly... ⚡');
            } finally {
                if (btn) btn.disabled = false;
                if (lab) lab.textContent = 'Export & Download';
            }
        },

        async triggerFileDownload(url, filename, jobId) {
            try {
                toast('Downloading MP4 file to device... ⏳');
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
