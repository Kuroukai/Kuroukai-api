const express = require('express');
const keyController = require('../controllers/keyController');
const { validateCreateKey, validateKeyId, validateUserId } = require('../middleware/validation');

const router = express.Router();
// Delete key
router.delete('/:keyId', validateKeyId, keyController.deleteKey.bind(keyController));

// Create new key
router.post('/create', validateCreateKey, keyController.createKey.bind(keyController));

// Validate key
router.get('/validate/:keyId', validateKeyId, keyController.validateKey.bind(keyController));

// Get key information
router.get('/info/:keyId', validateKeyId, keyController.getKeyInfo.bind(keyController));

// Get all keys for a user
router.get('/user/:userId', validateUserId, keyController.getUserKeys.bind(keyController));

module.exports = router;
