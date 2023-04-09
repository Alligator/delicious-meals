const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '..', 'messages.db'));

const newSeason = 2;

let stmt = db.prepare(`
INSERT INTO message_votes(message_id, season)
SELECT
  id AS message_id,
  ? AS season
FROM messages
`);
stmt.run(newSeason);
