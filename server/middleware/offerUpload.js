const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const ApiResponse = require('../utils/ApiResponse');
const logger = require('../utils/logger');
const sanitizeInputMiddleware = require('./sanitizeInput');

/**
 * Resolve the base uploads directory and the offers subfolder.
 * Creates the directories recursively if they do not exist.
 */
function getUploadDirs() {
  const uploadDirName = process.env.UPLOAD_DIR || 'uploads';
  const baseUploadDir = path.resolve(__dirname, '..', uploadDirName);
  const offersUploadDir = path.join(baseUploadDir, 'offers');

  if (!fs.existsSync(baseUploadDir)) {
    fs.mkdirSync(baseUploadDir, { recursive: true });
  }
  if (!fs.existsSync(offersUploadDir)) {
    fs.mkdirSync(offersUploadDir, { recursive: true });
  }

  return { baseUploadDir, offersUploadDir };
}

// Ensure directories exist on module load
getUploadDirs();

/**
 * Detect image type from raw file signature / magic bytes.
 * Validates strictly: JPEG, PNG, and WebP.
 * Rejects SVG, HTML, scripts, GIF, executables, etc.
 *
 * @param {Buffer} buffer - File buffer
 * @returns {{ ext: string, mime: string } | null} Detected extension and MIME type or null if invalid
 */
function detectImageSignature(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' };
  }

  // 3. WebP: 'RIFF' at bytes 0..3 and 'WEBP' at bytes 8..11
  const riff = buffer.toString('ascii', 0, 4);
  const webp = buffer.toString('ascii', 8, 12);
  if (riff === 'RIFF' && webp === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp' };
  }

  return null;
}

// Multer memory storage — keep buffer in memory until magic bytes are verified
const memoryStorage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

const multerInstance = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    const ext = path.extname(file.originalname || '').toLowerCase();

    // Explicitly reject SVG immediately
    if (mime.includes('svg') || ext === '.svg') {
      const err = new Error('SVG files are not permitted. Only JPEG, PNG, and WebP images are allowed.');
      err.statusCode = 400;
      return cb(err, false);
    }

    if (!ALLOWED_MIME_TYPES.has(mime)) {
      const err = new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
      err.statusCode = 400;
      return cb(err, false);
    }

    cb(null, true);
  },
});

/**
 * Multer wrapper middleware for single file upload on field "image".
 * Captures Multer errors (e.g. file size limit exceeded) and returns clean 400 JSON.
 */
const offerUploadSingle = (req, res, next) => {
  multerInstance.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return ApiResponse.error(res, {
            statusCode: 400,
            message: 'Image file size exceeds the 2MB limit. Please upload a smaller image.',
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
          return ApiResponse.error(res, {
            statusCode: 400,
            message: 'Only one image file can be uploaded under the field name "image".',
          });
        }
        return ApiResponse.error(res, {
          statusCode: 400,
          message: `Upload error: ${err.message}`,
        });
      }
      return ApiResponse.error(res, {
        statusCode: err.statusCode || 400,
        message: err.message || 'Error processing uploaded file',
      });
    }

    // Sanitize any text fields parsed by multer in multipart/form-data
    if (req.body && typeof req.body === 'object') {
      sanitizeInputMiddleware(req, res, () => {});
    }

    next();
  });
};

/**
 * Middleware factory to verify image magic bytes and safely save to disk.
 *
 * @param {object} options
 * @param {boolean} options.required - If true, rejects request when no image is uploaded
 */
const verifyAndSaveOfferImage = ({ required = false } = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.file) {
        if (required) {
          return ApiResponse.error(res, {
            statusCode: 400,
            message: 'No image file uploaded. Please provide an image file under the "image" field.',
          });
        }
        return next();
      }

      // Check real file signature / magic bytes
      const signature = detectImageSignature(req.file.buffer);
      if (!signature) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: 'Invalid file format. Only JPEG, PNG, and WebP images are allowed. SVG is not permitted.',
        });
      }

      // Generate random unique filename (never use user-supplied filename)
      const randomSuffix = crypto.randomBytes(16).toString('hex');
      const filename = `offer-${Date.now()}-${randomSuffix}.${signature.ext}`;

      const { offersUploadDir } = getUploadDirs();
      const targetPath = path.join(offersUploadDir, filename);

      // Write verified buffer to disk
      await fs.promises.writeFile(targetPath, req.file.buffer);

      // Populate file details and set relative imageUrl for controllers & validators
      const relativeUrl = `/uploads/offers/${filename}`;
      req.file.filename = filename;
      req.file.path = targetPath;
      req.file.imageUrl = relativeUrl;
      req.file.mimetype = signature.mime;
      req.body.imageUrl = relativeUrl;

      next();
    } catch (error) {
      logger.error('Failed to save offer image file:', { error: error.message });
      return ApiResponse.error(res, {
        statusCode: 500,
        message: 'Failed to process and store the image file.',
      });
    }
  };
};

