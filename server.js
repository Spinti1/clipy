require('./src/envConfig');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/files/:filename', (req, res, next) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(__dirname, 'data', 'files', filename);
  if (!fs.existsSync(filePath)) return next();
  if (req.query.download === '1' || req.query.dl === '1') {
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.sendFile(path.resolve(filePath));
  }
  next();
});
app.use('/files', express.static(path.join(__dirname, 'data', 'files')));

// Exact configuration from speed.viralio.ro
const APP_CONFIG = {
  cost: 0,
  free: true,
  voiceCharsPerCredit: 1000,
  maxSec: 600,
  maxUploadMb: 1024,
  defaultSpeed: 1.35,
  speedMin: 0.8,
  speedMax: 1.5,
  defaultVoice: "ro_emil",
  voices: [
    // Română (4)
    { key: "ro_emil", label: "Emil", tag: "M · clar, narativ", lang: "română", sample: "/api/voice-preview/ro_emil" },
    { key: "ro_alina", label: "Alina", tag: "F · caldă, naturală", lang: "română", sample: "/api/voice-preview/ro_alina" },
    { key: "ro_radu", label: "Radu", tag: "M · tânăr, energic", lang: "română", sample: "/api/voice-preview/ro_radu" },
    { key: "ro_delia", label: "Delia", tag: "F · radio, podcast", lang: "română", sample: "/api/voice-preview/ro_delia" },

    // Engleză (4)
    { key: "en_christopher", label: "Christopher", tag: "M · autoritar, povestitor", lang: "engleză", sample: "/api/voice-preview/en_christopher" },
    { key: "en_jenny", label: "Jenny", tag: "F · naturală, conversațională", lang: "engleză", sample: "/api/voice-preview/en_jenny" },
    { key: "en_guy", label: "Guy", tag: "M · pasionat, dinamic", lang: "engleză", sample: "/api/voice-preview/en_guy" },
    { key: "en_aria", label: "Aria", tag: "F · luminoasă, energică", lang: "engleză", sample: "/api/voice-preview/en_aria" },

    // Spaniolă (4)
    { key: "es_alvaro", label: "Alvaro", tag: "M · nativ, profesional", lang: "spaniolă", sample: "/api/voice-preview/es_alvaro" },
    { key: "es_elvira", label: "Elvira", tag: "F · caldă, clară", lang: "spaniolă", sample: "/api/voice-preview/es_elvira" },
    { key: "es_jorge", label: "Jorge", tag: "M · profund, podcast", lang: "spaniolă", sample: "/api/voice-preview/es_jorge" },
    { key: "es_ximena", label: "Ximena", tag: "F · dinamică, social", lang: "spaniolă", sample: "/api/voice-preview/es_ximena" },

    // Germană (4)
    { key: "de_conrad", label: "Conrad", tag: "M · profesional, ferm", lang: "germană", sample: "/api/voice-preview/de_conrad" },
    { key: "de_katja", label: "Katja", tag: "F · clară, optimistă", lang: "germană", sample: "/api/voice-preview/de_katja" },
    { key: "de_florian", label: "Florian", tag: "M · modern, narativ", lang: "germană", sample: "/api/voice-preview/de_florian" },
    { key: "de_amala", label: "Amala", tag: "F · blândă, radio", lang: "germană", sample: "/api/voice-preview/de_amala" },

    // Franceză (4)
    { key: "fr_henri", label: "Henri", tag: "M · dinamic, elegant", lang: "franceză", sample: "/api/voice-preview/fr_henri" },
    { key: "fr_denise", label: "Denise", tag: "F · naturală, caldă", lang: "franceză", sample: "/api/voice-preview/fr_denise" },
    { key: "fr_remy", label: "Remy", tag: "M · tânăr, energic", lang: "franceză", sample: "/api/voice-preview/fr_remy" },
    { key: "fr_eloise", label: "Eloise", tag: "F · expresivă, vibrantă", lang: "franceză", sample: "/api/voice-preview/fr_eloise" },

    // Italiană (4)
    { key: "it_diego", label: "Diego", tag: "M · sigur, natural", lang: "italiană", sample: "/api/voice-preview/it_diego" },
    { key: "it_elsa", label: "Elsa", tag: "F · expresivă, plăcută", lang: "italiană", sample: "/api/voice-preview/it_elsa" },
    { key: "it_giuseppe", label: "Giuseppe", tag: "M · profund, documentar", lang: "italiană", sample: "/api/voice-preview/it_giuseppe" },
    { key: "it_isabella", label: "Isabella", tag: "F · vioaie, social", lang: "italiană", sample: "/api/voice-preview/it_isabella" }
  ],
  langs: [
    { key: "română", label: "Română", flag: "🇷🇴", short: "RO", iso: "ro" },
    { key: "engleză", label: "Engleză", flag: "🇬🇧", short: "EN", iso: "en" },
    { key: "spaniolă", label: "Spaniolă", flag: "🇪🇸", short: "ES", iso: "es" },
    { key: "germană", label: "Germană", flag: "🇩🇪", short: "DE", iso: "de" },
    { key: "franceză", label: "Franceză", flag: "🇫🇷", short: "FR", iso: "fr" },
    { key: "italiană", label: "Italiană", flag: "🇮🇹", short: "IT", iso: "it" }
  ],
  captionPresets: [
    { key: "clasic", label: "Clasic", font: "Anton", text: "#FFFFFF", active: "#65D69E", outline: 0.09, shadow: 0.04, upper: true },
    { key: "galben", label: "Galben", font: "Anton", text: "#FFFFFF", active: "#FFD400", outline: 0.1, shadow: 0.04, upper: true },
    { key: "comic", label: "Comic", font: "Bangers", text: "#FFFFFF", active: "#FF3B5C", outline: 0.09, shadow: 0.05, upper: true, spacing: 0.03 },
    { key: "bubble", label: "Bubble", font: "Luckiest Guy", text: "#FFFFFF", active: "#38BDF8", outline: 0.11, shadow: 0.05, upper: false },
    { key: "boxnegru", label: "Box negru", font: "Anton", text: "#FFFFFF", active: "#FFD400", box: "#000000", boxAlpha: 0.65, pad: 0.16, upper: true },
    { key: "boxverde", label: "Box verde", font: "Anton", text: "#07130D", active: "#FFFFFF", box: "#65D69E", boxAlpha: 1, pad: 0.16, upper: true },
    { key: "neon", label: "Neon", font: "Bangers", text: "#FFFFFF", active: "#FFF36B", glow: "#FF4FD8", outline: 0.05, blur: 0.07, upper: true, spacing: 0.03 },
    { key: "simplu", label: "Simplu", font: "Anton", text: "#FFFFFF", active: "#FFFFFF", outline: 0.04, shadow: 0.05, upper: false }
  ],
  captionSizes: { s: 0.045, m: 0.058, l: 0.074 },
  captionDefaults: { enabled: false, preset: "clasic", posY: 0.72, size: "m", per: 4 },
  ctaMaxSec: 15
};

