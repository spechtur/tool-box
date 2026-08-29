# PHGR Fotowand

Teilnehmende fotografieren unterwegs mit dem Smartphone — die Bilder fügen sich live
auf einem Beamer-Canvas zu einer wachsenden Sammlung, die im Lernraum gemeinsam
sortiert, gruppiert und ausgewertet wird.

**Live:** [spechtur.github.io/tool-box/fotowand/presenter.html](https://spechtur.github.io/tool-box/fotowand/presenter.html)

---

## Wie es funktioniert

```
Präsenter (Laptop/Beamer)          Teilnehmende (Smartphone)
presenter.html                     join.html
      │                                  │
      └──── Supabase (tool-box) ─────────┘
        Tabellen + Storage-Bucket
```

1. Präsenter öffnet `presenter.html`, gibt eine Session-ID und die Aufgabenstellung ein
2. QR-Code erscheint automatisch → auf den Beamer projizieren
3. Teilnehmende scannen, fotografieren, beschreiben kurz, schicken ab
4. Die Fotos erscheinen live auf der Wand — die Auswertung passiert in vier Ansichten

Das Werkzeug ist bewusst **inhaltlich leer**: Die Aufgabenstellung ist ein freies
Textfeld, die Rubriken werden pro Session selbst definiert. Damit taugt es für den
CityWalk genauso wie für Exkursionen, Schulhausanalysen, Sprachunterricht oder
Architekturbetrachtungen.

---

## Die vier Ansichten

| Reiter | Wozu |
|---|---|
| 🧱 **Wand** | Upload-Reihenfolge, neueste zuerst. Die Sammlung wächst sichtbar, während die Gruppen noch unterwegs sind. |
| 📌 **Pinnwand** | Freies Anordnen wie auf einem Miro-Board: ziehen, vergrössern, clustern. **Mehrere Anordnungen** derselben Sammlung nebeneinander — Gruppe A, Gruppe B, Plenum — jederzeit umschaltbar. |
| 🗂️ **Rubriken** | Dieselben Fotos, gruppiert nach den selbst definierten Rubriken. |
| 🗺️ **Karte** | Folgt in der zweiten Runde. Die Koordinaten werden bereits gesammelt. |

Pinnwand und Rubriken ergänzen sich didaktisch: Die Pinnwand ist das *induktive*
Sortieren — Gruppen bilden, bevor man weiss, wie sie heissen. Die Rubrikenansicht
ist das *deduktive* Einordnen in ein Raster, das schon feststeht.

---

## Dateien

| Datei | Zweck |
|---|---|
| `presenter.html` | Beamer: Aufgabenstellung, vier Ansichten, QR-Code, Rubriken, Download, Reset |
| `join.html` | Smartphone: Aufgabe lesen, fotografieren, beschreiben, absenden |
| `config.js` | Supabase-Zugang, Basis-URL, Bucket-Name |
| `setup.sql` | Tabellen und Zugriffsregeln (einmalig) |

---

## Einrichtung (einmalig)

### 1. Tabellen anlegen

Im Supabase-Dashboard des Projekts `tool-box`: **SQL Editor → New query**,
den Inhalt von `setup.sql` einfügen, **Run**. Legt vier Tabellen an
(`fotowand_sessions`, `fotowand_beitraege`, `fotowand_anordnungen`,
`fotowand_positionen`) und die zugehörigen Zugriffsregeln. Der Durchlauf ist
wiederholbar, ohne Schaden anzurichten.

### 2. Storage-Bucket anlegen

Das ist der eine Schritt, den SQL nicht erledigen kann — er wird im Dashboard geklickt:

1. Links **Storage** → **New bucket**
2. Name: **`fotowand`** (genau so, kleingeschrieben — steht so in `config.js`)
3. Schalter **Public bucket** → **an**
4. **Save**

### 3. Hochladen erlauben

Ein öffentlicher Bucket ist *lesbar*, aber noch nicht *beschreibbar*. Damit die
Handys hochladen dürfen:

1. **Storage → Policies** → beim Bucket `fotowand` auf **New policy**
2. **For full customization** wählen
3. Name: `fw_upload`, Operation: **INSERT** ankreuzen
4. Target roles: `anon` und `authenticated`
5. Policy definition: `bucket_id = 'fotowand'`
6. **Save**

Dasselbe ein zweites Mal für **DELETE** (Name `fw_delete`) — damit
«Session zurücksetzen» die Bilddateien wirklich löscht und der Speicherplatz
wieder frei wird.

> **Prüfen:** `join.html` mit einer Test-Session öffnen und ein Foto abschicken.
> Kommt die Meldung «Der Speicherort ist noch nicht eingerichtet», fehlt der
> Bucket oder die INSERT-Regel.

---

## Bedienung

### Vor der Veranstaltung
- `presenter.html` öffnen, Session-ID vergeben (z.B. `citywalk-2026-09`)
- Aufgabenstellung eintippen — sie erscheint über der Wand **und** auf jedem Handy
- Rubriken anlegen, falls sie vorab feststehen sollen (optional)

### Während des Sammelns
- Reiter **Wand** auf den Beamer, QR-Code gross einblenden (Klick auf den Code)
- Unpassende Beiträge über 🚫 ausblenden — sie bleiben erhalten, verschwinden aber
  von der Wand

### In der Auswertung
- **Pinnwand:** Fotos aus der Ablage am linken Rand aufs Brett ziehen und clustern.
  Ziehen am leeren Grund verschiebt die Fläche, das Mausrad zoomt, «Alles zeigen»
  passt ein. Der Griff unten rechts an einer Karte vergrössert sie. Ein kurzer Klick
  ohne Ziehen blendet das Foto gross ein.
- **Mehrere Anordnungen:** «+ Neu» startet ein leeres Brett mit derselben Sammlung,
  «⧉ Kopie» dupliziert die aktuelle Anordnung zum Weiterarbeiten. Die Chips oben
  springen zwischen den Anordnungen hin und her.
- **Rubriken:** in der Seitenleiste anlegen — auch erst dann, wenn die Wand schon
  voll ist. Die Zuordnung passiert über das Auswahlfeld an jeder Karte und ist
  jederzeit änderbar. Umbenennen verliert keine Zuordnung, weil intern eine stabile
  ID gespeichert wird.

### Nach der Veranstaltung
- **↓ Alle Fotos + CSV (ZIP)** herunterladen — die CSV verknüpft über den Dateinamen
  Beschreibung, Kommentar, Rubrik, Name, Koordinaten und Zeitpunkt
- **↺ Session zurücksetzen** löscht die Fotos endgültig, auch aus dem Speicher.
  Aufgabenstellung, Rubriken und Anordnungen bleiben stehen.

---

## Technische Notizen

- **Bildgrösse:** Fotos werden **auf dem Handy** vor dem Upload auf 1600 px
  verkleinert und als JPEG ausgegeben (~250 KB statt 3–12 MB). Das macht den Upload
  über Mobilfunk erträglich und löst das HEIC-Problem gleich mit, weil das Canvas
  immer JPEG ausgibt.
- **Bilddrehung:** über `createImageBitmap(file, { imageOrientation: 'from-image' })`,
  damit Hochformat-Fotos nicht quer liegen.
- **GPS:** wird aus den EXIF-Daten der Originaldatei gelesen, *bevor* verkleinert
  wird — beim Verkleinern über das Canvas gehen alle EXIF-Daten verloren. Fehlen die
  Koordinaten (iOS entfernt sie beim Teilen, oder die Ortung war aus), bietet die
  Seite einen abweisbaren Knopf für `navigator.geolocation` an. Fotos ohne
  Koordinaten verschwinden nie, sie erscheinen später in einer Randleiste.
- **Kamera:** `<input type="file" capture="environment">` — das Betriebssystem öffnet
  seine eigene Kamera-App, die Seite sieht nie ein Live-Bild. Deshalb gibt es keine
  Berechtigungsabfrage.
- **ZIP ohne Bibliothek:** Store-Modus, im Werkzeug selbst geschrieben. JPEGs liessen
  sich ohnehin nicht sinnvoll komprimieren.
- **Abhängigkeiten:** `supabase-js` per CDN und der QR-Dienst `api.qrserver.com` —
  dieselben zwei wie in den übrigen Tools der tool-box.
- **Speicherplatz:** Supabase Free bietet 1 GB, bei ~250 KB pro Foto also rund
  4'000 Bilder. Alte Sessions gelegentlich herunterladen und leeren.

---

## Datenschutz

Ein offener QR-Code ist ein offenes Scheunentor — die Moderationsfunktion
(Beitrag ausblenden) ist deshalb von Anfang an eingebaut. Empfohlene Praxis:

- ein Satz in der Aufgabenstellung: «Bitte keine erkennbaren Personen fotografieren»
- die Sammlung nach der Auswertung herunterladen und die Session zurücksetzen
- die Namensangabe ist und bleibt freiwillig
