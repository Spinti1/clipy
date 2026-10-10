const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * Locate static_ffmpeg or system ffmpeg directory
 */
function getFfmpegDir() {
  const custom = process.env.STATIC_FFMPEG_PATH || process.env.FFMPEG_PATH;
  if (custom && fs.existsSync(custom)) {
    return fs.statSync(custom).isDirectory() ? custom : path.dirname(custom);
  }

  const candidates = [
    'C:\\Users\\Spinti-PC\\AppData\\Local\\Python\\pythoncore-3.14-64\\Lib\\site-packages\\static_ffmpeg\\bin\\win32',
    path.join(process.env.LOCALAPPDATA || '', 'Python', 'pythoncore-3.14-64', 'Lib', 'site-packages', 'static_ffmpeg', 'bin', 'win32'),
    path.join(process.env.LOCALAPPDATA || '', 'Python', 'Python314', 'Lib', 'site-packages', 'static_ffmpeg', 'bin', 'win32')
  ];

  for (const dir of candidates) {
    if (dir && fs.existsSync(path.join(dir, 'ffmpeg.exe'))) {
      return dir;
    }
  }

  return null;
}

function getFfprobePath() {
  const dir = getFfmpegDir();
  if (dir && fs.existsSync(path.join(dir, 'ffprobe.exe'))) {
    return path.join(dir, 'ffprobe.exe');
  }
  return 'ffprobe';
}

function getFfmpegPath() {
  const dir = getFfmpegDir();
  if (dir && fs.existsSync(path.join(dir, 'ffmpeg.exe'))) {
    return path.join(dir, 'ffmpeg.exe');
  }
  return 'ffmpeg';
}

/**
 * Probe media file using ffprobe to get real duration, width, height, and codec
 */
function probeVideo(filePath) {
  return new Promise((resolve) => {
    const ffprobe = getFfprobePath();
    const args = ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath];

    const proc = spawn(ffprobe, args);
    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      try { proc.kill(); } catch (_) {}
    }, 10000);

    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 || !stdout.trim()) {
        resolve({
          duration: 12.0,
          width: 1080,
          height: 1920,
          codec: 'unknown'
        });
        return;
      }

      try {
        const info = JSON.parse(stdout);
        const videoStream = (info.streams || []).find(s => s.codec_type === 'video');
        const duration = parseFloat(
          (info.format && info.format.duration) ||
          (videoStream && videoStream.duration) ||
          12.0
        );
        const width = parseInt((videoStream && videoStream.width) || 1080, 10);
        const height = parseInt((videoStream && videoStream.height) || 1920, 10);
        const codec = (videoStream && videoStream.codec_name) || 'unknown';

        resolve({ duration, width, height, codec });
      } catch (err) {
        resolve({
          duration: 12.0,
          width: 1080,
          height: 1920,
          codec: 'unknown'
        });
      }
    });

    proc.on('error', () => {
      clearTimeout(timer);
      resolve({
        duration: 12.0,
        width: 1080,
        height: 1920,
        codec: 'unknown'
      });
    });
  });
}

/**
 * Downloads a video from a web URL using yt-dlp, or resolves an existing uploaded file.
 * Returns metadata: { ok, videoUrl, filePath, title, duration, width, height }
 */
