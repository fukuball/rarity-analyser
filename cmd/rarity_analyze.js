const appRoot = require('app-root-path');
const config = require(appRoot + '/config/config.js');
const collectionData = require(appRoot + '/config/' + config.collection_file_name);
const fs = require('fs');
const Database = require('better-sqlite3');
const _ = require('lodash');
const argv = require('minimist')(process.argv.slice(2),{
    string: ['mode'],
});

let mode = argv['mode'];

const databasePath = appRoot + '/config/' + config.sqlite_file_name;

if (mode != 'force') { 
    if (fs.existsSync(databasePath)) {
        console.log("Database exist.");
        return;
    }
}

fs.writeFileSync(databasePath, '', { flag: 'w' });
console.log("Database created.");

const db = new Database(databasePath);

let totalPunk = 0;
let traitTypeId = 0;
let traitDetailTypeId = 0;
let punkTraitTypeId = 0;
let punkScoreId = 0;

let traitTypeIdMap = {};
let traitTypeCount = {};
let traitDetailTypeIdMap = {};
let traitDetailTypeCount = {};
let punkTraitTypeCount = {};

let ignoreTraits = config.ignore_traits.map(ignore_trait => ignore_trait.toLowerCase());

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
        "trait_data_type TEXT, " +
        "punk_count INT " +
    ")"
);

