# H5P KI-Generator

Ein KI-gestützter Generator für H5P-Lerninhalte. Beschreibe in einem Satz, was du brauchst – der Generator erstellt das fertige H5P-File zum direkten Hochladen in Moodle.

## Was es kann

Aus einer einfachen Beschreibung wie *«Lückentext über die Schweizer Demokratie, politische Begriffe als Lücken»* generiert der Generator automatisch einen vollständigen, interaktiven H5P-Inhalt – ohne H5P-Editor, ohne Klickerei, ohne manuelle Inhaltseingabe.

Unterstützte H5P-Typen:
- **Lückentext** (H5P.Blanks) – Text mit automatisch gesetzten Lücken
- **Multiple Choice** (H5P.MultiChoice) – Frage mit einer richtigen und drei falschen Antworten
- **Accordion** (H5P.Accordion) – Aufklappbare Panels mit Titel und Inhalt
- **True / False** (H5P.TrueFalse) – Richtig-oder-Falsch-Aussage

## Verwendung

1. Seite öffnen
2. Worker-URL und Passwort eingeben (einmalig, wird im Browser gespeichert)
3. H5P-Typ wählen
4. Auftrag beschreiben – auf Deutsch, Italienisch oder Romanisch
5. «Mit Claude generieren» klicken
6. Die heruntergeladene `.h5p`-Datei in Moodle hochladen: **Material anlegen → H5P → Datei hochladen**

## Technischer Aufbau

Der Generator besteht aus zwei Komponenten:

**Frontend (diese GitHub Pages-Seite)**
Eine einzelne `index.html`-Datei mit JSZip. Keine Abhängigkeiten, kein Build-Prozess. Läuft vollständig im Browser.

**Backend (Cloudflare Worker)**
Ein minimaler Proxy-Server, der Anfragen vom Frontend entgegennimmt, das Zugangspasswort prüft und sie an die Anthropic Claude API weiterleitet. Der API-Key wird verschlüsselt im Worker gespeichert und ist für Aussenstehende nicht zugänglich.

```
Browser → Cloudflare Worker → Anthropic API → H5P-File → Moodle
```

## Zugang

Der Generator ist passwortgeschützt. Nur Personen mit dem Zugangspasswort können Inhalte generieren. Das Passwort wird vom Projektverantwortlichen vergeben.

## Kosten

Die Nutzung läuft über die Anthropic API. Pro generiertem H5P-Inhalt entstehen Kosten von ca. 0.5–1 Rappen. Ein monatliches Spending Limit auf der Anthropic Console begrenzt möglichen Missbrauch.

## Anpassen

Der gesamte Generator besteht aus einer einzigen Datei (`index.html`). Anpassungen direkt im GitHub-Editor:

- **Neue Beispiele** hinzufügen: Array `EXAMPLES` im Script-Bereich
- **System-Prompts** anpassen: Objekt `SYSTEM_PROMPTS` – hier wird Claude instruiert, wie er den jeweiligen H5P-Typ generieren soll
- **Sprache ändern**: Im System-Prompt `Auf Deutsch` durch `In italiano` oder `En rumantsch` ersetzen

## Kontext

Entwickelt im Rahmen des Projekts **ORBITA** – Lehrmittelentwicklung für die italienischsprachigen Täler Graubündens. Ermöglicht Dozierenden die schnelle Erstellung von interaktiven Lernmaterialien in Moodle ohne technisches Vorwissen.

Entwickelt mit Unterstützung von Claude (Anthropic) und Vibe Coding.

## Lizenz

CC BY 4.0 – frei verwendbar und anpassbar mit Namensnennung.

Entwickelt von David Halser, [Pädagogische Hochschule Graubünden (PHGR)](https://www.phgr.ch)
