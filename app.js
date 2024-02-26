const express = require('express');
const sqlite3 = require('sqlite3');

const app = express();
const port = 3000;

app.use(express.json());
const db = new sqlite3.Database(':memory:');
db.serialize(() => {
    db.run(
        'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT)'
    );
});

app.get('/users', (req, res) => {
    db.all('SELECT * FROM users', (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        res.json(rows);
    });
});

app.get('/users/:id', (req, res) => {
    const { id } = req.params;
    db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, row) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if(!row){
            return res.status(404).json({ error: 'User not found' });
        }
              res.json(row);
    });
});

app.post('/users', (req, res) => {
    const { name, email } = req.body;
    db.run(
        `INSERT INTO users (name, email) VALUES (?, ?)`,
        [name, email],
        function (err) {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }
            res.status(201).json({ id: this.lastID });
        }
    );
});

app.delete('/users/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM users WHERE id = ?`, [id], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.status(201).json({ message: `Row deleted: ${this.changes}` });
    });
});

app.put('/users/:id', (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body;
    db.run(`UPDATE users SET name = ?, email = ? WHERE id = ?`, [
        name,
        email,
        id,
    ],function(err){
        if(err){
            res.status(400).json({ error: err.message });
            return;
        }
        res.status(201).json({ message:`Row updated: ${this.changes}` });
    });
});

// app.get('/', (req, res) => {
//     res.send('Welcome to my Express App!');
// });

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
