const multer = require('multer');
const ApiResponse = require('../utils/ApiResponse');

// Configure memory storage so files are accessible as Buffer in req.file.buffer
const storage = multer.memoryStorage();

// Allowed image MIME types
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only JPEG, PNG, WebP, and GIF image files are allowed.'
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1,
  },
});

/**
 * Middleware wrapper for single file upload that captures Multer errors
 * and returns standardized 400 JSON responses.
 *
 * @param {string} fieldName - Form field name for the image file
 */
const uploadSingle = (fieldName = 'image') => {
  const uploader = upload.single(fieldName);

  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return ApiResponse.error(res, {
              statusCode: 400,
              message: 'Image size exceeds the 5MB limit. Please upload a smaller image.',
            });
          }
          return ApiResponse.error(res, {
            statusCode: 400,
            message: `Upload error: ${err.message}`,
          });
        }
        return ApiResponse.error(res, {
          statusCode: 400,
          message: err.message || 'Error uploading image file',
        });
      }
      next();
    });
  };
};

module.exports = {
  upload,
  uploadSingle,
};
