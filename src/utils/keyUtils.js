const { v4: uuidv4 } = require('uuid');

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

/**
 * Extract client IP address from request, preferring real client IP behind proxies/CDNs
 * Tries common headers, parses lists, normalizes IPv6/IPv4-mapped, and skips private ranges.
 * @param {Object} req - Express request object
 * @returns {string} Best-effort public client IP or fallback
 */
function getClientIp(req) {
  const net = require('net');

  const normalize = (ip) => {
    if (!ip) return '';
    // Remove port if present (e.g., '1.2.3.4:12345' or '[::1]:12345')
    ip = String(ip).trim();
    if (ip.startsWith('[')) {
      const end = ip.indexOf(']');
      if (end !== -1) ip = ip.slice(1, end);
    } else {
      const colonIdx = ip.indexOf(':');
      // If there is a single ':' and it's IPv4:port, strip port. IPv6 will have multiple ':'
      if (colonIdx !== -1 && ip.indexOf(':', colonIdx + 1) === -1) {
        ip = ip.slice(0, colonIdx);
      }
    }
    // Unwrap IPv4-mapped IPv6
    if (ip.startsWith('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }
    return ip;
  };

  const isPrivate = (ip) => {
    // Quick checks for private/reserved ranges
    if (!ip) return true;
    if (ip === '127.0.0.1' || ip === '::1') return true;
    if (ip.startsWith('10.')) return true;
    if (ip.startsWith('192.168.')) return true;
    const octets = ip.split('.').map(Number);
    if (octets.length === 4) {
      // 172.16.0.0 – 172.31.255.255
      if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
      // 169.254.0.0/16 link-local
      if (octets[0] === 169 && octets[1] === 254) return true;
    }
    // IPv6 unique local (fc00::/7) or link-local (fe80::/10)
    const lower = ip.toLowerCase();
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (lower.startsWith('fe80:')) return true;
    return false;
  };

  const pickFirstPublic = (list) => {
    for (const raw of list) {
      const ip = normalize(raw);
      if (net.isIP(ip) && !isPrivate(ip)) return ip;
    }
    // Fallback to first valid even if private
    for (const raw of list) {
      const ip = normalize(raw);
      if (net.isIP(ip)) return ip;
    }
    return '';
  };

  // Known headers set by various proxies/CDNs
  const headers = req.headers || {};
  const candidates = [];

  // Forwarded: for="<client>", for=<client>
  const fwd = headers['forwarded'];
  if (fwd && typeof fwd === 'string') {
    const parts = fwd.split(',');
    for (const p of parts) {
      const m = p.match(/for=([^;]+)/i);
      if (m && m[1]) {
        candidates.push(m[1].replace(/\"/g, '').replace(/"/g, ''));
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
    if (typeof v === 'string') candidates.push(v);
  }

  // X-Forwarded-For may contain a list
  const xff = headers['x-forwarded-for'];
  if (xff && typeof xff === 'string') {
    const ips = xff.split(',').map(s => s.trim()).filter(Boolean);
    candidates.push(...ips);
  }

  // Finally, Express/Node derived addresses
  const fallbacks = [
    req.ip,
    req.connection && req.connection.remoteAddress,
    req.socket && req.socket.remoteAddress,
    req.connection && req.connection.socket && req.connection.socket.remoteAddress
  ].filter(Boolean);
  candidates.push(...fallbacks);

  const bestPublic = pickFirstPublic(candidates);
  // Also compute first valid (even if private) for environments wanting LAN/VPN IP
  const firstValid = (() => {
    for (const raw of candidates) {
      const ip = normalize(raw);
      if (net.isIP(ip)) return ip;
    }
    return '';
  })();

  const chosen = (require('../config').ipPreference === 'private') ? (firstValid || bestPublic) : (bestPublic || firstValid);
  return chosen || 'unknown';
}

/**
 * Return both IP variants for diagnostics (public-preferred and first-valid)
 */
function getIpVariants(req) {
  const net = require('net');
  const normalize = (ip) => {
    if (!ip) return '';
    ip = String(ip).trim();
    if (ip.startsWith('[')) {
      const end = ip.indexOf(']');
      if (end !== -1) ip = ip.slice(1, end);
    } else {
      const colonIdx = ip.indexOf(':');
      if (colonIdx !== -1 && ip.indexOf(':', colonIdx + 1) === -1) {
        ip = ip.slice(0, colonIdx);
      }
    }
    if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
    return ip;
  };
  const isPrivate = (ip) => {
    if (!ip) return true;
    if (ip === '127.0.0.1' || ip === '::1') return true;
    if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
    const o = ip.split('.').map(Number);
    if (o.length === 4) {
      if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return true;
      if (o[0] === 169 && o[1] === 254) return true;
    }
    const low = ip.toLowerCase();
    if (low.startsWith('fc') || low.startsWith('fd') || low.startsWith('fe80:')) return true;
    return false;
  };
  const pickFirstPublic = (list) => {
    for (const raw of list) {
      const ip = normalize(raw);
      if (net.isIP(ip) && !isPrivate(ip)) return ip;
    }
    for (const raw of list) {
      const ip = normalize(raw);
      if (net.isIP(ip)) return ip;
    }
    return '';
  };
  const headers = req.headers || {};
  const candidates = [];
  const fwd = headers['forwarded'];
  if (fwd && typeof fwd === 'string') {
    const parts = fwd.split(',');
    for (const p of parts) {
      const m = p.match(/for=([^;]+)/i);
      if (m && m[1]) candidates.push(m[1].replace(/\"/g, '').replace(/"/g, ''));
    }
  }
  const directHeaders = ['cf-connecting-ip','true-client-ip','x-real-ip','x-client-ip','fastly-client-ip','x-cluster-client-ip','fly-client-ip'];
  for (const h of directHeaders) {
    const v = headers[h];
    if (typeof v === 'string') candidates.push(v);
  }
  const xff = headers['x-forwarded-for'];
  if (xff && typeof xff === 'string') candidates.push(...xff.split(',').map(s => s.trim()).filter(Boolean));
  const fallbacks = [req.ip, req.connection && req.connection.remoteAddress, req.socket && req.socket.remoteAddress, req.connection && req.connection.socket && req.connection.socket.remoteAddress].filter(Boolean);
  candidates.push(...fallbacks);

  const publicIp = pickFirstPublic(candidates) || null;
  const privateIp = (() => {
    for (const raw of candidates) { const ip = normalize(raw); if (net.isIP(ip)) return ip; }
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
