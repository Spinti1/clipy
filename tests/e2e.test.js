const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../server.js');

describe('Full End-to-End System Journey', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = await startServer(0);
    baseUrl = `http://localhost:${server.address().port}`;
  });

  after(async () => {
    if (server) await new Promise(r => server.close(r));
  });

  test('Full User Workflow: Configure -> Upload -> Process -> Caption -> Export -> Schedule', async () => {
    // 1. Fetch config & user info
    const cfg = await (await fetch(`${baseUrl}/api/config`)).json();
    assert.equal(cfg.defaultVoice, 'el_viralio');
    const me = await (await fetch(`${baseUrl}/api/auth/me`)).json();
    assert.equal(me.user.name, 'Viralio Creator');
    const initialCredits = me.user.credits;

    // 2. Upload video
    const initUp = await (await fetch(`${baseUrl}/api/uploads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'my_clip.mp4', size: 5000 })
    })).json();
    assert.ok(initUp.uploadId);

    const chunkRes = await (await fetch(`${baseUrl}/api/uploads/${initUp.uploadId}?offset=0`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: Buffer.alloc(5000, 1)
    })).json();
    assert.equal(chunkRes.offset, 5000);

    const finishUp = await (await fetch(`${baseUrl}/api/uploads/${initUp.uploadId}/finish`, {
      method: 'POST'
    })).json();
    assert.ok(finishUp.url);

    // 3. Start translation batch job
    const batchRes = await (await fetch(`${baseUrl}/api/jobs/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: [finishUp.url, 'https://youtube.com/shorts/sample123'],
        voice: 'el_claudiu',
        speed: 1.2,
        lang: 'română',
        fit: 'voice'
      })
    })).json();
    assert.equal(batchRes.results.length, 2);
    const jobId = batchRes.results[0].job.jobId;

    // 4. Wait for job to advance
    await new Promise(r => setTimeout(r, 1600));

    // 5. Verify captions
    const captions = await (await fetch(`${baseUrl}/api/jobs/${jobId}/captions`)).json();
    assert.ok(captions.words.length > 5);

    // 6. Test export with filters
    const exp = await (await fetch(`${baseUrl}/api/jobs/${jobId}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tools: {
          mirror: true,
          blur: [{ x: 10, y: 70, w: 80, h: 15 }],
          mask: { enabled: true, posY: 0.5, thickness: 0.4, zoom: 1.5, blackBg: false },
          captions: { enabled: true, preset: 'galben', posY: 0.75, size: 'm', per: 2 }
        }
      })
    })).json();
    assert.equal(exp.ok, true);
    assert.ok(exp.exp.url);

    // 7. Test Ultra post schedule
    const ultraState = await (await fetch(`${baseUrl}/api/ultra/state`)).json();
    assert.ok(ultraState.accounts.length > 0);

    // 8. Test credits top-up
    const topup = await (await fetch(`${baseUrl}/api/auth/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 50 })
    })).json();
    assert.equal(topup.credits, initialCredits + 50);
  });
});
