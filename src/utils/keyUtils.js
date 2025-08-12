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
 * Extract client IP address from request (prioritizing real user IP)
 * @param {Object} req - Express request object
 * @returns {string} IP address
 */
function getClientIp(req) {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor && typeof xForwardedFor === 'string') {
    const ips = xForwardedFor.split(',').map(ip => ip.trim()).filter(Boolean);
    if (ips.length > 0) {
      return ips[0];
    }
  }
  return req.ip ||
         (req.connection && req.connection.remoteAddress) ||
         (req.socket && req.socket.remoteAddress) ||
         (req.connection && req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         'unknown';
}

module.exports = {
  generateKey,
  getExpirationDate,
  isKeyValid,
  getRemainingTime,
  sanitizeInput,
  isValidUUID,
  getClientIp
};
