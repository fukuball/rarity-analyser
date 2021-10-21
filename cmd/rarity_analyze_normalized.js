const appRoot = require('app-root-path');
const config = require(appRoot + '/config/config.js');
const fs = require('fs');
const Database = require('better-sqlite3');
const argv = require('minimist')(process.argv.slice(2),{
    string: ['mode'],
});

let mode = argv['mode'];

let ignoreTraits = config.ignore_traits.map(ignore_trait => ignore_trait.toLowerCase());

const databasePath = appRoot + '/config/' + config.sqlite_file_name;

if (!fs.existsSync(databasePath)) {
    console.log("Database not exist.");
    return;
}

const db = new Database(databasePath);

if (mode != 'force') {
    let checkTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='normalized_punk_scores'").get();
    if (checkTable) {
        if (checkTable.name == 'normalized_punk_scores') {
            console.log("Database exist.");
            return;
        }
    }
}

let allTraitTypes = db.prepare('SELECT trait_types.* FROM trait_types').all();
let allTraitTypeCount = db.prepare('SELECT trait_type_id, COUNT(trait_type_id) as trait_type_count, SUM(punk_count) trait_type_sum FROM trait_detail_types GROUP BY trait_type_id').all();
let traitCountNum = db.prepare('SELECT COUNT(*) as trait_count_num FROM punk_trait_counts').get().trait_count_num;
let traitCounts = db.prepare('SELECT * FROM punk_trait_counts').all();
let totalSupply = db.prepare('SELECT COUNT(punks.id) as punk_total FROM punks').get().punk_total;
let allTraits = db.prepare('SELECT trait_types.trait_type, trait_detail_types.trait_detail_type, trait_detail_types.punk_count, trait_detail_types.trait_type_id, trait_detail_types.id trait_detail_type_id  FROM trait_detail_types INNER JOIN trait_types ON (trait_detail_types.trait_type_id = trait_types.id) ORDER BY trait_types.trait_type, trait_detail_types.trait_detail_type').all();

let traitTypeCountSum = 0 + traitCountNum;
let traitTypeNum = 0 + 1;
let missingTraitTypeId = [];
let traitTypeRarityScoreSum = [];
let traitTypeCountNum = [];
let traitTypeValueCount = [];
allTraitTypeCount.forEach(traitTypeCount => {

    let thisTraitType = db.prepare('SELECT trait_types.* FROM trait_types WHERE id = ?').get(traitTypeCount.trait_type_id);
    if (ignoreTraits.includes(thisTraitType.trait_type.toLowerCase())) {
        traitTypeRarityScoreSum[traitTypeCount.trait_type_id] = 0;
        traitTypeCountNum[traitTypeCount.trait_type_id] = 0;
        traitTypeValueCount[traitTypeCount.trait_type_id] = 0;
    } else {
        let hasMissingTrait = (traitTypeCount.trait_type_sum != totalSupply) ? 1 : 0;
        if (hasMissingTrait) {
            missingTraitTypeId.push(traitTypeCount.trait_type_id);
            traitTypeRarityScoreSum[traitTypeCount.trait_type_id] = totalSupply/(totalSupply-traitTypeCount.trait_type_sum);
        } else {
            traitTypeRarityScoreSum[traitTypeCount.trait_type_id] = 0;    
        }
        traitTypeCountNum[traitTypeCount.trait_type_id] = traitTypeCount.trait_type_count + hasMissingTrait;
        traitTypeCountSum = traitTypeCountSum + (traitTypeCount.trait_type_count + hasMissingTrait);
        traitTypeNum = traitTypeNum + 1;

        traitTypeValueCount[traitTypeCount.trait_type_id] = traitTypeCount.trait_type_count + hasMissingTrait;
    }
});
traitTypeValueCount[allTraitTypes.length] = traitCountNum;
let meanValueCount = traitTypeCountSum/traitTypeNum;

allTraits.forEach(detailTrait => {
    traitTypeRarityScoreSum[detailTrait.trait_type_id] = traitTypeRarityScoreSum[detailTrait.trait_type_id] +
        totalSupply/detailTrait.punk_count;
});
traitTypeRarityScoreSum[allTraitTypes.length] = 0;
traitCounts.forEach(traitCount => {
    traitTypeRarityScoreSum[allTraitTypes.length] = traitTypeRarityScoreSum[allTraitTypes.length] + 
        totalSupply/traitCount.punk_count;
}); 

let traitTypeMeanRarity = [];
allTraitTypes.forEach(traitType => {
    if (ignoreTraits.includes(traitType.trait_type.toLowerCase())) {
        traitTypeMeanRarity[traitType.id] = 0;
    } else {
        traitTypeMeanRarity[traitType.id] = traitTypeRarityScoreSum[traitType.id]/traitTypeCountNum[traitType.id];
    }
});
traitTypeMeanRarity[allTraitTypes.length] = traitTypeRarityScoreSum[allTraitTypes.length]/traitCountNum;
let meanRarity = traitTypeMeanRarity.reduce((a,b) => a + b, 0) / traitTypeMeanRarity.length;

console.log(traitTypeValueCount);
console.log(meanValueCount);
console.log(traitTypeMeanRarity);
console.log(meanRarity);

