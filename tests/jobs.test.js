const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../server.js');

describe('Jobs Pipeline API', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = await startServer(0);
    baseUrl = `http://localhost:${server.address().port}`;
  });

  after(async () => {
    if (server) await new Promise(r => server.close(r));
  });

  test('batch job creation, progression, captions, post-text, export', async () => {
    // 1. Batch create jobs
    const batchRes = await fetch(`${baseUrl}/api/jobs/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: ['https://www.tiktok.com/@creator/video/1234567890'],
        voice: 'el_viralio',
        speed: 1.35,
        lang: 'română',
        fit: 'voice'
      })
    });
    assert.equal(batchRes.status, 200);
    const batchData = await batchRes.json();
    assert.ok(batchData.results);
    assert.equal(batchData.results.length, 1);
    const job = batchData.results[0].job;
    assert.ok(job);
    assert.ok(job.jobId);
    assert.equal(job.platform, 'tiktok');

    // 2. Poll jobs list
    const jobsRes = await fetch(`${baseUrl}/api/jobs`);
    assert.equal(jobsRes.status, 200);
    const jobsData = await jobsRes.json();
    assert.ok(Array.isArray(jobsData.jobs));
    const found = jobsData.jobs.find(j => j.jobId === job.jobId);
    assert.ok(found);

    // 3. Captions endpoint
    const capRes = await fetch(`${baseUrl}/api/jobs/${job.jobId}/captions`);
    assert.equal(capRes.status, 200);
    const capData = await capRes.json();
    assert.ok(Array.isArray(capData.words));
    assert.ok(capData.words.length > 0);
    assert.ok(typeof capData.words[0].s === 'number');

    // 4. Post-text endpoint (Speed Ultra titles and tags)
    const postRes = await fetch(`${baseUrl}/api/jobs/${job.jobId}/post-text`, { method: 'POST' });
    assert.equal(postRes.status, 200);
    const postData = await postRes.json();
    assert.ok(postData.text);
    assert.ok(postData.text.title);
    assert.ok(Array.isArray(postData.text.hashtags));

    // 5. Export endpoint
    const expRes = await fetch(`${baseUrl}/api/jobs/${job.jobId}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tools: { mirror: true, blur: [], mask: { enabled: false }, captions: { enabled: true } } })
    });
    assert.equal(expRes.status, 200);
    const expData = await expRes.json();
    assert.ok(expData.exp);
    assert.ok(expData.exp.url);
  });
});
