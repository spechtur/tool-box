/**
 * Cloudflare Worker – Feedback-Auswertung (PHGR)
 *
 * Nimmt POST { typ, kontext, feedbacks } entgegen, schickt einen passenden
 * Prompt an die Anthropic-API (claude-haiku-4-5) und streamt die Antwort
 * als Server-Sent Events zurück:
 *   data: {"chunk":"..."}   – Textfragment
 *   data: {"done":true}     – Abschluss
 *   data: {"error":"..."}   – Fehlerfall
 *
 * Der API-Key wird ausschließlich aus der Worker-Umgebungsvariable
 * ANTHROPIC_API_KEY gelesen – er steht nie im Code.
 */

export default {
  async fetch(request, env) {
    // CORS-Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Body parsen
    let body;
    try {
      body = await request.json();
    } catch {
      return sseError('Ungültiger JSON-Body');
    }

    const { typ, kontext, feedbacks } = body;

    if (!typ || !Array.isArray(feedbacks) || feedbacks.length === 0) {
      return sseError('Fehlende oder leere Felder: typ, feedbacks');
    }

    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return sseError('ANTHROPIC_API_KEY nicht konfiguriert');
    }

    // Anthropic-API aufrufen (streaming)
    let anthropicResp;
    try {
      anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 8192,
          stream: true,
          messages: [{ role: 'user', content: buildPrompt(typ, kontext || '', feedbacks) }],
        }),
      });
    } catch (err) {
      return sseError('Verbindungsfehler zur Claude-API: ' + err.message);
    }

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text();
      return sseError('Claude-API-Fehler ' + anthropicResp.status + ': ' + errText);
    }

    // SSE-Stream an den Browser weiterleiten
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const reader = anthropicResp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // unvollständige Zeile aufbewahren

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') continue;

            let event;
            try { event = JSON.parse(raw); } catch { continue; }

            if (
              event.type === 'content_block_delta' &&
              event.delta?.type === 'text_delta' &&
              event.delta.text
            ) {
              const sse = 'data: ' + JSON.stringify({ chunk: event.delta.text }) + '\n\n';
              await writer.write(encoder.encode(sse));
            }
          }
        }

        await writer.write(encoder.encode('data: ' + JSON.stringify({ done: true }) + '\n\n'));
      } catch (err) {
        await writer.write(encoder.encode('data: ' + JSON.stringify({ error: err.message }) + '\n\n'));
      } finally {
        writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders(),
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
        'x-accel-buffering': 'no',
      },
    });
  },
};

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function sseError(message) {
  return new Response('data: ' + JSON.stringify({ error: message }) + '\n\n', {
    headers: { ...corsHeaders(), 'content-type': 'text/event-stream; charset=utf-8' },
  });
}

