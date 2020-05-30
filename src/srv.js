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
    pool.query('SELECT * FROM xxx.fakeuser ORDER BY name LIMIT $1', [limit],
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

app.get("/suppliers", (req, res) => {
    pool.query('select * from xxx.suppliers order by phone', [],
        (er, re) => {
            if (er) throw er;
            res.send(re.rows);
        });
});


app.get("/cards", (req, res) => {
    let catid = req.query.catid;
    if (catid===undefined) {
        catid = 2;
    }
    let agent =  ''; //req.get('User-Agent');
    //todo: znaleźć rozmiar ekranu i ip klienta...
    console.log(`[${new Date()}] Zapytanie o "cards": kategoria ${catid}`);
    pool.query('select * from d1.card  where categoryid=$1 order by id ', [catid],
        (er, re) => {
            if (er) throw er;
            res.send(re.rows);
        });
});

app.get("/cards/like", (req, res) => {
    let id = req.query.id;
    if (id===undefined) {
        throw "nie podano numeru kartki";
    }
    pool.query('update d1.card set likes= likes + 1 where id=$1', [id],
        (er, re) => {
            if (er) throw er;
            res.send('OK');
        });
});




app.get("/add", (req, res) => {
    console.log(`zapytanie http o /add`);
    let a = req.query.a;
    let b = req.query.b;
    a = parseInt(a);
    b = parseInt(b);

    res.send(`wynik dodawania ${a} + ${b} = ${a + b}`);
});





// start the Express server
app.listen(port, () => {
    console.log(`server started at http://localhost:${port}`);
    pool.query('set search_path to xxx');
});
