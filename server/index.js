const Database = require('better-sqlite3');
const elo = require('elo-rating');
const express = require('express');
const morgan = require('morgan');
const process = require('process');
const CronJob = require('cron').CronJob;
const dumpChannelSinceLatest = require('./dump-channel').dumpChannelSinceLatest;

const db = new Database('messages.db');
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
    return messageDb.query('SELECT * FROM messages ORDER BY rating DESC');
  },
  async get(id) {
    const messages = await messageDb.query('SELECT * FROM messages WHERE id = ?', [id]);
    return messages.length > 0 ? messages[0] : null;
  },
  async closeMatch() {
    // sometimes just do a random pair
    if (Math.random() > 0.9) {
      return await messageDb.randomPair();
    }

    // get a random record
    const first = await messageDb.query('SELECT * FROM messages ORDER BY random() LIMIT 1');

    // try and get a match with a close rating
    const tolerance = 20;
    const matches = await messageDb.query(`
      SELECT *
      FROM messages
      WHERE id != $id
      AND rating > $minRating
      AND rating < $maxRating
      ORDER BY random()
      LIMIT 1`,
      { id: first[0].id, minRating: first[0].rating - tolerance, maxRating: first[0].rating + tolerance },
    );

    if (matches.length === 0) {
      // no close match found, just return two random ones
      console.log('MATCHMAKING> couldn\'t match');
      return await messageDb.randomPair();
    }

    return [first[0], matches[0]];
  },
  randomPair() {
    return messageDb.query('SELECT * FROM messages ORDER BY random() LIMIT 2');
  },
  topTenMessages() {
    return messageDb.query('SELECT * FROM messages ORDER BY rating DESC LIMIT 10');
  },
  authors(limit = -1) {
    return messageDb.query(`
      SELECT author, ratio, totalWins, totalLosses, totalMeals
      FROM (
        SELECT
          author,
          CAST(sum(wins) AS real) / sum(losses) as ratio,
          sum(wins) AS totalWins,
          sum(losses) AS totalLosses,
          count(1) AS totalMeals
        FROM messages
        GROUP BY author
      )
      ORDER BY ratio DESC
      LIMIT ?`,
      limit,
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

  updateVotes(ip, userAgent, url) {
    return messageDb.exec(
      `INSERT INTO votes(ip, userAgent, url) VALUES ($ip, $userAgent, $url)`,
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
      await messageDb.exec(
        'UPDATE messages SET rating = $rating, wins = wins + 1 WHERE id = $id',
        { rating: rating, id: id },
      );
    } else {
      await messageDb.exec(
        'UPDATE messages SET rating = $rating, losses = losses + 1 WHERE id = $id',
        { rating: rating, id: id },
      );
    }
  },
};


const job = new CronJob('0 */1 * * *', () => dumpChannelSinceLatest(db));
job.start();
dumpChannelSinceLatest(db);

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
  ]).then(([topMessages, topAuthors, stats]) => {
    res.send({ topMessages, topAuthors, ...stats });
  });
});

app.get('*', (req, res) => {
  res.redirect('/');
});

app.listen(3000, () => console.log('listening'));
