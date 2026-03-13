const express = require('express');
const router = express.Router();
const { millHandlers, qualityHandlers, designHandlers } = require('../controllers/masterController');
const { requirePermission } = require('../middleware/authMiddleware');

// Mills
router.get('/mills', requirePermission('master_data', 'view'), millHandlers.getAll);
router.post('/mills', requirePermission('master_data', 'create'), millHandlers.create);
router.put('/mills/:id', requirePermission('master_data', 'update'), millHandlers.update);
router.patch('/mills/:id/status', requirePermission('master_data', 'update'), millHandlers.toggleStatus);
router.delete('/mills/:id', requirePermission('master_data', 'delete'), millHandlers.remove);

// Qualities
router.get('/qualities', requirePermission('master_data', 'view'), qualityHandlers.getAll);
router.post('/qualities', requirePermission('master_data', 'create'), qualityHandlers.create);
router.put('/qualities/:id', requirePermission('master_data', 'update'), qualityHandlers.update);
router.patch('/qualities/:id/status', requirePermission('master_data', 'update'), qualityHandlers.toggleStatus);
router.delete('/qualities/:id', requirePermission('master_data', 'delete'), qualityHandlers.remove);

// Designs
router.get('/designs', requirePermission('master_data', 'view'), designHandlers.getAll);
router.post('/designs', requirePermission('master_data', 'create'), designHandlers.create);
router.put('/designs/:id', requirePermission('master_data', 'update'), designHandlers.update);
router.patch('/designs/:id/status', requirePermission('master_data', 'update'), designHandlers.toggleStatus);
router.delete('/designs/:id', requirePermission('master_data', 'delete'), designHandlers.remove);

module.exports = router;
