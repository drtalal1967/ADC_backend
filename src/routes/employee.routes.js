const express = require('express');
const employeeController = require('../controllers/employee.controller');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', checkPermission('employees', 'canView'), employeeController.getAllEmployees);
router.get('/dentists', checkPermission('employees', 'canView'), employeeController.getDentists);
router.post('/import', checkPermission('employees', 'canCreate'), employeeController.importEmployees);
router.get('/:id', checkPermission('employees', 'canView'), employeeController.getEmployeeById);
router.post('/', checkPermission('employees', 'canCreate'), employeeController.createEmployee);
router.put('/:id', checkPermission('employees', 'canUpdate'), employeeController.updateEmployee);
router.delete('/:id', checkPermission('employees', 'canDelete'), employeeController.deleteEmployee);

module.exports = router;
