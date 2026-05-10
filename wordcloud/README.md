# PHGR Wortwolke

Echtzeit-Wortwolke für Weiterbildungen und Workshops an der Pädagogischen Hochschule Graubünden.  
Teilnehmende scannen einen QR-Code, geben Stichwörter ein – die Wolke wächst live auf dem Beamer.

**Live:** [spechtur.github.io/tool-box/wordcloud/presenter.html](https://spechtur.github.io/tool-box/wordcloud/presenter.html)

---

## Wie es funktioniert

```
Präsenter (Laptop/Beamer)          Teilnehmende (Smartphone)
presenter.html                     join.html
      │                                  │
      └──────── Supabase (tool-box) ─────┘
                  Echtzeit-Sync
```

1. Präsenter öffnet `presenter.html`, gibt eine Session-ID ein
2. QR-Code erscheint automatisch → auf den Beamer projizieren
3. Teilnehmende scannen, geben 1–5 Stichwörter ein, schicken ab
4. Wortwolke wächst live, häufige Begriffe erscheinen grösser

---

## Dateien

| Datei | Zweck |
|---|---|
| `presenter.html` | Präsenter-Ansicht: Wortwolke, QR-Code, Statistik |
| `join.html` | Teilnehmer-Ansicht: Eingabeformular (Smartphone) |
| `config.js` | Supabase-Zugangsdaten & Basis-URL |
| `setup.sql` | Supabase-Tabelle anlegen (einmalig) |

---

## Bedienung

### Vor der Weiterbildung
- `presenter.html` öffnen
- **Session-ID** eingeben (z.B. `cas-bildung-2026-09`) → neue ID = frische, leere Wolke
- **Stichwörter pro Person** wählen (1–5)
- Seite in den Vollbildmodus (F11) und auf den Beamer projizieren

### Während der Weiterbildung
- QR-Code ist in der Sidebar sichtbar – auf Klick öffnet er sich gross zum Abscannen
- Teilnehmende besuchen die angezeigte URL oder scannen den QR-Code
- Wolke aktualisiert sich alle 2.5 Sekunden automatisch

### Auswertung
- **Gross ↗** – öffnet die scrollbare Rangliste aller Begriffe
- **↓ CSV** – lädt eine CSV-Datei herunter (`wortwolke-SESSION-DATUM.csv`) zur Archivierung
- **Session zurücksetzen** – löscht alle Beiträge der aktuellen Session

---

## Setup (einmalig, ca. 15 Minuten)

### 1. Supabase-Tabelle anlegen
Im [Supabase-Dashboard](https://supabase.com) → Projekt `tool-box` → **SQL Editor** → Inhalt von `setup.sql` einfügen → **Run**.

### 2. `config.js` anpassen
```js
const SUPABASE_URL  = 'https://DEIN-PROJEKT.supabase.co';
const SUPABASE_ANON = 'sb_publishable_...';
const BASE_URL      = 'https://DEIN-USERNAME.github.io/tool-box/wordcloud';
```
URL und Key: Supabase Dashboard → **Settings → API Keys**.

### 3. GitHub Pages aktivieren
Repository → **Settings → Pages** → Branch: `main`, Folder: `/ (root)` → **Save**.

---

## Neue Weiterbildung starten

Einfach eine neue **Session-ID** eingeben – keine weitere Konfiguration nötig.  
Alle Sessions bleiben in Supabase gespeichert und können dort eingesehen oder gelöscht werden.

---

## Technischer Stack

| Komponente | Technologie |
|---|---|
| Hosting | GitHub Pages (kostenlos) |
| Datenbank | Supabase (kostenlos, EU-Region) |
| QR-Code | api.qrserver.com |
| Frontend | Vanilla HTML/CSS/JS, kein Framework |

---

## Teil der PHGR tool-box

Dieses Tool ist Teil der [PHGR tool-box](https://spechtur.github.io/tool-box) –  
einer Sammlung kleiner Web-Werkzeuge für Lehre und Weiterbildung.
