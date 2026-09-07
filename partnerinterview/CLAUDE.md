# CLAUDE.md – Digitales Partnerinterview-Tool

> Projektgedächtnis für Claude Code
> Letzte Aktualisierung: 2026-09-07

---

## Projektüberblick

Generisches Partnerinterview-Tool für PHGR-Weiterbildungen: TN wählen aus einem vorbereiteten
Fragensatz (per QR-Link geladen) die gewünschten Fragen aus, führen zeitgesteuerte Interviews
in wechselnden Rollen durch und geben sich abschliessend eine ressourcenorientierte Rückmeldung.
Der Fragensatz-Inhalt ist austauschbar – das Tool selbst bleibt kontextneutral und
wiederverwendbar für andere Einsatzszenarien.

---

## Tech-Stack

- **Frontend:** Vanilla HTML/CSS/JS – zwei Seiten: `presenter.html` (Vorbereitung) und `join.html` (TN)
- **Backend:** keins – Fragensätze als statische JSON-Dateien in `saetze/` (Verzeichnis: `saetze/index.json`)
- **Übergabe an die TN:** Fragensatz steckt deflate-komprimiert im URL-Fragment (`join.html#d=…`);
  alternativ der kurze Weg über `join.html?set=slug` für Sätze, die im Repo liegen
- **Hosting:** GitHub Pages – Ordner `partnerinterview/` im Repo github.com/spechtur/tool-box
- **Deployment:** Push to main → automatisch live

---

## Datenmodell (Fragensatz-JSON)

Vorschlag für die Struktur eines Fragensatzes – dient als Ausgangspunkt für die Umsetzung:

```json
{
  "slug": "kultur-der-digitalitaet",
  "titel": "Ressourcen in einer Kultur der Digitalität",
  "timer_sekunden": 300,
  "fragen": [
    "Welches digitale Tool nutzt du bereits sicher im Unterricht?",
    "Welche analoge Ressource hilft dir, mit Unsicherheit umzugehen?"
  ]
}
```

David pflegt neue Fragensätze als eigene JSON-Datei im Repo, referenziert über den Slug
in der URL (z. B. `?set=kultur-der-digitalitaet`).

---

## Design-System

- PHGR-CI: Gelb `#c7d200`, Türkis `#23b2c6`, Rot `#ed6a69`, Orange `#fbb900`, Violett `#6169af`
- Apple-Glass-Stil: `backdrop-filter: blur(12px)`, `background: rgba(255,255,255,0.15)`
- Runde Ecken: `border-radius: 16px` (Cards), `8px` (Buttons)
- Typografie: System-Font-Stack, Weights 400/600/700
- Mobile-first: grosse Touch-Targets, Timer-Balken oben, restlicher Screen für Fragenliste

### Timer-Balken (Spezifikation)

- 16 px hoher Balken, direkt unter der PHGR-Zeile; beide zusammen `position: sticky` am oberen Rand
- Füllstand nimmt linear über die Zeit ab
- Farbverlauf: Grün → Gelb → Orange → Rot (z. B. an Restzeit-Prozent gekoppelt)
- Akustisches Signal beim Ablauf (kurzer, unaufdringlicher Ton)
- Bedienelemente: Start / Pause / Stopp / Restart – keine Zeiteingabe in der TN-Ansicht
- Dauer kommt aus dem Fragensatz-JSON (`timer_sekunden`)

### Glassmorphism-Muster (Referenz)

```css
.glass-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}
```

---

## Konventionen

- Alle Texte auf Deutsch (Du-Form für TN-Ansprache)
- Keine externen CDN-Abhängigkeiten wenn möglich (offline-tauglich)
- Kein Login, keine Nutzerkonten
- Kein Speichern von TN-Daten (Antworten, Notizen) über die Browser-Session hinaus
- Mobile-first, da TN während des Interviews mit dem Smartphone im Raum unterwegs sind

---

## Bekannte Einschränkungen

- v1 hat keine Bibliotheks-Übersichtsseite – Fragensätze werden nur über direkten Link/QR
  mit bekanntem Slug erreicht, von David vorbereitet
- Nach „Interview fixieren" stellt der Button „Neue Runde" die volle Liste wieder her (Rollentausch)
- Sehr lange Fragensätze ergeben einen dichten QR-Code; die Vorbereitung warnt ab 1800 Zeichen Linklänge
- Kein Notizfeld pro Frage in v1 – TN notieren ausserhalb des Tools
- Kein Upload-Interface für neue Fragensätze – David pflegt JSON-Dateien direkt im Repo

---

## Verwandte Tools im Repo

- Gruppenlos (Gruppengenerator) – Referenz für Struktur und mobile Bedienung
- Sokrates (Lernbegleiter) – Referenz für PHGR-CI-Umsetzung und Glass-Stil
