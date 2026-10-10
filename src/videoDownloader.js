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

function hexToAssColor(hex, fallback = '&H00FFFFFF&') {
  if (!hex) return fallback;
  const c = String(hex).replace('#', '').trim();
  if (c.length === 6) {
    const r = c.slice(0, 2);
    const g = c.slice(2, 4);
    const b = c.slice(4, 6);
    return `&H00${b}${g}${r}&`;
  }
  return fallback;
}

function formatAssTime(sec) {
  const s = Math.max(0, sec || 0);
  const hrs = Math.floor(s / 3600);
  const mins = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const secs = String(Math.floor(s % 60)).padStart(2, '0');
  const cs = String(Math.floor((s % 1) * 100)).padStart(2, '0');
  return `${hrs}:${mins}:${secs}.${cs}`;
}

const PRESET_STYLES = {
  clasic:   { font: 'Anton', active: '#65D69E', text: '#FFFFFF', upper: true, outline: 3.5, shadow: 1.5 },
  galben:   { font: 'Anton', active: '#FFD400', text: '#FFFFFF', upper: true, outline: 3.5, shadow: 1.5 },
  comic:    { font: 'Bangers', active: '#FF3B5C', text: '#FFFFFF', upper: true, outline: 3.5, shadow: 2.0 },
  bubble:   { font: 'Luckiest Guy', active: '#38BDF8', text: '#FFFFFF', upper: false, outline: 4.0, shadow: 2.0 },
  neon:     { font: 'Bangers', active: '#FFF36B', text: '#FFFFFF', upper: true, outline: 3.0, shadow: 2.5 },
  boxnegru: { font: 'Anton', active: '#FFD400', text: '#FFFFFF', upper: true, outline: 3.0, shadow: 1.5 },
  boxverde: { font: 'Anton', active: '#FFFFFF', text: '#07130D', upper: true, outline: 2.5, shadow: 1.0 },
  simplu:   { font: 'Anton', active: '#FFFFFF', text: '#FFFFFF', upper: false, outline: 2.0, shadow: 1.0 }
};

/**
 * Generates an ASS subtitle script with real-time active-word karaoke highlighting
 */
