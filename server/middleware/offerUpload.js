const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const ApiResponse = require('../utils/ApiResponse');
const logger = require('../utils/logger');
const sanitizeInputMiddleware = require('./sanitizeInput');

/**
 * Sanitize a raw env var value: strip surrounding whitespace and quotes (', ", `).
 * Returns the cleaned string, or '' if falsy.
 *
 * @param {string|undefined} raw
 * @returns {string}
 */
function sanitizeEnvVar(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().replace(/^['"`]+|['"`]+$/g, '');
}

const CLOUDINARY_VAR_NAMES = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];

/**
 * Returns an array of env var names that are missing or empty after sanitization.
 * Never logs or returns values.
 *
 * @returns {string[]}
 */
function getMissingCloudinaryVars() {
  return CLOUDINARY_VAR_NAMES.filter((name) => !sanitizeEnvVar(process.env[name]));
}

/**
 * Check if Cloudinary credentials are configured in environment variables.
 * Never logs credentials.
 *
 * @returns {boolean}
 */
function isCloudinaryConfigured() {
  return getMissingCloudinaryVars().length === 0;
}

/**
 * Get configured Cloudinary v2 client or null if unconfigured.
 * Never crashes the server on startup.
 *
 * @returns {object|null}
 */
function getCloudinaryClient() {
  if (!isCloudinaryConfigured()) {
    return null;
  }
  cloudinary.config({
    cloud_name: sanitizeEnvVar(process.env.CLOUDINARY_CLOUD_NAME),
    api_key: sanitizeEnvVar(process.env.CLOUDINARY_API_KEY),
    api_secret: sanitizeEnvVar(process.env.CLOUDINARY_API_SECRET),
    secure: true,
  });
  return cloudinary;
}

/**
 * Extract Cloudinary public_id from a stored image URL.
 * Strictly checks that the URL is on res.cloudinary.com under the doodcafe/offers folder.
 * Returns null for external URLs, local paths, or images in other folders.
 *
 * @param {string} imageUrl - Stored image URL
 * @returns {string|null} public_id (e.g. "doodcafe/offers/abc123xyz") or null
 */
function extractCloudinaryPublicId(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;

  try {
    const parsed = new URL(imageUrl.trim());
    if (parsed.hostname !== 'res.cloudinary.com') {
      return null;
    }

    const marker = '/doodcafe/offers/';
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) {
      return null;
    }

    // Subpath starting with "doodcafe/offers/..."
    const subpath = parsed.pathname.slice(markerIndex + 1);
    const lastSlash = subpath.lastIndexOf('/');
    const lastDot = subpath.lastIndexOf('.');

    // Strip extension only if dot occurs in filename segment
    if (lastDot > lastSlash) {
      return subpath.slice(0, lastDot);
    }
    return subpath;
  } catch {
    return null;
  }
}

/**
 * Upload an image buffer to Cloudinary using upload_stream.
 * Target folder: "doodcafe/offers"
 * Transformations: limit width to 1200px, auto quality, auto format.
 *
 * @param {Buffer} buffer - Verified image buffer
 * @param {object} options - Optional upload options
 * @returns {Promise<object>} Cloudinary upload result
 */
