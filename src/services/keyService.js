const database = require('../config/database');
const { generateKey, getExpirationDate, isKeyValid, getRemainingTime } = require('../utils/keyUtils');
const Logger = require('../utils/logger');
const config = require('../config');

const logger = new Logger(config.logging.level);

class KeyService {
  /**
   * Create a new access key
   * @param {string} userId - User ID
   * @param {number} hours - Validity in hours
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<Object>} Created key data
   */
  async createKey(userId, hours, ipAddress) {
    // First, enforce single active key per user
    const existing = await this.getActiveKeyForUser(userId);
    if (existing) {
      const timeInfo = getRemainingTime(existing.expires_at);
      logger.warn('User attempted to create a key while having an active one', { userId, keyId: existing.key_id });
      return {
        error: 'User already has an active key',
        code: 409,
        data: {
          key_id: existing.key_id,
          user_id: existing.user_id,
          expires_at: existing.expires_at,
          time_remaining: timeInfo
        }
      };
    }

    return new Promise((resolve, reject) => {
      const keyId = generateKey();
      const expiresAt = getExpirationDate(hours);

      const db = database.getDb();
      const sql = `INSERT INTO access_keys (key_id, user_id, expires_at, ip_address)
                   VALUES (?, ?, ?, ?)`;

      db.run(sql, [keyId, userId, expiresAt, ipAddress], function(err) {
        if (err) {
          logger.error('Failed to create key in database:', err);
          reject(err);
          return;
        }

        logger.info('Key created successfully:', {
          keyId,
          userId,
          hours,
          ipAddress
        });

        resolve({
          key_id: keyId,
          user_id: userId,
          expires_at: expiresAt,
          valid_for_hours: hours
        });
      });
    });
  }

  /**
   * Get key by ID
   * @param {string} keyId - Key ID
   * @returns {Promise<Object|null>} Key data or null if not found
   */
  async getKeyById(keyId) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const sql = 'SELECT * FROM access_keys WHERE key_id = ?';

