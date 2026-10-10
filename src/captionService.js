function parseTime(t) {
  const normalized = String(t || '').trim().replace(',', '.');
  const parts = normalized.split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(normalized) || 0;
}

function parseVtt(content) {
  if (!content) return [];
  const lines = String(content).split(/\r?\n/);
  const cues = [];
  let currentCue = null;

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('WEBVTT') || line.startsWith('Kind:') || line.startsWith('Language:') || line.startsWith('NOTE')) {
      continue;
    }
    const match = line.match(/^(\d{1,2}:[\d:.,]+)\s+-->\s+(\d{1,2}:[\d:.,]+)/);
    if (match) {
      if (currentCue && currentCue.text) cues.push(currentCue);
      currentCue = {
        start: Math.round(parseTime(match[1]) * 1000) / 1000,
        end: Math.round(parseTime(match[2]) * 1000) / 1000,
        text: ''
      };
    } else if (currentCue && !line.match(/^\d+$/)) {
      // Clean HTML tags like <c> </c> or <00:00:01.200>
      const clean = line.replace(/<[^>]+>/g, '').trim();
      if (clean) {
        currentCue.text = (currentCue.text ? currentCue.text + ' ' + clean : clean);
      }
    }
  }

  if (currentCue && currentCue.text) cues.push(currentCue);

  // Filter out sound effects like (music), [applause]
  return cues.filter(c => {
    const t = c.text.trim();
    return t && !t.startsWith('(') && !t.startsWith('[') && !t.toLowerCase().includes('musique') && !t.toLowerCase().includes('music');
  });
}

function cuesToWords(cues) {
  if (!cues || !cues.length) return [];
  const words = [];

  for (let cue of cues) {
    const rawTokens = cue.text.split(/\s+/).filter(Boolean);
    if (!rawTokens.length) continue;

    const cueDuration = Math.max(0.2, cue.end - cue.start);
    // Weight tokens by character length so short words take less time and long words more time
    const weights = rawTokens.map(tok => {
      const cleanLen = tok.replace(/[^a-zA-Z0-9ăâîșțĂÂÎȘȚ]/g, '').length;
      return Math.max(2, cleanLen);
    });
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    let curTime = cue.start;
    rawTokens.forEach((token, idx) => {
      const cleanWord = token.replace(/[.,!?;:"]/g, '');
      if (!cleanWord) return;

      const dur = (weights[idx] / totalWeight) * cueDuration;
      const s = Math.round(curTime * 1000) / 1000;
      const e = Math.round((curTime + dur) * 1000) / 1000;
      curTime += dur;

      let p = 0;
      if (idx === rawTokens.length - 1 || /[.!?]$/.test(token)) p = 2;
      else if (/[,;:]$/.test(token)) p = 1;

      words.push({ w: cleanWord, s, e, p });
    });
  }

  return words;
}

function wordsToGroups(words, per = 4) {
  const groups = [];
  const chunkSize = Math.max(1, per || 4);
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize);
    groups.push({
      s: chunk[0].s,
      e: chunk[chunk.length - 1].e,
      words: chunk
    });
  }
  return groups;
}

module.exports = {
  parseVtt,
  cuesToWords,
  wordsToGroups
};
