const appRoot = require('app-root-path');
const config = require(appRoot + '/config/config.js');
const express = require('express');
const router = express.Router();
const fs = require('fs');
const Database = require('better-sqlite3');
const _ = require('lodash');

let databasePath = appRoot + '/config/' + config.sqlite_file_name;

if (!fs.existsSync(databasePath)) {
  databasePath = appRoot + '/config/database.sqlite.sample';
}

const db = new Database(databasePath);

/* GET home page. */
router.get('/', function(req, res, next) {

  let search = req.query.search;
  let traits = req.query.traits;
  let orderBy = req.query.order_by;
  let page = req.query.page;

  let offset = 0;
  let limit = 60;

  if (_.isEmpty(search)) {
    search = '';
  }

  if (_.isEmpty(traits)) {
    traits = '';
  }

  if (orderBy == 'rarity' || orderBy == 'id') {
    orderBy = orderBy;
  } else {
    orderBy = 'rarity';
  }

  if (!_.isEmpty(page)) {
    page = parseInt(page);
    if (!isNaN(page)) {
      offset = (Math.abs(page) - 1) * limit;
    } else {
      page = 1;
    }
  } else {
    page = 1;
  }

  let selectedTraits = (traits != '') ? traits.split(',') : [];
  let totalPunkCount = 0
  let punks = null;
  let orderByStmt = '';
  if (orderBy == 'rarity') {
    orderByStmt = 'ORDER BY punk_scores.rarity_rank ASC';
  } else {
    orderByStmt = 'ORDER BY punks.id ASC';
  }

  let totalSupply = db.prepare('SELECT COUNT(punks.id) as punk_total FROM punks').get().punk_total;
  let allTraitTypes = db.prepare('SELECT trait_types.* FROM trait_types').all();
  let allTraitTypesData = {};
  allTraitTypes.forEach(traitType => {
    allTraitTypesData[traitType.trait_type] = traitType.punk_count;
  });

  let allTraits = db.prepare('SELECT trait_types.trait_type, trait_detail_types.trait_detail_type, trait_detail_types.punk_count, trait_detail_types.trait_type_id, trait_detail_types.id trait_detail_type_id  FROM trait_detail_types INNER JOIN trait_types ON (trait_detail_types.trait_type_id = trait_types.id) ORDER BY trait_types.trait_type, trait_detail_types.trait_detail_type').all();
  let totalPunkCountQuery = 'SELECT COUNT(punks.id) as punk_total FROM punks INNER JOIN punk_scores ON (punks.id = punk_scores.punk_id) ';
  let punksQuery = 'SELECT punks.*, punk_scores.rarity_rank FROM punks INNER JOIN punk_scores ON (punks.id = punk_scores.punk_id) ';
  let totalPunkCountQueryValue = {};
  let punksQueryValue = {};

  if (!_.isEmpty(search)) {
    totalPunkCountQuery = totalPunkCountQuery+' WHERE punks.id LIKE :punk_id ';
    totalPunkCountQueryValue['punk_id'] = '%'+search+'%';

    punksQuery = punksQuery+' WHERE punks.id LIKE :punk_id ';
    punksQueryValue['punk_id'] = '%'+search+'%';
  } else {
    totalPunkCount = totalPunkCount;
  }

  let allTraitTypeIds = [];
  allTraits.forEach(trait => {
    if (!allTraitTypeIds.includes(trait.trait_type_id.toString())) {
      allTraitTypeIds.push(trait.trait_type_id.toString());
    }
  }); 

  let purifySelectedTraits = [];
  if (selectedTraits.length > 0) {

    selectedTraits.map(selectedTrait => {
      selectedTrait = selectedTrait.split('_');
      if ( allTraitTypeIds.includes(selectedTrait[0]) ) {
        purifySelectedTraits.push(selectedTrait[0]+'_'+selectedTrait[1]);
      }
    });

    if (purifySelectedTraits.length > 0) {
      if (!_.isEmpty(search)) {
        totalPunkCountQuery = totalPunkCountQuery + ' AND ';
        punksQuery = punksQuery + ' AND ';
      } else {
        totalPunkCountQuery = totalPunkCountQuery + ' WHERE ';
        punksQuery = punksQuery + ' WHERE ';
      }
      let count = 0;

      purifySelectedTraits.forEach(selectedTrait => {
        selectedTrait = selectedTrait.split('_');
        totalPunkCountQuery = totalPunkCountQuery+' punk_scores.trait_type_'+selectedTrait[0]+'_value = :trait_type_'+selectedTrait[0]+'_value ';
        punksQuery = punksQuery+' punk_scores.trait_type_'+selectedTrait[0]+'_value = :trait_type_'+selectedTrait[0]+'_value ';
        if (count != (purifySelectedTraits.length-1)) {
          totalPunkCountQuery = totalPunkCountQuery + ' AND ';
          punksQuery = punksQuery + ' AND ';
        }
        count++;

        totalPunkCountQueryValue['trait_type_'+selectedTrait[0]+'_value'] = selectedTrait[1];
        punksQueryValue['trait_type_'+selectedTrait[0]+'_value'] = selectedTrait[1];    
      });
    }
  }
  let purifyTraits = purifySelectedTraits.join(',');

  punksQuery = punksQuery+' '+orderByStmt+' LIMIT :offset,:limit';
  punksQueryValue['offset'] = offset;
  punksQueryValue['limit'] = limit;

  totalPunkCount = db.prepare(totalPunkCountQuery).get(totalPunkCountQueryValue).punk_total;
  punks = db.prepare(punksQuery).all(punksQueryValue);

  let totalPage =  Math.ceil(totalPunkCount/limit);

  res.render('index', { 
    appTitle: config.app_name,
    appDescription: config.app_description,
    ogTitle: config.collection_name + ' | ' + config.app_name,
    ogDescription: config.collection_description + ' | ' + config.app_description,
    ogUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
    ogImage: config.main_og_image,
    activeTab: 'rarity',
    punks: punks, 
    totalPunkCount: totalPunkCount,
    totalPage: totalPage, 
    search: search, 
    orderBy: orderBy,
    traits: purifyTraits,
    selectedTraits: purifySelectedTraits,
    allTraits: allTraits,
    page: page,
    totalSupply: totalSupply,
    allTraitTypesData: allTraitTypesData,
    _:_ 
  });
});

router.get('/matrix', function(req, res, next) {

  let allTraits = db.prepare('SELECT trait_types.trait_type, trait_detail_types.trait_detail_type, trait_detail_types.punk_count FROM trait_detail_types INNER JOIN trait_types ON (trait_detail_types.trait_type_id = trait_types.id) ORDER BY trait_types.trait_type, trait_detail_types.trait_detail_type').all();
  let allTraitCounts = db.prepare('SELECT * FROM punk_trait_counts ORDER BY trait_count').all();
  let totalPunkCount = db.prepare('SELECT COUNT(id) as punk_total FROM punks').get().punk_total;

  res.render('matrix', {
    appTitle: config.app_name,
    appDescription: config.app_description,
    ogTitle: config.collection_name + ' | ' + config.app_name,
    ogDescription: config.collection_description + ' | ' + config.app_description,
    ogUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
    ogImage: config.main_og_image,
    activeTab: 'matrix',
    allTraits: allTraits,
    allTraitCounts: allTraitCounts,
    totalPunkCount: totalPunkCount,
    _:_ 
  });
});

module.exports = router;
