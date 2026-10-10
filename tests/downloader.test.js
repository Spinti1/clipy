const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const videoDownloader = require('../src/videoDownloader.js');

describe('Real Video Downloader Service', () => {
  test('downloads and probes real YouTube video metadata and mp4 file', async () => {
    const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
    const targetFile = path.join(__dirname, '..', 'data', 'files', 'test_e2e_yt.mp4');
    
    const result = await videoDownloader.downloadVideo(testUrl, targetFile);
    assert.equal(result.ok, true);
    assert.ok(fs.existsSync(targetFile));
    assert.ok(result.duration > 15);
    assert.ok(result.width > 0);
    assert.ok(result.height > 0);
    assert.ok(result.title.includes('zoo'));
  });
});
