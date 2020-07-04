const express = require("express");
const app = express();

const {BAD_REQUEST, UNAUTHORIZED, INTERNAL_SERVER_ERROR} = require('http-status-codes');

const fs = require('fs');
const path = '/home/pm/deploy/vote/'
// const path = '/run/secrets'
let dbhost = fs.readFileSync(`${path}/vote_db_host`, 'utf8').toString().trim();
let dbdb = fs.readFileSync(`${path}/vote_db_db`, 'utf8').toString().trim();
let dbuser = fs.readFileSync(`${path}/vote_db_user`, 'utf8').toString().trim();
let dbpass = fs.readFileSync(`${path}/vote_db_pass`, 'utf8').toString().trim();
const PORT = 2019;
const AUTH = 'https://denver.wsi.edu.pl:8443/wd-auth';



const Pool = require('pg').Pool;
const pool = new Pool({
    host: '10.10.0.33',
    port: 5432,
    database: 'student',
    user: 'student',
    password: 'wsiz#1234'
});
// const pool = new Pool({
//     host: dbhost,
//     port: 5432,
//     database: dbdb,
//     user: dbuser,
//     password: dbpass
// });

const NodeCache = require("node-cache");
const user_cache = new NodeCache({stdTTL: 600});

// const needle = require('needle');    //also nice, but doesn't have async/await
const https = require("https");
const tls_options = {
    rejectUnauthorized: false  // verify SSL certificate
}
const agent = new https.Agent(tls_options);
const fetch = require("node-fetch");
//^^ using `node-fetch` for async operations

// import {v4 as uuidv4} from 'uuid';
const {v4: uuidv4} = require('uuid');//https://github.com/uuidjs/uuid



/**
 * Sends an error response to the client:
 * @param res
 * @param message
 * @param error_code
 * @returns {void}
 */
async function send_error_response(res, message, error_code) {
    res.status(error_code);
    await res.send({"error": message});
}

async function send_ok_response(res, message = 'OK') {
    await res.send({"result": message});
}


/**
 * Logownie do bazy userów (tutaj: WD)
 * @param {string} user
 * @param {string} md5pass
 * @returns {string}
 */
async function login(user, md5pass) {
    let url = `${AUTH}/auth?album=${user}&pass=${md5pass}`
    let res = await fetch(url, {agent});
    console.log(`res=${res}`)
    let authtoken = (await res.text()).substr(1, 36);
    console.log(`userid=${user} logged in, authtoken:${authtoken}`);
    return authtoken;
}

/**
 * Sprawdzenie jaki userid odpowiada podanemu authtoken. Ta funkcja powinna być
 * obsługiwana przez bazę userów (tutaj: WD).
 * Wykorzystamy bibliotekę "node-cache" by wyniki tej operacji zapamiętać (nie pytać ciągle bazy userów).
 *
 * @param authtoken
 * @returns {string} (undefined jeśli authtoken nie odpowiada żadnemu userowi)
 */
async function get_userid(authtoken) {
    if (user_cache.has(authtoken)) {
        let userid = user_cache.get(authtoken);
        console.log(`returning cached user: ${userid}`);
        return user_cache.get(authtoken);
    } else {
        //ask user DB
        let url = `${AUTH}/user?wdauth=${authtoken}`
        let res = await fetch(url, {agent});
        let data = await res.json();
        let uuid = data.studentid;
        console.log(`WD: userid=${uuid}`);
        user_cache.set(authtoken, uuid);
        return uuid;
    }
}

/**
 * Zwraca wybory dostępne dla podanego usera. Wybory muszą być:
 * - otwarte dla danego timestamp-u (po votebegin, i przed voteend),
 * - userid nie może być jeszcze zarejestrowany do danych wyborów (tabela registrations)
 *
 * Uwaga -- timestamp-y są zone-naive (unaware); zakładamy, że wszystkie są w tej samej strefie
 * czasowej (np. CEST).
 *
 * @param userid
 * @param at_timestamp
 * @returns {Map[]}
 */
