const documentService = require('../services/document.service');
const { uploadToImageKit } = require('../services/imagekit.service');

const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { skipDb, source, category, title, description, vendorId, labCaseId, expenseId, paymentId, employeeId, laboratoryId, branch } = req.body;

    // Upload to ImageKit (cloud) — req.file.buffer from memoryStorage
    const ikResult = await uploadToImageKit(
      req.file.buffer,
      req.file.originalname,
      'dental-documents'
    );

    // Use the permanent ImageKit CDN URL
    const fileUrl = ikResult.url;

    // If skipDb is true, just return the URL and DO NOT create a DB document record.
    if (skipDb && (String(skipDb).trim().toLowerCase() === 'true' || skipDb === true || skipDb === '1')) {
      return res.status(201).json({ fileUrl });
    }

    // If uploaded from Document Center, tag it so it always appears there
    const isFromDocCenter = source === 'DOCUMENT_CENTER';
    const finalDescription = isFromDocCenter 
      ? `[source:document_center]${description ? ' ' + description : ''}`
      : description;

    // Identify the uploader
    let uploadedBy = 'Admin';
    if (req.user) {
      if (req.user.employee) {
        uploadedBy = `${req.user.employee.firstName} ${req.user.employee.lastName}`.trim();
        if (uploadedBy === '.' || !uploadedBy) uploadedBy = req.user.role?.name || 'Admin';
      } else if (req.user.role) {
        uploadedBy = req.user.role.name.charAt(0) + req.user.role.name.slice(1).toLowerCase();
      }
    }

    const document = await documentService.createDocument({
      fileName: req.file.originalname,
      fileUrl,
      fileType: req.file.mimetype,
      fileSizeKb: Math.round(req.file.size / 1024),
      category: category || 'General',
      title: title || req.file.originalname,
      description: finalDescription,
      branch,
      uploadedBy, // Save the uploader
      vendorId,
      labCaseId,
      expenseId,
      paymentId,
      employeeId,
      laboratoryId,
    });

    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
};

const getAllDocuments = async (req, res, next) => {
  try {
    const documents = await documentService.getAllDocuments();
    res.json(documents || []);
  } catch (error) {
    next(error);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    await documentService.deleteDocument(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  getAllDocuments,
  deleteDocument,
};
