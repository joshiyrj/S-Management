const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/stockController');
const { requirePermission } = require('../middleware/authMiddleware');

router.get('/stats', requirePermission('stock_list', 'view'), ctrl.getStats);
router.get('/', requirePermission('stock_list', 'view'), ctrl.getAll);
router.get('/:id', requirePermission('stock_list', 'view'), ctrl.getOne);
router.post('/', requirePermission('stock_entry', 'create'), ctrl.create);
router.put('/:id', requirePermission('stock_entry', 'update'), ctrl.update);
router.delete('/:id', requirePermission('stock_list', 'delete'), ctrl.remove);

module.exports = router;