async function get_active_unregistered_elections(userid, at_timestamp) {
    const {rows} = await pool.query(
            `select *
             from v2.elections e
             where $2 between e.votebegin and e.voteend
               and e.electionid not in (
                 select r.electionid
                 from v2.registrations r
                 where userid = $1)`,
        [userid, at_timestamp]);
    return rows;
}

/**
 * Zwraca wybory dostępne ogólnie na tą chwilę
 * - otwarte dla danego timestamp-u (po votebegin, i przed voteend),
 *
 * Uwaga -- timestamp-y są zone-naive (unaware); zakładamy, że wszystkie są w tej samej strefie
 * czasowej (np. CEST).
 *
 * @param at_timestamp
 * @returns {Map[]}
 */
async function get_active_elections(at_timestamp) {
    const {rows} = await pool.query(
            `select *
             from v2.elections e
             where $1 between e.votebegin and e.voteend`,
        [at_timestamp]);
    return rows;
}


/**
 * Sprawdzenie wyników głosowania, czy są zgodne z regułami. W tej wersji, wszystkie ".value" mają
 * być dodatnie, i co najwyżej jeden może być ==1. Dodaktowo electionid musi się zgadzać z podanym `eid`.
 *
 * @param {string} eid : electionid dla którego obecne głosy mają być odpowiednie
 * @param {Map[]} votes pojedynczy wynik głosowania (de facto tabela obiektów typu Vote)
 */
function isvalid_v1(votes, eid) {
    let total = 0;
    for (const v of votes) {
        if (v.value < 0) return false;
        total += v.value;
        if (total > 1) return false;
        if (v.electionid !== eid) return false;
    }
    return true;
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
    let r = {"result": "Vote system works OK"}
    res.send(r);
});

app.get("/login", async (req, res) => {
    let user, pass, authtoken;
    try {
        user = req.query.user;
        pass = req.query.pass;
    } catch (e) {
        return send_error_response(res,
            'User or password not provided', BAD_REQUEST);
    }
    try {
        authtoken = await login(user, pass);
    } catch (e) {
        return send_error_response(res, 'Unauthorized', UNAUTHORIZED);
    }
    if (authtoken.indexOf('FAILED') !== -1) {
        return send_error_response(res, 'Unauthorized', UNAUTHORIZED);
    }
    await res.send({"authtoken": authtoken});
});


app.get("/user", async (req, res) => {
    let authtoken = req.query.authtoken;
    let user = await get_userid(authtoken);
    await res.send({"userid": user});
});


app.get("/elections", async (req, res) => {
    let authtoken;
    try {
        authtoken = req.query.authtoken;
    } catch (e) {
        return send_error_response(res, 'Missing authtoken', BAD_REQUEST);
    }
    let userid = await get_userid(authtoken);
    if (userid === undefined) {
        return send_error_response(res, 'Bad authtoken', BAD_REQUEST);
    }
    let ee = await get_active_unregistered_elections(userid, new Date());
    await res.send({"elections": ee});
});


