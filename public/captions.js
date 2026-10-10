// ══════════════════════════════════════════════════════════════
// Caption-uri: gruparea cuvintelor pe ecran — ACELAȘI cod în browser (preview) și pe
// server (exportul ASS), ca preview-ul să arate exact ce iese la export.
// ══════════════════════════════════════════════════════════════
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Captions = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Lățimea literelor (în em, ×1000), măsurată din TTF-urile din /fonts, pentru
    // A–Z a–z 0–9. Literele cu diacritice au lățimea literei de bază (Ă = A, Ș = S).
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const GLYPHS = {
        'Anton': { space: 234, other: 400, w: '485 479 474 493 412 399 485 499 227 466 472 397 746 498 486 472 494 477 461 396 474 469 712 484 446 410 483 501 491 498 488 280 504 505 243 263 491 248 758 499 497 501 498 347 475 305 499 461 696 459 461 386 494 331 494 494 494 494 494 494 494 494' },
        'Bangers': { space: 195, other: 400, w: '433 428 414 441 341 341 499 442 200 279 462 302 619 453 493 379 525 444 430 362 419 379 601 411 384 431 433 428 414 441 341 341 499 441 202 279 462 302 619 452 493 379 525 444 430 362 419 379 601 411 384 431 474 320 467 458 459 450 478 339 518 489' },
        'Luckiest Guy': { space: 195, other: 550, w: '626 594 515 583 479 487 626 626 297 510 614 452 791 704 638 596 691 606 531 543 623 613 908 588 607 487 626 594 513 584 577 488 627 626 294 510 603 451 898 652 638 597 691 606 532 545 611 614 910 595 605 496 633 388 509 528 539 531 573 506 571 555' },
    };
    const WIDTH = {};
    for (const [font, g] of Object.entries(GLYPHS)) {
        const map = {};
        g.w.split(' ').forEach((v, i) => { map[CHARS[i]] = +v / 1000; });
        WIDTH[font] = { map, space: g.space / 1000, other: g.other / 1000 };
    }

    // lățimea unui text în em (fără kerning — ce iese e puțin peste real, deci pe partea sigură)
    function textEm(text, font) {
        const f = WIDTH[font] || WIDTH.Anton;
        let em = 0;
        for (const ch of String(text)) {
            if (ch === ' ') { em += f.space; continue; }
            const base = ch.normalize('NFD')[0];
            em += f.map[base] != null ? f.map[base] : f.other;
        }
        return em;
    }

    // cât loc e pe un rând: textul are 6% margine stânga-dreapta (ca MarginL/MarginR din ASS
    // și width:88% din preview); conturul / cutia mai iau puțin la capete
    function fitFor(preset, vw, px) {
        const margin = Math.round(vw * 0.06);
        const edge = preset.box ? 2 * (preset.pad || 0.16) : 2 * (preset.outline || 0) + (preset.shadow || 0);
        return {
            font: preset.font, upper: !!preset.upper, spacing: preset.spacing || 0,
            maxEm: Math.max(1, (vw - 2 * margin) / Math.max(1, px) * 0.97 - edge),
        };
    }

    const shown = (w, fit) => (fit && fit.upper ? String(w).toLocaleUpperCase('ro-RO') : String(w));
    function groupEm(ws, fit) {
        const text = ws.map(w => shown(w.w, fit)).join(' ');
        return textEm(text, fit.font) + fit.spacing * [...text].length;
    }

    // Pe ecran puțin înaintea vocii: textul care apare fix odată cu sunetul pare deja în urmă
    // (și un eveniment ASS se vede abia de la primul cadru de după startul lui).
    const LEAD = 0.05;
    // o pauză reală în voce (sau semn de punctuație) închide grupul
    const PAUSE_BREAK = 0.15;
    const r3d = x => Math.round(x * 1000) / 1000;

    // words = [{ w, s, e, p? }] (p = 1 virgulă, 2 final de propoziție), per = 1–3 cuvinte,
    // fit = fitFor(...) sau null. Un grup ține până începe următorul (fără pâlpâit între
    // grupuri), dar nu rămâne agățat pe ecran peste o pauză lungă; nu trece peste o pauză
    // sau punctuație și nu se rupe pe două rânduri.
    function groupWords(words, per, fit) {
        const n = Math.min(6, Math.max(1, parseInt(per) || 4));
        const list = Array.isArray(words) ? words : [];
        const groups = [];
        let cur = [];
        const flush = () => { if (cur.length) groups.push({ s: cur[0].s, e: cur[cur.length - 1].e, words: cur }); cur = []; };
        for (const w of list) {
            if (cur.length) {
                const last = cur[cur.length - 1];
                if (cur.length >= n || last.p === 2 || (cur.length >= 3 && last.p === 1) || w.s - last.e >= PAUSE_BREAK || (fit && groupEm(cur.concat(w), fit) > fit.maxEm)) flush();
            }
            cur.push(w);
        }
        flush();
        groups.forEach((g, i) => {
            const next = groups[i + 1];
            g.e = next ? (next.s - g.e < 0.7 ? next.s : g.e + 0.25) : g.e + 0.4;
        });
        return groups.map(g => {
            const s = r3d(Math.max(0, g.s - LEAD));
            return {
                s, e: r3d(Math.max(g.e - LEAD, s + 0.05)),
                words: g.words.map(w => ({ w: w.w, s: r3d(Math.max(0, w.s - LEAD)), e: r3d(Math.max(0, w.e - LEAD)) })),
            };
        });
    }

    return { groupWords, fitFor, textEm, LEAD };
});
