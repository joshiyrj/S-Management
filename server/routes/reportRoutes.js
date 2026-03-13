const express = require('express');
const router = express.Router();
const { getReport, exportReport } = require('../controllers/reportController');
const { requirePermission } = require('../middleware/authMiddleware');

router.get('/', requirePermission('reports', 'view'), getReport);
router.get('/export', requirePermission('reports', 'view'), exportReport);

module.exports = router;
