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
- **Auswertung:** Drei KI-Modi — Mayring, SWOT, Ideensynthese. Ausgeblendete
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

Die drei Modi folgen einer klaren didaktischen Logik:
- **Mayring und SWOT** blicken *zurück* — sie werten ab, was war (Evaluation).
- **Ideensynthese** blickt *vorwärts* — sie synthetisiert, was sein könnte (Partizipation).

### Mayring (`typ: "mayring"`)
**Zweck:** Qualitative Inhaltsanalyse nach Mayring für die Auswertung vergangener
Lehrveranstaltungen oder Module. Geeignet wenn die Leitfrage lautet: *«Was haben
die TN erlebt, was hat gut/weniger gut funktioniert?»*

Ausgabe: vollständiges HTML-Dokument im PHGR-Design mit:
- Gelbem Header (phGR-Logo, Titel, N-Badge)
- 4 Kernbefund-Karten im 2×2 Grid (Kategorie, These, Erklärung, Häufigkeit)
- Aside mit 3 Diskussionsfragen und 1 Überraschungsbefund
- Fokus-Overlay: jede der 6 Boxen per Klick gross einblendbar (88vw × 88vh)
- Vollbild-Button mit Auto-Hide

### SWOT (`typ: "swot"`)
**Zweck:** Strukturierte Stärken-Schwächen-Analyse für die Reflexion eines Moduls,
einer Veranstaltung oder eines Projekts. Geeignet wenn die Leitfrage lautet:
*«Was sind unsere Stärken, Schwächen, Chancen und Risiken?»*

Ausgabe: vollständiges HTML-Dokument im PHGR-Design mit:
- 4-Quadranten-Grid (S/W/O/T), je 5–8 Einträge
- Dot-Voting (5 Punkte pro Eintrag, klickbar) zur Priorisierung im Plenum
- Sort-Button (erscheint sobald Punkte vergeben)
- Fokus-Overlay: Quadrant per Klick auf Header gross einblendbar (88vw × 88vh)
  → Move/Restore-Mechanik, damit Dots und Sort im Fokus weiterhin funktionieren
- Vollbild-Button mit Auto-Hide

### Ideensynthese (`typ: "ideen"`)
**Zweck:** Partizipative Zukunftsgestaltung — die TN reichen Ideen und Vorschläge
ein (nicht Bewertungen), und die KI synthetisiert daraus konkrete Zukunftsoptionen
für die Diskussion im Plenum. Geeignet wenn die Leitfrage lautet: *«Wie soll es
weitergehen? Welche Ideen könnten wir gemeinsam umsetzen?»*

Die KI entwickelt aus den Eingaben **6 unterschiedliche Optionen**:
- **Minimaler Konsens** — kleinster gemeinsamer Nenner, sofort umsetzbar,
  kein Widerstand zu erwarten
- **Grundsolider Kompromiss** — balanciert unterschiedliche Positionen,
  pragmatisch und realistisch im Aufwand
- **Mutige Option** — nimmt die ambitioniertesten Ideen ernst, geht weiter
  als die Mehrheit, mit Begründung
- **Überraschung #1–3** — drei kreative Synthesen, die niemand explizit so
  formuliert hat, aber sich aus der Gesamtheit der Ideen ergeben; bewusst
  divers, weil «Zukunft hat immer Optionen»

Jede Option hat einen **Titel** (prägnanter Satz) und einen **Kommentar**
(anonym, mit direktem Bezug zu konkreten Eingaben der TN).

Ausgabe: vollständiges HTML-Dokument im PHGR-Design mit:
- Türkisem Header (phGR-Logo, Leitfrage als Titel, N-Badge)
- 2×3 Karten-Grid: Reihe 1 = Hauptoptionen, Reihe 2 = Überraschungen
- Fokus-Overlay auf allen 6 Karten (Clone-Mechanik, 88vw × 88vh)
- Vollbild-Button mit Auto-Hide
- Download als `ideensynthese_TT-MM-JJJJ.html`

### Worker-Konfiguration (alle Modi)
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

## Zeichenlimit-Slider
- Bereich: 100–1000 Zeichen (vorher max. 500)
- Dreifarbig: Gelb `#c7d200` ≤ 500 · Türkis `#23b2c6` 501–800 · Rot `#ed6a69` 801–1000
- Farbe gilt für Slider-Thumb und Zahlanzeige gleichermassen
- Rein visuell (kein Einfluss auf Funktionalität) — signalisiert Token-Verbrauch

## Aktueller Stand
- Worker deployed: `https://feedback-auswertung.david-halser.workers.dev`
- `WORKER_URL` in `presenter.html` zeigt auf diese URL
- Session-Verlauf implementiert und live (Stufe 1 abgeschlossen)
- Alle drei KI-Modi (Mayring, SWOT, Ideensynthese) implementiert
- Zeichenlimit auf 1000 erhöht, Slider dreifarbig

## Offene Punkte
- Session-Eingabe ggf. von `oninput` auf `onchange` / Enter umstellen
  (verhindert vorzeitiges Auslösen bei langer Session-ID-Eingabe)

## Deployment
- **Frontend:** Push ins Repo → GitHub Pages (automatisch).
- **Cloudflare Worker:** Code aus `worker.js` ins Dashboard kopieren →
  Save and Deploy. Secret `ANTHROPIC_API_KEY` in Settings → Variables.
- **Supabase:** wird separat verwaltet. David deployt selbst.
