# CLAUDE.md — Fotowand (PHGR tool-box)

## Status

**Code steht, im Feld noch ungetestet.** Alle fünf Dateien sind geschrieben
(29.08.2026). Was fehlt, ist zweierlei: der Storage-Bucket im Supabase-Dashboard
(siehe unten, das ist Davids Schritt) und der ernsthafte Praxistest am echten
iPhone über Mobilfunk. Bis dahin gilt: Verkleinerung, HEIC-Umwandlung und
EXIF-Drehung sind nach Lehrbuch gebaut, aber **nicht am Gerät bewiesen**.

*Nachtrag 29.08.2026, erster Feldtest am iPhone:* Upload, Verkleinerung und
Bilddrehung funktionieren. Zum Standort siehe «Offene Punkte».

Belegt sind dagegen die zwei Teile, die sich am Schreibtisch prüfen liessen:
der selbst geschriebene ZIP-Schreiber (CRC und UTF-8-Dateinamen gegen `unzip`
und Pythons `zipfile` geprüft) und der EXIF-GPS-Parser (gegen ein von Hand
gebautes Test-JPEG: 46°51'36" N / 9°31'48" E korrekt als 46.86 / 9.53 gelesen,
und sauberes `null` bei JPEG ohne EXIF sowie bei PNG).

---

## Worum es geht

Ein Werkzeug, mit dem Teilnehmende unterwegs mit dem Smartphone Fotos hochladen,
die sich live auf einem Beamer-Canvas zu einer wachsenden Sammlung fügen.

**Didaktischer Ursprung:** Zum Auftakt der Blocktage «BNE — Bildung für
nachhaltige Entwicklung» gehen Studierende auf einen CityWalk und fotografieren
mit wachen Augen Elemente im Stadtraum, die mit BNE zu tun haben. Bisher wurden
die Fotos analog zurück in den Lernraum gebracht und dort von Hand auf ein
Miro-Board übertragen. Genau dieser Medienbruch fällt weg.

**Bewusst neutral gehalten.** Das Tool heisst *Fotowand*, nicht *CityWalk*, und
kennt keinen BNE-Begriff im Code. Die Aufgabenstellung ist ein freies Textfeld,
die Kategorien sind frei definierbar. Damit taugt es genauso für Exkursionen,
Schulhausanalysen, Sprachunterricht oder Architekturbetrachtungen. Die
Spezialisierung passiert zur Laufzeit durch die Lehrperson, nicht im Quelltext.

---

## Einordnung in die tool-box

Neues Unterverzeichnis `fotowand/` nach dem etablierten Muster:

| Datei | Zweck |
|---|---|
| `presenter.html` | Beamer: Aufgabenstellung als Header, Fotowand, QR-Code, Download, Reset |
| `join.html` | Smartphone: Aufgabe lesen, fotografieren, beschreiben, absenden |
| `config.js` | Supabase-Zugang aus `wordcloud/`, mit eigener `BASE_URL` und dem Bucket-Namen |
| `setup.sql` | vier Tabellen, Zugriffsregeln; die Bucket-Anleitung steht in der `README.md` |
| `README.md` | nach dem Muster von `wordcloud/README.md` |

**Vorbilder:**
- **`wordcloud/`** liefert das strukturelle Gerüst — Session-ID eingeben, QR-Code,
  Live-Aktualisierung, CSV-Export, Session zurücksetzen. Das Ablaufmodell ist
  praktisch identisch, nur steht statt eines Stichworts ein Foto.
- **`feedback/`** liefert die Darstellung — Kachel-Raster, Fokus-Overlay
  (88vw × 88vh) zum Grosseinblenden per Klick, «hidden»-Mechanik zum Ausblenden
  einzelner Beiträge, Session-Verlauf im localStorage. Erweitert um das
  Durchblättern: Das Overlay hält eine Reihenfolge, die der jeweiligen Ansicht
  folgt — man blättert durch das, was man vor sich sieht, nicht durch eine
  abstrakte Datenbankreihenfolge.

