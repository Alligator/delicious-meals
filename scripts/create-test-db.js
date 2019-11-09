const fs = require('fs');
const path = require('path');
const readline = require('readline');
const Database = require('better-sqlite3');

function createTestDb() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const creationScript = fs.readFileSync(path.join(__dirname, '..', 'server', 'create-database.sql'));
  console.log('about to execute creation script to create messages-test.db:\n');
  console.log(creationScript.toString());

  rl.question('continue (y/n)? ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      console.log('executing...');
      const db = new Database('messages-test.db');

      db.exec(creationScript.toString());

      console.log('inserting test data');
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

      const stmt = db.prepare('INSERT INTO messages(id, author, content, wins, losses, rating) VALUES (?, ?, ?, ?, ?, ?)');
      const insertMessages = db.transaction((messages) => {
        messages.forEach((message) => {
          stmt.run(message.id, message.author, message.content, message.wins, message.losses, message.rating);
        });
      });
      insertMessages(messages);

      console.log('done!');
    }
    rl.close();
  });

}

createTestDb();