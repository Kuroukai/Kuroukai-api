const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const Logger = require('../utils/logger');
const config = require('../config');
const logger = new Logger(config.logging.level);

class Database {
  constructor() {
    this.db = null;
    // On serverless (Vercel), filesystem is read-only except /tmp
    const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.NOW_REGION;
    const defaultPath = isServerless ? '/tmp/keys.db' : './keys.db';
    this.dbPath = process.env.DATABASE_PATH || defaultPath;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        // Ensure target directory exists (mainly for custom DATABASE_PATH)
        const dir = path.dirname(path.resolve(this.dbPath));
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      } catch (e) {
        // Ignore mkdir errors; /tmp usually exists in serverless
      }

      const openDb = (dbPathToUse, onReady, onError) => {
        this.db = new sqlite3.Database(dbPathToUse, (err) => {
          if (err) return onError(err);
          logger.info(`Connected to SQLite database at ${dbPathToUse}`);
          this.initialize().then(onReady).catch(onError);
        });
      };

      openDb(this.dbPath,
        resolve,
        (err) => {
          logger.error('Database connection error:', { error: err.message });
          // Fallback to in-memory DB to avoid serverless crash
          if (err && /SQLITE_CANTOPEN/i.test(String(err.message))) {
            logger.warn('Falling back to in-memory SQLite database (:memory:) due to file open error');
            openDb(':memory:', resolve, (memErr) => {
              logger.error('Failed to open in-memory SQLite database', { error: memErr.message });
              reject(err);
            });
          } else {
            reject(err);
          }
        }
      );
    });
  }

  initialize() {
    return new Promise((resolve, reject) => {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS access_keys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key_id TEXT UNIQUE NOT NULL,
          user_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          last_accessed DATETIME,
          usage_count INTEGER DEFAULT 0,
          status TEXT DEFAULT 'active',
          ip_address TEXT,
          created_by TEXT DEFAULT 'api'
        )
      `;

      this.db.serialize(() => {
        this.db.run(createTableSQL, (err) => {
          if (err) {
            logger.error('Error creating table:', { error: err.message });
            reject(err);
          } else {
            logger.info('Database tables initialized');
            resolve();
          }
        });
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            logger.error('Error closing database:', { error: err.message });
            reject(err);
          } else {
            logger.info('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  getDb() {
    return this.db;
  }
}

module.exports = new Database();
