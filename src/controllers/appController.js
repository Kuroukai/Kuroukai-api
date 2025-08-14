const Logger = require('../utils/logger');
const config = require('../config');

const logger = new Logger(config.logging.level);

class AppController {
  /**
   * Health check endpoint
   */
  healthCheck(req, res) {
    res.json({
      msg: 'Kuroukai Free API is running',
      code: 200,
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      environment: config.nodeEnv
    });
  }

  /**
   * Root endpoint with API documentation
   */
  getApiInfo(req, res) {
    res.json({
      msg: 'Kuroukai Free API',
      code: 200,
      version: '2.0.0',
      endpoints: {
        'POST /api/keys/create': 'Create new access key',
        'GET /api/keys/validate/:keyId': 'Validate a key',
        'GET /api/keys/info/:keyId': 'Get key information',
        'GET /api/keys/user/:userId': 'Get all keys for user',
        'DELETE /api/keys/:keyId': 'Delete a key by keyId',
        'GET /bind/:keyId.js': 'Get validation JS file',
  'GET /test/:keyId': 'Test validation with visual interface',
  'GET /ip': 'Show detected client IP (debug)',
        'GET /health': 'Health check'
      },
      documentation: {
        github: 'https://github.com/Kuroukai/Kuroukai-free-api',
        readme: 'See README.md for detailed usage instructions'
      }
    });
  }

  /**
   * Test endpoint for visual validation
   */
  getTestPage(req, res) {
    const { keyId } = req.params;

  // Validate keyId format using shared util
  const { isValidUUID } = require('../utils/keyUtils');
  if (!isValidUUID(keyId)) {
      return res.status(400).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kuroukai Key Validation - Error</title>
</head>
<body style="background-color: #000000; color: #ff0000; font-family: monospace; padding: 20px;">
    <pre>Error: Invalid key ID format</pre>
</body>
</html>
      `);
    }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kuroukai Key Validation</title>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';">
</head>
<body>
  <script src="/bind/${keyId}.js" defer></script>
</body>
</html>`;

    res.send(html);
  }

  /**
   * Simple endpoint to echo detected client IP (uses util.getClientIp)
   */
  getClientIp(req, res) {
  const { getClientIp, getIpVariants } = require('../utils/keyUtils');
  const ip = getClientIp(req);
  const variants = getIpVariants(req);
  res.json({ ip, variants });
  }
}

module.exports = new AppController();
