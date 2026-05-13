const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

router.get('/', authMiddleware, categoryController.getAllCategories);
router.post('/', authMiddleware, checkPermission('settings', 'update'), categoryController.createCategory);
router.put('/:id', authMiddleware, checkPermission('settings', 'update'), categoryController.updateCategory);
router.delete('/:id', authMiddleware, checkPermission('settings', 'delete'), categoryController.deleteCategory);

module.exports = router;
