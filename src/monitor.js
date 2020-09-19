const express = require("express");
const app = express();
const port = 9081; // default port to listen
const moment = require('moment');


const Pool = require('pg').Pool;
const pool = new Pool({
    host: '10.10.0.33',
    port: 5432,
    database: 'student',
    user: 'student',
    password: 'wsiz#1234'
});

logg = function (msg, type = 'INFO') {
    console.log(`[${moment().format()}] ${type} ${msg}`);
}

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
    pool.query('select * from p21.users order by alias', [],
        (er, re) => {
            if (er) throw er;
            res.send(re.rows);
        });
});

//All CRUD for /cards implemented

/**

 a) listowanie urządzeń
 /user/devices?userid=728 ---> wszystkie device przypisane do usera o userid=728

 b) dodawnie urządzeń
 /user/devices/add?userid=728&deviceid=E3:AF:FF:18:D3:99


 */

// Urządzenia zadanego usera
app.get("/user/devices", (req, res) => {
    let userid = req.query.userid;

    pool.query('select d from p21.devices d, p21.userdevices ud where d.deviceid=ud.deviceid and ud.userid=$1',
        [userid],
        (er, re) => {
            if (er) throw er;
            res.send(re.rows);
        });
});

//Przypisywanie urządzeń do usera..
app.get("/user/devices/add", (req, res) => {
    let userid = req.query.userid;
    let deviceid = req.query.deviceid;

    pool.query('insert into p21.userdevices(userid, deviceid) VALUES ($1, $2) returning *;',
        [userid, deviceid],
        (er, re) => {
            if (er) throw er;
            res.send(re.rows);
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
    logg(`server started at http://localhost:${port}`);
    pool.query('set search_path to xxx');
});