db.exec(
    "CREATE TABLE trait_detail_types (" +
        "id INT, " +
        "trait_type_id INT, " +
        "trait_detail_type TEXT, " +
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
let insertTraitTypeStmt = db.prepare("INSERT INTO trait_types VALUES (?, ?, ?, ?)");
let insertTraitDetailTypeStmt = db.prepare("INSERT INTO trait_detail_types VALUES (?, ?, ?, ?)");
let insertPuntTraitStmt = db.prepare("INSERT INTO punk_traits VALUES (?, ?, ?, ?)");

let count1 = config.collection_id_from;
collectionData.forEach(element => {

    if (element.id != undefined) {
        element.id = element.id.toString();
    }
    if (element.id == undefined) {
        element['id'] = count1;
    }
    if (_.isEmpty(element.id)) {
        element['id'] = count1;
    }
    if (_.isEmpty(element.name)) {
        element['name'] = config.collection_name + ' #' + element.id;
    }
    if (!element.name.includes('#'+element.id)) {
        element['name'] = element['name'] + ' #' + (count1 + config.collection_id_from);
    }
    if (_.isEmpty(element.description)) {
        element['description'] = '';
    }
    if (_.isEmpty(element.external_url)) {
        element['external_url'] = '';
    }
    if (_.isEmpty(element.animation_url)) {
        element['animation_url'] = '';
    }

    console.log("Prepare punk: #" + element.id);
    
    insertPunkStmt.run(element.id, element.name, element.description, element.image, element.external_url, element.animation_url);

    let thisPunkTraitTypes = [];

    if (_.isEmpty(element.attributes) && !_.isEmpty(element.traits)) {
        element.attributes = [];
        for (const [key, value] of Object.entries(element.traits)) {
            element.attributes.push(
                {
                    trait_type: key,
                    value: value
                }
            );
        }
    }

    // fake data for date
    /*
    element.attributes.push({
        value: '2456221590',
        trait_type: 'date',
        display_type: 'date',
    });
    */

    element.attributes.forEach(attribute => {

        if (attribute.value) {
            attribute.value = attribute.value.toString();
        }

        if (_.isEmpty(attribute.trait_type) || _.isEmpty(attribute.value) || attribute.value.toLowerCase() == 'none' || attribute.value.toLowerCase() == 'nothing' || attribute.value.toLowerCase() == '0') {
            return;
        }

        // Trait type
        if (!traitTypeCount.hasOwnProperty(attribute.trait_type)) {
            let traitDataType = 'string';
            if (!_.isEmpty(attribute.display_type) && attribute.display_type.toLowerCase() == 'date') {
                traitDataType = 'date';
            }
            insertTraitTypeStmt.run(traitTypeId, _.startCase(attribute.trait_type), traitDataType, 0);
            traitTypeIdMap[attribute.trait_type] = traitTypeId;
            traitTypeId = traitTypeId + 1;
            if (!ignoreTraits.includes(attribute.trait_type.toLowerCase())) {
                traitTypeCount[attribute.trait_type] = 0 + 1;
            } else {
                traitTypeCount[attribute.trait_type] = 0;
            }
        } else {
            if (!ignoreTraits.includes(attribute.trait_type.toLowerCase())) {
                traitTypeCount[attribute.trait_type] = traitTypeCount[attribute.trait_type] + 1;
            } else {
                traitTypeCount[attribute.trait_type] = 0;
            }
        }

        // Trait detail type
        if (!traitDetailTypeCount.hasOwnProperty(attribute.trait_type+'|||'+attribute.value)) {
            insertTraitDetailTypeStmt.run(traitDetailTypeId, traitTypeIdMap[attribute.trait_type], attribute.value, 0);
            traitDetailTypeIdMap[attribute.trait_type+'|||'+attribute.value] = traitDetailTypeId;
            traitDetailTypeId = traitDetailTypeId + 1;
            if (!ignoreTraits.includes(attribute.trait_type.toLowerCase())) {
                traitDetailTypeCount[attribute.trait_type+'|||'+attribute.value] = 0 + 1;
            } else {
                traitDetailTypeCount[attribute.trait_type+'|||'+attribute.value] = 0;
            }
        } else {
            if (!ignoreTraits.includes(attribute.trait_type.toLowerCase())) {
                traitDetailTypeCount[attribute.trait_type+'|||'+attribute.value] = traitDetailTypeCount[attribute.trait_type+'|||'+attribute.value] + 1; 
            } else {
                traitDetailTypeCount[attribute.trait_type+'|||'+attribute.value] = 0;
            }  
        }

        insertPuntTraitStmt.run(punkTraitTypeId, element.id, traitTypeIdMap[attribute.trait_type], attribute.value);  
        punkTraitTypeId = punkTraitTypeId + 1;
        
        if (!ignoreTraits.includes(attribute.trait_type.toLowerCase())) {
            thisPunkTraitTypes.push(attribute.trait_type);
        }
    });

    if (!punkTraitTypeCount.hasOwnProperty(thisPunkTraitTypes.length)) {
        punkTraitTypeCount[thisPunkTraitTypes.length] = 0 + 1;
    } else {
        punkTraitTypeCount[thisPunkTraitTypes.length] = punkTraitTypeCount[thisPunkTraitTypes.length] + 1;
    }

    totalPunk = totalPunk + 1;
    count1 = count1 + 1;
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
console.log(traitDetailTypeCount);
let updateTraitDetailTypeStmt = db.prepare("UPDATE trait_detail_types SET punk_count = :punk_count WHERE id = :id");
for(let traitDetailType in traitDetailTypeCount)
{
    let thisTraitDetailTypeCount = traitDetailTypeCount[traitDetailType];
    let traitDetailTypeId = traitDetailTypeIdMap[traitDetailType];
    updateTraitDetailTypeStmt.run({
        punk_count: thisTraitDetailTypeCount,
        id: traitDetailTypeId
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
    createScoreTableStmt = createScoreTableStmt + "trait_type_" + i + "_percentile DOUBLE, trait_type_" + i + "_rarity DOUBLE, trait_type_" + i + "_value TEXT, ";
    insertPunkScoreStmt = insertPunkScoreStmt + ":trait_type_" + i + "_percentile, :trait_type_" + i + "_rarity, :trait_type_" + i + "_value, ";
}

createScoreTableStmt = createScoreTableStmt + "trait_count INT,  trait_count_percentile DOUBLE, trait_count_rarity DOUBLE, rarity_sum DOUBLE, rarity_rank INT)";
insertPunkScoreStmt = insertPunkScoreStmt + ":trait_count,  :trait_count_percentile, :trait_count_rarity, :rarity_sum, :rarity_rank)";

db.exec(createScoreTableStmt);
insertPunkScoreStmt = db.prepare(insertPunkScoreStmt);

let count2 = config.collection_id_from;
collectionData.forEach(element => {
    
    if (element.id != undefined) {
        element.id = element.id.toString();
    }
    if (_.isEmpty(element.id)) {
        element['id'] = count2;
    }

    console.log("Analyze punk: #" + element.id);

    let thisPunkTraitTypes = [];
    let thisPunkDetailTraits = {};

    if (_.isEmpty(element.attributes) && !_.isEmpty(element.traits)) {
        element.attributes = [];
        for (const [key, value] of Object.entries(element.traits)) {
            element.attributes.push(
                {
                    trait_type: key,
                    value: value
                }
            );
        }
    }

    element.attributes.forEach(attribute => {

        if (attribute.value) {
            attribute.value = attribute.value.toString();
        }
        
        if (_.isEmpty(attribute.trait_type) || _.isEmpty(attribute.value) || attribute.value.toLowerCase() == 'none' || attribute.value.toLowerCase() == 'nothing' || attribute.value.toLowerCase() == '0') {
            return;
        }

        thisPunkTraitTypes.push(attribute.trait_type);
        thisPunkDetailTraits[attribute.trait_type] = attribute.value;
    });

    let punkScore = {};
    let raritySum = 0;
    punkScore['id'] = punkScoreId;
    punkScore['punk_id'] = element.id;
    for(let traitType in traitTypeCount)
    {
        
        if (thisPunkTraitTypes.includes(traitType)) {
            // has trait
            let traitDetailType = thisPunkDetailTraits[traitType];
            let thisTraitDetailTypeCount = traitDetailTypeCount[traitType+'|||'+traitDetailType];
            let traitTypeId = traitTypeIdMap[traitType];
            if (!ignoreTraits.includes(traitType.toLowerCase())) {
                punkScore['trait_type_' + traitTypeId + '_percentile'] = thisTraitDetailTypeCount/totalPunk;
                punkScore['trait_type_' + traitTypeId + '_rarity'] = totalPunk/thisTraitDetailTypeCount;
                raritySum = raritySum + totalPunk/thisTraitDetailTypeCount;
            } else {
                punkScore['trait_type_' + traitTypeId + '_percentile'] = 0;
                punkScore['trait_type_' + traitTypeId + '_rarity'] = 0;
                raritySum = raritySum + 0;
            }
            punkScore['trait_type_' + traitTypeId + '_value'] = traitDetailType;
        } else {   
            // missing trait
            let thisTraitTypeCount = traitTypeCount[traitType];
            let traitTypeId = traitTypeIdMap[traitType];
            if (!ignoreTraits.includes(traitType.toLowerCase())) {
                punkScore['trait_type_' + traitTypeId + '_percentile'] = (totalPunk-thisTraitTypeCount)/totalPunk;
                punkScore['trait_type_' + traitTypeId + '_rarity'] = totalPunk/(totalPunk-thisTraitTypeCount);
                raritySum = raritySum + totalPunk/(totalPunk-thisTraitTypeCount);
            } else {
                punkScore['trait_type_' + traitTypeId + '_percentile'] = 0;
                punkScore['trait_type_' + traitTypeId + '_rarity'] = 0;
                raritySum = raritySum + 0;
            }
            punkScore['trait_type_' + traitTypeId + '_value'] = 'None';
        }
    }


    thisPunkTraitTypes = thisPunkTraitTypes.filter(thisPunkTraitType => !ignoreTraits.includes(thisPunkTraitType));
    let thisPunkTraitTypeCount = thisPunkTraitTypes.length;

    punkScore['trait_count'] = thisPunkTraitTypeCount;
    punkScore['trait_count_percentile'] = punkTraitTypeCount[thisPunkTraitTypeCount]/totalPunk;
    punkScore['trait_count_rarity'] = totalPunk/punkTraitTypeCount[thisPunkTraitTypeCount];
    raritySum = raritySum + totalPunk/punkTraitTypeCount[thisPunkTraitTypeCount];
    punkScore['rarity_sum'] = raritySum;
    punkScore['rarity_rank'] = 0;

    insertPunkScoreStmt.run(punkScore);

    punkScoreId = punkScoreId + 1;
    count2 = count2 + 1;
});

const punkScoreStmt = db.prepare('SELECT rarity_sum FROM punk_scores WHERE punk_id = ?');
const punkRankStmt = db.prepare('SELECT COUNT(id) as higherRank FROM punk_scores WHERE rarity_sum > ?');
let updatPunkRankStmt = db.prepare("UPDATE punk_scores SET rarity_rank = :rarity_rank WHERE punk_id = :punk_id");

let count3 = config.collection_id_from;
collectionData.forEach(element => {
    if (element.id != undefined) {
        element.id = element.id.toString();
    }
    if (_.isEmpty(element.id)) {
        element['id'] = count3;
    }

    console.log("Ranking punk: #" + element.id);
    let punkScore = punkScoreStmt.get(element.id);
    let punkRank = punkRankStmt.get(punkScore.rarity_sum);
    updatPunkRankStmt.run({
        rarity_rank: punkRank.higherRank+1,
        punk_id: element.id
    });
    count3 = count3 + 1;
});