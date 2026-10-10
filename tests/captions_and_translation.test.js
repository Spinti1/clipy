const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const captionService = require('../src/captionService.js');
const translateService = require('../src/translateService.js');

describe('Caption Extraction and Real Translation Engine', () => {
  const sampleVtt = `WEBVTT
Kind: captions
Language: en

00:00:01.200 --> 00:00:03.360
All right, so here we are, in front of the
elephants

00:00:05.318 --> 00:00:07.974
the cool thing about these guys is that they
have really...

00:00:07.974 --> 00:00:12.616
really really long trunks

00:00:12.616 --> 00:00:14.367
and that's cool
`;

  test('parses WebVTT content into timed cues', () => {
    const cues = captionService.parseVtt(sampleVtt);
    assert.ok(Array.isArray(cues));
    assert.equal(cues.length, 4);
    assert.equal(cues[0].start, 1.2);
    assert.equal(cues[0].end, 3.36);
    assert.ok(cues[0].text.includes('elephants'));
  });

  test('translates English text to Romanian using real translator', async () => {
    const text = 'Here we are in front of the elephants.';
    const res = await translateService.translateText(text, 'engleză', 'română');
    assert.ok(res);
    assert.notEqual(res, text);
    assert.ok(res.toLowerCase().includes('elefan') || res.toLowerCase().includes('aici') || res.toLowerCase().includes('față'));
  });

  test('converts timed cues into word-level karaoke subtitle stream', () => {
    const cues = captionService.parseVtt(sampleVtt);
    const words = captionService.cuesToWords(cues);
    assert.ok(Array.isArray(words));
    assert.ok(words.length >= 10);
    assert.equal(typeof words[0].s, 'number');
    assert.equal(typeof words[0].e, 'number');
    assert.ok(words[0].s >= 1.2);
    assert.ok(words[words.length - 1].e <= 15);
  });

  test('Gemini transcribes audio into timestamped subtitle cues', async () => {
    const geminiService = require('../src/geminiService.js');
    const voiceService = require('../src/voiceService.js');
    const audioPath = path.join(__dirname, '..', 'data', 'files', 'test_gemini_transcribe.mp3');

    if (!fs.existsSync(audioPath)) {
      await voiceService.synthesizeSpeech({
        text: 'Astăzi îți voi arăta cel mai rapid mod de a crea conținut viral.',
        voiceKey: 'el_viralio',
        lang: 'română',
        speed: 1.35,
        outputFile: audioPath
      });
    }

    const cues = await geminiService.transcribeAudio(audioPath);
    assert.ok(Array.isArray(cues));
    assert.ok(cues.length > 0);
    assert.equal(typeof cues[0].start, 'number');
    assert.equal(typeof cues[0].end, 'number');
    assert.ok(cues[0].text && cues[0].text.length > 0);
  });

  test('Gemini translates subtitle cues preserving timestamps', async () => {
    const geminiService = require('../src/geminiService.js');
    const inputCues = [
      { start: 0.5, end: 2.8, text: 'This is the most incredible way to make viral content.' }
    ];
    const translatedCues = await geminiService.translateCues(inputCues, 'română');
    assert.ok(Array.isArray(translatedCues));
    assert.equal(translatedCues.length, 1);
    assert.equal(translatedCues[0].start, 0.5);
    assert.equal(translatedCues[0].end, 2.8);
    assert.ok(translatedCues[0].text);
    assert.notEqual(translatedCues[0].text, inputCues[0].text);
  });
});
