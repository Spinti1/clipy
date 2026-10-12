const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../server.js');

describe('YouTube Real Download Integration in Pipeline', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = await startServer(0);
    baseUrl = `http://localhost:${server.address().port}`;
  });

  after(async () => {
    if (server) await new Promise(r => server.close(r));
  });

  test('submitting a real YouTube URL processes the actual video and serves it to client', async () => {
    const ytUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';

    // 1. Create job with real YouTube URL
    const createRes = await fetch(`${baseUrl}/api/jobs/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: [ytUrl],
        voice: 'el_viralio',
        speed: 1.35,
        lang: 'română',
        fit: 'voice'
      })
    });
    assert.equal(createRes.status, 200);
    const createData = await createRes.json();
    assert.equal(createData.results.length, 1);
    const jobId = createData.results[0].job.jobId;

    // 2. Poll until completed (real download, translation and TTS take 8-15 seconds on cold run)
    let finishedJob = null;
    const maxTries = 80;
    for (let i = 0; i < maxTries; i++) {
      await new Promise(r => setTimeout(r, 500));
      const res = await fetch(`${baseUrl}/api/jobs`);
      const data = await res.json();
      const current = (data.jobs || []).find(j => j.jobId === jobId);
      if (current && current.done) {
        finishedJob = current;
        break;
      }
    }

    assert.ok(finishedJob, 'Job should complete within polling window');
    assert.equal(finishedJob.done, true);
    assert.equal(finishedJob.stage, 'render');
    assert.ok(finishedJob.result, 'Job must have a result');

    // 3. Verify that the video is NOT the hardcoded /assets/sample.mp4
    assert.notEqual(finishedJob.result.video, '/assets/sample.mp4');
    assert.ok(finishedJob.result.video.startsWith('/files/'));
    assert.ok(finishedJob.result.video.endsWith('.mp4'));

    // 4. Verify title, duration and dimensions
    assert.ok(finishedJob.result.title.includes('zoo'));
    assert.ok(finishedJob.result.duration > 15 && finishedJob.result.duration < 25);
    assert.ok(finishedJob.result.width > 0);
    assert.ok(finishedJob.result.height > 0);

    // 5. Verify the video file and synthesized audio are physically served via HTTP
    const videoHttpRes = await fetch(`${baseUrl}${finishedJob.result.video}`, { method: 'HEAD' });
    assert.equal(videoHttpRes.status, 200);
    assert.equal(videoHttpRes.headers.get('content-type'), 'video/mp4');
    assert.ok(parseInt(videoHttpRes.headers.get('content-length'), 10) > 10000);

    assert.ok(finishedJob.result.audio);
    assert.ok(finishedJob.result.audio.startsWith('/files/'));
    const audioHttpRes = await fetch(`${baseUrl}${finishedJob.result.audio}`, { method: 'HEAD' });
    assert.equal(audioHttpRes.status, 200);

    // 6. Verify export references this exact downloaded video
    const expRes = await fetch(`${baseUrl}/api/jobs/${jobId}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tools: { mirror: false, blur: [], mask: { enabled: false } } })
    });
    const expData = await expRes.json();
    assert.equal(expData.exp.url, finishedJob.result.video);

    // 7. Verify extracted & translated subtitles contain the real video content
    const capRes = await fetch(`${baseUrl}/api/jobs/${jobId}/captions`);
    assert.equal(capRes.status, 200);
    const capData = await capRes.json();
    assert.ok(capData.words.length > 5);
    const allWords = capData.words.map(w => w.w.toLowerCase()).join(' ');
    assert.ok(allWords.includes('elefan') || allWords.includes('tromp') || allWords.includes('lung') || allWords.includes('bine'));
    assert.ok(finishedJob.result.text.toLowerCase().includes('elefan') || finishedJob.result.text.toLowerCase().includes('lung') || finishedJob.result.text.toLowerCase().includes('faț'));
  });
});
