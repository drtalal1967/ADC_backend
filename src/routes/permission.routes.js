const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permission.controller');
const { authenticateToken, isAdmin } = require('../middleware/auth.middleware');

// All routes here require ADMIN or MANAGER
router.use(authenticateToken);
router.use(isAdmin);

router.get('/roles', permissionController.getAllRoles);
router.get('/:roleId', permissionController.getRolePermissions);
router.put('/:roleId', permissionController.updateRolePermissions);

module.exports = router;
