const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/stats', checkPermission('dashboard', 'canView'), dashboardController.getStats);
router.get('/analytics', checkPermission('financials', 'view'), dashboardController.getAnalytics);

router.post('/financial-entry', checkPermission('financials', 'create'), dashboardController.addFinancialEntry);
router.get('/financial-entries', checkPermission('financials', 'view'), dashboardController.getFinancialEntries);
router.delete('/financial-entry/:id', checkPermission('financials', 'delete'), dashboardController.deleteFinancialEntry);

module.exports = router;