**Kein Cloudflare Worker, keine Anthropic-API, keine KI-Auswertung.** Das Tool
sammelt und zeigt, es interpretiert nicht. Damit entfällt die gesamte
Worker-Infrastruktur des Feedback-Tools.

Nach Fertigstellung: Kachel in der `index.html` der tool-box ergänzen.

---

## Die vier Ansichten

Der Presenter-Canvas zeigt dieselbe Sammlung wahlweise in vier Anordnungen,
umschaltbar per Reiter. Das ist das didaktische Herzstück, weil es den
Auswertungsprozess im Lernraum in Etappen gliedert:

1. **Wand** — Masonry-Raster in Upload-Reihenfolge, neueste zuerst. Die Sammlung
   wächst sichtbar, während die Gruppen noch unterwegs sind. Das ist der Auftakt.
2. **Pinnwand** — freies Anordnen ohne Raster, wie auf einem Miro-Board: ziehen,
   vergrössern, clustern. Das ist das *induktive* Sortieren — Gruppen bilden,
   bevor man weiss, wie sie heissen.
3. **Rubriken** — dieselben Fotos, gruppiert nach den Kategorien der Session.
   Das ist das *deduktive* Einordnen in ein Raster, das schon feststeht.
4. **Karte** — dieselben Fotos, verortet im Stadtraum, als runde Miniaturen mit
   der Rubrikenfarbe als Ring. Zeigt, welche Ecken abgelaufen wurden und wo sich
   Funde häufen. Leaflet wird erst beim Öffnen des Reiters geladen; fällt es aus,
   bleiben die anderen drei Ansichten unberührt.

Pinnwand und Rubriken sind keine Doppelung, sondern die zwei Richtungen desselben
Vorgangs. Der Ablauf über alle vier: sammeln → frei clustern → benennen → verorten.

---

## Die Pinnwand — mehrere Anordnungen

**Positionen liegen in der Datenbank, nicht im Browser.** Läge die Anordnung nur
im Speicher, wäre sie beim Beamer-Neustart oder einem Reload weg — mitten in der
Lektion.

**Mehrere Anordnungen derselben Sammlung** stehen nebeneinander: «Cluster Gruppe
A», «Cluster Gruppe B», «Plenum». Die Chips in der Werkzeugleiste springen
zwischen ihnen hin und her, «⧉ Kopie» dupliziert eine Anordnung samt Positionen
zum Weiterarbeiten. Deshalb hängen die Koordinaten **nicht am Beitrag**, sondern
in einer eigenen Tabelle an der Kombination (Anordnung, Beitrag).

Weitere Entscheidungen, die im Code stecken:

- **Gedachte Fläche statt Bildschirmpixel.** Gerechnet wird auf 4200 × 2600
  Einheiten, die beim Anzeigen transformiert werden — sonst verrutschte alles,
  sobald dasselbe Brett am Beamer statt am Laptop läuft. Ziehen auf leerem Grund
  verschiebt, das Mausrad zoomt.
- **Neue Fotos drängen sich nicht ins Bild.** Wer noch unterwegs ist, lädt weiter
  hoch, während im Lernraum schon sortiert wird. Ein Beitrag ohne gespeicherte
  Position landet in der **Ablage** am linken Rand — sichtbar, aber ausserhalb
  der entstehenden Ordnung. Erst beim Hineinziehen bekommt er Koordinaten.
- **Ziehen und Vergrössern kommen sich nicht in die Quere.** Unter vier Pixel
  Bewegung gilt als Klick und öffnet das Fokus-Overlay, darüber ist es ein Zug.
  Umgesetzt mit Pointer-Events, damit Maus und Touchscreen denselben Pfad nehmen.
- **Das Polling zieht nicht unter der Hand weg.** Während gezogen wird, pausiert
  die Live-Aktualisierung; geschrieben wird erst beim Loslassen.
- **Textbausteine zuschaltbar.** Beim Clustern will man oft nur Bilder sehen,
  beim Präsentieren die Worte dazu.

**Bewusst nicht gebaut:** frei platzierbare Textzettel und gezeichnete
Cluster-Rahmen. Wenn sich zeigt, dass die Gruppen einen Namen an der Wand
brauchen, ist die naheliegende Erweiterung nicht ein Textzettel, sondern der
Schritt von der Pinnwand in die Rubrikenansicht: Cluster markieren, Rubrik daraus
machen. Das Datenmodell ist dafür offen.

