import express = require('express');
import {Message} from "./model/message";
import {Score} from "./model/score";

const app: express.Application = express();


let faker = require('faker');

app.use(express.json());        //pozwala na czytanie req.body

app.use((req, res, next) => {
    //konfiguracja CORS
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'DELETE, PUT, GET, POST');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

const Pool = require('pg').Pool;
const pool = new Pool({
    host: '10.10.0.33',
    port: 5432,
    database: 'student',
    user: 'student',
    password: 'wsiz#1234'
});

app.get('/status', (req, res) => {
    res.send('Highscore app works OK');
});

app.get('/fake', (req, res) => {
    let w = ['a'];
    faker.locale = "pl";
    for (let i = 0; i < 10; i++) {
        console.log('-----');
        console.log(faker.name.findName());
        console.log(faker.name.lastName());
        console.log(faker.phone.phoneNumber());
        console.log(faker.image.avatar());
        console.log(faker.address.city());
    }

    res.send('Names:' + JSON.stringify(w));
});


app.get('/scores', (req, res) => {
    let alias = '%';
    let user_alias = req.query.alias;
    if (user_alias !== undefined) alias = user_alias;
    //....


    let created = new Date(); /// tu powinna być data defaultowa, typu 1970
    created.setDate(created.getDate() - 10000); //10000 dni temu...
    // jeśli klient podał 'since', to nadpisać created
    let user_since = req.query.since;
    if (user_since !== undefined) created = user_since;

    let limit = 1000000000;
    // jeśli klient podał 'limit', to nadpisać...
    let user_limit = req.query.limit;
    if (user_limit !== undefined) limit = user_limit;

    //działa: http://localhost:3001/scores?alias=crazy_horse&since=2019-06-04T09:24:10.892Z


    pool.query('select * from aa.high where alias like $1 and created >= $2 order by score desc limit $3',
        [alias, created, limit],
        (er: any, re: any) => {
            if (er) throw er;
            res.send(re.rows);
        });
});

app.post('/scores', (req, res) => {
    let m: Score = req.body;
    m.created = new Date();
    if (m.id === undefined) {
        pool.query('INSERT INTO aa.high (alias, score, created) VALUES ($1, $2, $3) ' +
            'returning *',
            [m.alias, m.score, m.created], (error: any, response: any) => {
                if (error) {
                    console.log(`error: ${error}`);
                    res.send(error);
                    return;
                }
                m = response.rows[0];
                res.send(m);
            });
    } else {
        console.log(`Updateujemy high score o id=${m.id}`);
        pool.query('UPDATE aa.high SET alias=$2, score=$3, created=$4 where id=$1 ' +
            'returning *',
            [m.id, m.alias, m.score, m.created], (error: any, re: any) => {
                if (error) {
                    console.log(`error: ${error}`);
                    res.send(error);
                    return;
                }
                m = re.rows[0];
                res.send(m);
            });
    }
});


app.delete('/scores/:id', (req, res) => {
    const id = req.params.id;
    pool.query('DELETE FROM aa.high where id=$1 returning *', [id], (error: any, re: any) => {
        if (error) {
            console.log(`error: ${error}`);
            res.send(error);
            return;
        }
        console.log(`usunieto ${JSON.stringify(re.rows[0])} elementów`);
        res.send(`OK`);
    });
});


app.listen(3001, function () {
    console.log('Example app listening on port 3003!');
    pool.query('set search_path to aa');
});

/**
 * Tabela highscores:
 * id : SERIAL
 * alias : text
 * score : int
 * created : timestamp
 *
 *
 * Zadanie:
 * 1) stworzyć tabelę na bazie,
 * 2) dodać kilka danych (ręcznie, może być z intellij)
 * 3) na backendzie (ten fajl) dodać metodę zwracającą wszystkie highscores (można posortować po score, malejąco)
 * 4) na backendzie dodać metodę dodawania/modyfikacji highscores,
 * 5) dodać metodę usuwania highscores (by id)
 */