/**
 * Safely delete an offer image file from local disk.
 * Only deletes files inside /uploads/offers/.
 * Guards against path traversal and never touches external URLs.
 *
 * @param {string} imageUrl - Stored image URL / path
 */
async function deleteOfferImageFile(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return;

  let pathname = imageUrl.trim();

  // If full URL was provided, extract pathname
  if (/^https?:\/\//i.test(pathname)) {
    try {
      const parsed = new URL(pathname);
      pathname = parsed.pathname;
    } catch (_) {
      return; // Invalid URL, do not delete
    }
  }

  // Must strictly start with /uploads/offers/
  if (!pathname.startsWith('/uploads/offers/')) {
    return;
  }

  // Extract filename portion
  const subPath = pathname.slice('/uploads/offers/'.length);
  const cleanFilename = path.basename(subPath);

  if (!cleanFilename || cleanFilename.includes('..') || cleanFilename.includes('/') || cleanFilename.includes('\\')) {
    return;
  }

  const { offersUploadDir } = getUploadDirs();
  const resolvedTarget = path.resolve(offersUploadDir, cleanFilename);

  // Path traversal guard: target must resolve strictly inside offersUploadDir
  const relative = path.relative(offersUploadDir, resolvedTarget);
  if (relative.startsWith('..') || path.isAbsolute(relative) || relative !== cleanFilename) {
    return;
  }

  try {
    if (fs.existsSync(resolvedTarget)) {
      await fs.promises.unlink(resolvedTarget);
    }
  } catch (err) {
    logger.warn('Failed to delete old offer image file:', {
      filename: cleanFilename,
      error: err.message,
    });
  }
}

/**
 * Format relative /uploads/... image path to an absolute URL.
 * Reads PUBLIC_BACKEND_URL env var first (required on Render / reverse-proxy),
 * falls back to BACKEND_URL, then falls back to request origin (local dev only).
 * External URLs (http:// or https://) or data URIs pass through unchanged.
 *
 * @param {string} imageUrl - Image URL or path
 * @param {object} req - Express request object (optional)
 * @returns {string} Formatted absolute URL or original string
 */
function formatOfferImageUrl(imageUrl, req) {
  if (!imageUrl || typeof imageUrl !== 'string') return imageUrl;

  // External URLs (http://, https://) or data URIs pass through unchanged
  if (/^(?:https?:\/\/|data:)/i.test(imageUrl)) {
    return imageUrl;
  }

  // If relative path starting with /uploads/
  if (imageUrl.startsWith('/uploads/')) {
    // Check PUBLIC_BACKEND_URL first (required on Render / reverse-proxy deployments),
    // then fall back to BACKEND_URL for backwards compatibility,
    // then fall back to request origin (dev/local only — may be wrong behind a proxy).
    const envOrigin =
      process.env.PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';

    const backendOrigin = envOrigin
      ? envOrigin.replace(/\/+$/, '')
      : req && req.protocol && req.get && req.get('host')
        ? `${req.protocol}://${req.get('host')}`
        : '';

    if (!envOrigin && backendOrigin) {
      logger.warn(
        'PUBLIC_BACKEND_URL is not set. Falling back to request origin for image URLs. ' +
          'Set PUBLIC_BACKEND_URL to the public backend URL (e.g. https://doodcafe.onrender.com).'
      );
    }

    return backendOrigin ? `${backendOrigin}${imageUrl}` : imageUrl;
  }

  return imageUrl;
}

/**
 * Normalize an image URL for database storage.
 * If an absolute URL pointing to /uploads/offers/... was submitted, stores relative path /uploads/offers/...
 * External URLs pass through unchanged.
 *
 * @param {string} imageUrl - Input URL string
 * @returns {string} Normalized string for DB storage
 */
function normalizeOfferImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return imageUrl;
  const trimmed = imageUrl.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith('/uploads/offers/')) {
        return parsed.pathname;
      }
    } catch (_) {}
  }

  return trimmed;
}

module.exports = {
  detectImageSignature,
  getUploadDirs,
  offerUploadSingle,
  verifyAndSaveOfferImage,
  deleteOfferImageFile,
  formatOfferImageUrl,
  normalizeOfferImageUrl,
};