---

## Kategorien — flexibel und nachträglich

**Das ist die zentrale Anforderung und der Punkt, an dem das Datenmodell
sorgfältig sein muss.**

Die Rubriken werden pro Session frei definiert. Raster, die im BNE-Kontext
naheliegen, sind etwa die drei Nachhaltigkeitsdimensionen aus dem **Lehrplan 21**,
die Themenfelder von **éducation21** oder die **17 SDGs** der Agenda 2030.

*(Entschieden am 29.08.2026: Diese Listen werden **nicht** als Vorlagen im Code
hinterlegt. Das Werkzeug soll in ganz unterschiedlichen Kontexten taugen — wer
ein Raster braucht, tippt es ein. Die technische Möglichkeit genügt, hinterlegte
Inhalte würden das Tool heimlich auf ein Fach festlegen.)*

Entscheidend sind zwei Betriebsarten, die beide funktionieren müssen:

**Vorher festgelegt.** Die Lehrperson definiert die Rubriken beim Anlegen der
Session. Auf dem Handy erscheint dann in der Upload-Maske eine optionale
Auswahl — als Toggle-Gruppe gestaltet, ähnlich wie das Namensfeld im
Feedback-Tool: sichtbar, aber nicht erzwungen. Die Teilnehmenden ordnen ihr Foto
gleich beim Hochladen zu.

**Nachträglich erarbeitet.** Genauso muss der Fall funktionieren, dass zuerst
gesammelt und *danach* — gemeinsam mit den Studierenden im Lernraum — überlegt
wird, welche Ordnung überhaupt sinnvoll ist. Die Rubriken entstehen also erst,
wenn die Wand schon voll ist, und die bereits vorhandenen Fotos werden ihnen
anschliessend zugewiesen. Didaktisch ist das oft der stärkere Weg: Die
Kategorienbildung wird selbst zum Lerngegenstand.

**Konsequenzen fürs Datenmodell:**
- Kategorien sind **kein fixes Enum**, sondern Daten an der Session.
- Jede Kategorie hat eine **stabile ID** neben ihrem Anzeigetext. Wird eine
  Rubrik später umbenannt, verlieren die zugeordneten Fotos ihre Zuordnung nicht.
- Die Zuordnung eines Beitrags ist **jederzeit änderbar und darf leer sein**.
  Nicht zugeordnete Fotos landen in der Kategorienansicht in einem Feld
  «Noch nicht zugeordnet».
- Der Presenter braucht eine **Zuordnen-Oberfläche**: Rubriken anlegen,
  umbenennen, löschen — und vorhandene Fotos zuweisen (per Klick oder
  Drag-and-Drop; die schlichtere Variante zuerst bauen).

---

## Datenmodell (Entwurf)

**`fotowand_sessions`**
| Feld | Zweck |
|---|---|
| `session_id` | frei wählbar, z.B. `bne-blocktage-2026-09` — neue ID = frische Sammlung |
| `titel` | frei gestaltet, z.B. «CityWalk BNE»; steht gross auf dem Handy. Nachgerüstet am 29.08.2026, weil ein technischer Schlüssel kein guter Titel ist |
| `aufgabenstellung` | Freitext; erscheint als Canvas-Header **und** auf dem Handy unter dem Titel, etwas kleiner — sie darf lang werden |
| `kategorien` | JSON-Liste aus `{ id, label, farbe }`; leer erlaubt |
| `optionen` | JSON-Schalter für die Handy-Ansicht, z.B. `{ ort, kamera }`. Bewusst **eine** JSON-Spalte statt einer Spalte je Schalter — künftige Optionen brauchen dann keine Wanderung in Supabase mehr |
| `erstellt` | Zeitstempel |

