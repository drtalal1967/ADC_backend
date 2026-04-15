const express = require('express');
const { downloadBackup } = require('../controllers/backup.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

// Only admin can download backup
router.get('/download', downloadBackup);

module.exports = router;
