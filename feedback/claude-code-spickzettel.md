KTUELL# Claude Code – Spickzettel

*Stütze zum Abbauen: heute Schritt für Schritt, irgendwann nur noch ein kurzer Blick — und dann gar nicht mehr.*

---

## 1. Reinkommen

1. VS Code öffnen → Projektordner laden (steht meist unter „Recent").
2. `Terminal → Neues Terminal` (startet schon im Projektordner; `pwd` zeigt's).
3. Starten — drei Varianten:
   - `claude` — neue Sitzung
   - `claude --resume` — frühere Sitzung aus einer Liste wählen
   - `claude --continue` — die zuletzt offene Sitzung direkt fortsetzen

*Der PATH ist dauerhaft eingerichtet (`~/.bash_profile`). Kein Setup mehr nötig — ausser du wechselst irgendwann auf zsh.*

---

## 2. Der Rhythmus: erkunden → planen → bauen → sichern

1. **Erkunden** — erst zeigen/erklären lassen, bevor etwas geändert wird.
   *„Zeig mir, wie X aktuell funktioniert und was noch fehlt."*
2. **Planen** — Plan-Modus an: `Shift+Tab` **zweimal** (Fusszeile: „plan mode on")
   oder `/plan`. Claude liest nur und schlägt einen Plan vor, ändert nichts.
3. **Bauen** — Plan freigeben. Claude fragt vor jeder Änderung um Erlaubnis.
4. **Sichern** — committen/pushen: per GitHub Desktop wie gewohnt,
   oder Claude bitten: *„commit das und push es zu GitHub."*

---

## 3. Tasten & Befehle, die ich wirklich brauche

| Taste / Befehl | Was es tut |
|---|---|
| `Shift+Tab` (2×) | In den Plan-Modus (nochmal drücken = wieder raus) |
| `/plan` | Plan-Modus, auch mitten im Gespräch |
| `Shift+Enter` | Zeilenumbruch im Prompt (`Enter` = abschicken) |
| `Esc` | Claude sofort stoppen |
| `/clear` | Gesprächsverlauf leeren; Projektwissen bleibt |
| `/exit` | Sitzung beenden (wird automatisch gespeichert) |

---

## 4. Gute Gewohnheiten

- **Ja sagen**, wenn Claude Code eine relevante Referenz/einen Skill lesen will
  (z.B. `claude-api`) — dann schlägt es Fakten nach, statt zu raten.
- **CLAUDE.md aktuell halten:** Ändert sich am Projekt etwas Grundlegendes,
  kurz dort eintragen — jede künftige Sitzung ist sofort im Bild.
- **Kein Output = hat geklappt.** Das Terminal meldet sich nur bei Problemen.
- **Sessions** speichern automatisch. Bei vielen: im `--resume`-Picker mit
  `Ctrl+R` benennen, dann findest du sie wieder.

---

## 5. Wo was lebt (mein Stack)

- **Code im Repo** → Claude Codes Zuhause. Es editiert *lokal* auf dem Mac;
  GitHub bekommt die Änderungen erst per **Push**.
- **API-Key** → Anthropic Console.
- **Worker deployen + Secret hinterlegen** → Cloudflare.
- Die Dashboard-Schritte (Console, Cloudflare) mache ich selbst;
  Claude Code liefert dafür Code und Konfiguration.

---

*Faustregel fürs Abbauen: Fühlt sich ein Abschnitt „selbstverständlich" an — streichen.
Ziel ist, dass am Ende nichts hier mehr nötig ist.*
