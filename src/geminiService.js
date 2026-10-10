const fs = require('fs');
const { GEMINI_API_KEY } = require('./envConfig');

const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Transcribes an audio file into timestamped subtitle cues using Gemini Flash Lite
 * @param {string} audioPath Path to the audio file (mp3, wav, etc.)
 * @returns {Promise<Array<{start: number, end: number, text: string}>>}
 */
async function transcribeAudio(audioPath) {
  if (!fs.existsSync(audioPath)) {
    console.warn('[geminiService] Audio file does not exist:', audioPath);
    return [];
  }

  const audioBytes = fs.readFileSync(audioPath);
  if (!audioBytes.length) return [];

  const base64Data = audioBytes.toString('base64');
  const mimeType = audioPath.endsWith('.wav') ? 'audio/wav' : 'audio/mp3';

  const prompt = `Listen carefully to the spoken voice in this audio file. Extract the exact transcription and provide timestamped subtitle cues.
Return ONLY a valid JSON array of objects with the exact schema:
[
  { "start": 0.0, "end": 2.5, "text": "spoken words here" }
]
The start and end fields must be numbers in seconds. The text must be verbatim what was said. If no speech is heard in the audio, return an empty array [].`;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64Data } }
          ]
        }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[geminiService] Transcription API error (${res.status}):`, errText.slice(0, 300));
      return [];
    }

    const data = await res.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) return [];

    const parsed = JSON.parse(rawContent);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(item => item && typeof item.text === 'string' && item.text.trim())
      .map(item => ({
        start: Number(item.start) || 0,
        end: Number(item.end) || (Number(item.start) + 2.0),
        text: String(item.text).trim()
      }));
  } catch (err) {
    console.warn('[geminiService] Transcription failed:', err.message);
    return [];
  }
}

/**
 * Translates an array of subtitle cues into a target language, preserving exact start and end times
 * @param {Array<{start: number, end: number, text: string}>} cues
 * @param {string} targetLang
 * @returns {Promise<Array<{start: number, end: number, text: string}>>}
 */
async function translateCues(cues, targetLang = 'română') {
  if (!Array.isArray(cues) || !cues.length) return [];

  const prompt = `Translate the text of the following subtitle cues into ${targetLang}.
Preserve the exact same timing ("start" and "end" float seconds) and JSON structure.
Cues to translate:
${JSON.stringify(cues)}

Return ONLY a valid JSON array of objects matching the same format:
[
  { "start": float, "end": float, "text": "translated text" }
]`;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[geminiService] Translate cues API error (${res.status}):`, errText.slice(0, 300));
      return cues;
    }

    const data = await res.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) return cues;

    const parsed = JSON.parse(rawContent);
    if (!Array.isArray(parsed) || !parsed.length) return cues;

    return parsed.map((item, idx) => ({
      start: typeof item.start === 'number' ? item.start : cues[idx]?.start || 0,
      end: typeof item.end === 'number' ? item.end : cues[idx]?.end || 2.0,
      text: String(item.text || cues[idx]?.text || '').trim()
    }));
  } catch (err) {
    console.warn('[geminiService] Cue translation failed:', err.message);
    return cues;
  }
}

/**
 * Translates arbitrary text into target language
 * @param {string} text
 * @param {string} targetLang
 * @returns {Promise<string>}
 */
async function translateText(text, targetLang = 'română') {
  const clean = String(text || '').trim();
  if (!clean) return '';

  const prompt = `Translate the following text into ${targetLang}. Return ONLY the direct translation without any explanation, prefix, or quotation marks:\n${clean}`;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!res.ok) {
      return clean;
    }

    const data = await res.json();
    const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return translated || clean;
  } catch (err) {
    console.warn('[geminiService] Text translation failed:', err.message);
    return clean;
  }
}

module.exports = {
  transcribeAudio,
  translateCues,
  translateText
};
