const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '..', 'messages.db'));

// 1. create message_votes
let stmt = db.prepare(`
CREATE TABLE IF NOT EXISTS message_votes(
  message_id  TEXT,
  season      INTEGER DEFAULT 1,
  wins        INTEGER DEFAULT 0,
  losses      INTEGER DEFAULT 0,
  rating      INTEGER DEFAULT 1500
);
`);
stmt.run();

// 2. move messages.wins/losses/rating to message_votes under season 1
stmt = db.prepare(`
INSERT INTO message_votes
SELECT
  id as message_id,
  1 as season,
  wins,
  losses,
  rating
FROM messages
`);
stmt.run();
