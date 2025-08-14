const { v4: uuidv4 } = require('uuid');
const net = require('net');
const config = require('../config');

/**
 * Generate a unique key ID
 * @returns {string} UUID v4 string
 */
function generateKey() {
  return uuidv4();
}

/**
 * Get expiration date for a key
 * @param {number} hours - Number of hours from now
 * @returns {string} ISO date string
 */
function getExpirationDate(hours = 24) {
  if (typeof hours !== 'number' || hours <= 0) {
    throw new Error('Hours must be a positive number');
  }

  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry.toISOString();
}

/**
 * Check if a key is valid (active and not expired)
 * @param {Object} key - Key object from database
 * @returns {boolean} True if key is valid
 */
function isKeyValid(key) {
  if (!key) return false;

  const now = new Date().toISOString();
  return key.status === 'active' && key.expires_at > now;
}

/**
 * Calculate remaining time for a key
 * @param {string} expiryDate - ISO date string
 * @returns {Object} Time information object
 */
function getRemainingTime(expiryDate) {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diff = expiry - now;

  if (diff <= 0) {
    return {
      expired: true,
      remaining: 0,
      hours: 0,
      minutes: 0,
      formatted: 'Expired'
    };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return {
    expired: false,
    remaining: diff,
    hours,
    minutes,
    formatted: `${hours}h ${minutes}m`
  };
}

/**
 * Sanitize user input to prevent XSS and injection attacks
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
    .trim()
    .substring(0, 255); // Limit length
}

/**
 * Validate UUID format
 * @param {string} uuid - UUID string to validate
 * @returns {boolean} True if valid UUID
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ---- IP helpers (compartilhados entre funções) ----
const normalizeIp = (ip) => {
  if (!ip) return '';
  ip = String(ip).trim();
  // Remove porta de [::1]:12345
  if (ip.startsWith('[')) {
    const end = ip.indexOf(']');
    if (end !== -1) ip = ip.slice(1, end);
  } else {
    // IPv4:port
    const colonIdx = ip.indexOf(':');
    if (colonIdx !== -1 && ip.indexOf(':', colonIdx + 1) === -1) {
      ip = ip.slice(0, colonIdx);
    }
  }
  // IPv4 mapeado em IPv6
  if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  return ip;
};

const isPrivateIp = (ip) => {
  if (!ip) return true;
  if (ip === '127.0.0.1' || ip === '::1') return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  const o = ip.split('.').map(Number);
  if (o.length === 4) {
    // 172.16.0.0 – 172.31.255.255 e 169.254.0.0/16 (link-local)
    if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return true;
    if (o[0] === 169 && o[1] === 254) return true;
  }
  const low = ip.toLowerCase();
  // IPv6 ULA (fc00::/7), ULA local (fd..) e link-local (fe80::/10)
  if (low.startsWith('fc') || low.startsWith('fd') || low.startsWith('fe80:')) return true;
  return false;
};

const pickFirstPublic = (list) => {
  for (const raw of list) {
    const ip = normalizeIp(raw);
    if (net.isIP(ip) && !isPrivateIp(ip)) return ip;
  }
  for (const raw of list) {
    const ip = normalizeIp(raw);
    if (net.isIP(ip)) return ip;
  }
  return '';
};

/**
 * Extract client IP address from request, preferring real client IP behind proxies/CDNs
 * Tries common headers, parses lists, normalizes IPv6/IPv4-mapped, and skips private ranges.
 * @param {Object} req - Express request object
 * @returns {string} Best-effort public client IP or fallback
 */
function getClientIp(req) {
  // Known headers set by various proxies/CDNs
  const headers = req.headers || {};
  const headerCandidates = [];

  // Forwarded: for="<client>", for=<client>
  const fwd = headers['forwarded'];
  if (fwd && typeof fwd === 'string') {
    const parts = fwd.split(',');
    for (const p of parts) {
      const m = p.match(/for=([^;]+)/i);
      if (m && m[1]) {
  headerCandidates.push(m[1].replace(/\"/g, '').replace(/"/g, ''));
      }
    }
  }

  // Common direct client IP headers
  const directHeaders = [
    'cf-connecting-ip',
    'true-client-ip',
    'x-real-ip',
    'x-client-ip',
    'fastly-client-ip',
    'x-cluster-client-ip',
    'fly-client-ip'
  ];
  for (const h of directHeaders) {
    const v = headers[h];
    if (typeof v === 'string') headerCandidates.push(v);
  }

  // X-Forwarded-For may contain a list
  const xff = headers['x-forwarded-for'];
  if (xff && typeof xff === 'string') {
    const ips = xff.split(',').map(s => s.trim()).filter(Boolean);
    headerCandidates.push(...ips);
  }

  // Finally, Express/Node derived addresses
  const fallbackCandidates = [
    req.ip,
    req.connection && req.connection.remoteAddress,
    req.socket && req.socket.remoteAddress,
    req.connection && req.connection.socket && req.connection.socket.remoteAddress
  ].filter(Boolean);

  // Reorder based on preference: private -> prefer connection addresses first
  const ipPref = (config.ipPreference || 'public');
  const candidates = (ipPref === 'private')
    ? [...fallbackCandidates, ...headerCandidates]
    : [...headerCandidates, ...fallbackCandidates];

  const bestPublic = pickFirstPublic(candidates);
  // Also compute first valid (even if private) for environments wanting LAN/VPN IP
  const firstValid = (() => {
    for (const raw of candidates) {
      const ip = normalizeIp(raw);
      if (net.isIP(ip)) return ip;
    }
    return '';
  })();

  const chosen = (config.ipPreference === 'private') ? (firstValid || bestPublic) : (bestPublic || firstValid);
  return chosen || 'unknown';
}

/**
 * Return both IP variants for diagnostics (public-preferred and first-valid)
 */
function getIpVariants(req) {
  const headers = req.headers || {};
  const headerCandidates = [];
  const fwd = headers['forwarded'];
  if (fwd && typeof fwd === 'string') {
    const parts = fwd.split(',');
    for (const p of parts) {
      const m = p.match(/for=([^;]+)/i);
      if (m && m[1]) headerCandidates.push(m[1].replace(/\"/g, '').replace(/"/g, ''));
    }
  }
  const directHeaders = ['cf-connecting-ip','true-client-ip','x-real-ip','x-client-ip','fastly-client-ip','x-cluster-client-ip','fly-client-ip'];
  for (const h of directHeaders) {
    const v = headers[h];
    if (typeof v === 'string') headerCandidates.push(v);
  }
  const xff = headers['x-forwarded-for'];
  if (xff && typeof xff === 'string') headerCandidates.push(...xff.split(',').map(s => s.trim()).filter(Boolean));
  const fallbackCandidates = [req.ip, req.connection && req.connection.remoteAddress, req.socket && req.socket.remoteAddress, req.connection && req.connection.socket && req.connection.socket.remoteAddress].filter(Boolean);
  const ipPref = (config.ipPreference || 'public');
  const candidates = (ipPref === 'private') ? [...fallbackCandidates, ...headerCandidates] : [...headerCandidates, ...fallbackCandidates];

  const publicIp = pickFirstPublic(candidates) || null;
  const privateIp = (() => {
    for (const raw of candidates) { const ip = normalizeIp(raw); if (net.isIP(ip)) return ip; }
    return null;
  })();
  return { publicIp, privateIp };
}

module.exports = {
  generateKey,
  getExpirationDate,
  isKeyValid,
  getRemainingTime,
  sanitizeInput,
  isValidUUID,
  getClientIp,
  getIpVariants
};
