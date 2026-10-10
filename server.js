const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/files', express.static(path.join(__dirname, 'data', 'files')));

// Exact configuration from speed.viralio.ro
const APP_CONFIG = {
  cost: 3,
  voiceCharsPerCredit: 1000,
  maxSec: 600,
  maxUploadMb: 1024,
  defaultSpeed: 1.35,
  speedMin: 0.8,
  speedMax: 1.5,
  defaultVoice: "el_viralio",
  voices: [
    { key: "el_viralio", label: "Viralio", tag: "M · vocea casei", sample: "/api/voice-preview/el_viralio" },
    { key: "el_claudiu", label: "Claudiu", tag: "M · român nativ", sample: "/api/voice-preview/el_claudiu" },
    { key: "el_cristi", label: "Cristi", tag: "M · român, profund", sample: "/api/voice-preview/el_cristi" },
    { key: "el_zaturk", label: "ZaTurk", tag: "M · român, narator", sample: "/api/voice-preview/el_zaturk" },
    { key: "el_nick", label: "Nick", tag: "M · român, documentar", sample: "/api/voice-preview/el_nick" },
    { key: "el_adrian", label: "Adrian", tag: "M · român, matur", sample: "/api/voice-preview/el_adrian" },
    { key: "el_adi", label: "Adi", tag: "M · român, grav", sample: "/api/voice-preview/el_adi" },
    { key: "el_mihai", label: "Mihai", tag: "M · român, profesionist", sample: "/api/voice-preview/el_mihai" },
    { key: "el_iulian", label: "Iulian", tag: "M · român, clar", sample: "/api/voice-preview/el_iulian" },
    { key: "el_ciprian", label: "Ciprian", tag: "M · român, relaxat", sample: "/api/voice-preview/el_ciprian" },
    { key: "el_oliver", label: "Oliver", tag: "M · român, ferm", sample: "/api/voice-preview/el_oliver" },
    { key: "el_iosif", label: "Iosif", tag: "M · român, teatral", sample: "/api/voice-preview/el_iosif" },
    { key: "el_cornel", label: "Cornel", tag: "M · român, energic", sample: "/api/voice-preview/el_cornel" },
    { key: "el_delia", label: "Delia", tag: "F · română, radio", sample: "/api/voice-preview/el_delia" },
    { key: "el_ela", label: "Ela", tag: "F · română, caldă", sample: "/api/voice-preview/el_ela" },
    { key: "el_roxana", label: "Roxana", tag: "F · română, naturală", sample: "/api/voice-preview/el_roxana" },
    { key: "el_alexandra", label: "Alexandra", tag: "F · română, social media", sample: "/api/voice-preview/el_alexandra" },
    { key: "el_ilinca", label: "Ilinca", tag: "F · română, reclame", sample: "/api/voice-preview/el_ilinca" },
    { key: "mm_radu", label: "Radu", tag: "M · român, tânăr", sample: "/api/voice-preview/mm_radu" },
    { key: "mm_sorin", label: "Sorin", tag: "M · român, sigur", sample: "/api/voice-preview/mm_sorin" },
    { key: "mm_ioana", label: "Ioana", tag: "F · română, optimistă", sample: "/api/voice-preview/mm_ioana" },
    { key: "mm_elena", label: "Elena", tag: "F · română, blândă", sample: "/api/voice-preview/mm_elena" },
    { key: "el_brian", label: "Brian", tag: "M · profund", sample: "/api/voice-preview/el_brian" },
    { key: "el_roger", label: "Roger", tag: "M · relaxat", sample: "/api/voice-preview/el_roger" },
    { key: "el_george", label: "George", tag: "M · povestitor", sample: "/api/voice-preview/el_george" },
    { key: "el_callum", label: "Callum", tag: "M · intens", sample: "/api/voice-preview/el_callum" },
    { key: "el_charlie", label: "Charlie", tag: "M · energic", sample: "/api/voice-preview/el_charlie" },
    { key: "el_sarah", label: "Sarah", tag: "F · clară", sample: "/api/voice-preview/el_sarah" },
    { key: "el_jessica", label: "Jessica", tag: "F · expresivă", sample: "/api/voice-preview/el_jessica" },
    { key: "el_laura", label: "Laura", tag: "F · vioaie", sample: "/api/voice-preview/el_laura" }
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
  captionDefaults: { enabled: false, preset: "clasic", posY: 0.72, size: "m", per: 2 },
  ctaMaxSec: 15
};

// Global state stores (in-memory with disk backup capability)
const state = {
  user: {
    id: "usr_viralio_demo",
    name: "Viralio Creator",
    email: "creator@viralio.ro",
    picture: "https://api.dicebear.com/7.x/bottts/svg?seed=viralio",
    credits: 150,
    voice_characters: 250000,
    subscriptionPlan: "Pro",
    subscriptionStatus: "active"
  },
  ultra: true,
  cta: null,
  history: []
};

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

function startServer(port = 3000) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      resolve(server);
    }).on('error', reject);
  });
}

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  startServer(PORT).then(server => {
    console.log(`Viralio Speed Server running at http://localhost:${server.address().port}`);
  });
}

module.exports = { app, startServer, APP_CONFIG, state };
