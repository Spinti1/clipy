const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const audioCache = new Map();

const FEMALE_KEYS = [
  'el_delia', 'el_ela', 'el_roxana', 'el_alexandra', 'el_ilinca',
  'mm_ioana', 'mm_elena', 'el_sarah', 'el_jessica', 'el_laura'
];

function isFemaleVoice(key) {
  return FEMALE_KEYS.includes(key);
}

const VOICE_PERSONAS = {
  'el_cristi': { pitch: '-15Hz', rateDelta: 0 },
  'el_adi': { pitch: '-22Hz', rateDelta: -3 },
  'el_zaturk': { pitch: '-10Hz', rateDelta: 0 },
  'el_adrian': { pitch: '-6Hz', rateDelta: 0 },
  'el_cornel': { pitch: '+10Hz', rateDelta: 5 },
  'el_delia': { pitch: '+12Hz', rateDelta: 2 },
  'el_ilinca': { pitch: '+14Hz', rateDelta: 3 },
  'el_claudiu': { pitch: '+0Hz', rateDelta: 4 },
  'el_nick': { pitch: '-3Hz', rateDelta: -4 },
  'mm_radu': { pitch: '+12Hz', rateDelta: 2 },
  'mm_ioana': { pitch: '+16Hz', rateDelta: 2 },
  'mm_elena': { pitch: '-6Hz', rateDelta: -2 }
};

const LANG_VOICES = {
  'română': { m: 'ro-RO-EmilNeural', f: 'ro-RO-AlinaNeural' },
  'engleză': { m: 'en-US-ChristopherNeural', f: 'en-US-JennyNeural' },
  'spaniolă': { m: 'es-ES-AlvaroNeural', f: 'es-ES-ElviraNeural' },
  'germană': { m: 'de-DE-ConradNeural', f: 'de-DE-KatjaNeural' },
  'franceză': { m: 'fr-FR-HenriNeural', f: 'fr-FR-DeniseNeural' },
  'italiană': { m: 'it-IT-DiegoNeural', f: 'it-IT-ElsaNeural' }
};

function resolveVoice(voiceKey, lang) {
  const normLang = String(lang || 'română').toLowerCase();
  const pair = LANG_VOICES[normLang] || LANG_VOICES['română'];
  const female = isFemaleVoice(voiceKey);
  const voiceName = female ? pair.f : pair.m;
  const persona = VOICE_PERSONAS[voiceKey] || { pitch: '+0Hz', rateDelta: 0 };
  return { voiceName, persona, female };
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

  return new Promise((resolve) => {
    const args = [
      '-m', 'edge_tts',
      '--voice', voiceName,
      '--rate', rateArg,
      '--pitch', pitchArg,
      '--text', cleanText,
      '--write-media', destPath
    ];

    const proc = spawn('python', args);
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
        resolve({
          ok: true,
          filePath: destPath,
          audioUrl: '/files/' + path.basename(destPath),
          duration: probe.duration || 4.0
        });
      } else {
        // Fallback to synthesized PCM audio if edge-tts fails
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
  synthesizeSpeech,
  generateVoiceSampleWav,
  isFemaleVoice,
  resolveVoice
};
