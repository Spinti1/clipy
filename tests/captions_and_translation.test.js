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
});
