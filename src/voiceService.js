const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PYTHON_EXE } = require('./envConfig');

const audioCache = new Map();

const VOICES_CONFIG = {
  // Română (4)
  'ro_emil': { voice: 'ro-RO-EmilNeural', pitch: '+0Hz', rateDelta: 0, female: false, lang: 'română', label: 'Emil', tag: 'M · clar, narativ' },
  'ro_alina': { voice: 'ro-RO-AlinaNeural', pitch: '+0Hz', rateDelta: 0, female: true, lang: 'română', label: 'Alina', tag: 'F · caldă, naturală' },
  'ro_radu': { voice: 'ro-RO-EmilNeural', pitch: '+8Hz', rateDelta: 4, female: false, lang: 'română', label: 'Radu', tag: 'M · tânăr, energic' },
  'ro_delia': { voice: 'ro-RO-AlinaNeural', pitch: '+12Hz', rateDelta: 2, female: true, lang: 'română', label: 'Delia', tag: 'F · radio, podcast' },

  // Engleză (4)
  'en_christopher': { voice: 'en-US-ChristopherNeural', pitch: '+0Hz', rateDelta: 0, female: false, lang: 'engleză', label: 'Christopher', tag: 'M · autoritar, povestitor' },
  'en_jenny': { voice: 'en-US-JennyNeural', pitch: '+0Hz', rateDelta: 0, female: true, lang: 'engleză', label: 'Jenny', tag: 'F · naturală, conversațională' },
  'en_guy': { voice: 'en-US-GuyNeural', pitch: '+0Hz', rateDelta: 0, female: false, lang: 'engleză', label: 'Guy', tag: 'M · pasionat, dinamic' },
  'en_aria': { voice: 'en-US-AriaNeural', pitch: '+0Hz', rateDelta: 0, female: true, lang: 'engleză', label: 'Aria', tag: 'F · luminoasă, energică' },

  // Spaniolă (4)
  'es_alvaro': { voice: 'es-ES-AlvaroNeural', pitch: '+0Hz', rateDelta: 0, female: false, lang: 'spaniolă', label: 'Alvaro', tag: 'M · nativ, profesional' },
  'es_elvira': { voice: 'es-ES-ElviraNeural', pitch: '+0Hz', rateDelta: 0, female: true, lang: 'spaniolă', label: 'Elvira', tag: 'F · caldă, clară' },
  'es_jorge': { voice: 'es-ES-AlvaroNeural', pitch: '-8Hz', rateDelta: 3, female: false, lang: 'spaniolă', label: 'Jorge', tag: 'M · profund, podcast' },
  'es_ximena': { voice: 'es-ES-XimenaNeural', pitch: '+0Hz', rateDelta: 0, female: true, lang: 'spaniolă', label: 'Ximena', tag: 'F · dinamică, social' },

  // Germană (4)
  'de_conrad': { voice: 'de-DE-ConradNeural', pitch: '+0Hz', rateDelta: 0, female: false, lang: 'germană', label: 'Conrad', tag: 'M · profesional, ferm' },
  'de_katja': { voice: 'de-DE-KatjaNeural', pitch: '+0Hz', rateDelta: 0, female: true, lang: 'germană', label: 'Katja', tag: 'F · clară, optimistă' },
  'de_florian': { voice: 'de-DE-FlorianMultilingualNeural', pitch: '+0Hz', rateDelta: 0, female: false, lang: 'germană', label: 'Florian', tag: 'M · modern, narativ' },
  'de_amala': { voice: 'de-DE-AmalaNeural', pitch: '+0Hz', rateDelta: 0, female: true, lang: 'germană', label: 'Amala', tag: 'F · blândă, radio' },

  // Franceză (4)
  'fr_henri': { voice: 'fr-FR-HenriNeural', pitch: '+0Hz', rateDelta: 0, female: false, lang: 'franceză', label: 'Henri', tag: 'M · dinamic, elegant' },
  'fr_denise': { voice: 'fr-FR-DeniseNeural', pitch: '+0Hz', rateDelta: 0, female: true, lang: 'franceză', label: 'Denise', tag: 'F · naturală, caldă' },
  'fr_remy': { voice: 'fr-FR-RemyMultilingualNeural', pitch: '+0Hz', rateDelta: 0, female: false, lang: 'franceză', label: 'Remy', tag: 'M · tânăr, energic' },
  'fr_eloise': { voice: 'fr-FR-EloiseNeural', pitch: '+0Hz', rateDelta: 0, female: true, lang: 'franceză', label: 'Eloise', tag: 'F · expresivă, vibrantă' },

  // Italiană (4)
  'it_diego': { voice: 'it-IT-DiegoNeural', pitch: '+0Hz', rateDelta: 0, female: false, lang: 'italiană', label: 'Diego', tag: 'M · sigur, natural' },
  'it_elsa': { voice: 'it-IT-ElsaNeural', pitch: '+0Hz', rateDelta: 0, female: true, lang: 'italiană', label: 'Elsa', tag: 'F · expresivă, plăcută' },
  'it_giuseppe': { voice: 'it-IT-GiuseppeMultilingualNeural', pitch: '+0Hz', rateDelta: 0, female: false, lang: 'italiană', label: 'Giuseppe', tag: 'M · profund, documentar' },
  'it_isabella': { voice: 'it-IT-IsabellaNeural', pitch: '+0Hz', rateDelta: 0, female: true, lang: 'italiană', label: 'Isabella', tag: 'F · vioaie, social' }
};

