-- D1 schema for the HumanifyMe feedback worker.
-- One row per intake event. payload_json holds the source-specific body
-- (counts/dimensions for mcp + try-it; categorical answers + optional free-text
-- for survey). No rewrite/draft content is ever stored here.
CREATE TABLE IF NOT EXISTS feedback_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  source        TEXT NOT NULL,            -- 'mcp' | 'try-it' | 'survey'
  anon          TEXT,                     -- opaque install id for 'mcp', else NULL
  payload_json  TEXT NOT NULL,
  ts            TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS feedback_events_source ON feedback_events(source);
CREATE INDEX IF NOT EXISTS feedback_events_anon ON feedback_events(anon);
CREATE INDEX IF NOT EXISTS feedback_events_ts ON feedback_events(ts);
