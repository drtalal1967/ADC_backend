const express = require('express');
const multer = require('multer');
const userController = require('../controllers/user.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

// Use memoryStorage — file is uploaded to ImageKit from the controller
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG and WEBP are allowed.'), false);
    }
  },
});

router.put('/profile', authMiddleware, upload.single('profileImage'), userController.updateProfile);

module.exports = router;
