const crypto = require('crypto');

const DEFAULT_APP_NAME = 'workoutatlas';
const DEFAULT_REQUEST_TYPE = 'LOCAL_AI_QA';
const DEFAULT_GATEWAY_PATH = '/api/gateway';

function createRequestId(prefix = 'wa') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildAiGatewayRequestPayload(message, appName = DEFAULT_APP_NAME) {
  const trimmed = String(message || '').trim();
  if (!trimmed) {
    throw new Error('Message must be a non-empty string.');
  }

  return {
    appId: appName || DEFAULT_APP_NAME,
    appName: appName || DEFAULT_APP_NAME,
    type: DEFAULT_REQUEST_TYPE,
    payload: {
      message: trimmed,
    },
  };
}

function buildGatewayHeaders({ requestId, timestamp, signature, apiToken }) {
  const headers = {
    'Content-Type': 'application/json',
    'x-request-id': String(requestId || '').trim(),
    'x-timestamp': String(timestamp || '').trim(),
    'x-signature': String(signature || '').trim(),
  };

  if (apiToken) {
    headers['x-api-token'] = String(apiToken);
  }

  return headers;
}

function normalizeAiGatewayResponse(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid AI gateway response.');
  }

  const responseText = String(payload.response || payload.data?.response || '').trim();
  if (!responseText) {
    throw new Error('AI gateway returned an empty response.');
  }

  return {
    success: Boolean(payload.success),
    provider: String(payload.provider || 'gateway').trim(),
    model: String(payload.model || 'unknown').trim(),
    response: responseText,
    timestamp: String(payload.timestamp || new Date().toISOString()).trim(),
  };
}

function createSignature(secret, method, path, timestamp, requestId, body) {
  const canonical = [String(method || '').toUpperCase(), path, timestamp, requestId, body].join('\n');
  return crypto.createHmac('sha256', String(secret || '')).update(canonical, 'utf8').digest('hex');
}

function createTimeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timeoutValue = Number(timeoutMs || 0);
  const timeoutHandle = timeoutValue > 0 ? setTimeout(() => controller.abort(), timeoutValue) : null;

  return {
    signal: controller.signal,
    clear: () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    },
  };
}

function normalizeGatewayUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function normalizeGatewayPath(path) {
  const trimmed = String(path || '').trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function resolveGatewayConfig(env = process.env) {
  const gatewayOverrideUrl = String(env.AI_GATEWAY_URL || '').trim();
  const gatewayBaseUrl = String(env.TAILSCALE_GATEWAY_BASE_URL || gatewayOverrideUrl || '').trim();
  const gatewayPath = String(env.TAILSCALE_GATEWAY_ENDPOINT || DEFAULT_GATEWAY_PATH).trim();
  const hmacSecret = String(env.TAILSCALE_GATEWAY_HMAC_SECRET || '').trim();
  const appName = String(env.TAILSCALE_GATEWAY_APP_NAME || DEFAULT_APP_NAME).trim();
  const timeoutMs = Number(env.TAILSCALE_GATEWAY_TIMEOUT_MS || 120000);

  return {
    gatewayOverrideUrl,
    gatewayBaseUrl,
    gatewayPath: gatewayPath || DEFAULT_GATEWAY_PATH,
    hmacSecret,
    appName,
    timeoutMs,
  };
}

function getGatewayUrl(gatewayConfig) {
  const overrideUrl = normalizeGatewayUrl(gatewayConfig?.gatewayOverrideUrl);
  if (overrideUrl) {
    return overrideUrl;
  }

  const base = normalizeGatewayUrl(gatewayConfig?.gatewayBaseUrl);
  if (!base) {
    return '';
  }

  const path = normalizeGatewayPath(gatewayConfig?.gatewayPath || DEFAULT_GATEWAY_PATH);
  if (!path) {
    return base;
  }

  if (base.endsWith(path)) {
    return base;
  }

  return `${base}${path}`;
}

function createGatewayError(payload, fallbackMessage = 'Unable to reach the AI gateway.') {
  const detail = payload?.error || payload?.detail || payload?.message || fallbackMessage;
  return {
    error: fallbackMessage,
    detail,
  };
}

module.exports = {
  DEFAULT_APP_NAME,
  DEFAULT_REQUEST_TYPE,
  DEFAULT_GATEWAY_PATH,
  buildAiGatewayRequestPayload,
  buildGatewayHeaders,
  normalizeAiGatewayResponse,
  createSignature,
  createTimeoutSignal,
  resolveGatewayConfig,
  getGatewayUrl,
  createGatewayError,
  createRequestId,
};

