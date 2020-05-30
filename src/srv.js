const express = require("express");
const app = express();
const port = 8070; // default port to listen

const Pool = require('pg').Pool;
const pool = new Pool({
    host: '10.10.0.33',
    port: 5432,
    database: 'student',
    user: 'student',
    password: 'wsiz#1234'
});

app.get("/", (req, res) => {
    let r = {"result": "Hello world!"}
    res.send(r);
});

app.get("/users", (req, res) => {
    let limit = 10;
    if (req.query.maxusers!==undefined) {
        limit = parseInt(req.query.maxusers)
    }
    pool.query('select * from fakeuser limit $1', [limit],
        (er, re) => {
            if (er) throw er;
            res.send(re.rows);
        });
});


// start the Express server
app.listen(port, () => {
    console.log(`server started at http://localhost:${port}`);
    pool.query('set search_path to xxx');
});
