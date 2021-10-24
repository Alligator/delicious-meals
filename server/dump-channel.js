const Discord = require('discord.js');
const fs = require('fs');

function dumpChannel(botToken, channelId, after) {
  return new Promise((resolve, reject) => {
    const client = new Discord.Client();

    client.on('ready', async () => {
      const channel = client.channels.get(channelId);

      const messages = [];
      let oldestMessage;
      let newestMessage = after;
      while (true) {
        // console.log(oldestMessage, newestMessage);
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

function createDatabase(db, messages) {
  if (messages.length > 0) {
    console.log(`writing ${messages.length} messages`);
  }

  db.prepare(`
    CREATE TABLE IF NOT EXISTS messages(
      id      TEXT PRIMARY KEY,
      author  TEXT,
      content TEXT,
      wins    INTEGER DEFAULT 0,
      losses  INTEGER DEFAULT 0,
      rating  INTEGER DEFAULT 1500
    )`,
  ).run();

  const stmt = db.prepare('INSERT INTO messages(id, author, content) VALUES (?, ?, ?)');
  const insertMessages = db.transaction((messages) => {
    messages.forEach((message) => {
      stmt.run(message.id, message.author, message.content);
    });
  });

  insertMessages(messages);
}

function readConfig() {
  if (!fs.existsSync('./config.json')) {
    const def = {
      botToken: 'DISCORD BOT TOKEN HERE',
      channelId: 'DISCORD CHANNEL ID HERE',
    };
    fs.writeFileSync('./config.json', JSON.stringify(def, null, 2));
    throw new Error('no config.json file found! writing a default, please fill it out');
  }
  return JSON.parse(fs.readFileSync('./config.json'));
}

function dumpEntireChannel(db) {
  const config = readConfig();
  dumpChannel(config.botToken, config.channelId).then(messages => createDatabase(db, messages));
}

function dumpChannelSinceLatest(db) {
  const config = readConfig();
  const result = db.prepare('SELECT max(id) as id FROM messages').get();
  dumpChannel(config.botToken, config.channelId, result.id)
    .then((messages) => {
      createDatabase(db, messages)
    });
}

module.exports = { dumpEntireChannel, dumpChannelSinceLatest };
