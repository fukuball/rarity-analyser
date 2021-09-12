const appRoot = require('app-root-path');
const config = require(appRoot + '/config/config.js');
const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const _ = require('lodash');

const databasePath = appRoot + '/config/' + config.sqlite_file_name;
const db = new Database(databasePath);

/* GET home page. */
router.get('/', function(req, res, next) {

  let search = req.query.search;
  let page = req.query.page;

  let offset = 0;
  let limit = 100;

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

  const totalPunkCount = db.prepare('SELECT COUNT(id) as punk_total FROM punks').get().punk_total;
  let totalPage =  Math.ceil(totalPunkCount/limit);

  let punks = null;
  if (!_.isEmpty(search)) {
    punks =  db.prepare('SELECT punks.*, punk_scores.rarity_rank FROM punks INNER JOIN punk_scores ON (punks.id = punk_scores.punk_id) WHERE punks.id LIKE ? LIMIT ?,?').all('%'+search+'%', offset, limit);
  } else {
    punks = db.prepare('SELECT punks.*, punk_scores.rarity_rank FROM punks INNER JOIN punk_scores ON (punks.id = punk_scores.punk_id) LIMIT ?,?').all(offset, limit);
  }

  res.render('index', { title: config.app_name, punks: punks, totalPage: totalPage, search: search, page: page, _:_ });
});

module.exports = router;
