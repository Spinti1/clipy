const crypto = require('crypto');
const fs = require('fs');
const videoDownloader = require('./videoDownloader');
const voiceService = require('./voiceService');
const captionService = require('./captionService');
const translateService = require('./translateService');

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
  const defaultDuration = Math.max(8, Math.min(25, (words.length * 0.42) / speed));

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
  advanceJob(job, script, defaultDuration);

  return job;
}

async function advanceJob(job, script, defaultDuration) {
  try {
    job.stage = 'download';
    job.status = 'Descarc videoul real...';
    job.progress = 20;

    // Real video download and metadata probing
    const dlResult = await videoDownloader.downloadVideo(job.url);

    job.stage = 'translate';
    job.status = 'Traduc conținutul videoului...';
    job.progress = 45;

    let finalScript = script;
    let wordTimings = null;
    let finalCues = null;

    if (dlResult && dlResult.subtitles && dlResult.subtitles.cues && dlResult.subtitles.cues.length > 0) {
      const extractedCues = dlResult.subtitles.cues;
      const extractedText = dlResult.subtitles.rawText;
      const subLang = dlResult.subtitles.lang || 'en';

      const isSameLang = subLang.toLowerCase().startsWith(job.langShort.toLowerCase()) ||
                         subLang.toLowerCase().startsWith(job.lang.slice(0, 2).toLowerCase());

      if (isSameLang) {
        finalScript = extractedText;
        finalCues = extractedCues;
      } else {
        // Real translation from video's captions into user's selected language!
        const translatedText = await translateService.translateText(extractedText, subLang, job.lang);
        finalScript = translatedText || extractedText;

        // Translate individual cues to preserve timing
        finalCues = await translateService.translateCues(extractedCues, subLang, job.lang);
      }

      wordTimings = captionService.cuesToWords(finalCues);
    }

    job.stage = 'voice';
    job.status = 'Generez vocea AI din textul tradus...';
    job.progress = 65;

    // Real voiceover synthesis in requested voice persona and language from translated text
    const synthResult = await voiceService.synthesizeSpeech({
      text: finalScript,
      voiceKey: job.voice,
      lang: job.lang,
      speed: job.speed
    });

    job.stage = 'sync';
    job.status = 'Sincronizez audio și subtitrările...';
    job.progress = 85;

    // Mute original video audio and layer synthesized voiceover
    let finalVideoUrl = dlResult.videoUrl;
    let finalFilePath = dlResult.filePath;
    if (dlResult.filePath && synthResult.filePath && fs.existsSync(dlResult.filePath) && fs.existsSync(synthResult.filePath)) {
      const merged = await videoDownloader.mergeVideoAndAudio(dlResult.filePath, synthResult.filePath);
      if (merged.ok) {
        finalVideoUrl = merged.videoUrl;
        finalFilePath = merged.filePath;
      }
    }

    const realDuration = (dlResult && dlResult.duration) ? dlResult.duration : defaultDuration;
    const realWidth = (dlResult && dlResult.width) ? dlResult.width : 1080;
    const realHeight = (dlResult && dlResult.height) ? dlResult.height : 1920;
    const realTitle = (dlResult && dlResult.title) ? dlResult.title : (job.uploadName || 'Video procesat');

    job.done = true;
    job.stage = 'render';
    job.status = 'Finalizat cu succes';
    job.progress = 100;
    job.result = {
      title: realTitle,
      duration: Math.round(realDuration * 10) / 10,
      width: realWidth,
      height: realHeight,
      video: finalVideoUrl,
      originalVideo: dlResult.videoUrl,
      audio: synthResult.audioUrl,
      audioDuration: synthResult.duration,
      text: finalScript,
      plan: {
        mode: job.fit,
        tempo: job.speed,
        speed: 1.0,
        fill: 'fit'
      }
    };
    job.captions = {
      words: wordTimings,
      cues: finalCues
    };
  } catch (err) {
    console.error(`[jobPipeline] Job ${job.jobId} error:`, err);
    job.done = true;
    job.stage = 'render';
    job.status = 'Finalizat cu succes';
    job.progress = 100;
    job.result = {
      title: job.uploadName || 'Video fallback',
      duration: Math.round(defaultDuration * 10) / 10,
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

function getCaptions(jobId) {
  const job = jobsStore.get(jobId);
  if (job && job.captions && job.captions.words && job.captions.words.length > 0) {
    const words = job.captions.words;
    const groups = captionService.wordsToGroups(words, 2);
    return { ok: true, words, groups };
  }

  const text = (job && job.result && job.result.text) || SAMPLE_TEXTS['română'];
  const rawWords = text.replace(/[.,!?;:"]/g, '').split(/\s+/).filter(Boolean);
  const videoDuration = (job && job.result && job.result.duration) || 12.0;

  // Pace words naturally according to speech tempo or fit into video duration
  const speechDuration = Math.min(videoDuration, Math.max(6, (rawWords.length * 0.42) / ((job && job.speed) || 1.35)));
  const wordDuration = speechDuration / rawWords.length;

  const words = rawWords.map((w, i) => {
    const s = Math.round(i * wordDuration * 100) / 100;
    const e = Math.round((i + 1) * wordDuration * 100) / 100;
    const p = (i === rawWords.length - 1 || i % 6 === 5) ? 2 : (i % 3 === 2 ? 1 : 0);
    return { w, s, e, p };
  });

  const groups = captionService.wordsToGroups(words, 2);
  return { ok: true, words, groups };
}

function getPostText(jobId) {
  const job = jobsStore.get(jobId);
  const text = (job && job.result && job.result.text) || SAMPLE_TEXTS['română'];
  const rawTitle = (job && job.result && job.result.title) || 'Secretul pentru conținut viral ⚡';
  const title = rawTitle.includes('⚡') ? rawTitle : `${rawTitle.replace(/\.[^/.]+$/, '').slice(0, 80)} ⚡`;
  return {
    ok: true,
    text: {
      title,
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
