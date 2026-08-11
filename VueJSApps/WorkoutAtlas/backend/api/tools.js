const express = require('express');
const axios = require('axios');

const router = express.Router();

function normalizeGatewayUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

async function requestGatewayTestImage(gatewayBase) {
  return axios.get(`${gatewayBase}/api/tools/test-image`, {
    timeout: 12000,
    responseType: 'stream',
    validateStatus: () => true,
  });
}

router.get('/tools/test-image', async (req, res) => {
  const gatewayBase = normalizeGatewayUrl(process.env.PUBLIC_GATEWAY_URL);

  if (!gatewayBase) {
    return res.status(500).json({
      success: false,
      message: 'PUBLIC_GATEWAY_URL is not configured.',
    });
  }

  try {
    const gatewayImageResponse = await requestGatewayTestImage(gatewayBase);

    if (gatewayImageResponse.status < 200 || gatewayImageResponse.status >= 300) {
      return res.status(gatewayImageResponse.status || 502).json({
        success: false,
        message: 'Gateway image retrieval failed.',
      });
    }

    const passthroughHeaders = ['content-type', 'content-length', 'cache-control', 'etag', 'last-modified'];
    passthroughHeaders.forEach((headerName) => {
      const headerValue = gatewayImageResponse.headers?.[headerName];
      if (headerValue) {
        res.setHeader(headerName, headerValue);
      }
    });

    return gatewayImageResponse.data.pipe(res);
  } catch (error) {
    console.error('Tools test image proxy failed:', error?.message || error);
    return res.status(502).json({
      success: false,
      message: 'Unable to retrieve test image via gateway proxy.',
    });
  }
});

router.get('/tools/status', async (req, res) => {
  const gatewayBase = normalizeGatewayUrl(process.env.PUBLIC_GATEWAY_URL);
  const timestamp = new Date().toISOString();

  if (!gatewayBase) {
    return res.status(500).json({
      gateway: false,
      storage: false,
      timestamp,
    });
  }

  let gateway = false;
  let storage = false;

  try {
    const gatewayResponse = await axios.get(gatewayBase, {
      timeout: 8000,
      validateStatus: () => true,
    });
    gateway = gatewayResponse.status >= 200 && gatewayResponse.status < 300;

    if (gateway) {
      const storageResponse = await requestGatewayTestImage(gatewayBase);
      const contentType = String(storageResponse.headers?.['content-type'] || '').toLowerCase();
      const isImageContent = contentType.startsWith('image/');

      storage =
        storageResponse.status >= 200 &&
        storageResponse.status < 300 &&
        isImageContent;
    }
  } catch (error) {
    console.error('Tools status check failed:', error?.message || error);
  }

  return res.json({
    gateway,
    storage,
    timestamp,
  });
});

router.post('/debug/mobile-menu', (req, res) => {
  const payload = req.body && typeof req.body === 'object' ? req.body : {};

  const safeString = (value, maxLength = 128) => String(value || '').trim().slice(0, maxLength);
  const safeBoolean = (value) => Boolean(value);

  const safeEntry = {
    timestamp: safeString(payload.timestamp || new Date().toISOString(), 64),
    eventName: safeString(payload.eventName || 'UNKNOWN_EVENT', 64),
    menuStateBefore: safeBoolean(payload.menuStateBefore),
    menuStateAfter: safeBoolean(payload.menuStateAfter),
    eventTarget: {
      tag: safeString(payload?.eventTarget?.tag || '', 40),
      id: safeString(payload?.eventTarget?.id || '', 80),
      class: safeString(payload?.eventTarget?.class || '', 160),
    },
    eventType: safeString(payload.eventType || 'unknown', 48),
    currentRoute: safeString(payload.currentRoute || '', 220),
    viewport: safeString(payload.viewport || 'unknown', 24),
  };

  console.log('[MOBILE MENU DEBUG]', JSON.stringify(safeEntry));
  return res.status(200).json({ ok: true });
});

module.exports = router;
