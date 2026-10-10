const { spawn } = require('child_process');
const path = require('path');

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

  return new Promise((resolve) => {
    const workerScript = path.join(__dirname, 'translateWorker.py');
    const proc = spawn('python', [workerScript]);

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
            cache.set(cacheKey, res.result);
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

async function translateCues(cues, fromLang = 'en', toLang = 'ro') {
  if (!cues || !cues.length) return [];
  const src = normalizeLang(fromLang);
  const tgt = normalizeLang(toLang);
  if (src === tgt) return cues;

  const translated = [];
  for (const cue of cues) {
    const t = await translateText(cue.text, fromLang, toLang);
    translated.push({
      start: cue.start,
      end: cue.end,
      text: t || cue.text
    });
  }
  return translated;
}

module.exports = {
  translateText,
  translateCues,
  normalizeLang
};
