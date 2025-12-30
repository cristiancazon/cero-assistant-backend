const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

router.post('/elevenlabs', webhookController.handleElevenLabsWebhook);
// Handle root post for /responses alias
router.post('/', webhookController.handleElevenLabsWebhook);

module.exports = router;