let createScoreTableStmt = "CREATE TABLE normalized_punk_scores ( id INT, punk_id INT, ";
let insertPunkScoreStmt = "INSERT INTO normalized_punk_scores VALUES (:id, :punk_id, ";

allTraitTypes.forEach(traitType => {
    createScoreTableStmt = createScoreTableStmt + "trait_type_" + traitType.id + "_percentile DOUBLE, trait_type_" + traitType.id + "_rarity DOUBLE, trait_type_" + traitType.id + "_value TEXT, ";
    insertPunkScoreStmt = insertPunkScoreStmt + ":trait_type_" + traitType.id + "_percentile, :trait_type_" + traitType.id + "_rarity, :trait_type_" + traitType.id + "_value, ";
});

createScoreTableStmt = createScoreTableStmt + "trait_count INT,  trait_count_percentile DOUBLE, trait_count_rarity DOUBLE, rarity_sum DOUBLE, rarity_rank INT)";
insertPunkScoreStmt = insertPunkScoreStmt + ":trait_count,  :trait_count_percentile, :trait_count_rarity, :rarity_sum, :rarity_rank)";

db.exec(createScoreTableStmt);
insertPunkScoreStmt = db.prepare(insertPunkScoreStmt);

let punkScores = db.prepare('SELECT * FROM punk_scores').all();

punkScores.forEach(punkScore => {

    console.log("Normalize punk: #" + punkScore.id);

    let raritySum = 0;
    let normalizedPunkScore = {};
    normalizedPunkScore['id'] = punkScore.id;
    normalizedPunkScore['punk_id'] = punkScore.punk_id;
    
    for (let i = 0; i < traitTypeMeanRarity.length; i++) {
        let a = 0;
        if (traitTypeMeanRarity[i] >= meanRarity) {
            a = (traitTypeMeanRarity[i] - meanRarity) / traitTypeMeanRarity[i];
        } else {
            a = (meanRarity - traitTypeMeanRarity[i]) / meanRarity;
        }

        let b = 0;
        if (traitTypeValueCount[i] >= meanValueCount) {
            b = (traitTypeValueCount[i] - meanValueCount) / traitTypeValueCount[i];
        } else {
            b = (meanValueCount - traitTypeValueCount[i]) / meanValueCount;
        }

        let c = traitTypeValueCount[i] >= meanValueCount ? 1 - b : 1 + b;
        let r = (i == traitTypeMeanRarity.length - 1) ? punkScore['trait_count_rarity'] : punkScore['trait_type_' + i + '_rarity'];
        let rarity_score_normalized = 0;

        if (a >= b && ((traitTypeMeanRarity[i] > meanRarity && traitTypeValueCount[i] > meanValueCount) || (traitTypeMeanRarity[i] < meanRarity && traitTypeValueCount[i] < meanValueCount))) {
          rarity_score_normalized = (r - (a - b) * r) * c + (a - b) * r;
        } else {
          rarity_score_normalized = (r - a * r) * c + a * r;
        }

        //console.log(i);
        //console.log(r);
        //console.log(rarity_score_normalized);

        if ((i == traitTypeMeanRarity.length - 1)) {
            normalizedPunkScore['trait_count'] = punkScore['trait_count'];
            normalizedPunkScore['trait_count_percentile'] = punkScore['trait_count_percentile'];
            normalizedPunkScore['trait_count_rarity'] = rarity_score_normalized;
            raritySum = raritySum + rarity_score_normalized;
            normalizedPunkScore['rarity_sum'] = raritySum;
            normalizedPunkScore['rarity_rank'] = 0;
        } else {
            if (!ignoreTraits.includes(punkScore['trait_type_' + i + '_value'].toLowerCase())) {
                normalizedPunkScore['trait_type_' + i + '_percentile'] = punkScore['trait_type_' + i + '_percentile'];
                normalizedPunkScore['trait_type_' + i + '_rarity'] = rarity_score_normalized;
                raritySum = raritySum + rarity_score_normalized;
            } else {
                normalizedPunkScore['trait_type_' + i + '_percentile'] = 0;
                normalizedPunkScore['trait_type_' + i + '_rarity'] = 0;
                raritySum = raritySum + 0;
            }
            normalizedPunkScore['trait_type_' + i + '_value'] = punkScore['trait_type_' + i + '_value'];
        }
    }

    //console.log(normalizedPunkScore);

    insertPunkScoreStmt.run(normalizedPunkScore);
});

const punkScoreStmt = db.prepare('SELECT rarity_sum FROM normalized_punk_scores WHERE punk_id = ?');
const punkRankStmt = db.prepare('SELECT COUNT(id) as higherRank FROM normalized_punk_scores WHERE rarity_sum > ?');
let updatPunkRankStmt = db.prepare("UPDATE normalized_punk_scores SET rarity_rank = :rarity_rank WHERE punk_id = :punk_id");

punkScores.forEach(punkScore => {
    console.log("Normalized ranking punk: #" + punkScore.punk_id);
    let normalizedPunkScore = punkScoreStmt.get(punkScore.punk_id);
    let punkRank = punkRankStmt.get(normalizedPunkScore.rarity_sum);
    updatPunkRankStmt.run({
        rarity_rank: punkRank.higherRank+1,
        punk_id: punkScore.punk_id
    });
});