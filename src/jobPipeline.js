const crypto = require('crypto');

const jobsStore = new Map();

const SAMPLE_TEXTS = {
  'română': "Astăzi îți voi arăta cel mai rapid mod de a crea conținut viral. Tehnologia avansează incredibil de repede și este timpul să profiți de ea chiar acum!",
  'engleză': "Today I will show you the fastest way to create viral content. Technology is advancing incredibly fast and it is time to take advantage right now!",
  'spaniolă': "Hoy te mostraré la forma más rápida de crear contenido viral. La tecnología avanza increíblemente rápido y es hora de aprovecharla.",
  'germană': "Heute zeige ich Ihnen den schnellsten Weg, virale Inhalte zu erstellen. Die Technologie schreitet unglaublich schnell voran.",
  'franceză': "Aujourd'hui, je vais vous montrer le moyen le plus rapide de créer du contenu viral. La technologie progresse très vite.",
  'italiană': "Oggi ti mostrerò il modo più veloce per creare contenuti virali. La tecnologia sta avanzando incredibilmente veloce."
};

function detectPlatform(url) {
  const u = String(url || '').toLowerCase();
  if (u.startsWith('upload:') || u.includes('/files/')) return 'upload';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
  if (u.includes('douyin.com')) return 'douyin';
  if (u.includes('xiaohongshu.com') || u.includes('rednote.com')) return 'rednote';
  return 'youtube';
}

function createJob(params) {
  const jobId = 'job_' + crypto.randomBytes(8).toString('hex');
  const platform = detectPlatform(params.url);
  const lang = params.lang || 'română';
  const voice = params.voice || 'el_viralio';
  const speed = Number(params.speed) || 1.35;
  const fit = params.fit || 'voice';

  const script = SAMPLE_TEXTS[lang] || SAMPLE_TEXTS['română'];
  const words = script.split(/\s+/);
  const totalDuration = Math.max(8, Math.min(25, (words.length * 0.42) / speed));

  const job = {
    jobId,
    url: params.url,
    uploadName: params.uploadName || (platform === 'upload' ? 'video_upload.mp4' : null),
    platform,
    voice,
    voiceLabel: params.voiceLabel || 'Viralio',
    speed,
    lang,
    langShort: (lang === 'română' ? 'RO' : lang.slice(0, 2).toUpperCase()),
    fit,
    stage: 'queued',
    status: 'În așteptare...',
    progress: 0,
    done: false,
    error: null,
    voiceChars: script.length,
    voiceCached: false,
    voiceCost: Math.ceil(script.length / 1000),
    createdAt: Date.now(),
    result: null
  };

  jobsStore.set(jobId, job);

  // Run async progression
  advanceJob(job, script, totalDuration);

  return job;
}

function advanceJob(job, script, duration) {
  const stages = [
    { key: 'download', status: 'Descarc videoul...', pct: 20, delay: 250 },
    { key: 'translate', status: 'Traduc textul...', pct: 45, delay: 350 },
    { key: 'voice', status: 'Generez vocea...', pct: 70, delay: 350 },
    { key: 'sync', status: 'Sincronizez audio cu imaginea...', pct: 85, delay: 250 },
    { key: 'render', status: 'Gata de previzualizare', pct: 100, delay: 200 }
  ];

  let currentStep = 0;
  function nextStep() {
    if (currentStep < stages.length) {
      const s = stages[currentStep];
      job.stage = s.key;
      job.status = s.status;
      job.progress = s.pct;
      currentStep++;
      setTimeout(nextStep, s.delay);
    } else {
      job.done = true;
      job.stage = 'render';
      job.status = 'Finalizat cu succes';
      job.progress = 100;
      job.result = {
        duration: Math.round(duration * 10) / 10,
        width: 1080,
        height: 1920,
        video: '/assets/sample.mp4',
        text: script,
        plan: {
          mode: job.fit,
          tempo: job.speed,
          speed: 1.0,
          fill: 'fit'
        }
      };
    }
  }

  setTimeout(nextStep, 100);
}

function getCaptions(jobId) {
  const job = jobsStore.get(jobId);
  const text = (job && job.result && job.result.text) || SAMPLE_TEXTS['română'];
  const rawWords = text.replace(/[.,!?;:"]/g, '').split(/\s+/);
  const duration = (job && job.result && job.result.duration) || 12.0;

  const wordDuration = duration / rawWords.length;
  const words = rawWords.map((w, i) => {
    const s = Math.round(i * wordDuration * 100) / 100;
    const e = Math.round((i + 1) * wordDuration * 100) / 100;
    const p = (i === rawWords.length - 1 || i % 6 === 5) ? 2 : (i % 3 === 2 ? 1 : 0);
    return { w, s, e, p };
  });

  // Basic groups
  const groups = [];
  for (let i = 0; i < words.length; i += 2) {
    const chunk = words.slice(i, i + 2);
    groups.push({
      s: chunk[0].s,
      e: chunk[chunk.length - 1].e,
      words: chunk
    });
  }

  return { ok: true, words, groups };
}

function getPostText(jobId) {
  const job = jobsStore.get(jobId);
  const text = (job && job.result && job.result.text) || SAMPLE_TEXTS['română'];
  return {
    ok: true,
    text: {
      title: 'Secretul pentru conținut viral ⚡',
      description: text + '\n\nUrmărește pentru mai multe trucuri utile!',
      hashtags: ['#viral', '#speed', '#creatori', '#trend', '#fyp']
    }
  };
}

function exportJob(jobId, tools) {
  const job = jobsStore.get(jobId);
  if (!job) {
    const err = new Error('Job not found');
    err.status = 404;
    throw err;
  }
  const sig = 'exp_' + crypto.randomBytes(6).toString('hex');
  const exp = {
    sig,
    state: 'done',
    progress: 100,
    status: 'Gata pentru descărcare',
    url: (job.result && job.result.video) || '/assets/sample.mp4'
  };
  job.exp = exp;
  return { ok: true, exp };
}

module.exports = {
  jobsStore,
  createJob,
  getCaptions,
  getPostText,
  exportJob,
  detectPlatform
};
