const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { app, startServer } = require('../server.js');

describe('Server Core APIs', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = await startServer(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
  });

  after(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  test('GET /api/health returns ok and healthy status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.status, 'healthy');
  });

  test('GET /api/config returns complete viralio configuration', async () => {
    const res = await fetch(`${baseUrl}/api/config`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.cost, 0);
    assert.equal(data.defaultVoice, 'ro_emil');
    assert.equal(Array.isArray(data.voices), true);
    assert.equal(data.voices.length, 24);
    assert.equal(Array.isArray(data.langs), true);
    assert.equal(data.langs.length, 6);
    assert.equal(Array.isArray(data.captionPresets), true);
    assert.equal(data.captionPresets.length, 8);
  });

  test('GET /api/auth/me returns mock user with credits and ultra active', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.user);
    assert.equal(data.user.name, 'Clipy Creator');
    assert.equal(typeof data.user.credits, 'number');
    assert.equal(data.ultra, true);
  });

  test('GET /api/history returns initial empty history list', async () => {
    const res = await fetch(`${baseUrl}/api/history`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.items));
  });
});
