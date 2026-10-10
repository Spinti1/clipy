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
  const rawCues = [];
  let cur = null;

  for (let l of lines) {
    const line = l.trim();
    if (!line || line.startsWith('WEBVTT') || line.startsWith('Kind:') || line.startsWith('Language:') || line.startsWith('NOTE')) continue;

    const m = line.match(/^(\d{1,2}:[\d:.,]+)\s+-->\s+(\d{1,2}:[\d:.,]+)/);
    if (m) {
      if (cur) rawCues.push(cur);
      cur = {
        start: parseTime(m[1]),
        end: parseTime(m[2]),
        lines: []
      };
    } else if (cur && !line.match(/^\d+$/)) {
      // Decode common HTML entities
      let clean = line
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      // Strip WebVTT formatting & timestamp tags like <c.color> or <00:00:01.200>
      clean = clean.replace(/<[^>]+>/g, '').trim();
      // Remove leading speaker markers (e.g., >> Hello)
      clean = clean.replace(/^>+\s*/, '').trim();

      if (clean) cur.lines.push(clean);
    }
  }
  if (cur) rawCues.push(cur);

  // 1. Filter out micro-cues (duration < 0.08s used as YouTube render artifacts)
  const validCues = rawCues.filter(c => (c.end - c.start) >= 0.08 && c.lines.length > 0);

  // 2. Rolling Deduplication: handles YouTube repeating lines in subsequent rolling cues
  const cleanCues = [];
  let lastSeenLines = new Set();
  let lastText = '';

  for (const c of validCues) {
    const newLines = [];
    for (const textLine of c.lines) {
      // If line was already processed in the immediate rolling window, skip
      if (lastSeenLines.has(textLine)) continue;
      newLines.push(textLine);
      lastSeenLines.add(textLine);
    }

    // Keep set bounded so words that genuinely reappear later in the video aren't dropped
    if (lastSeenLines.size > 20) {
      const arr = Array.from(lastSeenLines);
      lastSeenLines = new Set(arr.slice(arr.length - 10));
    }

    if (newLines.length > 0) {
      let cueText = newLines.join(' ').trim();

      // Check if cueText duplicates the tail of lastText
      if (lastText && cueText === lastText) continue;

      // Filter out non-speech sound indicators
      const isSoundFx = cueText.startsWith('[') && cueText.endsWith(']') ||
                        cueText.startsWith('(') && cueText.endsWith(')') ||
                        /^\[music\]$/i.test(cueText) || /^\[applause\]$/i.test(cueText) ||
                        /musique/i.test(cueText);

      if (cueText && !isSoundFx) {
        cleanCues.push({
          start: Math.round(c.start * 1000) / 1000,
          end: Math.round(c.end * 1000) / 1000,
          text: cueText
        });
        lastText = cueText;
      }
    }
  }

  // 3. Prevent overlaps while preserving natural pauses
  for (let i = 0; i < cleanCues.length; i++) {
    if (i < cleanCues.length - 1 && cleanCues[i].end > cleanCues[i + 1].start) {
      cleanCues[i].end = cleanCues[i + 1].start;
    }
  }

  return cleanCues;
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
