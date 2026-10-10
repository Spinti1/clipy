const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../server.js');
const Captions = require('../public/captions.js');

describe('Fix Pass Verification Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = await startServer(0);
    baseUrl = `http://localhost:${server.address().port}`;
  });

  after(async () => {
    if (server) await new Promise(r => server.close(r));
  });

  test('Captions.groupWords correctly groups words using font metrics and timing', () => {
    const words = [
      { w: 'Astăzi', s: 0.1, e: 0.5, p: 0 },
      { w: 'îți', s: 0.5, e: 0.8, p: 0 },
      { w: 'voi', s: 0.8, e: 1.1, p: 0 },
      { w: 'arăta', s: 1.1, e: 1.6, p: 2 }
    ];
    const fit = Captions.fitFor({ font: 'Anton', text: '#FFF', active: '#65D69E', outline: 0.09 }, 1080, 50);
    const groups = Captions.groupWords(words, 2, fit);

    assert.ok(Array.isArray(groups));
    assert.ok(groups.length >= 2);
    assert.ok(groups[0].words.length <= 2);
    assert.ok(typeof groups[0].s === 'number');
    assert.ok(typeof groups[0].e === 'number');
  });

  test('Modular frontend assets exist and are served via HTTP', async () => {
    const resCss = await fetch(`${baseUrl}/css/style.css`);
    assert.equal(resCss.status, 200);

    const resExporter = await fetch(`${baseUrl}/js/videoExporter.js`);
    assert.equal(resExporter.status, 200);

    const resStage = await fetch(`${baseUrl}/js/stagePlayer.js`);
    assert.equal(resStage.status, 200);

    const resSetup = await fetch(`${baseUrl}/js/setupPanel.js`);
    assert.equal(resSetup.status, 200);
  });
});
