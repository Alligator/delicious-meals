CREATE TABLE IF NOT EXISTS messages(
  id      TEXT PRIMARY KEY,
  author  TEXT,
  content TEXT,
  wins    INTEGER DEFAULT 0,
  losses  INTEGER DEFAULT 0,
  rating  INTEGER DEFAULT 1500
);

CREATE TABLE IF NOT EXISTS votes(
  userAgent TEXT,
  url       TEXT,
  timestamp TEXT DEFAULT (datetime('now', 'utc'))
);
