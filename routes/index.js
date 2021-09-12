const appRoot = require('app-root-path');
const config = require(appRoot + '/config/config.js');
const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');

const databasePath = appRoot + '/config/' + config.sqlite_file_name;
const db = new Database(databasePath);

/* GET home page. */
router.get('/', function(req, res, next) {
  const punks = db.prepare('SELECT punks.*, punk_scores.rarity_rank FROM punks INNER JOIN punk_scores ON (punks.id = punk_scores.punk_id) LIMIT 0,60').all();
  res.render('index', { title: config.app_name, punks: punks });
});

module.exports = router;