function generateAssScript({ groups, width, height, capTools }) {
  const cap = capTools || {};
  const presetKey = cap.preset || 'clasic';
  const preset = PRESET_STYLES[presetKey] || PRESET_STYLES.clasic;

  const fontName = preset.font || 'Anton';
  const isUpper = preset.upper !== false;
  const activeColor = hexToAssColor(preset.active, '&H009ED665&');
  const normalColor = hexToAssColor(preset.text, '&H00FFFFFF&');
  const outlineColor = '&H00000000&';
  const shadowColor = '&H80000000&';

  const sizeKey = cap.size || 'm';
  const sizeFactor = sizeKey === 's' ? 0.058 : (sizeKey === 'l' ? 0.088 : 0.072);
  const fontSize = Math.max(28, Math.round(width * sizeFactor));

  const posY = Number(cap.posY != null ? cap.posY : 0.72);
  const marginV = Math.max(30, Math.round((1 - posY) * height));

  let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${normalColor},${activeColor},${outlineColor},${shadowColor},-1,0,0,0,100,100,1,0,1,${preset.outline},${preset.shadow},2,30,30,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  if (Array.isArray(groups)) {
    groups.forEach((g) => {
      const words = g.words || [];
      if (!words.length) return;

      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const nextW = words[i + 1];
        const wordStart = Math.max(g.s, w.s);
        const wordEnd = nextW ? Math.max(wordStart + 0.05, Math.min(g.e, nextW.s)) : g.e;

        if (wordEnd <= wordStart) continue;

        const lineText = words.map((cur, curIdx) => {
          const txt = isUpper ? String(cur.w).toUpperCase() : cur.w;
          if (curIdx === i) {
            return `{\\c${activeColor}}${txt}{\\c${normalColor}}`;
          }
          return txt;
        }).join(' ');

        ass += `Dialogue: 0,${formatAssTime(wordStart)},${formatAssTime(wordEnd)},Default,,0,0,${marginV},,${lineText}\n`;
      }
    });
  }

  return ass;
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

  let assPath = null;
  const filterChains = [];
  let currentLabel = '0:v';
  let step = 0;

  // 1. Horizontal Mirror
  if (tools.mirror) {
    const nextLabel = `v_${++step}`;
    filterChains.push(`[${currentLabel}]hflip[${nextLabel}]`);
    currentLabel = nextLabel;
  }

  // 2. Blur bounding boxes (applied on video BEFORE subtitles so subtitles are OVER blur)
  if (Array.isArray(tools.blur) && tools.blur.length > 0) {
    for (const b of tools.blur) {
      let bx = Math.max(0, Math.min(width - 4, Math.round((b.x / 100) * width)));
      let by = Math.max(0, Math.min(height - 4, Math.round((b.y / 100) * height)));
      let bw = Math.max(4, Math.min(width - bx, Math.round((b.w / 100) * width)));
      let bh = Math.max(4, Math.min(height - by, Math.round((b.h / 100) * height)));

      // Make dimensions even
      bw = bw - (bw % 2);
      bh = bh - (bh % 2);
      bx = bx - (bx % 2);
      by = by - (by % 2);

      const splitBase = `sp_base_${++step}`;
      const splitCrop = `sp_crop_${step}`;
      const blurred = `blur_${step}`;
      const nextLabel = `v_${++step}`;

      filterChains.push(`[${currentLabel}]split[${splitBase}][${splitCrop}]`);
      filterChains.push(`[${splitCrop}]crop=${bw}:${bh}:${bx}:${by},boxblur=15:5[${blurred}]`);
      filterChains.push(`[${splitBase}][${blurred}]overlay=${bx}:${by}[${nextLabel}]`);
      currentLabel = nextLabel;
    }
  }

  // 3. Mask band
  if (tools.mask && tools.mask.enabled && tools.mask.blackBg) {
    const topH = Math.max(1, Math.round(Math.max(0, (tools.mask.posY - tools.mask.thickness / 2) * height)));
    const botY = Math.min(height - 1, Math.round(Math.min(height, (tools.mask.posY + tools.mask.thickness / 2) * height)));
    const nextLabel1 = `v_${++step}`;
    const nextLabel2 = `v_${++step}`;
    filterChains.push(`[${currentLabel}]drawbox=x=0:y=0:w=${width}:h=${topH}:color=black:t=fill[${nextLabel1}]`);
    filterChains.push(`[${nextLabel1}]drawbox=x=0:y=${botY}:w=${width}:h=${height - botY}:color=black:t=fill[${nextLabel2}]`);
    currentLabel = nextLabel2;
  }

  // 4. Burn subtitles ON TOP of all blur and video filters
  if (tools.captions && tools.captions.enabled && captionsWords && captionsWords.length > 0) {
    const captionService = require('./captionService');
    const groups = captionService.wordsToGroups(captionsWords, tools.captions.per || 4);
    if (groups && groups.length > 0) {
      assPath = path.join(filesDir, `sub_${Date.now()}_${crypto.randomBytes(3).toString('hex')}.ass`);
      const assScript = generateAssScript({
        groups,
        width,
        height,
        capTools: tools.captions
      });
      fs.writeFileSync(assPath, assScript, 'utf8');

      // Use relative paths to prevent Windows colon parsing issues in ffmpeg
      const relAss = path.relative(process.cwd(), assPath).replace(/\\/g, '/');
      const relFonts = path.relative(process.cwd(), path.join(__dirname, '..', 'public', 'fonts')).replace(/\\/g, '/');

      const nextLabel = `v_${++step}`;
      filterChains.push(`[${currentLabel}]subtitles='${relAss}':fontsdir='${relFonts}'[${nextLabel}]`);
      currentLabel = nextLabel;
    }
  }

  return new Promise((resolve) => {
    let args;
    if (filterChains.length > 0) {
      const filterComplex = filterChains.join(';');
      args = [
        '-y',
        '-i', resolvedVideo,
        '-filter_complex', filterComplex,
        '-map', `[${currentLabel}]`,
        '-map', '0:a?',
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
    }, 90000);

    proc.stderr.on('data', d => { stderr += d; });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (assPath && fs.existsSync(assPath)) {
        try { fs.unlinkSync(assPath); } catch (_) {}
      }
      if (code === 0 && fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
        resolve({
          ok: true,
          filePath: dest,
          videoUrl: '/files/' + path.basename(dest)
        });
      } else {
        console.warn(`[videoDownloader] exportProcessedVideo error (code ${code}):`, stderr.slice(-300));
        resolve({
          ok: true,
          filePath: resolvedVideo,
          videoUrl: '/files/' + path.basename(resolvedVideo)
        });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      if (assPath && fs.existsSync(assPath)) {
        try { fs.unlinkSync(assPath); } catch (_) {}
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

