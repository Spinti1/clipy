const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { startServer } = require('../server.js');

describe('Clipy Studio Pro & Timeline Integration', () => {
    let server;
    let baseUrl;

    before(async () => {
        server = await startServer(0);
        baseUrl = `http://localhost:${server.address().port}`;
    });

    after(async () => {
        if (server) await new Promise(r => server.close(r));
    });

    test('public/index.html serves complete Clipchamp studio layout and components', async () => {
        const res = await fetch(`${baseUrl}/index.html`);
        assert.equal(res.status, 200);
        const html = await res.text();

        // Studio Layout Elements
        assert.ok(html.includes('id="studioWorkspaceView"'), 'Missing studio workspace view');
        assert.ok(html.includes('id="classicWorkspaceView"'), 'Missing classic workspace view');
        assert.ok(html.includes('id="studioNav"'), 'Missing studio header navbar');
        assert.ok(html.includes('id="studioRail"'), 'Missing left ribbon rail');
        assert.ok(html.includes('id="studioDrawer"'), 'Missing expandable drawer');
        assert.ok(html.includes('id="studioViewport"'), 'Missing cinema player viewport');
        assert.ok(html.includes('id="studioInspector"'), 'Missing inspector panel');
        assert.ok(html.includes('id="studioTimelineContainer"'), 'Missing bottom multi-track timeline');

        // Transport & Timeline controls
        assert.ok(html.includes('id="btnPlayPause"'), 'Missing transport play/pause button');
        assert.ok(html.includes('id="tmSplitBtn"'), 'Missing timeline split button');
        assert.ok(html.includes('id="tmDeleteBtn"'), 'Missing timeline delete button');
        assert.ok(html.includes('id="tmZoomSlider"'), 'Missing timeline zoom slider');
        assert.ok(html.includes('id="studioExportBtn"'), 'Missing studio export button');
        assert.ok(html.includes('/js/timeline.js'), 'Missing timeline.js script reference');

        // Adapted Legacy Elements preserved
        assert.ok(html.includes('id="urlList"'), 'urlList preserved');
        assert.ok(html.includes('id="voiceGrid"'), 'voiceGrid preserved');
        assert.ok(html.includes('id="goBtn"'), 'goBtn preserved');
        assert.ok(html.includes('id="jobs"'), 'jobs preserved');
        assert.ok(html.includes('id="ultra-modal"'), 'ultra-modal preserved');
    });

    test('timeline.js exports Timeline object and supports interval splitting and deletion', () => {
        const timelineJsCode = fs.readFileSync(path.join(__dirname, '../public/js/timeline.js'), 'utf-8');
        assert.ok(timelineJsCode.includes('window.Timeline ='), 'Timeline object must be registered on window');
        assert.ok(timelineJsCode.includes('splitAtPlayhead'), 'Timeline must implement splitAtPlayhead');
        assert.ok(timelineJsCode.includes('deleteSelectedClip'), 'Timeline must implement deleteSelectedClip');
        assert.ok(timelineJsCode.includes('renderTracks'), 'Timeline must render tracks');
    });

    test('public/css/style.css defines Fluent Dark studio classes and typography', async () => {
        const res = await fetch(`${baseUrl}/css/style.css`);
        assert.equal(res.status, 200);
        const css = await res.text();

        assert.ok(css.includes('Plus Jakarta Sans'), 'Font Plus Jakarta Sans must be defined');
        assert.ok(css.includes('clipy-studio-pro'), 'clipy-studio-pro class must exist');
        assert.ok(css.includes('studio-header'), 'studio-header class must exist');
        assert.ok(css.includes('studio-viewport'), 'studio-viewport class must exist');
        assert.ok(css.includes('studio-timeline'), 'studio-timeline class must exist');
        assert.ok(css.includes('timeline-toolbar'), 'timeline-toolbar class must exist');
    });
});
