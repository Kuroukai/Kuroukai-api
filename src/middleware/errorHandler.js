const Logger = require('../utils/logger');
const config = require('../config');

const logger = new Logger(config.logging.level);

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Don't expose stack traces in production
  const isDevelopment = config.nodeEnv === 'development';

  res.status(err.status || 500).json({
    error: 'Internal server error',
    code: err.status || 500,
    ...(isDevelopment && { details: err.message, stack: err.stack })
  });
}

/**
 * 404 handler middleware
 */
function notFoundHandler(req, res) {
  logger.warn('Route not found:', {
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    error: 'Endpoint not found',
    code: 404
  });
}

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed:', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
}

/**
 * Database error handler
 */
function handleDatabaseError(err, req, res) {
  logger.error('Database error:', {
    error: err.message,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(500).json({
    error: 'Database error',
    code: 500
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
  requestLogger,
  handleDatabaseError
};
