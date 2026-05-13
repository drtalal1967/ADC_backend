const express = require('express');
const { downloadBackup } = require('../controllers/backup.controller');
const { authMiddleware, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

// Only admin can download backup
router.get('/download', authorize('ADMIN'), downloadBackup);

module.exports = router;
