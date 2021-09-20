const appRoot = require('app-root-path');
const config = require(appRoot + '/config/config.js');
const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const _ = require('lodash');

let databasePath = appRoot + '/config/' + config.sqlite_file_name;
const db = new Database(databasePath);

/* GET home page. */
router.get('/', function(req, res, next) {

  let projects = db.prepare('SELECT * FROM projects').all();

  res.render('index_rarity_tool', { 
    appTitle: config.app_name,
    appDescription: config.app_description,
    ogTitle: config.app_name,
    ogDescription: config.app_description,
    ogUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
    ogImage: config.main_og_image,
    activeTab: 'rarity',
    projects: projects,
    _:_ 
  });
});

module.exports = router;
