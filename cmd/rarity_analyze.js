const appRoot = require('app-root-path');
const config = require(appRoot + '/config/config.js');
const collectionData = require(appRoot + '/config/' + config.collection_file_name);
const fs = require('fs');
const Database = require('better-sqlite3');
const _ = require('lodash');

const databasePath = appRoot + '/config/' + config.sqlite_file_name;

/*if (fs.existsSync(databasePath)) {
    console.log("Database exist.");
    return;
}*/

fs.writeFileSync(databasePath, '', { flag: 'w' });
console.log("Database created.");

const db = new Database(databasePath);

let totalPunk = 0;
let traitId = 0;
let punkTraitId = 0;
let punkScoreId = 0;

let traitIdMap = {};
let traitTypeCount = {};
let punkTraitTypeCount = {};

db.exec(
    "CREATE TABLE punks (" +
        "id INT, " +
        "name TEXT, " +
        "description TEXT, " + 
        "image TEXT, " +
        "external_url TEXT, " +
        "animation_url TEXT " +
    ")"
);

db.exec(
    "CREATE TABLE traits (" +
        "id INT, " +
        "trait_type TEXT, " +
        "punk_count INT " +
    ")"
);

db.exec(
    "CREATE TABLE punk_traits (" +
        "id INT, " +
        "punk_id INT, " +
        "trait_type_id INT, " + 
        "value TEXT " +
    ")"
);

db.exec(
    "CREATE TABLE punk_trait_counts (" +
        "trait_count INT, " +
        "punk_count INT " +
    ")"
);

let insertPunkStmt = db.prepare("INSERT INTO punks VALUES (?, ?, ?, ?, ?, ?)");
let insertTraitStmt = db.prepare("INSERT INTO traits VALUES (?, ?, ?)");
let insertPuntTraitStmt = db.prepare("INSERT INTO punk_traits VALUES (?, ?, ?, ?)");

collectionData.forEach(element => {
    console.log("Prepare punk: #" + element.id);
    
    insertPunkStmt.run(element.id, element.name, element.description, element.image, element.external_url, element.animation_url);

    element.attributes.forEach(attribute => {

        if (_.isEmpty(attribute.trait_type)) {
            return;
        }

        if (!traitTypeCount.hasOwnProperty(attribute.trait_type)) {
            insertTraitStmt.run(traitId, _.startCase(attribute.trait_type), 0);
            traitIdMap[attribute.trait_type] = traitId;
            traitId = traitId + 1;
            traitTypeCount[attribute.trait_type] = 0 + 1;
        } else {
            traitTypeCount[attribute.trait_type] = traitTypeCount[attribute.trait_type] + 1;
        }

        insertPuntTraitStmt.run(punkTraitId, element.id, traitIdMap[attribute.trait_type], attribute.value);  
        punkTraitId = punkTraitId + 1;          
    });

    let thisPunkTraitTypes = _.map(element.attributes, 'trait_type');

    if (!punkTraitTypeCount.hasOwnProperty(thisPunkTraitTypes.length)) {
        punkTraitTypeCount[thisPunkTraitTypes.length] = 0 + 1;
    } else {
        punkTraitTypeCount[thisPunkTraitTypes.length] = punkTraitTypeCount[thisPunkTraitTypes.length] + 1;
    }

    totalPunk = totalPunk + 1;
});

console.log(traitTypeCount);
let updateTraitStmt = db.prepare("UPDATE traits SET punk_count = :punk_count WHERE id = :id");
for(let traitType in traitTypeCount)
{
    let thisTraitTypeCount = traitTypeCount[traitType];
    let traitId = traitIdMap[traitType];
    updateTraitStmt.run({
        punk_count: thisTraitTypeCount,
        id: traitId
    });
}
console.log(punkTraitTypeCount);
let insertPunkTraitContStmt = db.prepare("INSERT INTO punk_trait_counts VALUES (?, ?)");
for(let countType in punkTraitTypeCount)
{
    let thisTypeCount = punkTraitTypeCount[countType];
    insertPunkTraitContStmt.run(countType, thisTypeCount);
}

let createScoreTableStmt = "CREATE TABLE punk_scores ( id INT, punk_id INT, ";
let insertPunkScoreStmt = "INSERT INTO punk_scores VALUES (:id, :punk_id, ";

for (let i = 0; i < traitId; i++) {
    createScoreTableStmt = createScoreTableStmt + "trait_type_" + i + "_percentile DOUBLE, trait_type_" + i + "_rarity DOUBLE, ";
    insertPunkScoreStmt = insertPunkScoreStmt + ":trait_type_" + i + "_percentile, :trait_type_" + i + "_rarity, ";
}

createScoreTableStmt = createScoreTableStmt + "trait_count INT,  trait_count_percentile DOUBLE, trait_count_rarity DOUBLE)";
insertPunkScoreStmt = insertPunkScoreStmt + ":trait_count,  :trait_count_percentile, :trait_count_rarity)";

db.exec(createScoreTableStmt);
insertPunkScoreStmt = db.prepare(insertPunkScoreStmt);

collectionData.forEach(element => {
    console.log("Analyze punk: #" + element.id);

    let thisPunkTraitTypes = _.map(element.attributes, 'trait_type');

    let punkScore = {};
    punkScore['id'] = punkScoreId;
    punkScore['punk_id'] = element.id;
    for(let traitType in traitTypeCount)
    {
        let thisTraitTypeCount = traitTypeCount[traitType];
        let traitId = traitIdMap[traitType];
        if (thisPunkTraitTypes.includes(traitType)) {
            punkScore['trait_type_' + traitId + '_percentile'] = thisTraitTypeCount/totalPunk;
            punkScore['trait_type_' + traitId + '_rarity'] = totalPunk/thisTraitTypeCount;
        } else {
            // missing trait
            punkScore['trait_type_' + traitId + '_percentile'] = (totalPunk-thisTraitTypeCount)/totalPunk;
            punkScore['trait_type_' + traitId + '_rarity'] = totalPunk/(totalPunk-thisTraitTypeCount);
        }
    }
    punkScore['trait_count'] = thisPunkTraitTypes.length;
    punkScore['trait_count_percentile'] = punkTraitTypeCount[thisPunkTraitTypes.length]/totalPunk;
    punkScore['trait_count_rarity'] = totalPunk/punkTraitTypeCount[thisPunkTraitTypes.length];
    
    insertPunkScoreStmt.run(punkScore);

    punkScoreId = punkScoreId + 1;
});