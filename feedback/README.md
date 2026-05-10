# PHGR Feedback-Tool

Echtzeit-Rückmeldungen für Weiterbildungen an der PHGR.  
Teilnehmende schreiben eine kurze Nachricht (max. 300 Zeichen) – du siehst sie live als Bubbles.

**Live:** [spechtur.github.io/tool-box/feedback/presenter.html](https://spechtur.github.io/tool-box/feedback/presenter.html)

---

## Unterschied zur Wortwolke

| Wortwolke | Feedback-Tool |
|---|---|
| 1–5 Stichwörter | 1 Freitext (300 Zeichen) |
| Aggregiert nach Häufigkeit | Jede Antwort einzeln sichtbar |
| Quantitativ | Qualitativ |

---

## Bedienung

### Vor der Weiterbildung
1. `presenter.html` öffnen
2. **Session-ID** eingeben (Standard: heutiges Datum)
3. **Leitfrage** eingeben – erscheint gross auf den Smartphones der TN
4. QR-Code erscheint → auf Beamer projizieren oder Klick zum Vergrössern

### Während der Weiterbildung
- Bubbles erscheinen live (Aktualisierung alle 2.5 Sekunden)
- **🚫-Symbol** beim Hovern über eine Bubble blendet sie aus (nicht gelöscht)
- Ausgeblendete Bubbles bleiben in der Datenbank erhalten

### Ansichten
| Modus | Funktion |
|---|---|
| **Live** | Alle Bubbles auf der Fläche, Echtzeit |
| **Gesamt** | Scrollbare Liste aller Antworten, mit Ausblenden/Einblenden |
| **Spotlight** | Eine Antwort nach der anderen, zufällige Reihenfolge, ← → navigieren |

### Export
**↓ CSV herunterladen** – Tabelle mit Datum, Uhrzeit, Name, Rückmeldung, Ausgeblendet-Status.  
Dateiname: `feedback-SESSION-DATUM.csv`

---

## Setup (einmalig)

### 1. Supabase-Tabelle anlegen
Im Supabase-Dashboard → **SQL Editor** → Inhalt von `setup.sql` ausführen.

### 2. `config.js` prüfen
Gleiche Supabase-URL und Anon-Key wie das Wortwolken-Tool.  
`BASE_URL` zeigt auf diesen Ordner: `https://spechtur.github.io/tool-box/feedback`

### 3. In GitHub Pages deployen
Ordner `feedback/` im `tool-box`-Repository, GitHub Pages bereits aktiv.

---

## Teil der PHGR tool-box
[spechtur.github.io/tool-box](https://spechtur.github.io/tool-box)
