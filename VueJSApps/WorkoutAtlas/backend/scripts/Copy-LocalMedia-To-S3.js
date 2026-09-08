/**
 * Copy-LocalMedia-To-S3.js
 * WorkoutAtlas v0.85.41.23 Stage 1
 *
 * One-time inventory/dry-run scanner for local media that preserves
 * relative paths as future S3 object keys.
 *
 * Usage:
 *   cd backend
 *   node scripts/Copy-LocalMedia-To-S3.js --dry-run
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { lookup } = require('dns').promises;
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const {
  buildGatewayHeaders,
  createSignature,
  createTimeoutSignal,
  resolveGatewayConfig,
  createRequestId,
} = require('../services/aiGatewayService');

const SOURCE_DIR = path.resolve(__dirname, '..', 'workoutatlas-s3-data');
const FUTURE_BUCKET = 'workoutatlas-s3-data';

const ONE_MB = 1024 * 1024;
const TEN_MB = 10 * ONE_MB;
const GATEWAY_BODY_LIMIT_BYTES = ONE_MB;
const COPY_GATEWAY_BODY_LIMIT_BYTES = TEN_MB;
const COPY_DELAY_MS = 60;

const TOP_LEVEL_FOLDERS = ['APP', 'TEST', 'TRAINERS', 'USERS'];

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.txt': 'text/plain',
};

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  return {
    dryRun: flags.has('--dry-run'),
    copy: flags.has('--copy'),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPosixRelativeKey(baseDir, absoluteFilePath) {
  const relative = path.relative(baseDir, absoluteFilePath);
  return relative.split(path.sep).join('/');
}

function detectContentType(fileName) {
  const ext = path.extname(fileName || '').toLowerCase();
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

function getTopLevelFolder(relativeKey) {
  const firstSegment = String(relativeKey || '').split('/')[0] || '';
  return firstSegment.toUpperCase();
}

function isTraversalStyle(relativeKey) {
  const key = String(relativeKey || '');
  const segments = key.split('/');

  if (!key || key.startsWith('/') || key.startsWith('\\')) {
    return true;
  }

  if (key.includes('..\\') || key.includes('\\..') || key.includes('\\')) {
    return true;
  }

  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    return true;
  }

  if (segments.some((segment) => /[\x00-\x1F]/.test(segment))) {
    return true;
  }

  return false;
}

async function walkFiles(dirPath, output) {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await walkFiles(absolutePath, output);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const stats = await fs.promises.stat(absolutePath);
    const relativeKey = toPosixRelativeKey(SOURCE_DIR, absolutePath);
    const extension = path.extname(entry.name).toLowerCase();

    output.push({
      absoluteSourcePath: absolutePath,
      relativeS3StorageKey: relativeKey,
      filename: entry.name,
      extension,
      sizeBytes: stats.size,
      contentType: detectContentType(entry.name),
      topLevelFolder: getTopLevelFolder(relativeKey),
      invalidTraversalStyle: isTraversalStyle(relativeKey),
      ...estimateGatewayRequestSize(relativeKey, detectContentType(entry.name), stats.size),
    });
  }
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = Number(bytes || 0);
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

function estimateBase64Size(byteLength) {
  const size = Number(byteLength || 0);
  if (size <= 0) {
    return 0;
  }

  return Math.ceil(size / 3) * 4;
}

function estimateGatewayRequestSize(storageKey, contentType, fileSizeBytes) {
  const base64Size = estimateBase64Size(fileSizeBytes);

  const payloadWithoutData = {
    appName: 'Workout-Atlas',
    type: 'LOCAL_CLOUD',
    payload: {
      action: 'PUT_OBJECT',
      storageKey: String(storageKey || ''),
      contentType: String(contentType || 'application/octet-stream'),
      dataBase64: '',
    },
  };

  const staticBytes = Buffer.byteLength(JSON.stringify(payloadWithoutData), 'utf8');
  const estimatedJsonRequestSizeBytes = staticBytes + base64Size;

  return {
    estimatedBase64SizeBytes: base64Size,
    estimatedJsonRequestSizeBytes,
  };
}

function buildPublicGatewayEndpointUrl(publicGatewayUrl) {
  const base = String(publicGatewayUrl || '').trim().replace(/\/+$/, '');
  if (!base) {
    return '';
  }

  return `${base}/api/gateway`;
}

async function verifyPublicGatewayEndpoint(gatewayUrl) {
  if (!gatewayUrl) {
    throw new Error('PUBLIC_GATEWAY_URL is not configured.');
  }

  let parsed;
  try {
    parsed = new URL(gatewayUrl);
  } catch (_) {
    throw new Error(`PUBLIC_GATEWAY_URL is invalid: ${gatewayUrl}`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`PUBLIC_GATEWAY_URL must be http(s): ${gatewayUrl}`);
  }

  if (!parsed.hostname) {
    throw new Error('PUBLIC_GATEWAY_URL is missing hostname.');
  }

  await lookup(parsed.hostname);

  return {
    endpoint: gatewayUrl,
    hostname: parsed.hostname,
  };
}

function printSummary(inventory) {
  const totalFiles = inventory.length;
  const totalBytes = inventory.reduce((sum, item) => sum + item.sizeBytes, 0);
  const over1Mb = inventory.filter((item) => item.sizeBytes > ONE_MB);
  const over10Mb = inventory.filter((item) => item.sizeBytes > TEN_MB);
  const sortedBySize = [...inventory].sort((a, b) => b.sizeBytes - a.sizeBytes);
  const largestFile = sortedBySize[0] || null;
  const largestFiles = sortedBySize.slice(0, 5);
  const invalidFiles = inventory.filter((item) => item.invalidTraversalStyle);
  const underGatewayLimit = inventory.filter((item) => item.estimatedJsonRequestSizeBytes <= GATEWAY_BODY_LIMIT_BYTES);
  const overGatewayLimit = inventory.filter((item) => item.estimatedJsonRequestSizeBytes > GATEWAY_BODY_LIMIT_BYTES);
  const sortedByEstimatedRequestSize = [...inventory].sort(
    (a, b) => b.estimatedJsonRequestSizeBytes - a.estimatedJsonRequestSizeBytes
  );
  const largestEstimatedRequest = sortedByEstimatedRequestSize[0] || null;
  const top10EstimatedRequests = sortedByEstimatedRequestSize.slice(0, 10);

  const folderSummary = {};
  for (const folder of TOP_LEVEL_FOLDERS) {
    const items = inventory.filter((item) => item.topLevelFolder === folder);
    folderSummary[folder] = {
      files: items.length,
      bytes: items.reduce((sum, item) => sum + item.sizeBytes, 0),
    };
  }

  console.log('');
  console.log('[COPY-MEDIA] --- Dry-Run Inventory Summary ---');
  console.log(`[COPY-MEDIA] Source directory: ${SOURCE_DIR}`);
  console.log(`[COPY-MEDIA] Future destination bucket: ${FUTURE_BUCKET}`);
  console.log(`[COPY-MEDIA] Total files: ${totalFiles}`);
  console.log(`[COPY-MEDIA] Total bytes: ${totalBytes} (${formatBytes(totalBytes)})`);
  console.log('');
  console.log('[COPY-MEDIA] Top-level folder groups:');
  for (const folder of TOP_LEVEL_FOLDERS) {
    const group = folderSummary[folder];
    console.log(
      `[COPY-MEDIA]   ${folder}: files=${group.files}, bytes=${group.bytes} (${formatBytes(group.bytes)})`
    );
  }
  console.log('');
  console.log(`[COPY-MEDIA] Files over 1 MB: ${over1Mb.length}`);
  console.log(`[COPY-MEDIA] Files over 10 MB: ${over10Mb.length}`);
  console.log('');

  console.log(`[COPY-MEDIA] Gateway body limit: ${GATEWAY_BODY_LIMIT_BYTES} bytes (${formatBytes(GATEWAY_BODY_LIMIT_BYTES)})`);
  console.log(`[COPY-MEDIA] Files under 1 MB after Base64 + JSON: ${underGatewayLimit.length}`);
  console.log(`[COPY-MEDIA] Files estimated to exceed 1 MB after Base64 + JSON: ${overGatewayLimit.length}`);

  if (largestEstimatedRequest) {
    console.log('');
    console.log('[COPY-MEDIA] Largest estimated Gateway PUT_OBJECT request:');
    console.log(
      `[COPY-MEDIA]   ${largestEstimatedRequest.relativeS3StorageKey} | original=${largestEstimatedRequest.sizeBytes} (${formatBytes(largestEstimatedRequest.sizeBytes)}) | base64~=${largestEstimatedRequest.estimatedBase64SizeBytes} (${formatBytes(largestEstimatedRequest.estimatedBase64SizeBytes)}) | request~=${largestEstimatedRequest.estimatedJsonRequestSizeBytes} (${formatBytes(largestEstimatedRequest.estimatedJsonRequestSizeBytes)})`
    );
  }

  console.log('');
  console.log('[COPY-MEDIA] Top 10 files by estimated Gateway request size:');
  if (top10EstimatedRequests.length === 0) {
    console.log('[COPY-MEDIA]   none');
  } else {
    for (const item of top10EstimatedRequests) {
      console.log(
        `[COPY-MEDIA]   ${item.relativeS3StorageKey} | original=${item.sizeBytes} (${formatBytes(item.sizeBytes)}) | base64~=${item.estimatedBase64SizeBytes} (${formatBytes(item.estimatedBase64SizeBytes)}) | request~=${item.estimatedJsonRequestSizeBytes} (${formatBytes(item.estimatedJsonRequestSizeBytes)})`
      );
    }
  }

  if (largestFile) {
    console.log('[COPY-MEDIA] Largest file:');
    console.log(
      `[COPY-MEDIA]   ${largestFile.relativeS3StorageKey} | ${largestFile.sizeBytes} bytes (${formatBytes(largestFile.sizeBytes)})`
    );
  } else {
    console.log('[COPY-MEDIA] Largest file: none');
  }

  console.log('');
  console.log('[COPY-MEDIA] Top 5 largest files:');
  if (largestFiles.length === 0) {
    console.log('[COPY-MEDIA]   none');
  } else {
    for (const item of largestFiles) {
      console.log(
        `[COPY-MEDIA]   ${item.relativeS3StorageKey} | ${item.sizeBytes} bytes (${formatBytes(item.sizeBytes)})`
      );
    }
  }

  console.log('');
  console.log(`[COPY-MEDIA] Invalid/path-traversal-style filenames: ${invalidFiles.length}`);
  for (const item of invalidFiles) {
    console.log(`[COPY-MEDIA]   ${item.relativeS3StorageKey}`);
  }

  console.log('');
  console.log('[COPY-MEDIA] Inventory schema per file:');
  console.log('[COPY-MEDIA]   absoluteSourcePath, relativeS3StorageKey, filename, extension, sizeBytes, contentType, estimatedBase64SizeBytes, estimatedJsonRequestSizeBytes');

  console.log('');
  console.log('[COPY-MEDIA] Sample inventory entries (first 10):');
  const previewEntries = inventory.slice(0, 10);
  if (!previewEntries.length) {
    console.log('[COPY-MEDIA]   none');
  } else {
    for (const item of previewEntries) {
      console.log(
        `[COPY-MEDIA]   ${JSON.stringify({
          absoluteSourcePath: item.absoluteSourcePath,
          relativeS3StorageKey: item.relativeS3StorageKey,
          filename: item.filename,
          extension: item.extension,
          sizeBytes: item.sizeBytes,
          contentType: item.contentType,
          estimatedBase64SizeBytes: item.estimatedBase64SizeBytes,
          estimatedJsonRequestSizeBytes: item.estimatedJsonRequestSizeBytes,
        })}`
      );
    }
  }

  console.log('');
  console.log('[COPY-MEDIA] Source integrity: no move/rename/delete/write operations were performed.');
  console.log('[COPY-MEDIA] --- End Dry-Run Summary ---');
  console.log('');

  return {
    totalFiles,
    totalBytes,
    over1MbCount: over1Mb.length,
    over10MbCount: over10Mb.length,
    underGatewayLimitCount: underGatewayLimit.length,
    overGatewayLimitCount: overGatewayLimit.length,
    largestEstimatedRequest,
    top10EstimatedRequests,
    largestFiles,
    invalidFiles,
  };
}

async function sendPutObjectViaGateway({ gatewayUrl, gatewayConfig, storageKey, contentType, dataBase64 }) {
  const payload = {
    appName: 'Workout-Atlas',
    type: 'LOCAL_CLOUD',
    payload: {
      action: 'PUT_OBJECT',
      storageKey,
      contentType,
      dataBase64,
    },
  };

  const body = JSON.stringify(payload);
  const requestId = createRequestId('wa-copy');
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createSignature(
    gatewayConfig.hmacSecret,
    'POST',
    gatewayConfig.gatewayPath || '/api/gateway',
    timestamp,
    requestId,
    body
  );

  const timeout = createTimeoutSignal(gatewayConfig.timeoutMs);
  try {
    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: buildGatewayHeaders({
        requestId,
        timestamp,
        signature,
        apiToken: gatewayConfig.apiToken,
      }),
      body,
      signal: timeout.signal,
    });

    const text = await response.text();
    let parsedBody = {};
    try {
      parsedBody = text ? JSON.parse(text) : {};
    } catch (_) {
      parsedBody = {};
    }

    return {
      ok: response.ok,
      status: response.status,
      body: parsedBody,
      rawText: text,
    };
  } finally {
    timeout.clear();
  }
}

async function runCopy(inventory) {
  const gatewayConfig = resolveGatewayConfig(process.env);
  const gatewayUrl = buildPublicGatewayEndpointUrl(process.env.PUBLIC_GATEWAY_URL);

  if (!gatewayConfig.hmacSecret) {
    throw new Error('TAILSCALE_GATEWAY_HMAC_SECRET is not configured.');
  }

  const endpoint = await verifyPublicGatewayEndpoint(gatewayUrl);

  console.log('');
  console.log('[COPY-MEDIA] --- Copy Mode ---');
  console.log(`[COPY-MEDIA] Gateway endpoint: ${endpoint.endpoint}`);
  console.log(`[COPY-MEDIA] Gateway host resolved: ${endpoint.hostname}`);
  console.log(`[COPY-MEDIA] Sequential upload delay: ${COPY_DELAY_MS}ms`);
  console.log('');

  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let copiedBytes = 0;
  const failedKeys = [];

  for (let i = 0; i < inventory.length; i += 1) {
    const item = inventory[i];
    const index = i + 1;

    console.log(`[COPY-MEDIA] COPY [${index}/${inventory.length}] ${item.relativeS3StorageKey}`);

    if (item.invalidTraversalStyle) {
      skippedCount += 1;
      console.log('[COPY-MEDIA]   SKIPPED (invalid path/traversal-style storage key)');
      continue;
    }

    if (item.estimatedJsonRequestSizeBytes > COPY_GATEWAY_BODY_LIMIT_BYTES) {
      skippedCount += 1;
      console.log(
        `[COPY-MEDIA]   SKIPPED (estimated request ${item.estimatedJsonRequestSizeBytes} exceeds ${COPY_GATEWAY_BODY_LIMIT_BYTES} bytes)`
      );
      continue;
    }

    try {
      const fileBuffer = await fs.promises.readFile(item.absoluteSourcePath);
      const result = await sendPutObjectViaGateway({
        gatewayUrl,
        gatewayConfig,
        storageKey: item.relativeS3StorageKey,
        contentType: item.contentType,
        dataBase64: fileBuffer.toString('base64'),
      });

      if (result.ok) {
        successCount += 1;
        copiedBytes += item.sizeBytes;
        console.log('[COPY-MEDIA]   SUCCESS');
      } else {
        failedCount += 1;
        failedKeys.push(item.relativeS3StorageKey);
        const safeMessage = String(
          result.body?.error?.message || result.body?.message || result.body?.detail || `HTTP ${result.status}`
        ).slice(0, 220);
        console.log(`[COPY-MEDIA]   FAILED (${safeMessage})`);
      }
    } catch (err) {
      failedCount += 1;
      failedKeys.push(item.relativeS3StorageKey);
      const message = String(err?.message || err).slice(0, 220);
      console.log(`[COPY-MEDIA]   FAILED (${message})`);
    }

    await sleep(COPY_DELAY_MS);
  }

  console.log('');
  console.log('[COPY-MEDIA] --- Copy Summary ---');
  console.log(`[COPY-MEDIA] Total files discovered: ${inventory.length}`);
  console.log(`[COPY-MEDIA] Successful copies: ${successCount}`);
  console.log(`[COPY-MEDIA] Failed copies: ${failedCount}`);
  console.log(`[COPY-MEDIA] Skipped copies: ${skippedCount}`);
  console.log(`[COPY-MEDIA] Total bytes successfully copied: ${copiedBytes} (${formatBytes(copiedBytes)})`);
  console.log('[COPY-MEDIA] Failed storage keys:');
  if (failedKeys.length === 0) {
    console.log('[COPY-MEDIA]   none');
  } else {
    for (const key of failedKeys) {
      console.log(`[COPY-MEDIA]   ${key}`);
    }
  }

  console.log('');
  console.log('[COPY-MEDIA] Source integrity: no local source files were modified, renamed, moved, or deleted.');
  console.log('[COPY-MEDIA] --- End Copy Summary ---');
  console.log('');
}

async function run() {
  const options = parseArgs(process.argv);

  if (!options.dryRun && !options.copy) {
    console.log('[COPY-MEDIA] Usage:');
    console.log('[COPY-MEDIA]   node scripts/Copy-LocalMedia-To-S3.js --dry-run');
    console.log('[COPY-MEDIA]   node scripts/Copy-LocalMedia-To-S3.js --copy');
    process.exit(1);
  }

  if (options.dryRun && options.copy) {
    console.log('[COPY-MEDIA] Please choose one mode at a time: --dry-run or --copy');
    process.exit(1);
  }

  const sourceExists = fs.existsSync(SOURCE_DIR);
  if (!sourceExists) {
    console.error(`[COPY-MEDIA] Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  const inventory = [];
  await walkFiles(SOURCE_DIR, inventory);

  if (options.dryRun) {
    printSummary(inventory);
    process.exit(0);
  }

  await runCopy(inventory);
  process.exit(0);
}

run().catch((error) => {
  console.error('[COPY-MEDIA] Fatal error:', error && error.message ? error.message : error);
  process.exit(1);
});
