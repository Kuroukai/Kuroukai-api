const config = {
  // Server configuration
  port: parseInt(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database configuration
  database: {
    path: process.env.DATABASE_PATH || './keys.db'
  },

  // Security configuration
  security: {
  corsOrigin: process.env.CORS_ORIGIN || '*',
  // Quando true, envia cookies/autorização em CORS. Evite usar com origin='*'.
  corsCredentials: (/^(true|1)$/i).test(process.env.CORS_CREDENTIALS || ''),
    helmetOptions: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for admin dashboard
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
    }
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  },

  // Key configuration
  keys: {
    defaultHours: parseInt(process.env.DEFAULT_KEY_HOURS) || 24,
    maxHours: parseInt(process.env.MAX_KEY_HOURS) || 168, // 7 days
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },

  // Client IP preference for display/logging: 'public' | 'private'
  ipPreference: (process.env.IP_PREFERENCE || (process.env.NODE_ENV === 'development' ? 'private' : 'public')).toLowerCase()
};

module.exports = config;
