// Load environment variables from .env early
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// Import configuration
const config = require('./config');
const database = require('./config/database');
const Logger = require('./utils/logger');

// Import middleware
const { errorHandler, notFoundHandler, requestLogger } = require('./middleware/errorHandler');

// Import routes
const keyRoutes = require('./routes/keyRoutes');
const appRoutes = require('./routes/appRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Initialize logger
const logger = new Logger(config.logging.level);

class Application {
  constructor() {
    this.app = express();
  // Enable trust proxy only in production (helps with real client IP and rate limiting)
    if (process.env.NODE_ENV === 'production' || config.nodeEnv === 'production') {
      this.app.set('trust proxy', 1); // Corrigido para evitar erro do express-rate-limit
    }
    this.server = null;
  }

  async initialize() {
    try {
  // Connect to database
      await database.connect();

  // Setup middleware
      this.setupMiddleware();

  // Setup routes
      this.setupRoutes();

  // Setup error handlers
      this.setupErrorHandlers();

      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application:', error);
      throw error;
    }
  }

  setupMiddleware() {
  // Security middleware
    this.app.use(helmet(config.security.helmetOptions));

  // CORS
    const allowCredentials = !!config.security.corsCredentials;
    const configuredOrigin = config.security.corsOrigin;
    this.app.use(cors({
      origin: (origin, callback) => {
        // Se credentials estiver ativo, não permita '*'
        if (allowCredentials && (configuredOrigin === '*' || !configuredOrigin)) {
          // Permitir o origin recebido quando presente
          return callback(null, origin || false);
        }
        return callback(null, configuredOrigin || false);
      },
      credentials: allowCredentials
    }));

    // Rate limiting
    const limiter = rateLimit(config.rateLimit);
    this.app.use(limiter);

  // Cookie parser for admin sessions
    this.app.use(cookieParser());

  // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
    this.app.use(requestLogger);

    logger.info('Middleware configured');
  }

  setupRoutes() {
  // API routes
    this.app.use('/api/keys', keyRoutes);

  // Admin routes (with authentication)
    this.app.use('/admin', adminRoutes);

  // App routes
    this.app.use('/', appRoutes);

    logger.info('Routes configured');
  }

  setupErrorHandlers() {
  // 404 handler
    this.app.use(notFoundHandler);

  // Global error handler
    this.app.use(errorHandler);

    logger.info('Error handlers configured');
  }

  async start() {
    try {
      await this.initialize();

      this.server = this.app.listen(config.port, () => {
        logger.info(`Kuroukai Free API v2.0.0 running on port ${config.port}`);
        logger.info(`Environment: ${config.nodeEnv}`);
        logger.info(`Access at: http://localhost:${config.port}`);
      });

  // Graceful shutdown handlers
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start application:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

      if (this.server) {
        this.server.close(async () => {
          logger.info('HTTP server closed');

          try {
            await database.close();
            logger.info('Database connection closed');
            process.exit(0);
          } catch (error) {
            logger.error('Error closing database:', error);
            process.exit(1);
          }
        });
      }

  // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  getApp() {
    return this.app;
  }
}

// Create and start application
const app = new Application();

// Export for testing
module.exports = app;

// Start the application if this file is run directly
if (require.main === module) {
  app.start().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}
