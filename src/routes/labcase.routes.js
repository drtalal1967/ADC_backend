const express = require('express');
const labCaseController = require('../controllers/labcase.controller');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', checkPermission('lab_cases', 'canView'), labCaseController.getAllLabCases);
router.get('/:id', checkPermission('lab_cases', 'canView'), labCaseController.getLabCaseById);
router.post('/', checkPermission('lab_cases', 'canCreate'), labCaseController.createLabCase);
router.put('/:id', checkPermission('lab_cases', 'canUpdate'), labCaseController.updateLabCase);
router.delete('/:id', checkPermission('lab_cases', 'canDelete'), labCaseController.deleteLabCase);

router.get('/:id/logs', checkPermission('lab_cases', 'canView'), labCaseController.getCaseLogs);
router.get('/:id/payments', checkPermission('lab_cases', 'canView'), labCaseController.getLabCasePayments);
router.post('/:id/logs', checkPermission('lab_cases', 'canUpdate'), labCaseController.createCaseLog);

module.exports = router;
