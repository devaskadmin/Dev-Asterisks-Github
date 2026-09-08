const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { ensureUserNutritionImageFolder } = require('../services/userMediaService');

const router = express.Router();

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function requireAuthUserId(req, res) {
  const userId = Number(req?.session?.user?.id || 0);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized. Please log in.' });
    return null;
  }
  return userId;
}

function makeSafeUniqueFileName(mimeType) {
  const ext = EXT_BY_MIME[mimeType] || '.bin';
  const now = new Date();
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const datePart = `${y}${m}${d}`;
  const timePart = `${hh}${mm}${ss}`;
  const rand = crypto.randomBytes(3).toString('hex');
  return `nutrition-${datePart}-${timePart}-${rand}${ext}`;
}

const storage = multer.diskStorage({
  destination: async (req, _file, cb) => {
    try {
      const userId = Number(req?._authUserId || 0);
      if (!userId) {
        return cb(new Error('Unauthorized upload context.'));
      }
      const folder = await ensureUserNutritionImageFolder(userId);
      return cb(null, folder.absolutePath);
    } catch (error) {
      return cb(error);
    }
  },
  filename: (_req, file, cb) => {
    try {
      const nextName = makeSafeUniqueFileName(file?.mimetype || '');
      cb(null, nextName);
    } catch (error) {
      cb(error);
    }
  },
});

const uploadNutritionImage = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(String(file?.mimetype || '').toLowerCase())) {
      return cb(new Error('Unsupported image type. Allowed: jpeg, png, webp, gif.'));
    }
    cb(null, true);
  },
}).single('image');

router.post('/nutrition/images', (req, res) => {
  const userId = requireAuthUserId(req, res);
  if (!userId) return;

  req._authUserId = userId;

  uploadNutritionImage(req, res, (err) => {
    if (err) {
      const isSizeErr = err?.code === 'LIMIT_FILE_SIZE';
      const message = isSizeErr
        ? 'Image exceeds upload size limit (10MB).'
        : (err?.message || 'Upload failed.');
      return res.status(400).json({ error: message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    const safeFileName = path.basename(req.file.filename);
    const relativePath = path
      .join('USERS', String(userId), 'nutrition', 'images', safeFileName)
      .replace(/\\/g, '/');

    return res.status(201).json({
      imageId: crypto.randomUUID(),
      filename: safeFileName,
      relativePath,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
    });
  });
});

module.exports = router;
