// Synthetic formant voice preview generator in pure Node.js
const audioCache = new Map();

function isFemaleVoice(key) {
  const fKeys = ['el_delia', 'el_ela', 'el_roxana', 'el_alexandra', 'el_ilinca', 'mm_ioana', 'mm_elena', 'el_sarah', 'el_jessica', 'el_laura'];
  return fKeys.includes(key);
}

function generateVoiceSampleWav(voiceKey) {
  if (audioCache.has(voiceKey)) {
    return audioCache.get(voiceKey);
  }

  const sampleRate = 22050;
  const durationSec = 2.2;
  const numSamples = Math.floor(sampleRate * durationSec);
  const isFemale = isFemaleVoice(voiceKey);

  // Base fundamental frequency and formants
  const baseFreq = isFemale ? 220 : 130;
  const f1 = isFemale ? 650 : 500;
  const f2 = isFemale ? 1800 : 1400;

  // 16-bit mono PCM buffer
  const pcmData = Buffer.alloc(numSamples * 2);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    // Speech rhythm cadence (4 syllables: "Vi - ra - li - o")
    const syllable = Math.floor(t * 3.5);
    const sylT = (t * 3.5) % 1;
    const sylEnv = Math.sin(Math.PI * Math.min(1, Math.max(0, sylT)));

    // Modulate pitch slightly over speech phrase
    const pitch = baseFreq * (1 + 0.08 * Math.sin(2 * Math.PI * 1.5 * t));

    // Formant synthesis approximation
    const oscFundamental = Math.sin(2 * Math.PI * pitch * t);
    const oscHarmonic2 = 0.5 * Math.sin(2 * Math.PI * pitch * 2 * t);
    const oscFormant1 = 0.3 * Math.sin(2 * Math.PI * f1 * t);
    const oscFormant2 = 0.15 * Math.sin(2 * Math.PI * f2 * t);

    // Composite sound
    let sampleVal = (oscFundamental + oscHarmonic2 + oscFormant1 + oscFormant2) * sylEnv;

    // Overall smooth attack & decay
    if (t < 0.1) sampleVal *= t / 0.1;
    if (t > durationSec - 0.2) sampleVal *= (durationSec - t) / 0.2;

    // Clamp to 16-bit signed integer range
    const clamped = Math.max(-1, Math.min(1, sampleVal * 0.7));
    const int16 = Math.floor(clamped * 32767);
    pcmData.writeInt16LE(int16, i * 2);
  }

  // Create WAV container
  const header = Buffer.alloc(44);
  const dataSize = pcmData.length;
  const totalFileSize = 36 + dataSize;

  header.write('RIFF', 0);
  header.writeUInt32LE(totalFileSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  header.writeUInt16LE(1, 22);  // NumChannels (1 mono)
  header.writeUInt32LE(sampleRate, 24); // SampleRate
  header.writeUInt32LE(sampleRate * 2, 28); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  header.writeUInt16LE(2, 32);  // BlockAlign
  header.writeUInt16LE(16, 34); // BitsPerSample
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  const wavBuffer = Buffer.concat([header, pcmData]);
  audioCache.set(voiceKey, wavBuffer);
  return wavBuffer;
}

module.exports = {
  generateVoiceSampleWav
};
