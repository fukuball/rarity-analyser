var appRoot = require('app-root-path');
var config = require(appRoot + '/config/config.js');
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: config.app_name });
});

module.exports = router;