// Global state stores (in-memory with disk backup capability)
const state = {
  user: {
    id: "usr_clipy_demo",
    name: "Clipy Creator",
    email: "creator@clipy.app",
    picture: "https://api.dicebear.com/7.x/bottts/svg?seed=clipy",
    credits: 999999,
    voice_characters: 250000,
    subscriptionPlan: "Pro",
    subscriptionStatus: "active"
  },
  ultra: true,
  cta: null,
  history: []
};

// API: Health check & Ping Keep-Alive
app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'healthy', uptime: process.uptime() });
});

app.get('/api/ping', (req, res) => {
  res.json({ ok: true, status: 'alive', time: new Date().toISOString(), uptime: process.uptime() });
});

// API: Config
app.get('/api/config', (req, res) => {
  res.json(APP_CONFIG);
});

// API: Auth & Me
app.get('/api/auth/me', (req, res) => {
  res.json({
    ok: true,
    user: state.user,
    ultra: state.ultra,
    cta: state.cta
  });
});

// Top-up simulation endpoint
app.post('/api/auth/topup', (req, res) => {
  const add = parseInt(req.body.amount, 10) || 50;
  state.user.credits += add;
  res.json({ ok: true, credits: state.user.credits });
});

// API: History
app.get('/api/history', (req, res) => {
  res.json({ items: state.history });
});

const uploadManager = require('./src/uploadManager.js');

