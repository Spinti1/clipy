const path = require('path');
const fs = require('fs');

// Python 3.14 installation directory on user's machine
const PYTHON_DIR = 'C:\\Users\\Spinti-PC\\AppData\\Local\\Python\\pythoncore-3.14-64';
const SCRIPTS_DIR = path.join(PYTHON_DIR, 'Scripts');
const STATIC_FFMPEG_DIR = path.join(PYTHON_DIR, 'Lib', 'site-packages', 'static_ffmpeg', 'bin', 'win32');

// Prepend to process.env.PATH so Windows never resolves to the Microsoft Store WindowsApps stub
if (fs.existsSync(PYTHON_DIR)) {
  const currentPath = process.env.PATH || '';
  const additions = [PYTHON_DIR, SCRIPTS_DIR, STATIC_FFMPEG_DIR].filter(d => fs.existsSync(d));
  process.env.PATH = additions.join(';') + ';' + currentPath;
}

const PYTHON_EXE = fs.existsSync(path.join(PYTHON_DIR, 'python.exe'))
  ? path.join(PYTHON_DIR, 'python.exe')
  : (process.platform === 'win32' ? 'python' : 'python3');

const YTDLP_EXE = fs.existsSync(path.join(SCRIPTS_DIR, 'yt-dlp.exe'))
  ? path.join(SCRIPTS_DIR, 'yt-dlp.exe')
  : 'yt-dlp';

const EDGE_TTS_EXE = fs.existsSync(path.join(SCRIPTS_DIR, 'edge-tts.exe'))
  ? path.join(SCRIPTS_DIR, 'edge-tts.exe')
  : 'edge-tts';

const FFMPEG_EXE = fs.existsSync(path.join(STATIC_FFMPEG_DIR, 'ffmpeg.exe'))
  ? path.join(STATIC_FFMPEG_DIR, 'ffmpeg.exe')
  : 'ffmpeg';

const FFPROBE_EXE = fs.existsSync(path.join(STATIC_FFMPEG_DIR, 'ffprobe.exe'))
  ? path.join(STATIC_FFMPEG_DIR, 'ffprobe.exe')
  : 'ffprobe';

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

module.exports = {
  PYTHON_DIR,
  SCRIPTS_DIR,
  STATIC_FFMPEG_DIR,
  PYTHON_EXE,
  YTDLP_EXE,
  EDGE_TTS_EXE,
  FFMPEG_EXE,
  FFPROBE_EXE,
  GEMINI_API_KEY
};
