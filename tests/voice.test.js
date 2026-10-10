const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../server.js');

describe('Voice Audio Synthesis Service', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = await startServer(0);
    baseUrl = `http://localhost:${server.address().port}`;
  });

  after(async () => {
    if (server) await new Promise(r => server.close(r));
  });

  test('GET /api/voice-preview/:key returns playable audio for male and female voices', async () => {
    // Test male voice
    const resM = await fetch(`${baseUrl}/api/voice-preview/el_viralio`);
    assert.equal(resM.status, 200);
    assert.ok(resM.headers.get('content-type').startsWith('audio/'));
    const bufM = await resM.arrayBuffer();
    assert.ok(bufM.byteLength > 1000);

    // Test female voice
    const resF = await fetch(`${baseUrl}/api/voice-preview/el_delia`);
    assert.equal(resF.status, 200);
    assert.ok(resF.headers.get('content-type').startsWith('audio/'));
    const bufF = await resF.arrayBuffer();
    assert.ok(bufF.byteLength > 1000);
  });
});
