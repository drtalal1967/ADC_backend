const express = require('express');
const documentController = require('../controllers/document.controller');
const upload = require('../middleware/upload.middleware');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

const hasPermission = (user, module, actions) => {
  if (user?.role?.name === 'ADMIN') return true;
  const permission = user?.role?.permissions?.find(p => p.module === module);
  if (!permission) return false;

  return actions.some(action => {
    if (action === 'view') return permission.canView;
    if (action === 'create') return permission.canCreate;
    if (action === 'update') return permission.canUpdate;
    if (action === 'delete') return permission.canDelete;
    if (action === 'export') return permission.canExport;
    return false;
  });
};

const canUploadDocument = (req, res, next) => {
  const category = String(req.body.category || '').toLowerCase();
  const title = String(req.body.title || '').toLowerCase();
  const skipDb = ['true', '1'].includes(String(req.body.skipDb || '').toLowerCase());

  const relatedChecks = [];

  if (req.body.vendorId || category.includes('vendor') || (skipDb && title.includes('vendor'))) {
    relatedChecks.push(['vendors', ['create', 'update']]);
  }
  if (req.body.laboratoryId || category.includes('laboratory') || category === 'lab' || (skipDb && title.includes('lab'))) {
    relatedChecks.push(['laboratories', ['create', 'update']]);
  }
  if (req.body.expenseId || category.includes('expense')) {
    relatedChecks.push(['expenses', ['create', 'update']]);
  }
  if (req.body.labCaseId || category.includes('lab case')) {
    relatedChecks.push(['lab_cases', ['create', 'update']]);
  }
  if (req.body.paymentId || category.includes('payment')) {
    relatedChecks.push(['payments', ['create', 'update']]);
  }
  if (req.body.employeeId || category.includes('employee')) {
    relatedChecks.push(['employees', ['create', 'update']]);
  }

  const allowedByRelatedModule = relatedChecks.some(([module, actions]) => hasPermission(req.user, module, actions));

  if (allowedByRelatedModule || hasPermission(req.user, 'documents', ['create'])) {
    return next();
  }

  return res.status(403).json({ message: 'Permission denied for document upload' });
};

router.get('/', checkPermission('documents', 'canView'), documentController.getAllDocuments);
router.post('/upload', upload.single('file'), canUploadDocument, documentController.uploadDocument);
router.delete('/:id', checkPermission('documents', 'canDelete'), documentController.deleteDocument);

module.exports = router;