      db.get(sql, [keyId], (err, row) => {
        if (err) {
          logger.error('Failed to fetch key from database:', err);
          reject(err);
          return;
        }

        resolve(row || null);
      });
    });
  }

  /**
   * Get currently active key for a user (not expired and status=active)
   * @param {string} userId
   * @returns {Promise<Object|null>} Active key row or null
   */
  async getActiveKeyForUser(userId) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const sql = `SELECT * FROM access_keys
                   WHERE user_id = ? AND status = 'active'
                   ORDER BY created_at DESC`;
      db.get(sql, [userId], (err, row) => {
        if (err) {
          logger.error('Failed to query active key for user:', err);
          reject(err);
          return;
        }
        if (row && isKeyValid(row)) {
          resolve(row);
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Validate a key and update usage statistics
   * @param {string} keyId - Key ID
   * @returns {Promise<Object>} Validation result
   */
  async validateKey(keyId) {
    try {
      const key = await this.getKeyById(keyId);

      if (!key) {
        return {
          valid: false,
          error: 'Key not found',
          code: 404
        };
      }

      const valid = isKeyValid(key);
      const timeInfo = getRemainingTime(key.expires_at);

      // Update usage statistics if key is valid
      if (valid) {
        await this.updateKeyUsage(keyId);
      }

      return {
        valid,
        key_id: keyId,
        user_id: key.user_id,
        status: key.status,
        created_at: key.created_at,
        expires_at: key.expires_at,
        time_remaining: timeInfo,
        usage_count: key.usage_count + (valid ? 1 : 0),
        code: valid ? 200 : 410
      };
    } catch (error) {
      logger.error('Error validating key:', error);
      throw error;
    }
  }

  /**
   * Update key usage statistics
   * @param {string} keyId - Key ID
   * @returns {Promise<void>}
   */
  async updateKeyUsage(keyId) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const sql = 'UPDATE access_keys SET usage_count = usage_count + 1, last_accessed = CURRENT_TIMESTAMP WHERE key_id = ?';

      db.run(sql, [keyId], function(err) {
        if (err) {
          logger.error('Failed to update key usage:', err);
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  /**
   * Get all keys for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of user keys
   */
  async getUserKeys(userId) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const sql = 'SELECT * FROM access_keys WHERE user_id = ? ORDER BY created_at DESC';

      db.all(sql, [userId], (err, rows) => {
        if (err) {
          logger.error('Failed to fetch user keys from database:', err);
          reject(err);
          return;
        }

    const keys = rows.map(row => {
          const valid = isKeyValid(row);
          const timeInfo = getRemainingTime(row.expires_at);

          return {
            key_id: row.key_id,
      user_id: row.user_id,
            valid,
            status: row.status,
            created_at: row.created_at,
            expires_at: row.expires_at,
            time_remaining: timeInfo,
            usage_count: row.usage_count,
            last_accessed: row.last_accessed
          };
        });

  logger.debug('Retrieved user keys:', {
          userId,
          keyCount: keys.length
        });

        resolve(keys);
      });
    });
  }

  /**
   * Get key information without updating usage
   * @param {string} keyId - Key ID
   * @returns {Promise<Object>} Key information
   */
  async getKeyInfo(keyId) {
    try {
      const key = await this.getKeyById(keyId);

      if (!key) {
        return {
          error: 'Key not found',
          code: 404
        };
      }

      const valid = isKeyValid(key);
      const timeInfo = getRemainingTime(key.expires_at);

      return {
        msg: valid ? 'Key is active' : 'Key is expired or inactive',
        code: valid ? 200 : 410,
        data: {
          key_id: keyId,
          user_id: key.user_id,
          valid,
          status: key.status,
          created_at: key.created_at,
          expires_at: key.expires_at,
          time_remaining: timeInfo,
          usage_count: key.usage_count,
          last_accessed: key.last_accessed
        }
      };
    } catch (error) {
      logger.error('Error getting key info:', error);
      throw error;
    }
  }

  /**
   * Delete a key by keyId
   * @param {string} keyId - Key ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteKey(keyId) {
    return new Promise((resolve) => {
      const db = database.getDb();
      const sql = 'DELETE FROM access_keys WHERE key_id = ?';
      db.run(sql, [keyId], function(err) {
        if (err) {
          logger.error('Failed to delete key:', err);
          resolve({ error: 'Failed to delete key', code: 500 });
          return;
        }
        if (this.changes === 0) {
          resolve({ error: 'Key not found', code: 404 });
        } else {
          logger.info('Key deleted successfully:', { keyId });
          resolve({ success: true });
        }
      });
    });
  }

  /**
   * Get total count of keys
   * @returns {Promise<number>} Total key count
   */
  async getTotalKeysCount() {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const sql = 'SELECT COUNT(*) as count FROM access_keys';

      db.get(sql, [], (err, row) => {
        if (err) {
          logger.error('Failed to get total keys count:', err);
          reject(err);
          return;
        }

        resolve(row.count || 0);
      });
    });
  }

  /**
   * Get count of active keys
   * @returns {Promise<number>} Active key count
   */
  async getActiveKeysCount() {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
  const sql = 'SELECT COUNT(*) as count FROM access_keys\n' +
      "WHERE status = 'active' AND " +
      "strftime('%s', replace(replace(expires_at,'T',' '),'Z','')) > strftime('%s','now')";

      db.get(sql, [], (err, row) => {
        if (err) {
          logger.error('Failed to get active keys count:', err);
          reject(err);
          return;
        }

        resolve(row.count || 0);
      });
    });
  }

  /**
   * Get count of expired keys
   * @returns {Promise<number>} Expired key count
   */
  async getExpiredKeysCount() {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
  const sql = 'SELECT COUNT(*) as count FROM access_keys\n' +
      "WHERE strftime('%s', replace(replace(expires_at,'T',' '),'Z','')) <= strftime('%s','now') OR status = 'expired'";

      db.get(sql, [], (err, row) => {
        if (err) {
          logger.error('Failed to get expired keys count:', err);
          reject(err);
          return;
        }

        resolve(row.count || 0);
      });
    });
  }

  /**
   * Get recent keys within specified hours
   * @param {number} hours - Hours to look back
   * @returns {Promise<Array>} Recent keys
   */
  async getRecentKeys(hours = 24) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const sql = `SELECT * FROM access_keys
                   WHERE created_at >= datetime('now', '-${hours} hours')
                   ORDER BY created_at DESC`;

      db.all(sql, [], (err, rows) => {
        if (err) {
          logger.error('Failed to get recent keys:', err);
          reject(err);
          return;
        }

        resolve(rows || []);
      });
    });
  }
}

module.exports = new KeyService();
