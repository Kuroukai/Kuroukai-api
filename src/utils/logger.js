/**
 * Simple logger utility
 */
class Logger {
  constructor(level = 'info') {
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    this.level = this.levels[level] || this.levels.info;
  }

  error(message, meta = {}) {
    if (this.level >= this.levels.error) {
      console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, meta);
    }
  }

  warn(message, meta = {}) {
    if (this.level >= this.levels.warn) {
      console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, meta);
    }
  }

  info(message, meta = {}) {
    if (this.level >= this.levels.info) {
      console.info(`[INFO] ${new Date().toISOString()}: ${message}`, meta);
    }
  }

  debug(message, meta = {}) {
    if (this.level >= this.levels.debug) {
      console.debug(`[DEBUG] ${new Date().toISOString()}: ${message}`, meta);
    }
  }
}

module.exports = Logger;