-- ============================================================
-- PHGR Fotowand — Datenmodell
-- Auszuführen im Supabase SQL-Editor (Projekt "tool-box").
-- Läuft mehrfach durch, ohne Schaden anzurichten.
-- ============================================================

-- ── 1. Sessions ─────────────────────────────────────────────
-- Eine Zeile je Veranstaltung. Hält Aufgabenstellung und Rubriken.
create table if not exists fotowand_sessions (
  session_id       text primary key,
  titel            text        not null default '',   -- frei gestaltbar, steht gross auf dem Handy
  aufgabenstellung text        not null default '',
  -- Liste aus { id, label, farbe } — leer erlaubt, frei definierbar.
  -- Die id bleibt stabil, auch wenn das label später umbenannt wird.
  kategorien       jsonb       not null default '[]'::jsonb,
  erstellt         timestamptz not null default now()
);

-- Nachtrag für Projekte, in denen die Tabelle schon ohne Titel steht:
alter table fotowand_sessions add column if not exists titel text not null default '';

-- ── 2. Beiträge ─────────────────────────────────────────────
create table if not exists fotowand_beitraege (
  id           uuid primary key default gen_random_uuid(),
  session_id   text        not null,
  bild_url     text        not null,          -- öffentliche URL im Bucket
  bild_pfad    text,                          -- Pfad im Bucket, fürs Löschen
  beschreibung text        not null default '',
  kommentar    text        not null default '',
  kategorie_id text,                          -- nullable, jederzeit änderbar
  lat          double precision,              -- nullable, aus EXIF oder Geolocation
  lon          double precision,
  autor        text,                          -- nullable, optionale Angabe
  versteckt    boolean     not null default false,
  erstellt     timestamptz not null default now()
);

create index if not exists fotowand_beitraege_session_idx
  on fotowand_beitraege (session_id, erstellt desc);

-- ── 3. Anordnungen ──────────────────────────────────────────
-- Mehrere Sortierdurchgänge derselben Sammlung nebeneinander:
-- "Cluster Gruppe A", "Cluster Gruppe B", "Plenum" …
create table if not exists fotowand_anordnungen (
  id          uuid primary key default gen_random_uuid(),
  session_id  text        not null,
  name        text        not null default 'Anordnung',
  reihenfolge integer     not null default 0,
  erstellt    timestamptz not null default now()
);

create index if not exists fotowand_anordnungen_session_idx
  on fotowand_anordnungen (session_id, reihenfolge);

-- ── 4. Positionen ───────────────────────────────────────────
-- Wo liegt welches Foto in welcher Anordnung.
-- Kein Eintrag = Foto liegt noch in der Ablage.
create table if not exists fotowand_positionen (
  anordnung_id uuid not null references fotowand_anordnungen (id) on delete cascade,
  beitrag_id   uuid not null references fotowand_beitraege   (id) on delete cascade,
  pos_x        double precision not null,
  pos_y        double precision not null,
  z            integer          not null default 0,
  skalierung   double precision not null default 1,
  primary key (anordnung_id, beitrag_id)
);

-- ── 5. Zugriffsregeln ───────────────────────────────────────
-- Das Tool arbeitet anonym: Wer den QR-Code hat, darf mitmachen.
-- Der Schutz liegt in der Unkenntnis der Session-ID, nicht in Logins.
alter table fotowand_sessions   enable row level security;
alter table fotowand_beitraege  enable row level security;
alter table fotowand_anordnungen enable row level security;
alter table fotowand_positionen enable row level security;

drop policy if exists fw_sessions_all    on fotowand_sessions;
drop policy if exists fw_beitraege_all   on fotowand_beitraege;
drop policy if exists fw_anordnungen_all on fotowand_anordnungen;
drop policy if exists fw_positionen_all  on fotowand_positionen;

create policy fw_sessions_all    on fotowand_sessions    for all using (true) with check (true);
create policy fw_beitraege_all   on fotowand_beitraege   for all using (true) with check (true);
create policy fw_anordnungen_all on fotowand_anordnungen for all using (true) with check (true);
create policy fw_positionen_all  on fotowand_positionen  for all using (true) with check (true);

-- ── 6. Storage ──────────────────────────────────────────────
-- Der Bucket wird im Dashboard angelegt (Storage → New bucket,
-- Name "fotowand", Public ✓). Siehe README.md, Abschnitt "Einrichtung".
--
-- Die folgenden zwei Regeln erlauben anonymes Hochladen und Löschen.
-- Je nach Projektalter verweigert der SQL-Editor Änderungen an
-- storage.objects ("must be owner of table objects"). Dann sind
-- dieselben zwei Regeln im Dashboard unter Storage → Policies zu
-- klicken — die Anleitung dazu steht in der README.
--
-- create policy fw_upload on storage.objects
--   for insert to anon, authenticated with check (bucket_id = 'fotowand');
-- create policy fw_delete on storage.objects
--   for delete to anon, authenticated using (bucket_id = 'fotowand');
