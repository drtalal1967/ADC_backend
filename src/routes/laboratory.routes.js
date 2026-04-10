const express = require('express');
const laboratoryController = require('../controllers/laboratory.controller');
const { authMiddleware, checkPermission, authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', checkPermission('laboratories', 'canView'), laboratoryController.getAllLaboratories);
router.post('/import', checkPermission('laboratories', 'canCreate'), laboratoryController.importLaboratories);
router.get('/:id', checkPermission('laboratories', 'canView'), laboratoryController.getLaboratoryById);
router.post('/', checkPermission('laboratories', 'canCreate'), laboratoryController.createLaboratory);
router.put('/:id', checkPermission('laboratories', 'canUpdate'), laboratoryController.updateLaboratory);
router.delete('/:id', checkPermission('laboratories', 'canDelete'), laboratoryController.deleteLaboratory);

module.exports = router;
