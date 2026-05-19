const express = require('express');
const documentController = require('../controllers/document.controller');
const upload = require('../middleware/upload.middleware');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

const canUploadDocument = async (req, res, next) => {
  const category = String(req.body.category || '').toLowerCase();
  const title = String(req.body.title || '').toLowerCase();
  const skipDb = ['true', '1'].includes(String(req.body.skipDb || '').toLowerCase());

  const relatedChecks = [];

  if (req.body.leaveRequestId) {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: parseInt(req.body.leaveRequestId, 10) },
      select: { id: true, employeeId: true, leaveType: true },
    });

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const roleName = String(req.user?.role?.name || '').toUpperCase();
    const ownEmployeeId = Number(req.user?.employee?.id || req.user?.employeeId);
    const isAdmin = roleName === 'ADMIN';
    const isOwner = Number(leaveRequest.employeeId) === ownEmployeeId;
    const isSickLeave = String(leaveRequest.leaveType || '').toUpperCase().includes('SICK');

    if (isSickLeave && (isAdmin || isOwner)) {
      return next();
    }

    return res.status(403).json({ message: 'Only Admin and the employee can upload sick leave certificates' });
  }

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
  if (category.includes('leave')) {
    relatedChecks.push(['leaves', ['create', 'update']]);
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