app.get('/register', async (req, res) => {
    let authtoken, electionid;
    try {
        authtoken = req.query.authtoken;
        electionid = req.query.electionid;
        electionid = parseInt(electionid);
    } catch (e) {
        return send_error_response(res, 'Missing authtoken or electionid', BAD_REQUEST);
    }
    let userid = await get_userid(authtoken);
    if (userid === undefined) {
        return send_error_response(res, 'Bad authtoken', BAD_REQUEST);
    }
    let allowed_elections = await get_active_unregistered_elections(userid, new Date());
    let allowed_electionids = allowed_elections.map(e => e.electionid);
    if (!allowed_electionids.includes(electionid)) {
        return send_error_response(res, `Given electionid=${electionid} is not allowed`, BAD_REQUEST);
    }

    //W tym momencie mamy ważną, dopuszczoną parę (userid, electionid)
    //(trzeba uważać, bo w przypadku ataku, wiele requestów może dojść do tego miejsca, z tą samą parą)

    //transaction
    // - generate UUID
    // - write to "tokens"
    // - write to "registrations"
    // - return token

    let token = uuidv4();
    try {
        await pool.query('BEGIN')

        const writetoken = 'INSERT INTO v2.tokens(electionid, token) VALUES($1, $2)';
        await pool.query(writetoken, [electionid, token]);

        const writeregistration = 'INSERT INTO v2.registrations(userid, electionid) VALUES ($1,$2)';
        await pool.query(writeregistration, [userid, electionid]);

        await pool.query('COMMIT') //tylko 1 request może dojść do tego miejsca

    } catch (e) {
        await pool.query('ROLLBACK');
        console.log(`Error of token generation for userid=${userid} and electionid=${electionid}`);
        return send_error_response(res, 'Error in election_token generation', INTERNAL_SERVER_ERROR);
    }
    console.log(`Token generated for userid=${userid} and electionid=${electionid}`);
    res.send({'election_token': token});
});


app.get('/choices', (req, res) => {
    let electionid = req.query.electionid;
    if (electionid === undefined) {
        return send_error_response(res, 'Missing electionid', BAD_REQUEST);
    }
    pool.query('select * from v2.choices  where electionid=$1 order by title', [electionid],
        (er, re) => {
            if (er) throw er;
            res.send(re.rows);
        });
});


app.post("/vote", async (req, res) => {
    let votes = req.body;  //is an array of `votes`
    let token;
    try {
        token = req.query.election_token;
    } catch (e) {
        return send_error_response(res, 'Missing election_token', BAD_REQUEST);
    }
    console.log(`token:${token} submited vote ${JSON.stringify(votes)}`);

    //Znajdźmy electionid odpowiadające podanemu tokenowi
    const result = await pool.query('SELECT electionid from v2.tokens where token=$1', [token]);
    console.log(`token ${token} valid for election_id=${JSON.stringify(result)}`);
    const eid = result.rows[0].electionid;

    //Sprawdzamy, czy te wybory są jeszcze aktywne
    let allowed_elections = await get_active_elections(new Date());
    let allowed_electionids = allowed_elections.map(e => e.electionid);
    if (!allowed_electionids.includes(eid)) {
        return send_error_response(res, `Given electionid=${electionid} is not allowed`, BAD_REQUEST);
    }



    if (!isvalid_v1(votes, eid)) {
        return send_error_response(res, 'invalid vote', BAD_REQUEST);
    }

    //Mamy token i głosy; głosy trzeba zapisać, a token usunąć (najlepiej w 1 transakcji)
    try {
        await pool.query('BEGIN')

        //Token musi zostać unieważniony; (nowego dla danego usera już się nie wygeneruje)
        let resultset = await pool.query('DELETE FROM v2.tokens where token=$1 returning *', [token]);
        let deleted_count = resultset.rowCount;
        console.log(`deleted tokens: ${deleted_count}`);
        if (deleted_count !== 1) {
            console.log(`Vote manipulation detected for token ${token};`);
            throw new Error('invalid vote');
        }

        //Zapis każdego z głosów
        for (const v of votes) {
            console.log(`vote to save: ${JSON.stringify(v)}`);
            await pool.query('INSERT INTO v2.votes(electionid, choiceid, value) VALUES ($1, $2, $3)',
                [v.electionid, v.choiceid, v.value]);
        }

        await pool.query('COMMIT')

    } catch (e) {
        await pool.query('ROLLBACK');
        console.log(`Error of vote saving for token ${token}`);
        return send_error_response(res, 'Error of vote saving', INTERNAL_SERVER_ERROR);
    }

    res.send({"result": 'OK'});
});


// start the Express server
app.listen(PORT, () => {
    console.log(`server started at http://localhost:${PORT}`);
});
