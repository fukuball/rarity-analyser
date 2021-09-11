var appRoot = require('app-root-path');
var config = require(appRoot + '/config/config.js');
var collectionData = require(appRoot + '/config/' + config.collection_file_name);
var fs = require('fs');
var sqlite3 = require('sqlite3').verbose();

var databasePath = appRoot + '/config/' + config.sqlite_file_name;

/*if (fs.existsSync(databasePath)) {
    console.log("Database Exist.");
    return;
}*/

fs.writeFile(databasePath, '', { flag: 'w' }, function (err) {
    if (err) throw err;
    console.log("Database Created.");
});

let db = new sqlite3.Database(databasePath, (err) => {
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

    /*var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
    for (var i = 0; i < 10; i++) {
        stmt.run("Ipsum " + i);
    }
    stmt.finalize();

    db.each("SELECT rowid AS id, info FROM lorem", function(err, row) {
        console.log(row.id + ": " + row.info);
    });*/
});

/*collectionData.forEach(element => {
    console.log(element);
});*/