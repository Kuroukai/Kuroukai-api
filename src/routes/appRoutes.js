const express = require('express');
const appController = require('../controllers/appController');
const keyController = require('../controllers/keyController');
const { validateKeyId } = require('../middleware/validation');

const router = express.Router();

// Health check
router.get('/health', appController.healthCheck.bind(appController));

// Root endpoint
router.get('/', appController.getApiInfo.bind(appController));

// Test page for visual validation
router.get('/test/:keyId', appController.getTestPage.bind(appController));

// Binding script endpoint
router.get('/bind/:keyId.js', validateKeyId, keyController.generateBindingScript.bind(keyController));

module.exports = router;