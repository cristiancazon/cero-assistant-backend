const express = require('express');
const router = express.Router();
const toolsController = require('../controllers/toolsController');

// POST /api/tools/calendar
router.post('/calendar', toolsController.handleCalendarTool);

module.exports = router;
