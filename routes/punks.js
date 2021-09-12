const express = require('express');
const router = express.Router();

/* GET punks listing. */
router.get('/:id', function(req, res, next) {
  let punkId = req.params.id;

  res.render('punk', { title: 'PUnk'});
});

module.exports = router;
