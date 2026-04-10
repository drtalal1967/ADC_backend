const express = require('express');
const vendorController = require('../controllers/vendor.controller');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', checkPermission('vendors', 'canView'), vendorController.getAllVendors);
router.get('/:id', checkPermission('vendors', 'canView'), vendorController.getVendorById);
router.post('/', checkPermission('vendors', 'canCreate'), vendorController.createVendor);
router.post('/import', checkPermission('vendors', 'canCreate'), vendorController.importVendors);
router.put('/:id', checkPermission('vendors', 'canUpdate'), vendorController.updateVendor);
router.delete('/:id', checkPermission('vendors', 'canDelete'), vendorController.deleteVendor);

module.exports = router;
