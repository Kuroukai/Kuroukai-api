// Vercel serverless entrypoint that wraps the existing Express app
// Initializes the app on first request and reuses it across invocations.
const app = require('../src/app');

let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    await app.initialize();
    initialized = true;
  }
}

module.exports = async (req, res) => {
  await ensureInitialized();
  const expressApp = app.getApp();
  return expressApp(req, res);
};
