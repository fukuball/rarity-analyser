const appRoot = require('app-root-path');
const config = require(appRoot + '/config/config.js');
const express = require('express');
const router = express.Router();
const fs = require('fs');
const Database = require('better-sqlite3');
const _ = require('lodash');
const MarkdownIt = require('markdown-it'),
    md = new MarkdownIt();

let databasePath = appRoot + '/config/' + config.sqlite_file_name;

if (!fs.existsSync(databasePath)) {
  databasePath = appRoot + '/config/database.sqlite.sample';
}

const db = new Database(databasePath);

/* GET punks listing. */
router.get('/:id', function(req, res, next) {
  let punkId = req.params.id;

  let punk = db.prepare('SELECT punks.*, punk_scores.rarity_rank FROM punks INNER JOIN punk_scores ON (punks.id = punk_scores.punk_id) WHERE punks.id = ?').get(punkId);
  let punkScore = db.prepare('SELECT punk_scores.* FROM punk_scores WHERE punk_scores.punk_id = ?').get(punkId);
  let allTraitTypes = db.prepare('SELECT trait_types.* FROM trait_types').all();
  let allDetailTraitTypes = db.prepare('SELECT trait_detail_types.* FROM trait_detail_types').all();
  let allTraitCountTypes = db.prepare('SELECT punk_trait_counts.* FROM punk_trait_counts').all();

  let punkTraits = db.prepare('SELECT punk_traits.* FROM punk_traits WHERE punk_traits.punk_id = ?').all(punkId);
  let totalPunkCount = db.prepare('SELECT COUNT(id) as punk_total FROM punks').get().punk_total;

  let punkTraitData = {};
  punkTraits.forEach(punkTrait => {
    punkTraitData[punkTrait.trait_type_id] = punkTrait.value;
  });

  let allDetailTraitTypesData = {};
  allDetailTraitTypes.forEach(detailTrait => {
    allDetailTraitTypesData[detailTrait.trait_detail_type] = detailTrait.punk_count;
  });

  let allTraitCountTypesData = {};
  allTraitCountTypes.forEach(traitCount => {
    allTraitCountTypesData[traitCount.trait_count] = traitCount.punk_count;
  });

  let title = config.app_name;
  if (!_.isEmpty(punk)) {
    title = punk.name;
  }
  res.render('punk', { 
    title: title,
    ogUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
    ogImage: punk ? punk.image.replace('ipfs://', 'https://ipfs.io/ipfs/'): config.main_og_image,
    punk: punk, 
    punkScore: punkScore, 
    allTraitTypes: allTraitTypes, 
    allDetailTraitTypesData: allDetailTraitTypesData, 
    allTraitCountTypesData: allTraitCountTypesData, 
    punkTraitData: punkTraitData, 
    totalPunkCount: totalPunkCount, 
    _: _,
    md: md
  });
});

router.get('/:id/json', function(req, res, next) {
  let punkId = req.params.id;
  let punk = db.prepare('SELECT punks.*, punk_scores.rarity_rank FROM punks INNER JOIN punk_scores ON (punks.id = punk_scores.punk_id) WHERE punks.id = ?').get(punkId);
  
  if (_.isEmpty(punk)) {
    res.end(JSON.stringify({
      status: 'fail',
      message: 'not_exist',
    }));
  }

  let punkTraits = db.prepare('SELECT punk_traits.trait_type_id, trait_types.trait_type, punk_traits.value  FROM punk_traits INNER JOIN trait_types ON (punk_traits.trait_type_id = trait_types.id) WHERE punk_traits.punk_id = ?').all(punkId);
  let punkScore = db.prepare('SELECT punk_scores.* FROM punk_scores WHERE punk_scores.punk_id = ?').get(punkId);
  let allTraitTypes = db.prepare('SELECT trait_types.* FROM trait_types').all();
  
  let punkTraitsData = [];
  let punkTraitIDs = [];
  punkTraits.forEach(punkTrait => {
    let percentile = punkScore['trait_type_'+punkTrait.trait_type_id+'_percentile'];
    let rarity_score = punkScore['trait_type_'+punkTrait.trait_type_id+'_rarity'];
    punkTraitsData.push({
      trait_type: punkTrait.trait_type,
      value: punkTrait.value,
      percentile: percentile,
      rarity_score: rarity_score,
    });
    punkTraitIDs.push(punkTrait.trait_type_id);
  });

  let missingTraitsData = [];
  allTraitTypes.forEach(traitType => {
    if (!punkTraitIDs.includes(traitType.id)) {
      let percentile = punkScore['trait_type_'+traitType.id+'_percentile'];
      let rarity_score = punkScore['trait_type_'+traitType.id+'_rarity'];
      missingTraitsData.push({
        trait_type: traitType.trait_type,
        percentile: percentile,
        rarity_score: rarity_score,
      });
    }
  });
  
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    status: 'success',
    message: 'success',
    punk: {
      id: punk.id,
      name: punk.name,
      image: punk.image,
      attributes: punkTraitsData,
      missing_traits: missingTraitsData,
      trait_count: {
        count: punkScore.trait_count,
        percentile: punkScore.trait_count_percentile,
        rarity_score: punkScore.trait_count_rarity
      },
      rarity_score: punkScore.rarity_sum,
      rarity_rank: punkScore.rarity_rank
    }
  }));
});

module.exports = router;
