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
    pool.query('SELECT * FROM fakeuser ORDER BY name LIMIT $1', [limit],
        (er, re) => {
            if (er) throw er;
            res.send(re.rows);
        });
});

app.get("/countries", (req, res) => {
    pool.query('select distinct country cc from xxx.customers order by cc', [],
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
