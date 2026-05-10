-- ============================================================
-- PHGR Wortwolke – Supabase Setup
-- Im Supabase SQL-Editor ausführen (einmalig)
-- ============================================================

CREATE TABLE IF NOT EXISTS wordcloud_submissions (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text        NOT NULL,
  word       text        NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index für schnelle Session-Abfragen
CREATE INDEX IF NOT EXISTS idx_wc_session ON wordcloud_submissions (session_id);

-- Row Level Security aktivieren
ALTER TABLE wordcloud_submissions ENABLE ROW LEVEL SECURITY;

-- Jede/r darf Begriffe einreichen
CREATE POLICY "public_insert" ON wordcloud_submissions
  FOR INSERT WITH CHECK (true);

-- Jede/r darf die aktuelle Wolke lesen
CREATE POLICY "public_select" ON wordcloud_submissions
  FOR SELECT USING (true);

-- Präsenter darf Session zurücksetzen
-- (anon key reicht, da die Aktion nur über den Präsenter-Button ausgelöst wird)
CREATE POLICY "public_delete" ON wordcloud_submissions
  FOR DELETE USING (true);
