const keyService = require('../services/keyService');
const { getClientIp, isKeyValid } = require('../utils/keyUtils');
const { handleDatabaseError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const config = require('../config');

const logger = new Logger(config.logging.level);

class KeyController {
  /**
   * Delete a key by keyId
   */
  async deleteKey(req, res) {
    try {
      const { keyId } = req.params;
      const result = await keyService.deleteKey(keyId);
      if (result.error) {
        return res.status(result.code || 400).json({ error: result.error, code: result.code || 400 });
      }
      res.json({ msg: 'Key deleted successfully', code: 200, key_id: keyId });
    } catch (error) {
      handleDatabaseError(error, req, res);
    }
  }
  /**
   * Create a new access key
   */
  async createKey(req, res) {
    try {
      const { user_id, hours } = req.body;
      const ipAddress = getClientIp(req);

      const keyData = await keyService.createKey(user_id, hours, ipAddress);

      if (keyData && keyData.error && keyData.code === 409) {
        return res.status(409).json({
          error: keyData.error,
          code: 409,
          data: keyData.data
        });
      }

      res.json({
        msg: 'Key created successfully',
        code: 200,
        data: keyData
      });
    } catch (error) {
      handleDatabaseError(error, req, res);
    }
  }

  /**
   * Validate a key
   */
  async validateKey(req, res) {
    try {
      const { keyId } = req.params;
      const result = await keyService.validateKey(keyId);

      if (result.error) {
        return res.status(result.code).json({
          error: result.error,
          code: result.code
        });
      }

      res.json(result);
    } catch (error) {
      handleDatabaseError(error, req, res);
    }
  }

  /**
   * Get key information
   */
  async getKeyInfo(req, res) {
    try {
      const { keyId } = req.params;
      const result = await keyService.getKeyInfo(keyId);

      if (result.error) {
        return res.status(result.code).json({
          error: result.error,
          code: result.code
        });
      }

      res.json(result);
    } catch (error) {
      handleDatabaseError(error, req, res);
    }
  }

  /**
   * Get all keys for a user
   */
  async getUserKeys(req, res) {
    try {
      const { userId } = req.params;
      const keys = await keyService.getUserKeys(userId);

      res.json({
        msg: `Found ${keys.length} keys for user`,
        code: 200,
        user_id: userId,
        keys
      });
    } catch (error) {
      handleDatabaseError(error, req, res);
    }
  }

  /**
   * Generate binding JavaScript file for key validation
   */
  async generateBindingScript(req, res) {
    try {
      const { keyId } = req.params;
      const key = await keyService.getKeyById(keyId);

      let response;

      if (!key) {
        response = {
          msg: "Binding failed, key not found.",
          code: 404
        };
      } else {
  const valid = isKeyValid(key);

        if (valid) {
          // Update usage statistics
          await keyService.updateKeyUsage(keyId);
          response = {
            msg: "Binding is ok, you can now use it normally.",
            code: 200
          };
        } else {
          response = {
            msg: "Binding failed, key has expired.",
            code: 410
          };
        }
      }

      // Generate safe JavaScript without eval
      const scriptContent = `
// Kuroukai Free API - Key Validation
(function() {
  'use strict';

  const responseData = ${JSON.stringify(response)};

  // Style the page
  document.body.style.backgroundColor = '#000000';
  document.body.style.color = '#ffffff';
  document.body.style.fontFamily = 'monospace';
  document.body.style.padding = '20px';
  document.body.style.margin = '0';

  // Create response container
  const container = document.createElement('div');
  container.style.whiteSpace = 'pre-wrap';
  container.textContent = JSON.stringify(responseData, null, 2);

  // Clear body and add content
  document.body.innerHTML = '';
  document.body.appendChild(container);

  // Log to console
  console.log('Kuroukai API Response:', responseData);
})();
      `;

      res.set('Content-Type', 'application/javascript');
      res.send(scriptContent.trim());
    } catch (error) {
      logger.error('Error generating binding script:', error);

      const errorScript = `
// Kuroukai Free API - Error
(function() {
  'use strict';

  document.body.style.backgroundColor = '#000000';
  document.body.style.color = '#ff0000';
  document.body.style.fontFamily = 'monospace';
  document.body.style.padding = '20px';
  document.body.innerHTML = '<pre>Error loading validation script</pre>';
})();
      `;

      res.set('Content-Type', 'application/javascript');
      res.status(500).send(errorScript.trim());
    }
  }
}

module.exports = new KeyController();
