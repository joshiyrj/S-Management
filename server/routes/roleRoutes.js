const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/authMiddleware');
const {
  getRoles,
  getUsers,
  createRole,
  updateRoleType,
  updateRolePermissions,
  createUser,
  updateUser,
  updateUserPermissions,
} = require('../controllers/roleController');

router.get('/', requirePermission('roles_permissions', 'view'), getRoles);
router.post('/', requirePermission('roles_permissions', 'create'), createRole);
router.get('/users', requirePermission('roles_permissions', 'view'), getUsers);
router.post('/users', requirePermission('roles_permissions', 'create'), createUser);
router.put('/users/:id', requirePermission('roles_permissions', 'update'), updateUser);
router.put('/users/:id/permissions', requirePermission('roles_permissions', 'update'), updateUserPermissions);
router.put('/:id/type', requirePermission('roles_permissions', 'update'), updateRoleType);
router.put('/:id/permissions', requirePermission('roles_permissions', 'update'), updateRolePermissions);

module.exports = router;