**`fotowand_beitraege`**
| Feld | Zweck |
|---|---|
| `session_id` | Verweis auf die Session |
| `bild_url` | öffentliche URL aus dem Storage-Bucket |
| `beschreibung` | Kurztext: was ist zu sehen |
| `kommentar` | Freitext: was hat das mit der Aufgabe zu tun |
| `kategorie_id` | nullable, nachträglich änderbar |
| `lat` / `lon` | nullable, für die Kartenansicht |
| `autor` | nullable, optionale Angabe von Name oder Gruppe |
| `versteckt` | Moderation: ausgeblendet statt gelöscht |
| `erstellt` | Zeitstempel, bestimmt die Reihenfolge in Ansicht 1 |

**`fotowand_anordnungen`**
| Feld | Zweck |
|---|---|
| `id` | UUID, Verweisziel der Positionen |
| `session_id` | Verweis auf die Session |
| `name` | frei benannt, z.B. «Cluster Gruppe A» |
| `reihenfolge` | Sortierung der Reiter |

**`fotowand_positionen`**
| Feld | Zweck |
|---|---|
| `anordnung_id` + `beitrag_id` | zusammengesetzter Schlüssel |
| `pos_x` / `pos_y` | Koordinaten auf der gedachten Fläche |
| `z` | Stapelreihenfolge |
| `skalierung` | Faktor 0.35–3, ein wichtiges Bild darf grösser sein |

Kein Eintrag = das Foto liegt in dieser Anordnung noch in der Ablage.

Dazu ein **Storage-Bucket** für die Bilddateien, öffentlich lesbar, anonym
beschreibbar.

---

## Technische Knackpunkte

Alle lösbar, aber sie müssen von Beginn an eingeplant sein.

**Kamerazugriff — unkritisch.** Zwei Buttons genügen:
`<input type="file" accept="image/*" capture="environment">` springt direkt in
die Kamera, dasselbe ohne `capture` und mit `multiple` öffnet die Mediathek.
Es gibt **keine Berechtigungsabfrage**, weil die Seite die Kamera nie sieht —
das Betriebssystem öffnet seine eigene App und liefert nur die ausgewählte Datei
zurück. Ein Live-Kamerabild in der Seite (`getUserMedia`) wäre etwas völlig
anderes und wird bewusst nicht gebaut.

**Bildgrösse und HEIC — der wichtigste Punkt.** iPhone-Fotos sind 3–12 MB gross
und liegen im HEIC-Format vor, mit dem kein Browser-Canvas direkt umgehen mag.
Am Mobilfunknetz wäre das quälend. Lösung: Das Bild wird **auf dem Handy vor dem
Upload** auf etwa 1600 px verkleinert und als JPEG ausgegeben (~250 KB). Die
Konvertierung über das Canvas erledigt das HEIC-Problem gleich mit. Upload dauert
dann ein bis zwei Sekunden statt vierzig.

**Bilddrehung.** Handyfotos tragen ihre Ausrichtung in den EXIF-Daten. Naiv
verarbeitet liegen später alle quer. Beim Verkleinern mit
`createImageBitmap(file, { imageOrientation: 'from-image' })` auslesen.

**GPS — hier ist Ehrlichkeit nötig.** Die Koordinaten stecken in den EXIF-Daten
des Fotos (nicht XML, sondern EXIF). Zwei Fallstricke:
1. **Beim Verkleinern über das Canvas gehen sämtliche EXIF-Daten verloren.** Die
   Koordinaten müssen deshalb *aus der Originaldatei ausgelesen werden, bevor*
   verkleinert wird.
2. **Sie sind nicht garantiert vorhanden.** iOS kann Ortsdaten beim Teilen
   entfernen, Nutzende können Standortdienste für die Kamera abgeschaltet haben.
   Fallback wäre `navigator.geolocation` beim Absenden — das löst dann allerdings
   doch eine Berechtigungsabfrage aus und ist in Häuserschluchten ungenau.

Empfehlung: EXIF-Auslesen als Hauptweg, `navigator.geolocation` optional und
abweisbar als Ergänzung. Fotos ohne Koordinaten erscheinen in der Kartenansicht
in einer Randleiste «ohne Ortsangabe» — sie verschwinden nicht.

