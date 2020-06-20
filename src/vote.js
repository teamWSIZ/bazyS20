const express = require("express");
const app = express();
const port = 2020; // default port to listen

const Pool = require('pg').Pool;
const pool = new Pool({
    host: '10.10.0.33',
    port: 5432,
    database: 'student',
    user: 'student',
    password: 'wsiz#1234'
});

app.use(express.json());        //pozwala na czytanie req.body

app.use((req, res, next) => {
    //konfiguracja CORS
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'DELETE, PUT, GET, POST');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


app.get("/", (req, res) => {
    let r = {"result": "Vote system works OK"}
    res.send(r);
});


app.get("/choices", (req, res) => {
    let electionid = req.query.electionid;
    if (electionid === undefined) {
        res.statusCode = 400;     //bad request
        res.send({"error": "electionid missing"});
        return;
    }
    pool.query('select * from v2.choices  where electionid=$1 order by title', [electionid],
        (er, re) => {
            if (er) throw er;
            res.send(re.rows);
        });
});



app.post("/vote", async (req, res) => {
    let bb = req.body;  //is an array of `votes`
    console.log(`zapisujemy ${JSON.stringify(bb)}`);
    for (const v of bb) {
        console.log(`rekord: ${JSON.stringify(v)}, ${new Date().getTime()}`)
        const {rows} = await pool.query('' +
            'insert into v2.votes(electionid, choiceid, value) values ($1, $2, $3)',
            [v.electionid, v.choiceid, v.value]);
    }
    res.send({"result": "OK"});
});




//Przykład: insert elementu (dane przyjdą w request body)
//request można wysłać np. z aplikacji postman, albo z dowolnej własnej aplikacji intrnetowej
app.post("/cards/insert", (req, res) => {
    //todo: admin guard
    let bb = req.body;
    console.log(`Żądanie zapisu: ${JSON.stringify(bb)}`);
    pool.query('insert into d1.card (categoryid, title, text, url) values ($1,$2,$3,$4) returning *',
        [bb.categoryid, bb.title, bb.text, bb.url],
        (er, re) => {
            if (er) throw er;
            res.send(re.rows[0]);
        });
});


//Przykład modyfikacji istniejących danych; ważne, że przychodzący obiekt (w request.body) ma wypełnione pole `id`
app.post("/cards/update", (req, res) => {
    //todo: admin guard
    let bb = req.body;
    console.log(`Żądanie aktualizacji: ${JSON.stringify(bb)}`);
    pool.query('update d1.card set categoryid=$1, title=$2, text=$3, url=$4 where id=$5',
        [bb.categoryid, bb.title, bb.text, bb.url, bb.id], (er, re) => {
            if (er) throw er;
            res.send({"result": "OK"});
        });
});

//usuwanie rekordów z bazy
app.delete("/cards/delete", (req, res) => {
    //todo: admin guard
    let id = req.query.id;
    console.log(`Żądanie usunięcia rekordu o id: ${id}`);
    pool.query('delete from d1.card where id=$1',
        [id], (er, re) => {
            if (er) throw er;
            res.send({"result": "OK"});
        });
});


//All CRUD for /cards implemented


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
