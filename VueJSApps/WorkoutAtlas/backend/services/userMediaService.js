'use strict';

/**
 * userMediaService.js
 * FlexFit v0.83.11 — User Media Lifecycle Management
 *
 * Manages the per-user media folder structure under workoutatlas-s3-data/USERS/{UserID}/.
 * Uses the same LOCAL_AWS_PATH env var as mediaResolver.js.
 */

const fs   = require('fs');
const path = require('path');

const BACKEND_ROOT                   = path.resolve(__dirname, '..');
const REPO_ROOT                      = path.resolve(BACKEND_ROOT, '..');
const DEFAULT_LOCAL_AWS_RELATIVE_PATH = 'backend/workoutatlas-s3-data';

const USER_MEDIA_SUBDIRS = ['images', 'videos', 'exercises', path.join('nutrition', 'images')];
const USER_NUTRITION_IMAGE_SUBDIR = path.join('nutrition', 'images');

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the local content root — mirrors resolveLocalContentRoot() in mediaResolver.js.
 */
function resolveContentRoot() {
  const configuredPath = String(process.env.LOCAL_AWS_PATH || DEFAULT_LOCAL_AWS_RELATIVE_PATH).trim();

  if (path.isAbsolute(configuredPath)) return configuredPath;

  const fromRepo = path.resolve(REPO_ROOT, configuredPath);
  if (fs.existsSync(fromRepo)) return fromRepo;

  return path.resolve(BACKEND_ROOT, configuredPath);
}

/**
 * Validate userId and return the parsed integer.
 * Throws if invalid.
 */
function requireValidUserId(userId) {
  const uid = parseInt(userId, 10);
  if (!uid || uid <= 0 || !isFinite(uid)) {
    throw new Error(`Invalid userId: ${JSON.stringify(userId)}`);
  }
  return uid;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the absolute filesystem path to a user's media root folder.
 * workoutatlas-s3-data/USERS/{userId}
 */
function getUserMediaPath(userId) {
  const uid = requireValidUserId(userId);
  return path.join(resolveContentRoot(), 'USERS', String(uid));
}

/**
 * Idempotently create the full media folder structure for a user.
 *
 * Creates:
 *   workoutatlas-s3-data/USERS/{userId}/
 *   workoutatlas-s3-data/USERS/{userId}/images/
 *   workoutatlas-s3-data/USERS/{userId}/videos/
 *   workoutatlas-s3-data/USERS/{userId}/exercises/
 *   workoutatlas-s3-data/USERS/{userId}/nutrition/images/
 *
 * @returns {object} { success, userId, basePath, folders }
 */
async function ensureUserMediaFolders(userId) {
  const uid         = requireValidUserId(userId);
  const contentRoot = resolveContentRoot();
  const usersRoot   = path.join(contentRoot, 'USERS');
  const userRoot    = path.join(usersRoot, String(uid));

  // Ensure USERS/ parent exists
  if (!fs.existsSync(usersRoot)) {
    fs.mkdirSync(usersRoot, { recursive: true });
  }

  const folders = {};

  // Root user folder
  const rootExisted = fs.existsSync(userRoot);
  if (!rootExisted) {
    fs.mkdirSync(userRoot, { recursive: true });
  }
  folders.root = rootExisted ? 'existing' : 'created';

  // Subfolders: images / videos / exercises / nutrition/images
  for (const sub of USER_MEDIA_SUBDIRS) {
    const subPath  = path.join(userRoot, sub);
    const existed  = fs.existsSync(subPath);
    if (!existed) {
      fs.mkdirSync(subPath, { recursive: true });
    }
    folders[sub.replace(/\\/g, '/')] = existed ? 'existing' : 'created';
  }

  if (!rootExisted) {
    console.log(`[USER-MEDIA] Created folders for UserID=${uid}`);
  }

  return {
    success:  true,
    userId:   uid,
    basePath: path.relative(contentRoot, userRoot).replace(/\\/g, '/'),
    folders,
  };
}

/**
 * Idempotently create the nutrition image folder for a user.
 *
 * Creates:
 *   workoutatlas-s3-data/USERS/{userId}/nutrition/images/
 *
 * @returns {object} { success, userId, relativePath, absolutePath, folder }
 */
async function ensureUserNutritionImageFolder(userId) {
  const uid = requireValidUserId(userId);
  const userRoot = getUserMediaPath(uid);
  const nutritionImagesPath = path.join(userRoot, USER_NUTRITION_IMAGE_SUBDIR);

  const existed = fs.existsSync(nutritionImagesPath);
  if (!existed) {
    fs.mkdirSync(nutritionImagesPath, { recursive: true });
  }

  return {
    success: true,
    userId: uid,
    relativePath: path.join('USERS', String(uid), 'nutrition', 'images').replace(/\\/g, '/'),
    absolutePath: nutritionImagesPath,
    folder: existed ? 'existing' : 'created',
  };
}

/**
 * Recursively delete a user's media folder.
 *
 * Safety constraints enforced:
 *   - userId must be a positive integer
 *   - resolved path must equal USERS/{userId} exactly
 *   - path must be strictly inside workoutatlas-s3-data/USERS/
 *   - will never delete the USERS root or the content root
 *   - no path traversal allowed
 *
 * @returns {object} { success, userId, deleted, path }
 */
async function deleteUserMediaFolders(userId) {
  const uid         = requireValidUserId(userId);
  const contentRoot = resolveContentRoot();
  const usersRoot   = path.join(contentRoot, 'USERS');

  // Build the expected canonical path and resolve it — must match exactly.
  const expectedPath = path.join(usersRoot, String(uid));
  const resolvedPath = path.resolve(usersRoot, String(uid));

  // Guard: no path traversal (String(uid) is already a safe integer, but double-check)
  if (resolvedPath !== expectedPath) {
    throw new Error(`[USER-MEDIA] Path traversal detected for userId=${uid}`);
  }
  // Guard: must be inside USERS/ — not equal to USERS/ itself
  if (resolvedPath === usersRoot || resolvedPath === contentRoot) {
    throw new Error(`[USER-MEDIA] Refusing to delete USERS root or content root (userId=${uid})`);
  }
  if (!resolvedPath.startsWith(usersRoot + path.sep)) {
    throw new Error(`[USER-MEDIA] Resolved path is outside USERS root (userId=${uid})`);
  }

  const relativePath = path.relative(contentRoot, resolvedPath).replace(/\\/g, '/');

  if (!fs.existsSync(resolvedPath)) {
    return {
      success: true,
      userId:  uid,
      deleted: false,
      warning: 'Folder does not exist — nothing to delete.',
      path:    relativePath,
    };
  }

  fs.rmSync(resolvedPath, { recursive: true, force: true });
  console.log(`[USER-MEDIA] Deleted media folder for UserID=${uid}`);

  return {
    success: true,
    userId:  uid,
    deleted: true,
    path:    relativePath,
  };
}

module.exports = {
  ensureUserMediaFolders,
  ensureUserNutritionImageFolder,
  deleteUserMediaFolders,
};
