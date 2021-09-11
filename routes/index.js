var Config = require('../config/config');

var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: Config.app_name });
});

module.exports = router;
