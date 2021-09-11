const appRoot = require('app-root-path');
const config = require(appRoot + '/config/config.js');
const collectionData = require(appRoot + '/config/' + config.collection_file_name);
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const databasePath = appRoot + '/config/' + config.sqlite_file_name;

/*if (fs.existsSync(databasePath)) {
    console.log("Database Exist.");
    return;
}*/

fs.writeFile(databasePath, '', { flag: 'w' }, function (err) {
    if (err) throw err;
    console.log("Database Created.");
});

const db = new sqlite3.Database(databasePath, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database.');
});

db.serialize(function() {
    db.run(
        "CREATE TABLE punks (" +
            "id INT, " +
            "name TEXT, " +
            "description TEXT, " + 
            "image TEXT, " +
            "external_url TEXT, " +
            "animation_url TEXT " +
        ")"
    );

    db.run(
        "CREATE TABLE traits (" +
            "id INT, " +
            "trait_type TEXT " +
        ")"
    );

    db.run(
        "CREATE TABLE punk_traits (" +
            "id INT, " +
            "punk_id INT, " +
            "trait_type_id INT, " + 
            "value TEXT " +
        ")"
    );

    let insertPunkStmt = db.prepare("INSERT INTO punks VALUES (?, ?, ?, ?, ?, ?)");
    collectionData.forEach(element => {
        console.log("Process punk: #" + element.id);
        
        insertPunkStmt.run(element.id, element.name, element.description, element.image, element.external_url, element.animation_url);
    });

    /*
    punk_scores
    id
    punk_id
    trait_type_1_percentile DOUBLE
    trait_type_1_rarity DOUBLE
    ...
    trait_count INT
    trait_count_percentile DOUBLE
    trait_count_rarity DOUBLE
    */
});