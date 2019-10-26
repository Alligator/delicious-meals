const Discord = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const config = require('./config.json');

function dumpChannel(botToken, channelId, after) {
  return new Promise((resolve, reject) => {
    const client = new Discord.Client();

    client.on('ready', async () => {
      const channel = client.channels.get(channelId);

      const messages = [];
      let oldestMessage;
      let newestMessage = after;
      while (true) {
        console.log(oldestMessage, newestMessage);
        let rawMessages;
        if (after) {
          // move forward
          rawMessages = await channel.fetchMessages({ limit: 100, after: newestMessage });
        } else {
          // move backward
          rawMessages = await channel.fetchMessages({ limit: 100, before: oldestMessage });
        }
        if (rawMessages.size === 0) {
          break;
        }

        console.log(rawMessages.map(x => ({ id: x.id, c: x.cleanContent })));

        const formattedMessages = rawMessages.map(message => ({
            id: message.id,
            content: message.cleanContent,
            author: message.author.username,
          }));
        oldestMessage = rawMessages.last().id;
        newestMessage = rawMessages.first().id;

        messages.push.apply(messages, formattedMessages);
        console.log(`fetched ${messages.length} messages`);
      }

      client.destroy();
      resolve(messages);
    });

    client.login(botToken);
  });
}

function createDatabase(file, messages) {
  const db = new sqlite3.Database(file);
  console.log(`writing ${messages.length} messages`);

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS messages(
        id      TEXT PRIMARY KEY,
        author  TEXT,
        content TEXT,
        wins    INTEGER DEFAULT 0,
        losses  INTEGER DEFAULT 0,
        rating  INTEGER DEFAULT 1500
      )`,
    );

    db.run('BEGIN TRANSACTION');
    messages.forEach((message) => {
      db.run(
        'INSERT INTO messages(id, author, content) VALUES (?, ?, ?)',
        message.id,message.author, message.content,
      );
    });
    db.run('COMMIT');
  });

  db.close();
}

const file = 'messages.db';
function dumpEntireChannel() {
  dumpChannel(config.botToken, config.channelId).then(messages => createDatabase(file, messages));
}

function dumpChannelSinceLatest() {
  const db = new sqlite3.Database(file);

  db.serialize(() => {
    db.get('SELECT max(id) as id FROM messages', (err, result) => {
    db.close();
      if (err) {
        return;
      }
      console.log(`fetching messages since ${result.id}`);
      dumpChannel(config.botToken, config.channelId, result.id)
        .then((messages) => {
          createDatabase(file, messages)
        });
    });
  });
}

function createTestDb() {
  const authors = ['clive', 'tony', 'nigel'];
  const messages = []
  for (let i = 0; i < 100; i++) {
    messages.push({
      id: Math.floor(Math.random() * 10000000),
      author: authors[Math.floor(Math.random() * authors.length)],
      content: `nutrient paste #${i}`,
      wins: Math.floor(Math.random() * 50),
      losses: Math.floor(Math.random() * 50),
      rating: Math.floor(Math.random() * 2000),
    });
  }
  createDatabase('messages-test.db', messages);
}

module.exports = { dumpEntireChannel, dumpChannelSinceLatest };
