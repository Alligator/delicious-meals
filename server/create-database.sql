CREATE TABLE IF NOT EXISTS messages(
  id      TEXT PRIMARY KEY,
  author  TEXT,
  content TEXT,
  wins    INTEGER DEFAULT 0,
  losses  INTEGER DEFAULT 0,
  rating  INTEGER DEFAULT 1500
);

CREATE TABLE IF NOT EXISTS votes(
  ip        TEXT,
  url       TEXT,
  userAgent TEXT,
  timestamp TEXT DEFAULT (datetime('now', 'utc'))
);

CREATE VIEW IF NOT EXISTS messages_with_dates AS
SELECT
  *
  -- discord snowflakes are 63 bit ints, the top 41 bits are the timestamp
  -- 1420070400000 = 2015-1-1 00:00:00, the epoch for discord timestamps
, datetime(((id >> 22) + 1420070400000) / 1000, 'unixepoch') AS date
FROM messages;
