# PHGR Wortwolke

Echtzeit-Wortwolke für Weiterbildungen und Workshops.  
Präsenter-Laptop und Teilnehmer-Smartphones kommunizieren via Supabase.

---

## Dateien

| Datei | Zweck |
|---|---|
| `config.js` | Supabase-Zugangsdaten & Basis-URL (einmal anpassen) |
| `presenter.html` | Präsenter-Ansicht (Laptop/Beamer) |
| `join.html` | Teilnehmer-Ansicht (Smartphone via QR-Code) |
| `setup.sql` | Supabase-Tabelle anlegen (einmalig im SQL-Editor) |

---

## Einmaliges Setup (ca. 15 Minuten)

### 1. Supabase-Tabelle erstellen

Im Supabase-Dashboard → **SQL Editor** → Inhalt von `setup.sql` einfügen → **Run**.

### 2. GitHub-Repository anlegen

```
Neues Repo erstellen (z.B. "phgr-wordcloud") oder Subfolder in bestehendem Repo.
Diese vier Dateien hineinlegen.
Settings → Pages → Source: main / root → Save.
```

GitHub Pages URL merken: `https://DEIN-USERNAME.github.io/phgr-wordcloud`

### 3. `config.js` anpassen

```js
const SUPABASE_URL  = 'https://DEIN-PROJEKT.supabase.co';
const SUPABASE_ANON = 'eyJ...';   // Anon-Key (öffentlich sicher)
const BASE_URL      = 'https://DEIN-USERNAME.github.io/phgr-wordcloud';
```

Supabase-URL und Anon-Key: Dashboard → **Settings → API**.

---

## Nutzung in der Weiterbildung

### Präsenter
1. `presenter.html` öffnen (Vollbild: F11)
2. **Session-ID** eingeben (z.B. `cas-2026-03-ilanz`)
3. **Stichwörter pro Person** wählen (1–5)
4. QR-Code erscheint automatisch → auf Beamer projizieren

### Teilnehmende
1. QR-Code scannen
2. Begriff(e) eingeben → Abschicken
3. Wortwolke beim Präsenter wächst in Echtzeit

### Neue Session (nächste Weiterbildung)
Einfach eine neue Session-ID eingeben → leere Wolke, frischer Start.  
Altes Datenmaterial bleibt in Supabase (ggf. über Dashboard löschen).

---

## Sicherheitshinweis

Der Supabase **Anon-Key** ist für Client-Seiten-Verwendung gedacht und darf öffentlich in `config.js` stehen. Er hat nur die Rechte, die in den RLS-Policies definiert sind (Insert, Select, Delete auf `wordcloud_submissions`). Kein Zugriff auf andere Tabellen.

---

## Troubleshooting

| Problem | Lösung |
|---|---|
| QR-Code erscheint nicht | Session-ID in `presenter.html` eingeben |
| Teilnehmer sehen Fehler | Supabase RLS-Policies prüfen (`setup.sql` nochmal ausführen) |
| Wolke aktualisiert sich nicht | Browser-Console prüfen; Supabase-URL in `config.js` korrekt? |
| CORS-Fehler | In Supabase unter **Settings → API → Allowed Origins** GitHub-Pages-URL eintragen |
