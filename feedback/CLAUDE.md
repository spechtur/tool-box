# CLAUDE.md — Feedback-Tool (PHGR)

## Worum es geht
Live-Feedback-Tool für Lehrveranstaltungen: Das Publikum gibt in Echtzeit
Rückmeldungen, die auf einem Beamer in verschiedenen Modi angezeigt und per KI
qualitativ ausgewertet werden. Eingesetzt an der Pädagogischen Hochschule
Graubünden (PHGR), eingebettet in Moodle.

## Architektur
- **Frontend:** `presenter.html` — eine einzige HTML-Datei, kein Build-Schritt,
  keine externen Abhängigkeiten. Gehostet über GitHub Pages.
- **Backend / Daten:** Supabase (Realtime-Updates der Einträge).
- **KI-Auswertung:** `worker.js` — Cloudflare Worker als Proxy zur
  Anthropic-Claude-API, Antwort per SSE-Streaming. Modell: `claude-haiku-4-5`,
  max_tokens: 8192. Live-URL: `https://feedback-auswertung.david-halser.workers.dev`
- **Anzeigemodi:** Bubble-Canvas, Spotlight, Gesamtschau.
- **Auswertung:** Qualitative Analyse nach Mayring sowie SWOT. Ausgeblendete
  («hidden») Karten werden von der Analyse ausgeschlossen.

## Verbindliche Konventionen
- **Eine Datei, keine Abhängigkeiten:** Das Tool bleibt eine portable
  Single-File-HTML. Kein Framework, kein npm, keine CDN-Pflicht, wo vermeidbar.
- **UI auf Deutsch:** Alle sichtbaren Beschriftungen deutsch (CH-Hochschulkontext).
- **PHGR Corporate Identity:**
  - Gelb `#c7d200`, Türkis `#23b2c6`, Rot `#ed6a69`, Dunkel `#3a3a3a`
  - Typografie: DejaVu Sans / Trebuchet MS / Verdana
- **Geheimnisse nie ins Repo:** API-Keys liegen im Cloudflare Worker (Secret
  `ANTHROPIC_API_KEY`) bzw. in Supabase, nicht im HTML.
- **Keine Namen in KI-Ausgaben:** Der Worker-Prompt schreibt explizit vor, dass
  Namen aus den Rückmeldungen nicht verwendet werden dürfen.

## Zusammenarbeit
- David ist «Vibe Coder»: Er gibt Idee, Didaktik und Ästhetik vor; die Umsetzung
  im Code übernimmst du.
- **Erst der Plan, dann der Code:** Beschreibe deinen Lösungsweg und warte auf
  Davids Okay, bevor du grössere Änderungen umsetzt.
- Sprache der Zusammenarbeit: Deutsch.
- **Ehrlichkeit vor Halluzination:** Ist etwas unklar oder ungetestet, sag es
  offen, statt zu raten.

## KI-Auswertungs-Modi (worker.js)

### Mayring (`typ: "mayring"`)
Ausgabe: vollständiges HTML-Dokument im PHGR-Design mit:
- Gelbem Header (phGR-Logo, Titel, N-Badge)
- 4 Kernbefund-Karten im 2×2 Grid (Kategorie, These, Erklärung, Häufigkeit)
- Aside mit 3 Diskussionsfragen und 1 Überraschungsbefund
- Fokus-Overlay: jede der 6 Boxen per Klick gross einblendbar (88vw × 88vh)
- Vollbild-Button mit Auto-Hide

### SWOT (`typ: "swot"`)
Ausgabe: vollständiges HTML-Dokument im PHGR-Design mit:
- 4-Quadranten-Grid (S/W/O/T), je 5–8 Einträge
- Dot-Voting (5 Punkte pro Eintrag, klickbar)
- Sort-Button (erscheint sobald Punkte vergeben)
- Fokus-Overlay: Quadrant per Klick auf Header gross einblendbar (88vw × 88vh)
  → Move/Restore-Mechanik, damit Dots und Sort im Fokus weiterhin funktionieren
- Vollbild-Button mit Auto-Hide

### Worker-Konfiguration
- Prompt enthält das vollständige HTML-Template; Claude füllt nur Inhalt ein
- `WICHTIG`-Präfix im Prompt verhindert Markdown/Backtick-Umrahmung
- Keine Namen aus Rückmeldungen verwenden (explizite Anonymisierungsregel)
- Datum wird serverseitig im Worker gesetzt (`toLocaleDateString('de-CH', ...)`)

## Session-Verlauf (localStorage)
- Schlüssel: `phgr-fb-history`, max. 12 Einträge
- Wird automatisch gespeichert, wenn eine Session Daten enthält
- Felder pro Eintrag: `id`, `label` (umbenennbar), `count`, `lastUsed`
- UI: aufklappbares Panel unter dem Session-Input
- Umbenennen per `prompt()`, Entfernen per ✕-Button
- Bei Reset: Eintrag wird aus dem Verlauf entfernt (Daten in Supabase gelöscht)
- Persistiert über Browser- und Mac-Neustarts (solange GitHub-Pages-URL gleich bleibt)

## Aktueller Stand
- Worker deployed: `https://feedback-auswertung.david-halser.workers.dev`
- `WORKER_URL` in `presenter.html` zeigt auf diese URL
- Session-Verlauf implementiert und live (Stufe 1 abgeschlossen)
- Beide KI-Modi (Mayring, SWOT) produktiv getestet und für gut befunden

## Offene Punkte / nächste Schritte
- Session-Eingabe ggf. von `oninput` auf `onchange` / Enter umstellen
  (verhindert vorzeitiges Auslösen bei langer Session-ID-Eingabe)
- Neue Idee von David (noch nicht umgesetzt — folgt im nächsten Schritt)

## Geplante Erweiterungen (Rückstand)
- **Stufe 2: Nutzer-Identifikation** — echte Trennung pro Person, damit beim
  Teilen an der PH jede Person nur ihre eigenen Sessions sieht.
  - Erfordert Authentifizierung **plus** Row-Level-Security in Supabase.
  - Reines Filtern im Frontend ist *keine* Zugriffskontrolle — der anonyme
    Key könnte sonst die ganze Tabelle lesen.

## Deployment
- **Frontend:** Push ins Repo → GitHub Pages (automatisch).
- **Cloudflare Worker:** Code aus `worker.js` ins Dashboard kopieren →
  Save and Deploy. Secret `ANTHROPIC_API_KEY` in Settings → Variables.
- **Supabase:** wird separat verwaltet. David deployt selbst.
