const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const voiceService = require('../src/voiceService.js');
const videoDownloader = require('../src/videoDownloader.js');

describe('Voice Synthesis and Audio-Video Merging', () => {
  test('synthesizes real Romanian neural speech to MP3', async () => {
    const text = 'Astăzi îți voi arăta cel mai rapid mod de a crea conținut viral.';
    const outMp3 = path.join(__dirname, '..', 'data', 'files', 'test_synth_ro.mp3');

    const res = await voiceService.synthesizeSpeech({
      text,
      voiceKey: 'el_viralio',
      lang: 'română',
      speed: 1.35,
      outputFile: outMp3
    });

    assert.equal(res.ok, true);
    assert.ok(fs.existsSync(outMp3));
    assert.ok(res.duration > 1);
  });

  test('synthesizes English neural speech for foreign language selection', async () => {
    const text = 'Today I will show you the fastest way to create viral content.';
    const outMp3 = path.join(__dirname, '..', 'data', 'files', 'test_synth_en.mp3');

    const res = await voiceService.synthesizeSpeech({
      text,
      voiceKey: 'el_brian',
      lang: 'engleză',
      speed: 1.2,
      outputFile: outMp3
    });

    assert.equal(res.ok, true);
    assert.ok(fs.existsSync(outMp3));
    assert.ok(res.duration > 1);
  });

  test('merges video and synthesized speech replacing original audio', async () => {
    const videoFile = path.join(__dirname, '..', 'public', 'assets', 'sample.mp4');
    const audioFile = path.join(__dirname, '..', 'data', 'files', 'test_synth_ro.mp3');
    const mergedFile = path.join(__dirname, '..', 'data', 'files', 'test_synth_merged.mp4');

    const res = await videoDownloader.mergeVideoAndAudio(videoFile, audioFile, mergedFile);
    assert.equal(res.ok, true);
    assert.ok(fs.existsSync(mergedFile));

    const probe = await videoDownloader.probeVideo(mergedFile);
    assert.ok(probe.duration > 10);
    assert.ok(probe.width > 0);
  });
});
