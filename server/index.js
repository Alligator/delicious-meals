const Database = require('better-sqlite3');
const elo = require('elo-rating');
const express = require('express');
const morgan = require('morgan');
const process = require('process');
const CronJob = require('cron').CronJob;
const dumpChannelSinceLatest = require('./dump-channel').dumpChannelSinceLatest;

const CURRENT_SEASON = 2;

const devMode = process.argv[2] === '--dev';

let db;
if (devMode) {
  db = new Database('messages-test.db');
} else {
  db = new Database('messages.db');
}
process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

const messageDb = {
  query(query, params = []) {
    const stmt = db.prepare(query)
    return stmt.all(params);
  },
  exec(query, params) {
    const stmt = db.prepare(query);
    db.transaction((p) => {
      stmt.run(p);
    })(params);
  },

  all() {
    return messageDb.query(`
      SELECT
        m.id,
        m.author,
        m.content,
        mv.wins,
        mv.losses,
        mv.rating
      FROM messages AS m
      INNER JOIN message_votes AS mv
        ON mv.message_id = m.id
        AND mv.season = ?
      ORDER BY mv.rating DESC, mv.message_id
    `, [CURRENT_SEASON]);
  },
  async get(id) {
    const messages = await messageDb.query(`
      SELECT
        m.id,
        m.author,
        m.content,
        mv.wins,
        mv.losses,
        mv.rating
      FROM messages AS m
      INNER JOIN message_votes AS mv
        ON mv.message_id = m.id
        AND mv.season = ?
      WHERE m.id = ?
    `, [CURRENT_SEASON, id]);
    return messages.length > 0 ? messages[0] : null;
  },
  async closeMatch() {
    // sometimes just do a random pair
    if (Math.random() > 0.9) {
      return await messageDb.randomPair();
    }

    // get a random record
    const first = await messageDb.query(`
      SELECT
        m.id,
        m.author,
        m.content,
        mv.wins,
        mv.losses,
        mv.rating
      FROM messages AS m
      INNER JOIN message_votes AS mv
        ON mv.message_id = m.id
        AND mv.season = ?
      ORDER BY random()
      LIMIT 1
    `, [CURRENT_SEASON]);

    // try and get a match with a close rating
    const tolerance = 20;
    const matches = await messageDb.query(`
      SELECT
        m.id,
        m.author,
        m.content,
        mv.wins,
        mv.losses,
        mv.rating
      FROM messages AS m
      INNER JOIN message_votes AS mv
        ON mv.message_id = m.id
        AND mv.season = $season
      WHERE m.id != $id
      AND mv.rating > $minRating
      AND mv.rating < $maxRating
      ORDER BY random()
      LIMIT 1`,
      {
        id: first[0].id,
        minRating: first[0].rating - tolerance,
        maxRating: first[0].rating + tolerance,
        season: CURRENT_SEASON,
      },
    );

    if (matches.length === 0) {
      // no close match found, just return two random ones
      console.log('MATCHMAKING> couldn\'t match');
      return await messageDb.randomPair();
    }

    return [first[0], matches[0]];
  },
  randomPair() {
    return messageDb.query(`
      SELECT
        m.id,
        m.author,
        m.content,
        mv.wins,
        mv.losses,
        mv.rating
      FROM messages AS m
      INNER JOIN message_votes AS mv
        ON mv.message_id = m.id
        AND mv.season = ?
      ORDER BY random()
      LIMIT 2
    `, [CURRENT_SEASON]);
  },
  topTenMessages() {
    return messageDb.query(`
      SELECT
        m.id,
        m.author,
        m.content,
        mv.wins,
        mv.losses,
        mv.rating
      FROM messages AS m
      INNER JOIN message_votes AS mv
        ON mv.message_id = m.id
        AND mv.season = ?
      ORDER BY mv.rating DESC, mv.message_id
      LIMIT 10
    `, [CURRENT_SEASON]);
  },
  authors(limit = -1) {
    return messageDb.query(`
      SELECT author, ratio, totalWins, totalLosses, totalMeals
      FROM (
        SELECT
          author,
          ifnull(CAST(sum(mv.wins) AS real) / sum(mv.losses), mv.wins) as ratio,
          sum(mv.wins) AS totalWins,
          sum(mv.losses) AS totalLosses,
          count(1) AS totalMeals
        FROM messages AS m
        INNER JOIN message_votes AS mv
          ON mv.message_id = m.id
          AND mv.season = ?
        GROUP BY author
      )
      ORDER BY ratio DESC
      LIMIT ?`,
      [CURRENT_SEASON, limit],
    );
  },
  async stats() {
    const stats = await messageDb.query(`
      SELECT
        count(1)                      AS totalMeals,
        count(distinct author)        AS totalAuthors,
        (sum(wins) + sum(losses)) / 2 AS totalVotes
      FROM messages
    `);
    return stats[0];
  },
  async lastSeasonWinner() {
    const lastSeasonWinner = await messageDb.query(`
      SELECT
        m.author,
        m.content,
        mv.wins,
        mv.losses,
        MAX(mv.rating) as rating
      FROM message_votes AS mv
      INNER JOIN messages AS m ON m.id = mv.message_id
      WHERE season = ?
    `, CURRENT_SEASON - 1);

    return lastSeasonWinner[0];
  },
  updateVotes(ip, userAgent, url) {
    return messageDb.exec(`
      INSERT INTO votes(ip, userAgent, url)
      VALUES ($ip, $userAgent, $url)`,
      { ip: ip, userAgent: userAgent, url: url },
    );
  },
  async updateRatings(winnerId, loserId) {
    const winner = await messageDb.get(winnerId);
    const loser = await messageDb.get(loserId);
    
    // here come the k experiments
    // original:
    //   k = 20, doesn't change
    //
    // experiment 1:
    //   k = 32 for meals with <= 4 votes
    //   k = 16 for meals with a rating < 1600
    //   k = 10 for meals with a rating >= 1600
    let k = 16;
    if ((winner.wins + winner.losses) <= 4) {
      k = 32;
    } else if (winner.rating >= 1600) {
      k = 10;
    }

    const result = elo.calculate(winner.rating, loser.rating, true, k);
    await messageDb.updateRating(winnerId, result.playerRating, true);
    await messageDb.updateRating(loserId, result.opponentRating, false);
  },
  async updateRating(id, rating, win) {
    if (win) {
      await messageDb.exec(`
        UPDATE message_votes
        SET rating = $rating, wins = wins + 1
        WHERE message_id = $id
        AND season = $season
        `, { rating, id, season: CURRENT_SEASON },
      );
    } else {
      await messageDb.exec(`
        UPDATE message_votes
        SET rating = $rating, losses = losses + 1
        WHERE message_id = $id
        AND season = $season
        `, { rating, id, season: CURRENT_SEASON },
      );
    }
  },
};


