const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../server.js');

describe('Speed Ultra Scheduler APIs', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = await startServer(0);
    baseUrl = `http://localhost:${server.address().port}`;
  });

  after(async () => {
    if (server) await new Promise(r => server.close(r));
  });

  test('GET /api/ultra/state returns program, accounts and queue list', async () => {
    const res = await fetch(`${baseUrl}/api/ultra/state`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.program);
    assert.ok(Array.isArray(data.accounts));
    assert.ok(Array.isArray(data.queue));
  });

  test('PUT /api/ultra/program updates posting time slots and accounts', async () => {
    const res = await fetch(`${baseUrl}/api/ultra/program`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountIds: ['acc_tt_1'],
        slots: ['10:00', '18:00'],
        hashtags: '#viral #speed'
      })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.deepEqual(data.program.slots, ['10:00', '18:00']);
  });
});
