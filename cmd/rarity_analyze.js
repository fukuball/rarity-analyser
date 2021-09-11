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
let traitTypeId = 0;
let punkTraitTypeId = 0;
let punkScoreId = 0;

let traitTypeIdMap = {};
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
    "CREATE TABLE trait_types (" +
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
let insertTraitTypeStmt = db.prepare("INSERT INTO trait_types VALUES (?, ?, ?)");
let insertPuntTraitStmt = db.prepare("INSERT INTO punk_traits VALUES (?, ?, ?, ?)");

collectionData.forEach(element => {
    console.log("Prepare punk: #" + element.id);
    
    insertPunkStmt.run(element.id, element.name, element.description, element.image, element.external_url, element.animation_url);

    element.attributes.forEach(attribute => {

        if (_.isEmpty(attribute.trait_type)) {
            return;
        }

        if (!traitTypeCount.hasOwnProperty(attribute.trait_type)) {
            insertTraitTypeStmt.run(traitTypeId, _.startCase(attribute.trait_type), 0);
            traitTypeIdMap[attribute.trait_type] = traitTypeId;
            traitTypeId = traitTypeId + 1;
            traitTypeCount[attribute.trait_type] = 0 + 1;
        } else {
            traitTypeCount[attribute.trait_type] = traitTypeCount[attribute.trait_type] + 1;
        }

        insertPuntTraitStmt.run(punkTraitTypeId, element.id, traitTypeIdMap[attribute.trait_type], attribute.value);  
        punkTraitTypeId = punkTraitTypeId + 1;          
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
let updateTraitTypeStmt = db.prepare("UPDATE trait_types SET punk_count = :punk_count WHERE id = :id");
for(let traitType in traitTypeCount)
{
    let thisTraitTypeCount = traitTypeCount[traitType];
    let traitTypeId = traitTypeIdMap[traitType];
    updateTraitTypeStmt.run({
        punk_count: thisTraitTypeCount,
        id: traitTypeId
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

for (let i = 0; i < traitTypeId; i++) {
    createScoreTableStmt = createScoreTableStmt + "trait_type_" + i + "_percentile DOUBLE, trait_type_" + i + "_rarity DOUBLE, ";
    insertPunkScoreStmt = insertPunkScoreStmt + ":trait_type_" + i + "_percentile, :trait_type_" + i + "_rarity, ";
}

createScoreTableStmt = createScoreTableStmt + "trait_count INT,  trait_count_percentile DOUBLE, trait_count_rarity DOUBLE, rarity_sum DOUBLE)";
insertPunkScoreStmt = insertPunkScoreStmt + ":trait_count,  :trait_count_percentile, :trait_count_rarity, :rarity_sum)";

db.exec(createScoreTableStmt);
insertPunkScoreStmt = db.prepare(insertPunkScoreStmt);

collectionData.forEach(element => {
    console.log("Analyze punk: #" + element.id);

    let thisPunkTraitTypes = _.map(element.attributes, 'trait_type');

    let punkScore = {};
    let raritySum = 0;
    punkScore['id'] = punkScoreId;
    punkScore['punk_id'] = element.id;
    for(let traitType in traitTypeCount)
    {
        let thisTraitTypeCount = traitTypeCount[traitType];
        let traitTypeId = traitTypeIdMap[traitType];
        if (thisPunkTraitTypes.includes(traitType)) {
            punkScore['trait_type_' + traitTypeId + '_percentile'] = thisTraitTypeCount/totalPunk;
            punkScore['trait_type_' + traitTypeId + '_rarity'] = totalPunk/thisTraitTypeCount;
            raritySum = raritySum + totalPunk/thisTraitTypeCount;
        } else {
            // missing trait
            punkScore['trait_type_' + traitTypeId + '_percentile'] = (totalPunk-thisTraitTypeCount)/totalPunk;
            punkScore['trait_type_' + traitTypeId + '_rarity'] = totalPunk/(totalPunk-thisTraitTypeCount);
            raritySum = raritySum + totalPunk/(totalPunk-thisTraitTypeCount);
        }
    }
    punkScore['trait_count'] = thisPunkTraitTypes.length;
    punkScore['trait_count_percentile'] = punkTraitTypeCount[thisPunkTraitTypes.length]/totalPunk;
    punkScore['trait_count_rarity'] = totalPunk/punkTraitTypeCount[thisPunkTraitTypes.length];
    raritySum = raritySum + totalPunk/punkTraitTypeCount[thisPunkTraitTypes.length];
    punkScore['rarity_sum'] = raritySum;

    insertPunkScoreStmt.run(punkScore);

    punkScoreId = punkScoreId + 1;
});