**ZIP-Download ohne Bibliothek.** Der Download-Button liefert alle Bilder plus
eine CSV mit Beschreibung, Kommentar, Kategorie und Zeitstempel, über die
Dateinamen verknüpft. Ein ZIP im Store-Modus (ohne Kompression) lässt sich in
überschaubarem Code selbst erzeugen — das hält die Konvention «keine
Abhängigkeiten» ein, und JPEGs liessen sich ohnehin nicht komprimieren.

**HTTPS.** Über GitHub Pages ohnehin gegeben. Wichtig ist nur zu wissen, warum
ein lokaler Server im Hochschul-WLAN keine Alternative gewesen wäre.

**Missbrauch.** Ein offener QR-Code ist ein offenes Scheunentor. Die
Moderationsfunktion (Beitrag ausblenden) gehört von Anfang an eingebaut — der
Löschknopf soll da sein, bevor man ihn braucht.

**Speicherplatz.** Supabase Free bietet 1 GB. Bei ~250 KB pro Foto sind das rund
4'000 Bilder. Ausreichend auf Jahre, sofern alte Sessions gelegentlich
heruntergeladen und geleert werden.

---

## Supabase — der eine Übergabepunkt

Das Supabase-Projekt `tool-box` besteht bereits und wird von David selbst
verwaltet. Neu für dieses Tool ist **Storage** — das haben die bisherigen Tools
nicht gebraucht.

Zu erledigen (von David, im Dashboard):
1. `setup.sql` im SQL-Editor ausführen (wird geliefert) — legt die beiden
   Tabellen und die Zugriffsregeln an.
2. **Storage-Bucket anlegen** — das ist ein Klick im Dashboard, den SQL nicht
   erledigen kann. Öffentlich lesbar, anonymes Hochladen erlaubt. Anleitung wird
   Schritt für Schritt geliefert.

**Dieser Schritt blockiert:** Solange der Bucket nicht steht, lässt sich der
Upload nicht testen.

Die GitHub Action `.github/workflows/supabase-keepalive.yml` pingt das Projekt
alle fünf Tage an, damit der Free-Tier nicht pausiert — davon profitiert das
neue Tool automatisch mit.

---

## Stand der Arbeit

1. ✅ **Gerüst** — `config.js` aus `wordcloud/` übernommen, `BASE_URL` angepasst,
   Bucket-Name ergänzt.
2. ✅ **`setup.sql`** — vier Tabellen und Zugriffsregeln. Bucket-Anleitung steht
   in der `README.md`, Abschnitt «Einrichtung».
3. ✅ **`join.html`** — Aufgabenstellung, zwei Buttons, Vorschau, Beschreibung,
   Kommentar, Rubriken-Toggles, optionaler Name; dahinter Verkleinerung,
   EXIF-Drehung, GPS-Auslesen, Upload, «Noch ein Foto».
4. ✅ **`presenter.html`** — Session, Aufgabenstellung, QR-Code, die vier Reiter,
   Fokus-Overlay, Rubriken verwalten und zuweisen, mehrere Anordnungen,
   Moderation, ZIP-Download, Session zurücksetzen, Session-Verlauf.
5. ⬜ **Bucket anlegen** — Davids Schritt im Dashboard. *(blockiert 6.)*
6. ⬜ **Praxistest** — und zwar ernsthaft: echtes iPhone, echtes HEIC-Foto, über
   Mobilfunk statt WLAN. Erst dann ist die Verkleinerung bewiesen.
7. ✅ **Kartenansicht** mit Leaflet, plus zwei Schalter «Auf dem Handy»
   (Standorterfassung, direkter Kamerazugriff).

`README.md` und die Kachel in der `index.html` der tool-box sind ergänzt.

---

## Offene Punkte

- **Keine Kategorien-Vorlagen im Code.** Entschieden am 29.08.2026: Lehrplan 21,
  éducation21 und die SDGs werden *nicht* hinterlegt. Das Werkzeug bleibt
  inhaltlich leer, die Rubriken entstehen zur Laufzeit. Wer ein Raster braucht,
  tippt es ein — die technische Möglichkeit genügt.
