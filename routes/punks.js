const appRoot = require('app-root-path');
const config = require(appRoot + '/config/config.js');
const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');

const databasePath = appRoot + '/config/' + config.sqlite_file_name;
const db = new Database(databasePath);

/* GET punks listing. */
router.get('/:id', function(req, res, next) {
  let punkId = req.params.id;

  let punk = db.prepare('SELECT punks.*, punk_scores.rarity_rank FROM punks INNER JOIN punk_scores ON (punks.id = punk_scores.punk_id) WHERE punks.id = ?').get(punkId);

  res.render('punk', { title: 'Punk', headerTitle: config.app_name, punk: punk});
});

module.exports = router;
