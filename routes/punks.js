const appRoot = require('app-root-path');
const config = require(appRoot + '/config/config.js');
const express = require('express');
const router = express.Router();
const fs = require('fs');
const Database = require('better-sqlite3');
const jsondata = require(appRoot + '/modules/jsondata.js');
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

  let title = config.collection_name + ' | ' + config.app_name;
  let description = config.collection_description + ' | ' + config.app_description
  if (!_.isEmpty(punk)) {
    title = punk.name + ' | ' + config.app_name;
  }
  
  res.render('punk', { 
    app_title: title,
    app_description: description,
    ogTitle: title,
    ogDescription: description,
    ogUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
    ogImage: punk ? punk.image.replace('ipfs://', 'https://ipfs.io/ipfs/'): config.main_og_image,
    activeTab: 'rarity',
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

  let punkData = jsondata.punk(punk);
  
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    status: 'success',
    message: 'success',
    punk: punkData
  }));
});

router.get('/:id/similar', function(req, res, next) {
  let punkId = req.params.id;

  let punk = db.prepare('SELECT punks.*, punk_scores.rarity_rank FROM punks INNER JOIN punk_scores ON (punks.id = punk_scores.punk_id) WHERE punks.id = ?').get(punkId);
  let punkScore = db.prepare('SELECT punk_scores.* FROM punk_scores WHERE punk_scores.punk_id = ?').get(punkId);
  let allTraitTypes = db.prepare('SELECT trait_types.* FROM trait_types').all();
  let similarCondition = '';
  let similarTo = {};
  allTraitTypes.forEach(traitType => {
    similarCondition = similarCondition + 'IIF(punk_scores.trait_type_'+traitType.id+'_percentile = :trait_type_'+traitType.id+', 1 * (1-punk_scores.trait_type_'+traitType.id+'_percentile), 0) + ';
    similarTo['trait_type_'+traitType.id] = punkScore['trait_type_'+traitType.id+'_percentile'];
  });
  similarTo['trait_count'] = punkScore['trait_count'];
  similarTo['this_punk_id'] = punkId;

  let similarPunks = db.prepare(`
    SELECT
      punks.*,
      punk_scores.punk_id, 
      (
        ` 
        + similarCondition +
        `
        IIF(punk_scores.trait_count = :trait_count, 1 * (1-punk_scores.trait_count_percentile), 0)
      )
      similar 
    FROM punk_scores  
    INNER JOIN punks ON (punk_scores.punk_id = punks.id)
    WHERE punk_scores.punk_id != :this_punk_id
    ORDER BY similar desc
    LIMIT 12
    `).all(similarTo);

  let title = config.collection_name + ' | ' + config.app_name;
  let description = config.collection_description + ' | ' + config.app_description
  if (!_.isEmpty(punk)) {
    title = punk.name + ' | ' + config.app_name;
  }

  res.render('similar_punks', { 
    app_title: title,
    app_description: description,
    ogTitle: title,
    ogDescription: description,
    ogUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
    ogImage: punk ? punk.image.replace('ipfs://', 'https://ipfs.io/ipfs/'): config.main_og_image,
    activeTab: 'rarity',
    punk: punk,
    similarPunks: similarPunks,
    _: _
  });
});

module.exports = router;