- **Kartenbibliothek — entschieden am 29.08.2026.** Leaflet per CDN, als bewusste
  Ausnahme; die Regel war ohnehin schon eine «zwei Abhängigkeiten»-Regel, weil
  alle Tools `supabase-js` per CDN laden und die Wortwolke zusätzlich
  `api.qrserver.com`. Entschärft dadurch, dass Leaflet erst beim Öffnen des
  Reiters geholt wird: Fällt das CDN aus, verliert man die Karte, nicht das Tool.
  Kacheln direkt von OpenStreetMap, im Browser per CSS-Filter entsättigt, damit
  die Fotos wirken. **Nicht CARTO:** deren freier «Positron»-Stil verlangt seit
  2026 einen API-Schlüssel und legt sonst «API KEY REQUIRED» über die Karte.
- **Ungetestet am Gerät:** ob Safari auf dem iPhone `createImageBitmap` mit
  `imageOrientation: 'from-image'` unterstützt. Der Code fällt sonst auf den
  Aufruf ohne Option zurück, bei dem Safari die EXIF-Drehung nach eigener
  Rechnung anwendet — das kann stimmen, muss aber gesehen werden.
- **Datenschutz-Schalter.** «Standort erfassen» aus heisst: Es wird gar nicht
  erst im Foto nachgesehen und nichts gespeichert — nicht bloss nichts angezeigt.
  «Kamera direkt öffnen» aus erzwingt den Umweg über die Mediathek, und genau
  dieser Umweg ist der einzige, bei dem Ortsangaben mitkommen. Die zwei Schalter
  ziehen also in entgegengesetzte Richtungen und gehören bewusst gesetzt.
- **GPS — am Gerät geklärt (29.08.2026).** Ein frisch über den Kamera-Knopf
  aufgenommenes Foto kommt **ohne** Koordinaten an: Es landet nicht in der
  Mediathek, und Safari hat keine Ortungsberechtigung, also stehen im EXIF keine
  GPS-Daten. Das EXIF-Lesen bleibt damit für *mitgebrachte* Bilder zuständig;
  für frisch geschossene ist `navigator.geolocation` der reguläre Weg, nicht die
  Ausnahme. Der Standort-Knopf steht deshalb als eigene, erklärte Karte im
  Formular statt als kleine Randnotiz.
- **Bilddrehung: erledigt.** Am iPhone geprüft, die Fotos stehen richtig herum.
- **Datenschutz-Hinweis.** Ein Satz in der Aufgabenstellungs-Vorlage
  («keine erkennbaren Personen fotografieren») sowie eine bewusste Praxis, die
  Sammlung nach der Auswertung herunterzuladen und zu leeren. Das ist
  Hochschulpolitik, keine Technik — die Löschfunktion ist eingebaut.
- **Zuweisungs-Oberfläche.** Erst per Klick, Drag-and-Drop allenfalls später.

---

## Konventionen

Es gelten die Konventionen der tool-box, ausführlich dokumentiert in
`../feedback/CLAUDE.md`. Die für dieses Tool wesentlichen:

- **Eine Datei je Ansicht, keine Abhängigkeiten.** Portable Single-File-HTML,
  kein Framework, kein npm, kein Build-Schritt. Ausnahmen werden besprochen
  (siehe Kartenbibliothek).
- **UI durchgehend auf Deutsch** (Schweizer Hochschulkontext, «ss» statt «ß»).
- **PHGR Corporate Identity:** Gelb `#c7d200`, Türkis `#23b2c6`, Rot `#ed6a69`,
  Orange `#fbb900`, Violett `#6169af`, Dunkel `#3a3a3a`.
  Typografie: DejaVu Sans / Trebuchet MS / Verdana.
- **Geheimnisse nie ins Repo.** Der Supabase-Anon-Key in `config.js` ist
  öffentlich unbedenklich — der Schutz liegt in den Zugriffsregeln.
- **Erst der Plan, dann der Code.** David gibt Idee, Didaktik und Ästhetik vor;
  vor grösseren Änderungen den Lösungsweg beschreiben und sein Okay abwarten.
- **Ehrlichkeit vor Halluzination.** Ungetestetes offen als solches benennen.
