const { spawn } = require('child_process');
const path = require('path');
const { PYTHON_EXE } = require('./envConfig');
const geminiService = require('./geminiService');

const cache = new Map();

const LANG_MAP = {
  'română': 'ro-RO',
  'ro': 'ro-RO',
  'engleză': 'en-US',
  'en': 'en-US',
  'spaniolă': 'es-ES',
  'es': 'es-ES',
  'germană': 'de-DE',
  'de': 'de-DE',
  'franceză': 'fr-FR',
  'fr': 'fr-FR',
  'italiană': 'it-IT',
  'it': 'it-IT'
};

function normalizeLang(lang) {
  const l = String(lang || 'română').toLowerCase();
  return LANG_MAP[l] || l;
}

async function translateTextWithWorker(clean, src, tgt) {
  return new Promise((resolve) => {
    const workerScript = path.join(__dirname, 'translateWorker.py');
    const proc = spawn(PYTHON_EXE, [workerScript]);

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      try { proc.kill(); } catch (_) {}
      resolve(clean);
    }, 15000);

    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && stdout.trim()) {
        try {
          const res = JSON.parse(stdout);
          if (res.ok && res.result) {
            resolve(res.result);
            return;
          }
        } catch (_) {}
      }
      resolve(clean);
    });

    proc.on('error', () => {
      clearTimeout(timer);
      resolve(clean);
    });

    proc.stdin.write(JSON.stringify({ text: clean, src, tgt }));
    proc.stdin.end();
  });
}

async function translateText(text, fromLang = 'en', toLang = 'ro') {
  const clean = String(text || '').trim();
  if (!clean) return '';

  const src = normalizeLang(fromLang);
  const tgt = normalizeLang(toLang);

  if (src === tgt) return clean;

  const cacheKey = `${src}_${tgt}_${clean}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // 1. Primary: Gemini Flash Lite
  try {
    const res = await geminiService.translateText(clean, toLang);
    if (res && res !== clean) {
      cache.set(cacheKey, res);
      return res;
    }
  } catch (err) {
    console.warn('[translateService] Gemini translateText error, falling back to worker:', err.message);
  }

  // 2. Fallback: Python deep-translator
  const workerRes = await translateTextWithWorker(clean, src, tgt);
  cache.set(cacheKey, workerRes);
  return workerRes;
}

async function translateCues(cues, fromLang = 'en', toLang = 'ro') {
  if (!cues || !cues.length) return [];
  const src = normalizeLang(fromLang);
  const tgt = normalizeLang(toLang);
  if (src === tgt) return cues;

  // 1. Primary: Gemini batch cue translation (fast & preserves timing)
  try {
    const translated = await geminiService.translateCues(cues, toLang);
    if (translated && translated.length) {
      return translated;
    }
  } catch (err) {
    console.warn('[translateService] Gemini translateCues error, falling back:', err.message);
  }

  // 2. Fallback: translate cue-by-cue
  const fallbackList = [];
  for (const cue of cues) {
    const t = await translateText(cue.text, fromLang, toLang);
    fallbackList.push({
      start: cue.start,
      end: cue.end,
      text: t || cue.text
    });
  }
  return fallbackList;
}

module.exports = {
  translateText,
  translateCues,
  normalizeLang
};
