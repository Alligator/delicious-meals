const sqlite3 = require('sqlite3').verbose();
const elo = require('elo-rating');
const express = require('express');
const morgan = require('morgan');
const CronJob = require('cron').CronJob;
const dumpChannelSinceLatest = require('./init-db').dumpChannelSinceLatest;

const openDb = () => new sqlite3.Database('messages.db');
const messageDb = {
  query(query, params = []) {
    const db = openDb();
    console.log('  query:', query, params);
    return new Promise((resolve, reject) => {
      db.all(query, params, (err, result) => {
        db.close();
        if (!err) {
          resolve(result);
        } else {
          console.error(err);
          reject();
        }
      });
    });
  },
  exec(query, params) {
    const db = openDb();
    console.log('  exec:', query, params);
    return new Promise((resolve, reject) => {
      db.run(query, params, (err) => {
        db.close();
        if (!err) {
          resolve();
        } else {
          console.error(err);
          reject();
        }
      });
    });
  },

  all() {
    return messageDb.query('SELECT * FROM messages');
  },
  async get(id) {
    const messages = await messageDb.query('SELECT * FROM messages WHERE id = ?', [id]);
    return messages.length > 0 ? messages[0] : null;
  },
  randomPair() {
    return messageDb.query('SELECT * FROM messages ORDER BY random() LIMIT 2');
  },
  topTenMessages() {
    return messageDb.query('SELECT * FROM messages ORDER BY rating DESC LIMIT 10');
  },
  topTenAuthors() {
    return messageDb.query(`
      SELECT author, totalRating
      FROM (
        SELECT author, CAST(sum(rating) AS real) / count(1) as totalRating
        FROM messages
        GROUP BY author
      )
      ORDER BY totalRating DESC
      LIMIT 10`,
    );
  },

  async updateRatings(winnerId, loserId) {
    const winner = await messageDb.get(winnerId);
    const loser = await messageDb.get(loserId);
    const result = elo.calculate(winner.rating, loser.rating, true);
    await messageDb.updateRating(winnerId, result.playerRating, true);
    await messageDb.updateRating(loserId, result.opponentRating, false);
  },
  async updateRating(id, rating, win) {
    if (win) {
      await messageDb.exec(
        'UPDATE messages SET rating = $rating, wins = wins + 1 WHERE id = $id',
        { $rating: rating, $id: id },
      );
    } else {
      await messageDb.exec(
        'UPDATE messages SET rating = $rating, losses = losses + 1 WHERE id = $id',
        { $rating: rating, $id: id },
      );
    }
  },
};


const job = new CronJob('0 */1 * * *', dumpChannelSinceLatest);
job.start();
dumpChannelSinceLatest();

const app = express();
app.use(express.json());
app.use(express.static('static'));
app.use(morgan('combined'));

app.get('/', async (req, res) => {
  res.send(await messageDb.all());
});

app.get('/meals/pair', async (req, res) => {
  res.send(await messageDb.randomPair());
});
app.get('/meals/topten', async (req, res) => {
  res.send(await messageDb.topTenMessages());
});
app.get('/meals/:mealId', async (req, res) => {
  res.send(await messageDb.get(req.params.mealId));
});
app.post('/meals/vote', async (req, res) => {
  const { winnerId, loserId } = req.body;
  await messageDb.updateRatings(winnerId, loserId);
  const winner = await messageDb.get(winnerId);
  const loser = await messageDb.get(loserId);
  res.send({ winner, loser });
});

app.get('/authors/topten', async (req, res) => {
  res.send(await messageDb.topTenAuthors());
});

app.listen(3000, () => console.log('listening'));
