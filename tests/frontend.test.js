const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { startServer } = require('../server.js');

describe('Frontend Assets and HTML Verification', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = await startServer(0);
    baseUrl = `http://localhost:${server.address().port}`;
  });

  after(async () => {
    if (server) await new Promise(r => server.close(r));
  });

  test('public/index.html is served and contains core viralio UI elements', async () => {
    const res = await fetch(`${baseUrl}/index.html`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Speed'));
    assert.ok(html.includes('id="urlList"'));
    assert.ok(html.includes('id="voiceGrid"'));
    assert.ok(html.includes('id="goBtn"'));
    assert.ok(html.includes('id="jobs"'));
    assert.ok(html.includes('id="ultra-modal"'));
    assert.ok(html.includes('captions.js'));
  });

  test('sample video and font assets are accessible via HTTP', async () => {
    const resVid = await fetch(`${baseUrl}/assets/sample.mp4`, { method: 'HEAD' });
    assert.equal(resVid.status, 200);

    const resFont = await fetch(`${baseUrl}/fonts/Anton.ttf`, { method: 'HEAD' });
    assert.equal(resFont.status, 200);
  });
});
