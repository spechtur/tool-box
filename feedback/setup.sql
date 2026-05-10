-- ============================================================
-- PHGR Feedback-Tool – Supabase Setup
-- Im Supabase SQL-Editor ausführen (einmalig)
-- ============================================================

CREATE TABLE IF NOT EXISTS feedback_submissions (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text        NOT NULL,
  name       text,
  message    text        NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fb_session ON feedback_submissions (session_id);

ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fb_insert" ON feedback_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "fb_select" ON feedback_submissions FOR SELECT USING (true);
CREATE POLICY "fb_delete" ON feedback_submissions FOR DELETE USING (true);