function uploadBufferToCloudinary(buffer, options = {}) {
  const client = getCloudinaryClient();
  if (!client) {
    return Promise.reject(new Error('Cloudinary credentials are not configured.'));
  }

  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder: 'doodcafe/offers',
        resource_type: 'image',
        allowed_formats: ['jpg', 'png', 'webp'],
        transformation: [
          { width: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
        ],
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

/**
 * Resolve the base uploads directory and the offers subfolder for dev fallback.
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

// Ensure local directories exist on module load for development fallback
getUploadDirs();

// Warn at startup in production if Cloudinary is not fully configured (names only, never values)
if (process.env.NODE_ENV === 'production') {
  const _missingAtStartup = getMissingCloudinaryVars();
  if (_missingAtStartup.length > 0) {
    logger.warn(
      `Cloudinary offer image storage is not fully configured. Missing env vars: ${_missingAtStartup.join(', ')}. Upload routes will return 503.`
    );
  }
}

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

// Multer memory storage — keeps buffer in memory, no file written to disk
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
 * Middleware factory to verify image magic bytes and save to Cloudinary (or local disk in dev).
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

      const missingVars = getMissingCloudinaryVars();
      const hasCloudinary = missingVars.length === 0;
      const isProduction = process.env.NODE_ENV === 'production';

      // If Cloudinary credentials are missing
      if (!hasCloudinary) {
        if (isProduction) {
          logger.error(`Offers image upload failed: missing Cloudinary vars: ${missingVars.join(', ')}.`);
          return ApiResponse.error(res, {
            statusCode: 503,
            message: `Cloudinary is not configured. Missing: ${missingVars.join(', ')}`,
          });
        }

        // Development fallback: write to local disk
        logger.warn('Cloudinary not configured. Falling back to local disk storage for offer image (dev mode).');
        const randomSuffix = crypto.randomBytes(16).toString('hex');
        const filename = `offer-${Date.now()}-${randomSuffix}.${signature.ext}`;

        const { offersUploadDir } = getUploadDirs();
        const targetPath = path.join(offersUploadDir, filename);

        await fs.promises.writeFile(targetPath, req.file.buffer);

        const relativeUrl = `/uploads/offers/${filename}`;
        req.file.filename = filename;
        req.file.path = targetPath;
        req.file.imageUrl = relativeUrl;
        req.file.mimetype = signature.mime;
        req.body.imageUrl = relativeUrl;

        return next();
      }

      // Upload buffer directly to Cloudinary (no file written to disk)
      const cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer);

      req.file.cloudinary = cloudinaryResult;
      req.file.imageUrl = cloudinaryResult.secure_url;
      req.file.secure_url = cloudinaryResult.secure_url;
      req.file.public_id = cloudinaryResult.public_id;
      req.file.mimetype = signature.mime;
      req.body.imageUrl = cloudinaryResult.secure_url;

      next();
    } catch (error) {
      logger.error('Failed to process and store offer image:', { error: error.message });
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
    } catch {
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
    logger.warn('Failed to delete old local offer image file:', {
      filename: cleanFilename,
      error: err.message,
    });
  }
}

/**
 * Safely delete an offer image from Cloudinary or local disk.
 * If Cloudinary: deletes by public_id ONLY for URLs on res.cloudinary.com under doodcafe/offers.
 * If local disk: deletes from /uploads/offers/.
 * Never touches external non-Cloudinary URLs.
 * Failures in deletion never throw or block the caller.
 *
 * @param {string} imageUrl - Stored image URL or relative path
 */
async function deleteOfferImage(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return;
  const trimmed = imageUrl.trim();

  // 1. Check if it's a Cloudinary URL under doodcafe/offers
  const publicId = extractCloudinaryPublicId(trimmed);
  if (publicId) {
    try {
      const client = getCloudinaryClient();
      if (client) {
        await client.uploader.destroy(publicId, { resource_type: 'image' });
        logger.info('Deleted offer image from Cloudinary', { publicId });
      }
    } catch (err) {
      // Failures in deletion must not block caller
      logger.warn('Failed to delete offer image from Cloudinary:', {
        publicId,
        error: err.message,
      });
    }
    return;
  }

  // 2. Otherwise, if local file inside /uploads/offers/, clean it up
  try {
    await deleteOfferImageFile(trimmed);
  } catch (err) {
    logger.warn('Failed to delete old local offer image file:', {
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
 * Cloudinary URLs and other external URLs pass through unchanged.
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
    } catch {}
  }

  return trimmed;
}

module.exports = {
  detectImageSignature,
  getUploadDirs,
  offerUploadSingle,
  verifyAndSaveOfferImage,
  deleteOfferImageFile,
  deleteOfferImage,
  formatOfferImageUrl,
  normalizeOfferImageUrl,
  extractCloudinaryPublicId,
  isCloudinaryConfigured,
};
