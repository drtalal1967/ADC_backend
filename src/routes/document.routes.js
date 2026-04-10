const express = require('express');
const documentController = require('../controllers/document.controller');
const upload = require('../middleware/upload.middleware');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', checkPermission('documents', 'canView'), documentController.getAllDocuments);
router.post('/upload', checkPermission('documents', 'canCreate'), upload.single('file'), documentController.uploadDocument);
router.delete('/:id', checkPermission('documents', 'canDelete'), documentController.deleteDocument);

module.exports = router;
