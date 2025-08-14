const { sanitizeInput, isValidUUID } = require('../utils/keyUtils');
const config = require('../config');

/**
 * Validation middleware for creating keys
 */
function validateCreateKey(req, res, next) {
  const { user_id, hours } = req.body;

  // Validate user_id
  if (!user_id) {
    return res.status(400).json({
      error: 'user_id is required',
      code: 400
    });
  }

  if (typeof user_id !== 'string' || user_id.trim().length === 0) {
    return res.status(400).json({
      error: 'user_id must be a non-empty string',
      code: 400
    });
  }

  // Sanitize user_id
  req.body.user_id = sanitizeInput(user_id);

  // Validate hours if provided
  if (hours !== undefined) {
    const hoursNum = parseInt(hours);
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > config.keys.maxHours) {
      return res.status(400).json({
        error: `hours must be a positive number between 1 and ${config.keys.maxHours}`,
        code: 400
      });
    }
    req.body.hours = hoursNum;
  } else {
    req.body.hours = config.keys.defaultHours;
  }

  next();
}

/**
 * Validation middleware for key ID parameters
 */
function validateKeyId(req, res, next) {
  const { keyId } = req.params;

  if (!keyId) {
    return res.status(400).json({
      error: 'keyId parameter is required',
      code: 400
    });
  }

  if (!isValidUUID(keyId)) {
    return res.status(400).json({
      error: 'Invalid keyId format',
      code: 400
    });
  }

  next();
}

/**
 * Validation middleware for user ID parameters
 */
function validateUserId(req, res, next) {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({
      error: 'userId parameter is required',
      code: 400
    });
  }

  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return res.status(400).json({
      error: 'userId must be a non-empty string',
      code: 400
    });
  }

  // Sanitize userId
  req.params.userId = sanitizeInput(userId);

  next();
}


module.exports = {
  validateCreateKey,
  validateKeyId,
  validateUserId
};
