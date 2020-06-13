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

app.use(express.json());        //pozwala na czytanie req.body

app.use((req, res, next) => {
    //konfiguracja CORS
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'DELETE, PUT, GET, POST');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


app.get("/", (req, res) => {
    let r = {"result": "Hello world!"}
    res.send(r);
});

app.get("/users", (req, res) => {
    let limit = 10;
    if (req.query.maxusers !== undefined) {
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
    if (catid === undefined) {
        catid = 2;
    }
    let agent = ''; //req.get('User-Agent');
    console.log(`[${new Date()}] Zapytanie o "cards": kategoria ${catid}`);
    pool.query('select * from d1.card  where categoryid=$1 order by id ', [catid],
        (er, re) => {
            if (er) throw er;
            res.send(re.rows);
        });
});

app.get("/cards/like", (req, res) => {
    let id = req.query.id;
    if (id === undefined) {
        throw "nie podano numeru kartki";
    }
    pool.query('update d1.card set likes= likes + 1 where id=$1', [id],
        (er, re) => {
            if (er) throw er;
            res.send('OK');
        });
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