async function downloadVideo(url, targetFile) {
  const filesDir = path.join(__dirname, '..', 'data', 'files');
  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
  }

  const u = String(url || '').trim();

  // 1. Handle uploaded files or local references
  if (u.startsWith('/files/') || u.startsWith('upload:')) {
    const filename = path.basename(u);
    const localPath = path.join(filesDir, filename);
    if (fs.existsSync(localPath)) {
      const probe = await probeVideo(localPath);
      return {
        ok: true,
        videoUrl: '/files/' + filename,
        filePath: localPath,
        title: filename,
        duration: probe.duration,
        width: probe.width,
        height: probe.height
      };
    }
  }

  // 2. Handle direct file paths
  if (fs.existsSync(u)) {
    const probe = await probeVideo(u);
    return {
      ok: true,
      videoUrl: u.startsWith(filesDir) ? '/files/' + path.basename(u) : '/assets/sample.mp4',
      filePath: u,
      title: path.basename(u),
      duration: probe.duration,
      width: probe.width,
      height: probe.height
    };
  }

  // 3. For remote video links (YouTube, TikTok, Instagram, etc.)
  const urlHash = crypto.createHash('md5').update(u).digest('hex').slice(0, 12);
  const destPath = targetFile || path.join(filesDir, `vid_${urlHash}.mp4`);
  const metaPath = destPath + '.meta.json';

  // If already downloaded and valid file size > 10KB, reuse cache
  if (!targetFile && fs.existsSync(destPath) && fs.statSync(destPath).size > 10000) {
    const probe = await probeVideo(destPath);
    const filename = path.basename(destPath);
    let title = 'Video descărcat';
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta && meta.title) title = meta.title;
      } catch (_) {}
    }
    return {
      ok: true,
      videoUrl: '/files/' + filename,
      filePath: destPath,
      title,
      duration: probe.duration,
      width: probe.width,
      height: probe.height
    };
  }

  const ffmpegDir = getFfmpegDir();
  const ytArgs = [
    '-m', 'yt_dlp',
    '--no-simulate',
    '--js-runtimes', 'node',
    ...(ffmpegDir ? ['--ffmpeg-location', ffmpegDir] : []),
    '-S', 'res,vcodec:h264,acodec:m4a',
    '--merge-output-format', 'mp4',
    '-o', destPath,
    '--force-overwrites',
    '--no-playlist',
    '--print', 'after_video:TITLE:%(title)s',
    u
  ];

  return new Promise((resolve) => {
    const proc = spawn('python', ytArgs);
    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      try { proc.kill(); } catch (_) {}
    }, 45000);

    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });

    proc.on('close', async (code) => {
      clearTimeout(timer);
      let title = 'Video descărcat';
      const m = stdout.match(/TITLE:(.+)/);
      if (m && m[1]) {
        title = m[1].trim();
      }

      if (code === 0 && fs.existsSync(destPath)) {
        try {
          fs.writeFileSync(metaPath, JSON.stringify({ title, url: u }), 'utf8');
        } catch (_) {}

        const probe = await probeVideo(destPath);
        const filename = path.basename(destPath);
        resolve({
          ok: true,
          videoUrl: '/files/' + filename,
          filePath: destPath,
          title,
          duration: probe.duration,
          width: probe.width,
          height: probe.height
        });
      } else {
        console.warn(`[videoDownloader] yt-dlp exited with code ${code}. Stderr: ${stderr.slice(0, 300)}`);
        // Fallback to sample if external download fails
        resolve({
          ok: false,
          error: stderr || `Exit code ${code}`,
          videoUrl: '/assets/sample.mp4',
          filePath: path.join(__dirname, '..', 'public', 'assets', 'sample.mp4'),
          title: 'Video demonstrativ (fallback)',
          duration: 60.0,
          width: 640,
          height: 360
        });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      console.warn(`[videoDownloader] Error spawning python yt-dlp:`, err.message);
      resolve({
        ok: false,
        error: err.message,
        videoUrl: '/assets/sample.mp4',
        filePath: path.join(__dirname, '..', 'public', 'assets', 'sample.mp4'),
        title: 'Video demonstrativ (fallback)',
        duration: 60.0,
        width: 640,
        height: 360
      });
    });
  });
}

/**
 * Merges video and audio file using ffmpeg, replacing/muting the original video's audio
 */
function mergeVideoAndAudio(videoPath, audioPath, outputPath) {
  return new Promise((resolve) => {
    const ffmpeg = getFfmpegPath();
    const dest = outputPath || path.join(path.dirname(videoPath), `merged_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.mp4`);

    const args = [
      '-y',
      '-i', videoPath,
      '-i', audioPath,
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-af', 'apad',
      '-shortest',
      dest
    ];

    const proc = spawn(ffmpeg, args);
    let stderr = '';

    const timer = setTimeout(() => {
      try { proc.kill(); } catch (_) {}
    }, 30000);

    proc.stderr.on('data', d => { stderr += d; });

    proc.on('close', async (code) => {
      clearTimeout(timer);
      if (code === 0 && fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
        resolve({
          ok: true,
          filePath: dest,
          videoUrl: '/files/' + path.basename(dest)
        });
      } else {
        console.warn(`[videoDownloader] ffmpeg merge error (code ${code}):`, stderr.slice(0, 300));
        resolve({
          ok: false,
          error: stderr || `Exit code ${code}`,
          filePath: videoPath,
          videoUrl: '/files/' + path.basename(videoPath)
        });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      console.warn(`[videoDownloader] spawn ffmpeg error:`, err.message);
      resolve({
        ok: false,
        error: err.message,
        filePath: videoPath,
        videoUrl: '/files/' + path.basename(videoPath)
      });
    });
  });
}

module.exports = {
  downloadVideo,
  probeVideo,
  mergeVideoAndAudio,
  getFfmpegDir,
  getFfmpegPath,
  getFfprobePath
};

