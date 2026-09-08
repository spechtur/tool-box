# REQUIREMENTS – Digitales Partnerinterview-Tool

> Erstellt: 2026-09-07
> Autor: David Halser / PHGR
> Status: Draft

---

## 1. Projektzweck

Ein generisches, wiederverwendbares Partnerinterview-Tool: Zwei Personen führen abwechselnd
ein strukturiertes Interview anhand eines vorbereiteten Fragensatzes durch, wählen die Fragen
individuell aus, nutzen einen Timer für die Interviewrunde und geben sich abschliessend eine
ressourcenorientierte Rückmeldung. Der inhaltliche Kontext (z. B. „Ressourcen im Bereich
Kultur der Digitalität") kommt jeweils situativ über den Fragensatz hinzu – das Tool selbst
bleibt kontextneutral und ist so für spätere Einsatzszenarien wiederverwendbar.

---

## 2. Nutzer & Kontext

- **Primäre Nutzer:** Teilnehmende von PHGR-Weiterbildungen (Dozierende, Lehrpersonen)
- **Nutzungskontext:** Präsenzveranstaltung, Zugang per QR-Code zu einem vorbereiteten Fragensatz
- **Gerät:** Mobile-first (Smartphone) – TN bewegen sich während des Interviews im Raum

---

## 3. Funktionale Anforderungen (Pflicht)

| # | Feature | Akzeptanzkriterium |
|---|---------|-------------------|
| F1 | Fragensatz per Link/QR laden | URL verweist auf einen bestimmten Fragensatz (Slug); TN sehen beim Öffnen direkt die volle Fragenliste |
| F2 | Fragen an-/abwählen | Die zu interviewende Person streicht durch Antippen die Fragen, die sie **nicht gestellt bekommen** möchte (visuell markiert, nicht entfernt); erneuter Klick macht das rückgängig; beliebig oft änderbar |
| F2b | Eigene Frage ergänzen | Textfeld unterhalb der Liste; die ergänzte Frage erscheint am Ende und verhält sich wie jede andere |
| F3 | Auswahl fixieren | Button „Interview fixieren" reduziert die Liste auf die nicht gestrichenen Fragen für diese Interviewrunde |
| F4 | Timer | Dünner Balken oben im Screen, leert sich über die Zeit, Farbverlauf Grün → Gelb → Orange → Rot, akustisches Signal am Ende; Bedienelemente: Start / Pause / Stopp / Restart; keine Zeiteingabe in der TN-Ansicht (Dauer wird vorab im Fragensatz hinterlegt) |
| F5 | Fragensatz-Verwaltung (David) | Vorbereitungsansicht `presenter.html`: Titel, Fragen, Timerdauer, QR-Code; Export als JSON für die Ablage in `saetze/` – kein Login |

---

## 4. Nicht im Scope

- Datenbank oder Backend für Nutzerdaten
- Login/Accounts für TN oder Dozierende
- Speicherung von Antworten oder Notizen nach Sitzungsende
- Upload-Interface im Tool selbst (v1: Fragensätze werden manuell im Repo gepflegt)
- Strukturhilfe/Satzgerüst für die abschliessende Rückmeldung (bewusst offen gelassen)
- Verwaltungsoberfläche für mehrere Dozierende (v1: nur David pflegt die Bibliothek)

---

## 5. Fehlerfälle & Edge Cases

| Fehlerfall | Erwartetes Verhalten |
|------------|---------------------|
| Alle Fragen gestrichen, „Interview fixieren" geklickt | Hinweis anzeigen, dass mind. 1 Frage übrig bleiben muss |
| Fragensatz-Slug in URL existiert nicht | Freundliche Fehlermeldung, kein technischer Fehlertext |
| Timer läuft ab ohne Interaktion | Ton spielt, Balken bleibt rot stehen, Restart jederzeit möglich |
| Seite wird während Interview neu geladen/verlassen | Kein Datenverlust-Warnhinweis nötig, da ohnehin keine Daten persistiert werden |

---

## 6. Technische Rahmenbedingungen

- **Hosting:** GitHub Pages (spechtur)
- **Backend:** keins – Fragensätze als statische JSON-Dateien im Repo, referenziert über URL-Slug
- **State:** ausschliesslich client-seitig (Browser-Session), keine Persistenz nach Schliessen der Seite
- **CI/Design:** PHGR-CI + Apple-Glass-Stil, konsistent mit bestehender Toolbox
- **Referenz-Tools:** Gruppenlos, Sokrates (spechtur.github.io) als Stil- und Struktur-Referenz
- **DSGVO:** unkritisch – keine personenbezogenen Daten werden gespeichert oder übertragen

---

## 7. Offene Fragen

- [x] Zurück zur vollen Liste: ja, über den Button „Neue Runde" (setzt Auswahl und Timer zurück)
- [x] Notizfeld pro Frage: nicht in v1 – TN notieren ausserhalb des Tools
- [x] Timer-Dauer: Feld `timer_sekunden` im JSON, Default 300 Sekunden im Code
- [ ] Soll die „Bibliothek" später (v2) doch eine einfache Übersichtsseite bekommen, über die auch andere Dozierende ohne Slug-Kenntnis einen Fragensatz auswählen können?