// Raw body parser for chunk uploads
app.put('/api/uploads/:id', express.raw({ type: 'application/octet-stream', limit: '100mb' }), (req, res) => {
  try {
    const uploadId = req.params.id;
    const offset = parseInt(req.query.offset, 10) || 0;
    const result = uploadManager.appendChunk(uploadId, offset, req.body || Buffer.alloc(0));
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

app.post('/api/uploads', (req, res) => {
  try {
    const { name, size } = req.body;
    const result = uploadManager.initUpload(name, size);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/uploads/:id/finish', (req, res) => {
  try {
    const result = uploadManager.finishUpload(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/uploads/:id', (req, res) => {
  const result = uploadManager.deleteUpload(req.params.id);
  res.json(result);
});

// CTA Endpoints
app.post('/api/cta', (req, res) => {
  const { uploadId } = req.body;
  state.cta = {
    id: uploadId || 'cta_default',
    name: 'sample_video.mp4',
    durationSec: 15.0
  };
  res.json({ ok: true, cta: state.cta });
});

app.delete('/api/cta', (req, res) => {
  state.cta = null;
  res.json({ ok: true });
});

const jobPipeline = require('./src/jobPipeline.js');
jobPipeline.jobsStore.clear();

app.get('/api/jobs', (req, res) => {
  res.json({ jobs: Array.from(jobPipeline.jobsStore.values()).reverse() });
});

app.post('/api/jobs', (req, res) => {
  try {
    const job = jobPipeline.createJob(req.body);
    res.json({ ok: true, job });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/jobs/batch', (req, res) => {
  try {
    const { urls, voice, speed, lang, fit } = req.body;
    const urlList = Array.isArray(urls) ? urls : [urls].filter(Boolean);
    const results = urlList.map(url => {
      try {
        const job = jobPipeline.createJob({ url, voice, speed, lang, fit });
        return { ok: true, url, job };
      } catch (err) {
        return { ok: false, url, error: err.message };
      }
    });
    res.json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/jobs/:id', (req, res) => {
  jobPipeline.jobsStore.delete(req.params.id);
  res.json({ ok: true });
});

app.post('/api/jobs/clear', (req, res) => {
  for (const [id, j] of jobPipeline.jobsStore.entries()) {
    if (j.done) jobPipeline.jobsStore.delete(id);
  }
  res.json({ ok: true });
});

app.get('/api/jobs/:id/captions', (req, res) => {
  try {
    const data = jobPipeline.getCaptions(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

app.post('/api/jobs/:id/export', async (req, res) => {
  try {
    const data = await jobPipeline.exportJob(req.params.id, req.body.tools);
    res.json(data);
  } catch (err) {
    console.error('EXPORT ROUTE ERROR:', err);
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

app.get('/api/jobs/:id/download', (req, res) => {
  const job = jobPipeline.jobsStore.get(req.params.id);
  if (!job) return res.status(404).send('Job inexistent');
  let filePath = (job.exp && job.exp.filePath) || job.filePath;
  if (!filePath || !fs.existsSync(filePath)) {
    if (job.result && job.result.video && job.result.video.startsWith('/files/')) {
      filePath = path.join(__dirname, 'data', 'files', path.basename(job.result.video));
    }
  }
  if (!filePath || !fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'public', 'assets', 'sample.mp4');
  }
  const rawTitle = (job.exp && job.exp.title) || (job.result && job.result.title) || 'clipy_export';
  const cleanTitle = rawTitle.replace(/[^\w\s\-\.]/gi, '_').replace(/\s+/g, '_').slice(0, 60) || 'clipy_export';
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="${cleanTitle}.mp4"`);
  res.sendFile(path.resolve(filePath));
});

app.post('/api/jobs/:id/post-text', (req, res) => {
  try {
    const data = jobPipeline.getPostText(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

const voiceService = require('./src/voiceService.js');

app.get('/api/voice-preview/:key', async (req, res) => {
  try {
    const key = req.params.key;
    if (req.query.format === 'wav') {
      const wav = voiceService.generateVoiceSampleWav(key);
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(wav);
    }
    const mp3Path = await voiceService.generateVoicePreviewMp3(key).catch(() => null);
    if (mp3Path && fs.existsSync(mp3Path)) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(path.resolve(mp3Path));
    }
    const wav = voiceService.generateVoiceSampleWav(key);
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(wav);
  } catch (err) {
    try {
      const wav = voiceService.generateVoiceSampleWav(req.params.key);
      res.setHeader('Content-Type', 'audio/wav');
      res.send(wav);
    } catch (_) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }
});

const ultraScheduler = require('./src/ultraScheduler.js');

app.get('/api/ultra/state', (req, res) => {
  res.json(ultraScheduler.getState());
});

app.put('/api/ultra/program', (req, res) => {
  try {
    const updated = ultraScheduler.updateProgram(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/ultra/queue/:id', (req, res) => {
  const result = ultraScheduler.cancelQueued(req.params.id);
  res.json(result);
});

app.post('/api/ultra/tiktok-info', (req, res) => {
  res.json(ultraScheduler.getTikTokInfo());
});

function startServer(port = 3000) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => {
      resolve(server);
    }).on('error', reject);
  });
}

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  startServer(PORT).then(server => {
    console.log(`Clipy Server running at http://localhost:${server.address().port}`);
    // Auto keep-alive ping every 10 minutes (600,000 ms)
    setInterval(() => {
      fetch(`http://localhost:${PORT}/api/ping`).catch(() => {});
      console.log(`[keep-alive] Ping periodic efectuat la ${new Date().toLocaleTimeString()}`);
    }, 10 * 60 * 1000);
  });
}

module.exports = { app, startServer, APP_CONFIG, state };
