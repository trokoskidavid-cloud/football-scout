const router = require('express').Router();

router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/clubs', require('./clubs'));
router.use('/players', require('./players'));
router.use('/matches', require('./matches'));
router.use('/reports', require('./reports'));
router.use('/comments', require('./comments'));
router.use('/', require('./misc'));

module.exports = router;
