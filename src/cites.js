const express = require("express");
const app = express();
const port = 8070; // default port to listen

const Pool = require('pg').Pool;
const pool = new Pool({
    host: 'localhost',
    port: 6555,
    database: 'dbx1',
    user: 'x1',
    password: 'abra_kadabra'
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


app.get("/nearby_cities", (req, res) => {
    let x = req.query.x;
    let y = req.query.y;
    pool.query('select *, sqrt((x-$1)*(x-$1)+(y-$2)*(y-$2)) dist from cities order by dist limit 3;'
        , [x,y], (er, re) => {
            if (er) throw er;
            res.send(re.rows);
        });
});


// start the Express server
app.listen(port, () => {
    console.log(`server started at http://localhost:${port}`);
    pool.query('set search_path to xxx');
});