if (!devMode) {
  const job = new CronJob('0 */1 * * *', () => dumpChannelSinceLatest(db, CURRENT_SEASON));
  job.start();
  dumpChannelSinceLatest(db, CURRENT_SEASON);
}

const app = express();
app.use(express.json());
app.use(express.static('static', { extensions: ['html'] }));
app.use(morgan('combined'));
app.set('trust proxy', 'loopback');

app.get('/', async (req, res) => {
  res.send(await messageDb.all());
});

app.get('/meals/', async (req, res) => {
  res.send(await messageDb.all());
});
app.get('/meals/pair', async (req, res) => {
  res.send(await messageDb.closeMatch());
});
app.get('/meals/:mealId', async (req, res) => {
  res.send(await messageDb.get(req.params.mealId));
});
app.post('/meals/vote', async (req, res) => {
  const { winnerId, loserId } = req.body;
  await messageDb.updateRatings(winnerId, loserId);
  await messageDb.updateVotes(req.ip, req.get('User-Agent'), req.originalUrl);
  const winner = await messageDb.get(winnerId);
  const loser = await messageDb.get(loserId);
  res.send({ winner, loser });
});

app.get('/authors/', async (req, res) => {
  res.send(await messageDb.authors());
});

app.get('/stats', (req, res) => {
  Promise.all([
    messageDb.topTenMessages(),
    messageDb.authors(10),
    messageDb.stats(),
    messageDb.lastSeasonWinner(),
  ]).then(([topMessages, topAuthors, stats, lastSeasonWinner]) => {
    res.send({ topMessages, topAuthors, lastSeasonWinner, ...stats });
  });
});

app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'static' });
  // res.redirect('/');
});

app.listen(3000, () => console.log('listening on port 3000'));
