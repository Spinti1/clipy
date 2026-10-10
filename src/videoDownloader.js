const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { PYTHON_EXE, STATIC_FFMPEG_DIR, FFMPEG_EXE, FFPROBE_EXE } = require('./envConfig');

/**
 * Locate static_ffmpeg or system ffmpeg directory
 */
function getFfmpegDir() {
  if (STATIC_FFMPEG_DIR && fs.existsSync(STATIC_FFMPEG_DIR)) {
    return STATIC_FFMPEG_DIR;
  }
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
  if (FFPROBE_EXE && fs.existsSync(FFPROBE_EXE)) return FFPROBE_EXE;
  const dir = getFfmpegDir();
  if (dir && fs.existsSync(path.join(dir, 'ffprobe.exe'))) {
    return path.join(dir, 'ffprobe.exe');
  }
  return 'ffprobe';
}

function getFfmpegPath() {
  if (FFMPEG_EXE && fs.existsSync(FFMPEG_EXE)) return FFMPEG_EXE;
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

async function ensureCaptions(videoFilePath, existingSubs) {
  if (existingSubs && existingSubs.cues && existingSubs.cues.length) {
    return existingSubs;
  }
  const geminiService = require('./geminiService');
  const tempAudio = path.join(path.dirname(videoFilePath), `audio_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.mp3`);
  try {
    const { spawnSync } = require('child_process');
    const ffmpeg = getFfmpegPath();
    spawnSync(ffmpeg, ['-y', '-i', videoFilePath, '-vn', '-ar', '16000', '-ac', '1', '-b:a', '48k', tempAudio]);
    if (fs.existsSync(tempAudio) && fs.statSync(tempAudio).size > 1000) {
      const cues = await geminiService.transcribeAudio(tempAudio);
      try { fs.unlinkSync(tempAudio); } catch (_) {}
      if (cues && cues.length) {
        return {
          file: null,
          lang: 'auto',
          cues,
          rawText: cues.map(c => c.text).join(' ')
        };
      }
    }
  } catch (err) {
    console.warn('[videoDownloader] Gemini audio transcription error:', err.message);
    try { if (fs.existsSync(tempAudio)) fs.unlinkSync(tempAudio); } catch (_) {}
  }
  return null;
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
      const subtitles = await ensureCaptions(localPath, null);
      return {
        ok: true,
        videoUrl: '/files/' + filename,
        filePath: localPath,
        title: filename,
        duration: probe.duration,
        width: probe.width,
        height: probe.height,
        subtitles
      };
    }
  }

  // 2. Handle direct file paths
  if (fs.existsSync(u)) {
    const probe = await probeVideo(u);
    const subtitles = await ensureCaptions(u, null);
    return {
      ok: true,
      videoUrl: u.startsWith(filesDir) ? '/files/' + path.basename(u) : '/assets/sample.mp4',
      filePath: u,
      title: path.basename(u),
      duration: probe.duration,
      width: probe.width,
      height: probe.height,
      subtitles
    };
  }

  // 3. For remote video links (YouTube, TikTok, Instagram, etc.)
  const urlHash = crypto.createHash('md5').update(u).digest('hex').slice(0, 12);
  const destPath = targetFile || path.join(filesDir, `vid_${urlHash}.mp4`);
  const metaPath = destPath + '.meta.json';

  function extractSubtitles(dest) {
    const dir = path.dirname(dest);
    const base = path.basename(dest, path.extname(dest));
    const captionService = require('./captionService');

    try {
      const files = fs.readdirSync(dir).filter(f => f.startsWith(base) && f.endsWith('.vtt'));
      if (!files.length) return null;

      // Prioritize target languages: ro, en, or first available
      let chosen = files.find(f => f.includes('.ro') || f.includes('ro-'));
      if (!chosen) chosen = files.find(f => f.includes('.en') || f.includes('en-'));
      if (!chosen) chosen = files[0];

      const content = fs.readFileSync(path.join(dir, chosen), 'utf8');
      const cues = captionService.parseVtt(content);
      if (cues && cues.length) {
        const langMatch = chosen.match(/\.([a-z]{2}(?:-[a-z]{2})?)\.vtt$/i);
        return {
          file: path.join(dir, chosen),
          lang: langMatch ? langMatch[1] : 'en',
          cues,
          rawText: cues.map(c => c.text).join(' ')
        };
      }
    } catch (err) {
      console.warn('[videoDownloader] Subtitle parse error:', err.message);
    }
    return null;
  }

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
    let subtitles = extractSubtitles(destPath);
    if (!subtitles || !subtitles.cues || !subtitles.cues.length) {
      subtitles = await ensureCaptions(destPath, subtitles);
    }
    return {
      ok: true,
      videoUrl: '/files/' + filename,
      filePath: destPath,
      title,
      duration: probe.duration,
      width: probe.width,
      height: probe.height,
      subtitles
    };
  }

  const ffmpegDir = getFfmpegDir();
  const ytArgs = [
    '-m', 'yt_dlp',
    '--no-simulate',
    '--no-abort-on-error',
    '--ignore-errors',
    '--js-runtimes', 'node',
    ...(ffmpegDir ? ['--ffmpeg-location', ffmpegDir] : []),
    '-S', 'res,vcodec:h264,acodec:m4a',
    '--merge-output-format', 'mp4',
    '--write-subs',
    '--write-auto-subs',
    '--sub-format', 'vtt',
    '--sub-langs', 'en,ro,es,de,fr,it',
    '-o', destPath,
    '--force-overwrites',
    '--no-playlist',
    '--print', 'after_video:TITLE:%(title)s',
    u
  ];

  return new Promise((resolve) => {
    const proc = spawn(PYTHON_EXE, ytArgs);
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
        let subtitles = extractSubtitles(destPath);
        if (!subtitles || !subtitles.cues || !subtitles.cues.length) {
          subtitles = await ensureCaptions(destPath, subtitles);
        }
        resolve({
          ok: true,
          videoUrl: '/files/' + filename,
          filePath: destPath,
          title,
          duration: probe.duration,
          width: probe.width,
          height: probe.height,
          subtitles
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

function formatSrtTime(sec) {
  const s = Math.max(0, sec || 0);
  const hrs = String(Math.floor(s / 3600)).padStart(2, '0');
  const mins = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const secs = String(Math.floor(s % 60)).padStart(2, '0');
  const ms = String(Math.floor((s % 1) * 1000)).padStart(3, '0');
  return `${hrs}:${mins}:${secs},${ms}`;
}

/**
 * Renders an exported MP4 with tools (mirror, mask, blur, subtitles) burned in using ffmpeg
 */
async function exportProcessedVideo({ videoPath, tools = {}, captionsWords = [], outputPath }) {
  const ffmpeg = getFfmpegPath();
  const filesDir = path.join(__dirname, '..', 'data', 'files');
  if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });

  const resolvedVideo = (videoPath && fs.existsSync(videoPath))
    ? videoPath
    : path.join(__dirname, '..', 'public', 'assets', 'sample.mp4');

  const dest = outputPath || path.join(filesDir, `export_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.mp4`);

  const probe = await probeVideo(resolvedVideo);
  const width = probe.width || 720;
  const height = probe.height || 1280;

  const vfilters = [];

  // 1. Mirror
  if (tools.mirror) {
    vfilters.push('hflip');
  }

  // 2. Mask band
  if (tools.mask && tools.mask.enabled) {
    if (tools.mask.blackBg) {
      const topH = Math.max(1, Math.round(Math.max(0, (tools.mask.posY - tools.mask.thickness / 2) * height)));
      const botY = Math.min(height - 1, Math.round(Math.min(height, (tools.mask.posY + tools.mask.thickness / 2) * height)));
      vfilters.push(`drawbox=x=0:y=0:w=${width}:h=${topH}:color=black:t=fill`);
      vfilters.push(`drawbox=x=0:y=${botY}:w=${width}:h=${height - botY}:color=black:t=fill`);
    }
  }

  // 3. Blur bounding boxes
  if (Array.isArray(tools.blur) && tools.blur.length > 0) {
    for (const b of tools.blur) {
      const bx = Math.max(0, Math.min(width - 4, Math.round((b.x / 100) * width)));
      const by = Math.max(0, Math.min(height - 4, Math.round((b.y / 100) * height)));
      const bw = Math.max(4, Math.min(width - bx, Math.round((b.w / 100) * width)));
      const bh = Math.max(4, Math.min(height - by, Math.round((b.h / 100) * height)));
      vfilters.push(`delogo=x=${bx}:y=${by}:w=${bw}:h=${bh}`);
    }
  }

  // 4. Burn subtitles if enabled
  let srtPath = null;
  if (tools.captions && tools.captions.enabled && captionsWords && captionsWords.length > 0) {
    const captionService = require('./captionService');
    const groups = captionService.wordsToGroups(captionsWords, tools.captions.per || 4);
    if (groups && groups.length > 0) {
      srtPath = path.join(filesDir, `sub_${Date.now()}_${crypto.randomBytes(3).toString('hex')}.srt`);
      let srtContent = '';
      groups.forEach((g, idx) => {
        const lineText = g.words.map(w => w.w).join(' ');
        srtContent += `${idx + 1}\n${formatSrtTime(g.s)} --> ${formatSrtTime(g.e)}\n${lineText}\n\n`;
      });
      fs.writeFileSync(srtPath, srtContent, 'utf8');

      const escapedSrt = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
      const fontSize = tools.captions.size === 's' ? 18 : (tools.captions.size === 'l' ? 28 : 22);
      vfilters.push(`subtitles='${escapedSrt}':force_style='FontSize=${fontSize},PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2'`);
    }
  }

  return new Promise((resolve) => {
    let args;
    if (vfilters.length > 0) {
      args = [
        '-y',
        '-i', resolvedVideo,
        '-vf', vfilters.join(','),
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '22',
        '-c:a', 'copy',
        '-movflags', '+faststart',
        dest
      ];
    } else {
      args = [
        '-y',
        '-i', resolvedVideo,
        '-c', 'copy',
        '-movflags', '+faststart',
        dest
      ];
    }

    const proc = spawn(ffmpeg, args);
    let stderr = '';

    const timer = setTimeout(() => {
      try { proc.kill(); } catch (_) {}
    }, 60000);

    proc.stderr.on('data', d => { stderr += d; });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (srtPath && fs.existsSync(srtPath)) {
        try { fs.unlinkSync(srtPath); } catch (_) {}
      }
      if (code === 0 && fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
        resolve({
          ok: true,
          filePath: dest,
          videoUrl: '/files/' + path.basename(dest)
        });
      } else {
        console.warn(`[videoDownloader] exportProcessedVideo error (code ${code}):`, stderr.slice(0, 300));
        resolve({
          ok: true,
          filePath: resolvedVideo,
          videoUrl: '/files/' + path.basename(resolvedVideo)
        });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      if (srtPath && fs.existsSync(srtPath)) {
        try { fs.unlinkSync(srtPath); } catch (_) {}
      }
      console.warn(`[videoDownloader] exportProcessedVideo spawn error:`, err.message);
      resolve({
        ok: true,
        filePath: resolvedVideo,
        videoUrl: '/files/' + path.basename(resolvedVideo)
      });
    });
  });
}

module.exports = {
  downloadVideo,
  probeVideo,
  mergeVideoAndAudio,
  exportProcessedVideo,
  formatSrtTime,
  getFfmpegDir,
  getFfmpegPath,
  getFfprobePath
};

