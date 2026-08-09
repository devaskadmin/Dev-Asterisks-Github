const { OAuth2Client } = require('google-auth-library');

const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

const toBoolean = (value) => ['true', '1', 'yes'].includes(String(value || '').trim().toLowerCase());

const getAllowedClientIds = () => {
  return [
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
};

const isGoogleAuthEnabled = () => {
  return toBoolean(process.env.GOOGLE_AUTH_ENABLED);
};

const oauthClient = new OAuth2Client();

class GoogleTokenVerificationError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.name = 'GoogleTokenVerificationError';
    this.statusCode = statusCode;
  }
}

const verifyGoogleIdToken = async (idToken) => {
  const token = String(idToken || '').trim();
  if (!token) {
    throw new GoogleTokenVerificationError('Missing Google ID token.', 400);
  }

  const allowedClientIds = getAllowedClientIds();
  if (allowedClientIds.length === 0) {
    throw new GoogleTokenVerificationError('Google authentication is not configured.', 503);
  }

  let payload;

  try {
    const ticket = await oauthClient.verifyIdToken({
      idToken: token,
      audience: allowedClientIds,
    });

    payload = ticket.getPayload();
  } catch (_err) {
    throw new GoogleTokenVerificationError('Token verification failed.', 401);
  }

  if (!payload || typeof payload !== 'object') {
    throw new GoogleTokenVerificationError('Token verification failed.', 401);
  }

  const issuer = String(payload.iss || '').trim();
  if (!GOOGLE_ISSUERS.has(issuer)) {
    throw new GoogleTokenVerificationError('Token verification failed.', 401);
  }

  const audience = String(payload.aud || '').trim();
  if (!audience || !allowedClientIds.includes(audience)) {
    throw new GoogleTokenVerificationError('Token verification failed.', 401);
  }

  const exp = Number(payload.exp || 0);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(exp) || exp <= now) {
    throw new GoogleTokenVerificationError('Token verification failed.', 401);
  }

  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
  if (!emailVerified) {
    throw new GoogleTokenVerificationError('Token verification failed.', 401);
  }

  const subject = String(payload.sub || '').trim();
  if (!subject) {
    throw new GoogleTokenVerificationError('Token verification failed.', 401);
  }

  return {
    verified: true,
    provider: 'google',
  };
};

module.exports = {
  isGoogleAuthEnabled,
  verifyGoogleIdToken,
  GoogleTokenVerificationError,
};