function buildPrompt(typ, kontext, feedbacks) {
  const feedbackText = feedbacks
    .map((f, i) => `${i + 1}. ${f}`)
    .join('\n');

  const today = new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const outputAnweisung = `
WICHTIG: Antworte AUSSCHLIESSLICH mit dem rohen HTML-Dokument.
Kein Markdown, keine Code-Blöcke, keine Backticks, keine Erklärungen — nur reines HTML, beginnend mit <!DOCTYPE html>.`;

  if (typ === 'mayring') {
    const titel = kontext || 'Lehrveranstaltung';
    const n = feedbacks.length;
    return `Du bist Experte für qualitative Inhaltsanalyse nach Mayring. Analysiere folgende Rückmeldungen aus einer Lehrveranstaltung und erstelle eine beamertaugliche Diskussionsvorlage.

Kontext: ${titel}

Rückmeldungen (${n} Einträge):
${feedbackText}

Fülle das folgende HTML-Template mit den analysierten Inhalten. Ersetze NUR die Platzhalterstellen (in GROSSBUCHSTABEN in eckigen Klammern). Behalte das gesamte CSS und JavaScript unverändert.

Analyseregeln:
- Bilde induktiv 4 Kernbefunde aus den Rückmeldungen (nach Mayring)
- Jeder Befund hat: eine Kategorie (2–3 Wörter), eine prägnante These als Titel (1 Satz, max. 80 Zeichen), einen erklärenden Fliesstext (2–3 Sätze), eine Häufigkeitsangabe (wie viele der ${n} Texte diesen Befund stützen)
- Farben der 4 Karten in dieser Reihenfolge: tuerkis, rot, gelb, dunkel
- 3 Diskussionsfragen: direkt aus den Spannungsfeldern der Befunde ableiten, offen formuliert
- 1 Überraschungsbefund: ein unerwartetes, kontraintuitives oder widersprüchliches Muster aus den Daten — mit einem kurzen prägnanten Zitat (oder zitathaften Satz) als Headline und einer kurzen Erklärung

HTML-Template:

<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Diskussionsvorlage – [TITEL]</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --gelb:    #c7d200;
    --tuerkis: #23b2c6;
    --rot:     #ed6a69;
    --dunkel:  #3a3a3a;
    --hell:    #ececec;
    --bg:      #e4e4e4;
    --weiss:   #ffffff;
  }
  html, body { height: 100%; font-family: 'DejaVu Sans', 'Verdana', 'Tahoma', sans-serif; background: var(--bg); color: var(--dunkel); font-size: 14px; line-height: 1.45; }
  #fs-btn { position: fixed; top: 12px; right: 14px; z-index: 9999; background: rgba(58,58,58,0.18); border: none; border-radius: 6px; color: var(--dunkel); font-size: 20px; width: 36px; height: 36px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: opacity 0.4s; opacity: 0.7; line-height: 1; }
  #fs-btn:hover { opacity: 1; background: rgba(58,58,58,0.32); }
  #fs-btn.hidden { opacity: 0; pointer-events: none; }
  #fs-btn.fs-active { background: rgba(255,255,255,0.18); color: var(--weiss); }
  header { background: var(--gelb); padding: 14px 22px 12px 22px; display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 3px solid rgba(0,0,0,0.08); }
  .logo { display: flex; align-items: baseline; gap: 3px; flex-shrink: 0; }
  .logo .ph { font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 32px; font-weight: 400; color: var(--dunkel); letter-spacing: -1px; }
  .logo .gr { font-family: 'DejaVu Sans', 'Verdana', sans-serif; font-size: 25px; font-weight: 800; text-transform: uppercase; color: var(--dunkel); letter-spacing: 2px; }
  .header-center { flex: 1; text-align: center; }
  .header-center .modul-title { font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: var(--dunkel); }
  .header-center .modul-sub { font-size: 12.5px; font-weight: 400; color: rgba(58,58,58,0.72); margin-top: 2px; }
  .header-badge { background: var(--dunkel); color: var(--gelb); font-size: 11.5px; font-weight: 800; padding: 5px 12px; border-radius: 20px; letter-spacing: 0.5px; flex-shrink: 0; white-space: nowrap; }
  main { display: flex; gap: 16px; padding: 16px 20px 14px 20px; min-height: calc(100vh - 130px); align-items: start; }
  .cards-col { flex: 1; }
  .section-label { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(58,58,58,0.5); margin-bottom: 8px; }
  .cards { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; gap: 14px; align-items: start; }
  .card { background: var(--weiss); border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.09); padding: 14px 15px 12px 15px; border-left: 6px solid var(--tuerkis); display: flex; flex-direction: column; gap: 6px; }
  .card.rot    { border-left-color: var(--rot); }
  .card.gelb   { border-left-color: var(--gelb); }
  .card.dunkel { border-left-color: var(--dunkel); }
  .card.tuerkis { border-left-color: var(--tuerkis); }
  .card-num { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; opacity: 0.45; }
  .card-title { font-size: 18px; font-weight: 800; color: var(--dunkel); line-height: 1.25; }
  .card-body { font-size: 13.5px; color: rgba(58,58,58,0.82); line-height: 1.5; }
  .card-stat { display: inline-block; background: var(--bg); font-size: 11.5px; font-weight: 800; padding: 3px 9px; border-radius: 12px; color: var(--dunkel); margin-top: 2px; align-self: flex-start; }
  aside { width: 390px; flex-shrink: 0; display: flex; flex-direction: column; gap: 14px; }
  .aside-block { background: var(--weiss); border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); padding: 14px 16px; }
  .aside-label { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(58,58,58,0.45); margin-bottom: 10px; }
  .q-item { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 11px; }
  .q-item:last-child { margin-bottom: 0; }
  .q-icon { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; background: var(--tuerkis); color: var(--weiss); font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
  .q-text { font-size: 14.5px; font-weight: 700; color: var(--dunkel); line-height: 1.4; }
  .surprise-block { background: rgba(237,106,105,0.07); border: 1.5px solid rgba(237,106,105,0.35); border-radius: 8px; padding: 14px 16px; }
  .surprise-block .aside-label { color: var(--rot); opacity: 0.9; }
  .surprise-quote { font-size: 15px; font-weight: 800; font-style: italic; color: var(--rot); line-height: 1.4; margin-bottom: 8px; }
  .surprise-text { font-size: 13px; color: rgba(58,58,58,0.78); line-height: 1.5; }
  footer { background: var(--dunkel); color: rgba(255,255,255,0.5); font-size: 11.5px; text-align: center; padding: 8px 20px; letter-spacing: 0.3px; }
  footer span { color: rgba(255,255,255,0.75); font-weight: 700; }
  :fullscreen body, :-webkit-full-screen body { background: var(--bg); }

  /* ── FOKUS-BUTTON auf jeder Box ── */
  .focusable { position: relative; }
  .box-focus-btn {
    position: absolute; top: 8px; right: 8px;
    background: rgba(255,255,255,0.75); border: none; border-radius: 4px;
    font-size: 13px; width: 26px; height: 26px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.15s; z-index: 5; color: var(--dunkel);
  }
  .focusable:hover .box-focus-btn { opacity: 1; }
  .surprise-block .box-focus-btn { background: rgba(237,106,105,0.15); }

  /* ── FOKUS-OVERLAY ── */
  #focus-overlay {
    display: none; position: fixed; inset: 0; z-index: 10000;
    background: rgba(30,30,30,0.88);
    align-items: center; justify-content: center;
    cursor: pointer;
  }
  #focus-overlay.active { display: flex; }
  #focus-inner {
    width: 88vw; max-height: 88vh; overflow-y: auto;
    border-radius: 12px; cursor: default;
  }
  /* Skalierte Inhalte im Overlay */
  #focus-inner .card,
  #focus-inner .aside-block,
  #focus-inner .surprise-block {
    border-radius: 12px; box-shadow: none;
    padding: 40px 48px; gap: 14px;
  }
  #focus-inner .card-num  { font-size: 13px; }
  #focus-inner .card-title { font-size: 30px; line-height: 1.2; }
  #focus-inner .card-body  { font-size: 19px; line-height: 1.55; }
  #focus-inner .card-stat  { font-size: 15px; padding: 5px 14px; margin-top: 8px; }
  #focus-inner .aside-label { font-size: 13px; margin-bottom: 18px; }
  #focus-inner .q-item    { margin-bottom: 22px; gap: 14px; }
  #focus-inner .q-icon    { width: 34px; height: 34px; font-size: 18px; flex-shrink: 0; }
  #focus-inner .q-text    { font-size: 22px; line-height: 1.4; }
  #focus-inner .surprise-quote { font-size: 26px; margin-bottom: 14px; }
  #focus-inner .surprise-text  { font-size: 18px; line-height: 1.55; }
  #focus-inner .box-focus-btn  { display: none; }
</style>
</head>
<body>
<button id="fs-btn" title="Vollbild ein/aus">⛶</button>

<!-- FOKUS-OVERLAY -->
<div id="focus-overlay"><div id="focus-inner"></div></div>

<header>
  <div class="logo"><span class="ph">ph</span><span class="gr">GR</span></div>
  <div class="header-center">
    <div class="modul-title">[TITEL DER LEHRVERANSTALTUNG]</div>
    <div class="modul-sub">[INSTITUTION UND KONTEXT] · Kommunikative Validierung · ${today}</div>
  </div>
  <div class="header-badge">N = ${n} Rückmeldungen</div>
</header>
<main>
  <div class="cards-col">
    <div class="section-label">Kernbefunde</div>
    <div class="cards">
      <div class="card tuerkis focusable">
        <div class="card-num">Befund 01 — [KATEGORIE]</div>
        <div class="card-title">[THESE ALS SATZ]</div>
        <div class="card-body">[ERKLÄRUNG 2–3 SÄTZE]</div>
        <div class="card-stat">[X] / ${n} Texten · [Y] %</div>
      </div>
      <div class="card rot focusable">
        <div class="card-num">Befund 02 — [KATEGORIE]</div>
        <div class="card-title">[THESE ALS SATZ]</div>
        <div class="card-body">[ERKLÄRUNG 2–3 SÄTZE]</div>
        <div class="card-stat">[X] / ${n} Texten · [Y] %</div>
      </div>
      <div class="card gelb focusable">
        <div class="card-num">Befund 03 — [KATEGORIE]</div>
        <div class="card-title">[THESE ALS SATZ]</div>
        <div class="card-body">[ERKLÄRUNG 2–3 SÄTZE]</div>
        <div class="card-stat">[X] / ${n} Texten · [Y] %</div>
      </div>
      <div class="card dunkel focusable">
        <div class="card-num">Befund 04 — [KATEGORIE]</div>
        <div class="card-title">[THESE ALS SATZ]</div>
        <div class="card-body">[ERKLÄRUNG 2–3 SÄTZE]</div>
        <div class="card-stat">[X] / ${n} Texten · [Y] %</div>
      </div>
    </div>
  </div>
  <aside>
    <div class="aside-block focusable">
      <div class="aside-label">Diskussionsfragen</div>
      <div class="q-item"><div class="q-icon">?</div><div class="q-text">[FRAGE 1]</div></div>
      <div class="q-item"><div class="q-icon">?</div><div class="q-text">[FRAGE 2]</div></div>
      <div class="q-item"><div class="q-icon">?</div><div class="q-text">[FRAGE 3]</div></div>
    </div>
    <div class="surprise-block focusable">
      <div class="aside-label">⚡ Überraschungsbefund</div>
      <div class="surprise-quote">[ZITAT ODER PRÄGNANTE AUSSAGE]</div>
      <div class="surprise-text">[ERKLÄRUNG DES ÜBERRASCHENDEN MUSTERS]</div>
    </div>
  </aside>
</main>
<footer>
  <span>Vollständige Analyse (PDF)</span> auf Anfrage verfügbar · Qualitative Inhaltsanalyse nach Mayring · PHGR Weiterbildung
</footer>
<script>
  // ── VOLLBILD (ganze Seite) ──────────────────────────────
  const btn = document.getElementById('fs-btn');
  let hideTimer = null;
  function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement); }
  function updateBtn() { if (isFullscreen()) { btn.textContent = '✕'; btn.classList.add('fs-active'); } else { btn.textContent = '⛶'; btn.classList.remove('fs-active'); } }
  btn.addEventListener('click', () => {
    if (!isFullscreen()) { const el = document.documentElement; if (el.requestFullscreen) el.requestFullscreen(); else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen(); }
    else { if (document.exitFullscreen) document.exitFullscreen(); else if (document.webkitExitFullscreen) document.webkitExitFullscreen(); }
  });
  ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange'].forEach(ev => document.addEventListener(ev, updateBtn));
  function resetHideTimer() { btn.classList.remove('hidden'); clearTimeout(hideTimer); hideTimer = setTimeout(() => { if (isFullscreen()) btn.classList.add('hidden'); }, 3000); }
  document.addEventListener('mousemove', resetHideTimer);
  document.addEventListener('click', resetHideTimer);

  // ── FOKUS-MODUS (einzelne Box) ─────────────────────────
  const overlay = document.getElementById('focus-overlay');
  const focusInner = document.getElementById('focus-inner');

  document.querySelectorAll('.focusable').forEach(el => {
    const focBtn = document.createElement('button');
    focBtn.className = 'box-focus-btn';
    focBtn.textContent = '⛶';
    focBtn.title = 'Fokus-Ansicht';
    focBtn.addEventListener('click', e => { e.stopPropagation(); openFocus(el); });
    el.appendChild(focBtn);
    el.addEventListener('click', () => openFocus(el));
  });

  function openFocus(el) {
    const clone = el.cloneNode(true);
    clone.querySelector('.box-focus-btn')?.remove();
    focusInner.innerHTML = '';
    focusInner.appendChild(clone);
    overlay.classList.add('active');
  }

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('active'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.classList.remove('active'); });
</script>
</body>
</html>
${outputAnweisung}`;
  }

  if (typ === 'swot') {
    const titel = kontext || 'Lehrveranstaltung';
    return `Du bist Experte für pädagogische Evaluation. Analysiere folgende Rückmeldungen aus einer Lehrveranstaltung und erstelle eine SWOT-Analyse.

Kontext: ${titel}

Rückmeldungen (${feedbacks.length} Einträge):
${feedbackText}

Fülle das folgende HTML-Dokument mit den analysierten Inhalten. Ersetze NUR die Einträge in den vier entry-lists sowie die dynamischen Textstellen (TITEL, DATUM, ANZAHL). Behalte das gesamte CSS und JavaScript unverändert.

Regeln für die Einträge:
- Pro Quadrant 5–8 Einträge
- Jeder Eintrag: ein präziser, vollständiger Satz (max. 120 Zeichen)
- Direkt aus den Rückmeldungen abgeleitet, keine Erfindungen
- Stärken: Was lief gut / wird als Ressource wahrgenommen?
- Schwächen: Was fehlt / hemmt / wird kritisiert?
- Chancen: Was ist möglich / Entwicklungspotenzial?
- Risiken: Was bedroht / hindert / bereitet Sorgen?

HTML-Template (vollständig ausfüllen und zurückgeben):

<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SWOT – ${titel}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --gelb:      #c7d200;
    --tuerkis:   #23b2c6;
    --rot:       #ed6a69;
    --dunkel:    #3a3a3a;
    --grau-bg:   #d0d0d0;
    --white:     #ffffff;
    --text-dark: #1a1a1a;
    --text-mid:  #666666;
    --hover:     #f5f5f5;
    --font: 'DejaVu Sans', 'Trebuchet MS', sans-serif;
  }
  html, body { width: 100%; height: 100vh; overflow: hidden; font-family: var(--font); background: var(--grau-bg); }
  #app-header {
    display: flex; align-items: center; gap: 1rem; padding: 0 1rem;
    height: 42px; background: var(--white); border-bottom: 1.5px solid var(--grau-bg); flex-shrink: 0;
  }
  .phgr-logo { line-height: 1; font-size: clamp(1rem, 1.8vw, 1.35rem); }
  .phgr-logo .ph { font-family: Georgia, serif; font-style: italic; font-weight: 700; color: var(--text-dark); }
  .phgr-logo .gr { font-family: var(--font); font-variant: small-caps; font-weight: 300; color: var(--text-dark); }
  .header-sep { color: var(--grau-bg); font-weight: 300; font-size: 1.2rem; }
  .header-title { font-size: clamp(0.75rem, 1.3vw, 1.0rem); font-weight: 700; color: var(--text-dark); letter-spacing: 0.03em; text-transform: uppercase; flex: 1; }
  .header-meta { font-size: clamp(0.65rem, 1.0vw, 0.85rem); color: var(--text-mid); white-space: nowrap; }
  #fs-btn { background: none; border: none; cursor: pointer; font-size: 1.2rem; color: var(--text-mid); padding: 4px 6px; border-radius: 4px; transition: opacity 0.4s; line-height: 1; }
  #fs-btn:hover { color: var(--text-dark); background: var(--hover); }
  #grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 3px; height: calc(100vh - 42px); background: var(--grau-bg); }
  .quadrant { display: flex; flex-direction: column; overflow: hidden; background: var(--grau-bg); }
  .q-header { flex: 0 0 auto; display: flex; align-items: center; gap: 0.6rem; padding: clamp(6px, 0.9vh, 12px) clamp(10px, 1.2vw, 18px); }
  .q-letter { font-size: clamp(2rem, 4vw, 3.2rem); font-weight: 900; line-height: 1; flex-shrink: 0; }
  .q-labels { display: flex; flex-direction: column; gap: 1px; }
  .q-title { font-size: clamp(0.95rem, 1.8vw, 1.5rem); font-weight: 700; font-variant: small-caps; letter-spacing: 0.06em; line-height: 1; }
  .q-sub { font-size: clamp(0.65rem, 1.0vw, 0.88rem); opacity: 0.85; line-height: 1; }
  .q-staerken  .q-header { background: var(--gelb);    color: var(--text-dark); }
  .q-schwaechen .q-header { background: var(--rot);    color: var(--white); }
  .q-chancen   .q-header { background: var(--tuerkis); color: var(--white); }
  .q-risiken   .q-header { background: var(--dunkel);  color: var(--white); }
  .q-body { flex: 1; display: flex; flex-direction: column; background: var(--white); overflow: hidden; padding: clamp(4px, 0.6vh, 10px) clamp(6px, 0.8vw, 12px) 0; }
  .entry-list { flex: 1; display: flex; flex-direction: column; justify-content: space-evenly; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--grau-bg) transparent; }
  .entry { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: clamp(3px, 0.45vh, 7px) clamp(6px, 0.7vw, 10px); border-radius: 4px; background: var(--white); box-shadow: 0 1px 3px rgba(0,0,0,0.08); transition: background 0.15s; cursor: default; }
  .entry:hover { background: var(--hover); }
  .entry-text { font-size: clamp(0.9rem, 1.6vw, 1.25rem); color: var(--text-dark); line-height: 1.3; flex: 1; }
  .dots { display: flex; gap: 4px; flex-shrink: 0; align-items: center; }
  .dot { width: clamp(14px, 1.8vw, 20px); height: clamp(14px, 1.8vw, 20px); border-radius: 50%; cursor: pointer; transition: transform 0.1s, opacity 0.15s; opacity: 0.2; flex-shrink: 0; }
  .dot.filled { opacity: 1; }
  .dot:hover { transform: scale(1.2); }
  .q-staerken  .dot { background: var(--gelb); }
  .q-schwaechen .dot { background: var(--rot); }
  .q-chancen   .dot { background: var(--tuerkis); }
  .q-risiken   .dot { background: var(--dunkel); }
  .sort-wrap { display: flex; justify-content: flex-end; padding: clamp(3px, 0.5vh, 8px) 0; flex-shrink: 0; }
  .sort-btn { font-family: var(--font); font-size: clamp(0.65rem, 0.95vw, 0.82rem); font-weight: 700; border: none; border-radius: 4px; padding: 4px 10px; cursor: pointer; color: var(--white); visibility: hidden; transition: opacity 0.2s; }
  .q-staerken  .sort-btn { background: var(--gelb); color: var(--text-dark); }
  .q-schwaechen .sort-btn { background: var(--rot); }
  .q-chancen   .sort-btn { background: var(--tuerkis); }
  .q-risiken   .sort-btn { background: var(--dunkel); }

  /* ── FOKUS-BUTTON im q-header ── */
  .q-header { position: relative; }
  .q-focus-btn {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    background: rgba(255,255,255,0.22); border: none; border-radius: 4px;
    font-size: 13px; width: 28px; height: 28px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.15s; color: inherit; flex-shrink: 0;
  }
  .q-header:hover .q-focus-btn { opacity: 1; }
  .q-staerken .q-focus-btn { color: var(--text-dark); background: rgba(0,0,0,0.1); }

  /* ── FOKUS-OVERLAY ── */
  #focus-overlay {
    display: none; position: fixed; inset: 0; z-index: 10000;
    background: rgba(20,20,20,0.88);
    align-items: center; justify-content: center; cursor: pointer;
  }
  #focus-overlay.active { display: flex; }
  #focus-inner {
    width: 88vw; height: 88vh;
    display: flex; flex-direction: column;
    border-radius: 10px; overflow: hidden; cursor: default;
  }
  /* Vergrösserte Inhalte im Overlay */
  #focus-inner .q-header  { padding: clamp(12px,2vh,24px) clamp(16px,2.5vw,32px); }
  #focus-inner .q-letter  { font-size: clamp(3rem,5vw,4.5rem); }
  #focus-inner .q-title   { font-size: clamp(1.4rem,2.5vw,2rem); }
  #focus-inner .q-sub     { font-size: clamp(0.85rem,1.2vw,1.1rem); }
  #focus-inner .q-body    { padding: clamp(8px,1.2vh,18px) clamp(10px,1.5vw,22px) 0; }
  #focus-inner .entry-text { font-size: clamp(1.1rem,2vw,1.6rem); }
  #focus-inner .dot        { width: clamp(16px,2vw,26px); height: clamp(16px,2vw,26px); }
  #focus-inner .sort-btn   { font-size: clamp(0.75rem,1.1vw,1rem); padding: 6px 16px; }
  #focus-inner .q-focus-btn { display: none; }
</style>
</head>
<body>
<div id="focus-overlay"><div id="focus-inner"></div></div>
<div id="app-header">
  <div class="phgr-logo"><span class="ph">ph</span><span class="gr">GR</span></div>
  <span class="header-sep">|</span>
  <div class="header-title">[HIER: Titel der Lehrveranstaltung eintragen]</div>
  <div class="header-meta">SWOT &nbsp;·&nbsp; N=[ANZAHL] &nbsp;·&nbsp; ${today} &nbsp;·&nbsp; Qualitative Inhaltsanalyse (Mayring)</div>
  <button id="fs-btn" title="Vollbild">⛶</button>
</div>
<div id="grid">
  <div class="quadrant q-staerken">
    <div class="q-header">
      <div class="q-letter">S</div>
      <div class="q-labels">
        <div class="q-title">Stärken</div>
        <div class="q-sub">Was läuft gut / wird als Ressource wahrgenommen?</div>
      </div>
    </div>
    <div class="q-body">
      <div class="entry-list" id="list-s">
        [HIER: Einträge Stärken einfügen – je ein <div class="entry" data-score="0"><span class="entry-text">TEXT</span><div class="dots"></div></div>]
      </div>
      <div class="sort-wrap"><button class="sort-btn" data-target="list-s">↕ Sortieren</button></div>
    </div>
  </div>
  <div class="quadrant q-schwaechen">
    <div class="q-header">
      <div class="q-letter">W</div>
      <div class="q-labels">
        <div class="q-title">Schwächen</div>
        <div class="q-sub">Was fehlt / hemmt / wird kritisiert?</div>
      </div>
    </div>
    <div class="q-body">
      <div class="entry-list" id="list-w">
        [HIER: Einträge Schwächen einfügen]
      </div>
      <div class="sort-wrap"><button class="sort-btn" data-target="list-w">↕ Sortieren</button></div>
    </div>
  </div>
  <div class="quadrant q-chancen">
    <div class="q-header">
      <div class="q-letter">O</div>
      <div class="q-labels">
        <div class="q-title">Chancen</div>
        <div class="q-sub">Was ist möglich / wird als Entwicklungspotenzial gesehen?</div>
      </div>
    </div>
    <div class="q-body">
      <div class="entry-list" id="list-o">
        [HIER: Einträge Chancen einfügen]
      </div>
      <div class="sort-wrap"><button class="sort-btn" data-target="list-o">↕ Sortieren</button></div>
    </div>
  </div>
  <div class="quadrant q-risiken">
    <div class="q-header">
      <div class="q-letter">T</div>
      <div class="q-labels">
        <div class="q-title">Risiken</div>
        <div class="q-sub">Was bedroht / hindert / bereitet Sorgen?</div>
      </div>
    </div>
    <div class="q-body">
      <div class="entry-list" id="list-t">
        [HIER: Einträge Risiken einfügen]
      </div>
      <div class="sort-wrap"><button class="sort-btn" data-target="list-t">↕ Sortieren</button></div>
    </div>
  </div>
</div>
<script>
document.querySelectorAll('.entry').forEach(entry => {
  const dotsEl = entry.querySelector('.dots');
  for (let i = 0; i < 5; i++) {
    const d = document.createElement('span');
    d.className = 'dot'; d.dataset.idx = i;
    dotsEl.appendChild(d);
  }
  renderDots(entry);
  dotsEl.addEventListener('click', e => {
    const dot = e.target.closest('.dot');
    if (!dot) return;
    const idx = parseInt(dot.dataset.idx);
    const score = parseInt(entry.dataset.score) || 0;
    entry.dataset.score = (idx === score - 1) ? score - 1 : idx + 1;
    renderDots(entry);
    updateSortBtn(entry.closest('.quadrant'));
  });
});
function renderDots(entry) {
  const score = parseInt(entry.dataset.score) || 0;
  entry.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('filled', i < score));
}
function updateSortBtn(quad) {
  const any = [...quad.querySelectorAll('.entry')].some(e => parseInt(e.dataset.score) > 0);
  quad.querySelector('.sort-btn').style.visibility = any ? 'visible' : 'hidden';
}
document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const list = document.getElementById(btn.dataset.target);
    const entries = [...list.querySelectorAll('.entry')];
    entries.sort((a, b) => (parseInt(b.dataset.score)||0) - (parseInt(a.dataset.score)||0));
    entries.forEach(e => list.appendChild(e));
    const orig = btn.textContent;
    btn.textContent = '✓ Sortiert';
    setTimeout(() => btn.textContent = orig, 1500);
  });
});
const fsBtn = document.getElementById('fs-btn');
fsBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); fsBtn.textContent = '✕'; }
  else { document.exitFullscreen(); fsBtn.textContent = '⛶'; }
});
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) fsBtn.textContent = '⛶'; });
let hideTimer;
function showFsBtn() { fsBtn.style.opacity='1'; fsBtn.style.pointerEvents='auto'; clearTimeout(hideTimer); hideTimer=setTimeout(()=>{fsBtn.style.opacity='0';fsBtn.style.pointerEvents='none';},3000); }
document.addEventListener('mousemove', showFsBtn);
document.addEventListener('touchstart', showFsBtn);
showFsBtn();

// ── FOKUS-MODUS (einzelner Quadrant) ───────────────────
const focusOverlay = document.getElementById('focus-overlay');
const focusInner   = document.getElementById('focus-inner');
let focusPlaceholder = null;
let focusSource      = null;

document.querySelectorAll('.quadrant').forEach(quad => {
  const header = quad.querySelector('.q-header');
  const focBtn = document.createElement('button');
  focBtn.className = 'q-focus-btn';
  focBtn.textContent = '⛶';
  focBtn.title = 'Fokus-Ansicht';
  focBtn.addEventListener('click', e => { e.stopPropagation(); openFocus(quad); });
  header.appendChild(focBtn);
  header.addEventListener('click', () => openFocus(quad));
});

function openFocus(quad) {
  focusPlaceholder = document.createElement('div');
  focusPlaceholder.style.background = 'var(--grau-bg)';
  quad.parentNode.insertBefore(focusPlaceholder, quad);
  focusSource = quad;
  focusInner.appendChild(quad);
  focusOverlay.classList.add('active');
}

function closeFocus() {
  if (focusSource && focusPlaceholder) {
    focusPlaceholder.parentNode.insertBefore(focusSource, focusPlaceholder);
    focusPlaceholder.remove();
    focusPlaceholder = null;
    focusSource = null;
  }
  focusOverlay.classList.remove('active');
}

focusOverlay.addEventListener('click', e => { if (e.target === focusOverlay) closeFocus(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeFocus(); });
</script>
</body>
</html>
${outputAnweisung}`;
  }

  if (typ === 'ideen') {
    const titel = kontext || 'Ideensammlung';
    const n = feedbacks.length;
    return `Du bist Experte für kreative Ideensynthese und partizipative Zukunftsgestaltung. Analysiere folgende Ideen und Vorschläge aus einer Gruppe und entwickle daraus sechs Zukunftsoptionen.

Kontext / Leitfrage: ${titel}

Eingereichte Ideen (${n} Einträge):
${feedbackText}

Fülle das folgende HTML-Template mit den synthetisierten Optionen. Ersetze NUR die Platzhalterstellen (in GROSSBUCHSTABEN in eckigen Klammern). Behalte CSS und JavaScript unverändert.

Syntheseregeln:
- Verwende KEINE Namen aus den Eingaben — konsequent anonymisiert.
- Jede Option hat: einen prägnanten Titel (1 Satz, max. 90 Zeichen) und einen Kommentar (2–3 Sätze, der anonym auf konkrete Ideen aus den Eingaben Bezug nimmt und erklärt, warum diese Option so aussieht).
- Die 6 Optionen sind:
  1. MINIMALER KONSENS: Was alle (oder fast alle) erwähnt haben — der kleinste gemeinsame Nenner, sofort umsetzbar, kein Widerstand zu erwarten.
  2. GRUNDSOLIDER KOMPROMISS: Balanciert unterschiedliche Positionen pragmatisch; realistisch in Aufwand und Akzeptanz.
  3. MUTIGE OPTION: Nimmt die ambitioniertesten Ideen ernst, geht weiter als die Mehrheit — mit Begründung warum das sinnvoll wäre.
  4–6. ÜBERRASCHUNGSVORSCHLAG #1, #2, #3: Je eine kreative Synthese, die niemand explizit so formuliert hat, aber sich aus der Gesamtheit der Ideen ergibt. Alle drei sollen sich klar voneinander unterscheiden.

HTML-Template:

<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ideensynthese – [TITEL]</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --gelb:    #c7d200;
    --tuerkis: #23b2c6;
    --rot:     #ed6a69;
    --dunkel:  #3a3a3a;
    --bg:      #e8e8e8;
    --weiss:   #ffffff;
    --text:    #1a1a1a;
    --sub:     rgba(58,58,58,0.72);
    --font:    'DejaVu Sans', 'Verdana', 'Tahoma', sans-serif;
  }
  html, body { height: 100vh; overflow: hidden; font-family: var(--font); background: var(--bg); color: var(--text); display: flex; flex-direction: column; }

  /* ── HEADER ── */
  header { flex-shrink: 0; background: var(--tuerkis); padding: 10px 20px; display: flex; align-items: center; gap: 14px; border-bottom: 3px solid rgba(0,0,0,0.1); }
  .logo { display: flex; align-items: baseline; gap: 3px; flex-shrink: 0; }
  .logo .ph { font-family: Georgia, serif; font-style: italic; font-size: 28px; font-weight: 400; color: var(--weiss); letter-spacing: -1px; }
  .logo .gr { font-size: 22px; font-weight: 800; text-transform: uppercase; color: var(--weiss); letter-spacing: 2px; }
  .header-center { flex: 1; text-align: center; }
  .header-title { font-size: clamp(0.8rem, 1.4vw, 1.05rem); font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: var(--weiss); }
  .header-sub { font-size: clamp(0.65rem, 1vw, 0.82rem); color: rgba(255,255,255,0.78); margin-top: 2px; }
  .header-badge { background: rgba(0,0,0,0.18); color: var(--weiss); font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; white-space: nowrap; flex-shrink: 0; }

  /* ── MAIN ── */
  main { flex: 1; display: flex; flex-direction: column; gap: 10px; padding: 12px 16px; overflow: hidden; }
  .row-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(58,58,58,0.45); flex-shrink: 0; }
  .cards-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; flex: 1; min-height: 0; }

  /* ── KARTE ── */
  .card { background: var(--weiss); border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.09); padding: clamp(10px,1.4vh,18px) clamp(12px,1.4vw,18px); border-left: 6px solid var(--tuerkis); display: flex; flex-direction: column; gap: 6px; position: relative; overflow: hidden; }
  .card.gelb   { border-left-color: var(--gelb); }
  .card.dunkel { border-left-color: var(--dunkel); }
  .card.rot    { border-left-color: var(--rot); }
  .card.tuerkis { border-left-color: var(--tuerkis); }
  .card-label   { font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; opacity: 0.42; flex-shrink: 0; }
  .card-title   { font-size: clamp(0.9rem, 1.55vw, 1.25rem); font-weight: 800; line-height: 1.25; color: var(--text); flex-shrink: 0; }
  .card-comment { font-size: clamp(0.75rem, 1.1vw, 0.95rem); color: var(--sub); line-height: 1.5; flex: 1; overflow: hidden; }

  /* ── FOKUS-BUTTON ── */
  .box-focus-btn { position: absolute; top: 7px; right: 7px; background: rgba(255,255,255,0.8); border: none; border-radius: 4px; font-size: 12px; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; z-index: 5; color: var(--dunkel); }
  .card:hover .box-focus-btn { opacity: 1; }

  /* ── FOKUS-OVERLAY ── */
  #focus-overlay { display: none; position: fixed; inset: 0; z-index: 10000; background: rgba(20,20,20,0.88); align-items: center; justify-content: center; cursor: pointer; }
  #focus-overlay.active { display: flex; }
  #focus-inner { width: 88vw; max-height: 88vh; overflow-y: auto; border-radius: 12px; cursor: default; }
  #focus-inner .card { border-radius: 12px; box-shadow: none; padding: 44px 52px; gap: 16px; }
  #focus-inner .card-label   { font-size: 13px; }
  #focus-inner .card-title   { font-size: clamp(1.6rem, 3vw, 2.4rem); line-height: 1.2; }
  #focus-inner .card-comment { font-size: clamp(1rem, 1.8vw, 1.4rem); line-height: 1.6; }
  #focus-inner .box-focus-btn { display: none; }

  /* ── VOLLBILD-BUTTON ── */
  #fs-btn { position: fixed; top: 10px; right: 12px; z-index: 9999; background: rgba(255,255,255,0.2); border: none; border-radius: 6px; color: var(--weiss); font-size: 18px; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: opacity 0.4s; opacity: 0.7; }
  #fs-btn:hover { opacity: 1; background: rgba(255,255,255,0.35); }
  #fs-btn.hidden { opacity: 0; pointer-events: none; }

  /* ── FOOTER ── */
  footer { flex-shrink: 0; background: var(--dunkel); color: rgba(255,255,255,0.45); font-size: 11px; text-align: center; padding: 6px 20px; letter-spacing: 0.3px; }
  footer span { color: rgba(255,255,255,0.7); font-weight: 700; }
</style>
</head>
<body>
<button id="fs-btn" title="Vollbild">⛶</button>
<div id="focus-overlay"><div id="focus-inner"></div></div>

<header>
  <div class="logo"><span class="ph">ph</span><span class="gr">GR</span></div>
  <div class="header-center">
    <div class="header-title">[TITEL DER LEITFRAGE]</div>
    <div class="header-sub">Ideensynthese · ${today}</div>
  </div>
  <div class="header-badge">N = ${n} Ideen</div>
</header>

<main>
  <div class="row-label">Hauptoptionen</div>
  <div class="cards-row">

    <div class="card tuerkis">
      <div class="card-label">Minimaler Konsens</div>
      <div class="card-title">[OPTION ALS SATZ]</div>
      <div class="card-comment">[KOMMENTAR MIT BEZUG ZU DEN EINGABEN]</div>
    </div>

    <div class="card gelb">
      <div class="card-label">Grundsolider Kompromiss</div>
      <div class="card-title">[OPTION ALS SATZ]</div>
      <div class="card-comment">[KOMMENTAR MIT BEZUG ZU DEN EINGABEN]</div>
    </div>

    <div class="card dunkel">
      <div class="card-label">Mutige Option</div>
      <div class="card-title">[OPTION ALS SATZ]</div>
      <div class="card-comment">[KOMMENTAR MIT BEZUG ZU DEN EINGABEN]</div>
    </div>

  </div>

  <div class="row-label">Überraschungsvorschläge</div>
  <div class="cards-row">

    <div class="card rot">
      <div class="card-label">Überraschung #1</div>
      <div class="card-title">[OPTION ALS SATZ]</div>
      <div class="card-comment">[KOMMENTAR MIT BEZUG ZU DEN EINGABEN]</div>
    </div>

    <div class="card rot">
      <div class="card-label">Überraschung #2</div>
      <div class="card-title">[OPTION ALS SATZ]</div>
      <div class="card-comment">[KOMMENTAR MIT BEZUG ZU DEN EINGABEN]</div>
    </div>

    <div class="card rot">
      <div class="card-label">Überraschung #3</div>
      <div class="card-title">[OPTION ALS SATZ]</div>
      <div class="card-comment">[KOMMENTAR MIT BEZUG ZU DEN EINGABEN]</div>
    </div>

  </div>
</main>

<footer>
  <span>Ideensynthese</span> · Generiert aus ${n} Eingaben · PHGR Weiterbildung · ${today}
</footer>

<script>
  // ── FOKUS-MODUS ──────────────────────────────────────────
  const overlay   = document.getElementById('focus-overlay');
  const focusInner = document.getElementById('focus-inner');

  document.querySelectorAll('.card').forEach(card => {
    const btn = document.createElement('button');
    btn.className = 'box-focus-btn';
    btn.textContent = '⛶';
    btn.title = 'Fokus-Ansicht';
    btn.addEventListener('click', e => { e.stopPropagation(); openFocus(card); });
    card.appendChild(btn);
    card.addEventListener('click', () => openFocus(card));
  });

  function openFocus(card) {
    const clone = card.cloneNode(true);
    clone.querySelector('.box-focus-btn')?.remove();
    focusInner.innerHTML = '';
    focusInner.appendChild(clone);
    overlay.classList.add('active');
  }

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('active'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.classList.remove('active'); });

  // ── VOLLBILD ──────────────────────────────────────────────
  const fsBtn = document.getElementById('fs-btn');
  let hideTimer;
  fsBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); fsBtn.textContent = '✕'; }
    else { document.exitFullscreen(); fsBtn.textContent = '⛶'; }
  });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) fsBtn.textContent = '⛶'; });
  function showFs() { fsBtn.classList.remove('hidden'); clearTimeout(hideTimer); hideTimer = setTimeout(() => { if (document.fullscreenElement) fsBtn.classList.add('hidden'); }, 3000); }
  document.addEventListener('mousemove', showFs);
  showFs();
</script>
</body>
</html>
${outputAnweisung}`;
  }

  // Fallback
  return `Analysiere folgende Rückmeldungen und erstelle eine strukturierte Auswertung:\n${feedbackText}`;
}
