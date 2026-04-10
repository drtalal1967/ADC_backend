const ImageKit = require('imagekit');

// Initialize ImageKit once (singleton)
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

/**
 * Upload a file buffer to ImageKit
 * @param {Buffer} fileBuffer - The file buffer from multer memoryStorage
 * @param {string} originalName - Original filename (used for extension detection)
 * @param {string} folder - ImageKit folder path (default: 'dental-documents')
 * @returns {Promise<{url: string, fileId: string, name: string}>}
 */
const uploadToImageKit = async (fileBuffer, originalName, folder = 'dental-documents') => {
  try {
    const result = await imagekit.upload({
      file: fileBuffer,           // Buffer from multer memoryStorage
      fileName: originalName,     // ImageKit will make it unique automatically
      folder: folder,
      useUniqueFileName: true,    // Prevents overwrite conflicts
    });
    return {
      url: result.url,            // e.g. https://ik.imagekit.io/skwz3tmxw/dental-documents/photo.jpg
      fileId: result.fileId,      // ImageKit file ID (for future deletion)
      name: result.name,          // Actual stored filename
    };
  } catch (error) {
    console.error('ImageKit upload error:', error);
    throw new Error('Failed to upload file to cloud storage: ' + (error.message || error));
  }
};

module.exports = { uploadToImageKit };