const VOICE_ALIASES = {
  'el_viralio': 'ro_emil',
  'el_claudiu': 'ro_radu',
  'el_delia': 'ro_delia',
  'el_alina': 'ro_alina',
  'el_cristi': 'ro_emil',
  'el_adrian': 'ro_emil',
  'el_adi': 'ro_radu',
  'el_zaturk': 'ro_emil',
  'el_nick': 'ro_radu',
  'el_mihai': 'ro_emil',
  'el_brian': 'en_guy',
  'el_sarah': 'en_aria',
  'el_jessica': 'en_jenny'
};

const PREVIEW_TEXTS = {
  'română': 'Salut, acesta este un preview cu vocea mea.',
  'engleză': 'Hello, this is a quick preview of my voice.',
  'spaniolă': 'Hola, esta es una vista previa de mi voz.',
  'germană': 'Hallo, das ist eine Hörprobe meiner Stimme.',
  'franceză': 'Bonjour, ceci est un aperçu de ma voix.',
  'italiană': 'Ciao, questa è una breve anteprima della mia voce.'
};

function isFemaleVoice(key) {
  const normKey = VOICE_ALIASES[key] || key;
  return VOICES_CONFIG[normKey] ? VOICES_CONFIG[normKey].female : false;
}

function resolveVoice(voiceKey, lang) {
  const normLang = String(lang || 'română').toLowerCase();
  const key = VOICE_ALIASES[voiceKey] || voiceKey;
  let cfg = VOICES_CONFIG[key];

  // If voiceKey doesn't match language, pick the best matching voice for that language
  if (!cfg || (cfg.lang !== normLang && normLang)) {
    const matching = Object.values(VOICES_CONFIG).find(v => v.lang === normLang);
    if (matching) cfg = matching;
    else cfg = VOICES_CONFIG['ro_emil'];
  }

  return {
    voiceName: cfg.voice,
    persona: { pitch: cfg.pitch || '+0Hz', rateDelta: cfg.rateDelta || 0 },
    female: cfg.female,
    label: cfg.label
  };
}

/**
 * Synthesizes neural voice speech using edge-tts with offline fallback
 */
