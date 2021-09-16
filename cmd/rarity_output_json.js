const appRoot = require('app-root-path');
const config = require(appRoot + '/config/config.js');
const Database = require('better-sqlite3');
const jsondata = require(appRoot + '/modules/jsondata.js');
const fs = require('fs');

let databasePath = appRoot + '/config/' + config.sqlite_file_name;

if (!fs.existsSync(databasePath)) {
  databasePath = appRoot + '/config/database.sqlite.sample';
}

const db = new Database(databasePath);
const outputPath = appRoot + '/config/collection-rarities.json';

fs.truncateSync(outputPath);

const logger = fs.createWriteStream(outputPath, {
  flags: 'a'
});

logger.write("[\n");

let totalPunkCount = db.prepare('SELECT COUNT(id) as punk_total FROM punks').get().punk_total;
let punks = db.prepare('SELECT punks.* FROM punks ORDER BY id').all();

let count = 0;
punks.forEach(punk => {
    console.log("Process punk: #" + punk.id);
    if ((count+1) == totalPunkCount) {
        logger.write(JSON.stringify(jsondata.punk(punk))+"\n");
    } else {
        logger.write(JSON.stringify(jsondata.punk(punk))+",\n");
    }
    count++
});

logger.write("]");

logger.end();