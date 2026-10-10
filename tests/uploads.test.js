const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../server.js');

describe('Uploads & Media Management API', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = await startServer(0);
    baseUrl = `http://localhost:${server.address().port}`;
  });

  after(async () => {
    if (server) await new Promise(r => server.close(r));
  });

  test('chunked upload lifecycle works (init, put chunk, finish)', async () => {
    // 1. Init
    const initRes = await fetch(`${baseUrl}/api/uploads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'sample_video.mp4', size: 1024 })
    });
    assert.equal(initRes.status, 200);
    const initData = await initRes.json();
    assert.ok(initData.uploadId);

    // 2. Upload chunk
    const chunkData = Buffer.alloc(1024, 'v');
    const chunkRes = await fetch(`${baseUrl}/api/uploads/${initData.uploadId}?offset=0`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: chunkData
    });
    assert.equal(chunkRes.status, 200);
    const chunkJson = await chunkRes.json();
    assert.equal(chunkJson.ok, true);
    assert.equal(chunkJson.offset, 1024);

    // 3. Finish
    const finishRes = await fetch(`${baseUrl}/api/uploads/${initData.uploadId}/finish`, {
      method: 'POST'
    });
    assert.equal(finishRes.status, 200);
    const finishData = await finishRes.json();
    assert.equal(finishData.ok, true);
    assert.ok(finishData.url);
    assert.ok(typeof finishData.durationSec === 'number');

    // 4. Set as CTA
    const ctaRes = await fetch(`${baseUrl}/api/cta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId: initData.uploadId })
    });
    assert.equal(ctaRes.status, 200);
    const ctaData = await ctaRes.json();
    assert.equal(ctaData.ok, true);
    assert.ok(ctaData.cta);
    assert.equal(ctaData.cta.name, 'sample_video.mp4');

    // 5. Delete CTA
    const delCtaRes = await fetch(`${baseUrl}/api/cta`, { method: 'DELETE' });
    assert.equal(delCtaRes.status, 200);
    const delCtaData = await delCtaRes.json();
    assert.equal(delCtaData.ok, true);
  });
});
