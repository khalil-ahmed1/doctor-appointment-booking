const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const ApiError = require('../utils/ApiError');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Validates the magic bytes of a buffer to ensure it's a valid image (jpeg, png, webp).
 */
const validateImageSignature = (buffer) => {
  if (buffer.length < 4) return false;

  const hex = buffer.toString('hex', 0, 4).toUpperCase();
  // JPEG: FFD8FF
  if (hex.startsWith('FFD8FF')) return 'jpeg';
  // PNG: 89504E47
  if (hex === '89504E47') return 'png';
  // WEBP: RIFF...WEBP
  if (hex === '52494646') {
    const webpEnd = buffer.toString('hex', 8, 12).toUpperCase();
    if (webpEnd === '57454250') return 'webp';
  }

  return false;
};

/**
 * Uploads and resizes an image buffer to local storage (or Cloudinary if configured).
 * @param {Buffer} buffer - File buffer
 * @param {string} originalName - Original filename
 * @param {string} type - 'profile' or 'gallery'
 * @returns {Promise<string>} - The URL of the uploaded image
 */
const uploadImage = async (buffer, originalName, type = 'gallery') => {
  // Validate magic bytes
  const imageType = validateImageSignature(buffer);
  if (!imageType) {
    throw new ApiError(
      422,
      'INVALID_FILE_TYPE',
      'Only valid JPEG, PNG, and WebP images are allowed.',
    );
  }

  // Create unique filename
  const hash = crypto.randomBytes(8).toString('hex');
  const filename = `${type}_${Date.now()}_${hash}.webp`;
  const filepath = path.join(uploadDir, filename);

  // Resize using Sharp and convert to WebP
  let sharpInstance = sharp(buffer);

  if (type === 'profile') {
    // 512x512 exact crop
    sharpInstance = sharpInstance.resize(512, 512, { fit: 'cover' });
  } else {
    // gallery max 1600px width/height, maintaining aspect ratio
    sharpInstance = sharpInstance.resize(1600, 1600, { fit: 'inside', withoutEnlargement: true });
  }

  await sharpInstance.webp({ quality: 80 }).toFile(filepath);

  // Return local URL (in production this would be Cloudinary/S3 URL)
  // Assumes Express is serving /public as static
  const baseUrl = process.env.API_URL || 'http://localhost:5000/api/v1';
  // Fix base URL to serve static files (remove /api/v1)
  const hostUrl = baseUrl.replace('/api/v1', '');
  return `${hostUrl}/uploads/${filename}`;
};

/**
 * Deletes an image from storage
 * @param {string} url - The URL of the image to delete
 */
const deleteImage = async (url) => {
  if (!url) return;
  try {
    const filename = url.split('/').pop();
    if (filename) {
      const filepath = path.join(uploadDir, filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }
  } catch (error) {
    // Log error but don't fail the request if deletion fails
    console.error(`Failed to delete image ${url}:`, error);
  }
};

const uploadPDF = async (buffer, prefix = 'invoice') => {
  const hash = crypto.randomBytes(8).toString('hex');
  const filename = `${prefix}_${Date.now()}_${hash}.pdf`;
  const filepath = path.join(uploadDir, filename);

  fs.writeFileSync(filepath, buffer);

  const baseUrl = process.env.API_URL || 'http://localhost:5000/api/v1';
  const hostUrl = baseUrl.replace('/api/v1', '');
  return `${hostUrl}/uploads/${filename}`;
};

module.exports = {
  uploadImage,
  deleteImage,
  uploadPDF,
};