async function synthesizeSpeech({ text, voiceKey, lang, speed, outputFile }) {
  const filesDir = path.join(__dirname, '..', 'data', 'files');
  if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });

  const destPath = outputFile || path.join(filesDir, `voice_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.mp3`);
  const { voiceName, persona } = resolveVoice(voiceKey, lang);

  const sp = Number(speed) || 1.35;
  let ratePct = Math.round((sp - 1.0) * 100) + (persona.rateDelta || 0);
  const rateArg = (ratePct >= 0 ? '+' : '') + ratePct + '%';
  const pitchArg = persona.pitch || '+0Hz';

  const cleanText = String(text || '').trim();
  const subPath = destPath.replace(/\.mp3$/, '.vtt');

  return new Promise((resolve) => {
    const args = [
      '-m', 'edge_tts',
      '--voice', voiceName,
      '--rate', rateArg,
      '--pitch', pitchArg,
      '--text', cleanText,
      '--write-media', destPath,
      '--write-subtitles', subPath
    ];

    const proc = spawn(PYTHON_EXE, args);
    let stderr = '';

    const timer = setTimeout(() => {
      try { proc.kill(); } catch (_) {}
    }, 15000);

    proc.stderr.on('data', d => { stderr += d; });

    proc.on('close', async (code) => {
      clearTimeout(timer);
      const videoDownloader = require('./videoDownloader');

      if (code === 0 && fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
        const probe = await videoDownloader.probeVideo(destPath);
        let subContent = null;
        if (fs.existsSync(subPath)) {
          try { subContent = fs.readFileSync(subPath, 'utf8'); } catch (_) {}
        }
        resolve({
          ok: true,
          filePath: destPath,
          audioUrl: '/files/' + path.basename(destPath),
          duration: probe.duration || 4.0,
          subPath,
          subContent
        });
      } else {
        console.warn(`[voiceService] edge-tts error (code ${code}): ${stderr.slice(0, 200)}. Using fallback wav.`);
        const fallbackWav = generateVoiceSampleWav(voiceKey);
        const fallbackPath = destPath.replace(/\.mp3$/, '.wav');
        fs.writeFileSync(fallbackPath, fallbackWav);
        resolve({
          ok: true,
          filePath: fallbackPath,
          audioUrl: '/files/' + path.basename(fallbackPath),
          duration: 2.2
        });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      console.warn(`[voiceService] spawn edge-tts error: ${err.message}. Using fallback.`);
      const fallbackWav = generateVoiceSampleWav(voiceKey);
      const fallbackPath = destPath.replace(/\.mp3$/, '.wav');
      fs.writeFileSync(fallbackPath, fallbackWav);
      resolve({
        ok: true,
        filePath: fallbackPath,
        audioUrl: '/files/' + path.basename(fallbackPath),
        duration: 2.2
      });
    });
  });
}

async function generateVoicePreviewMp3(voiceKey) {
  const key = VOICE_ALIASES[voiceKey] || voiceKey;
  const cfg = VOICES_CONFIG[key] || VOICES_CONFIG['ro_emil'];
  const sampleText = PREVIEW_TEXTS[cfg.lang] || PREVIEW_TEXTS['română'];
  const filesDir = path.join(__dirname, '..', 'data', 'files');
  if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });
  const previewPath = path.join(filesDir, `preview_${key}.mp3`);
  if (fs.existsSync(previewPath) && fs.statSync(previewPath).size > 1000) {
    return previewPath;
  }
  const res = await synthesizeSpeech({
    text: sampleText,
    voiceKey: key,
    lang: cfg.lang,
    speed: 1.0,
    outputFile: previewPath
  });
  return res.filePath;
}

function generateVoiceSampleWav(voiceKey) {
  if (audioCache.has(voiceKey)) {
    return audioCache.get(voiceKey);
  }

  const sampleRate = 22050;
  const durationSec = 2.2;
  const numSamples = Math.floor(sampleRate * durationSec);
  const isFemale = isFemaleVoice(voiceKey);

  const baseFreq = isFemale ? 220 : 130;
  const f1 = isFemale ? 650 : 500;
  const f2 = isFemale ? 1800 : 1400;

  const pcmData = Buffer.alloc(numSamples * 2);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sylT = (t * 3.5) % 1;
    const sylEnv = Math.sin(Math.PI * Math.min(1, Math.max(0, sylT)));
    const pitch = baseFreq * (1 + 0.08 * Math.sin(2 * Math.PI * 1.5 * t));

    const oscFundamental = Math.sin(2 * Math.PI * pitch * t);
    const oscHarmonic2 = 0.5 * Math.sin(2 * Math.PI * pitch * 2 * t);
    const oscFormant1 = 0.3 * Math.sin(2 * Math.PI * f1 * t);
    const oscFormant2 = 0.15 * Math.sin(2 * Math.PI * f2 * t);

    let sampleVal = (oscFundamental + oscHarmonic2 + oscFormant1 + oscFormant2) * sylEnv;

    if (t < 0.1) sampleVal *= t / 0.1;
    if (t > durationSec - 0.2) sampleVal *= (durationSec - t) / 0.2;

    const clamped = Math.max(-1, Math.min(1, sampleVal * 0.7));
    const int16 = Math.floor(clamped * 32767);
    pcmData.writeInt16LE(int16, i * 2);
  }

  const header = Buffer.alloc(44);
  const dataSize = pcmData.length;
  const totalFileSize = 36 + dataSize;

  header.write('RIFF', 0);
  header.writeUInt32LE(totalFileSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  const wavBuffer = Buffer.concat([header, pcmData]);
  audioCache.set(voiceKey, wavBuffer);
  return wavBuffer;
}

module.exports = {
  VOICES_CONFIG,
  VOICE_ALIASES,
  synthesizeSpeech,
  generateVoiceSampleWav,
  generateVoicePreviewMp3,
  isFemaleVoice,
  resolveVoice
};
