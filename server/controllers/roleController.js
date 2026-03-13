const Role = require('../models/Role');
const User = require('../models/User');
const {
  MODULE_CATALOG,
  normalizePermissions,
  normalizePermissionOverrides,
  sanitizeRoleKey,
  validatePermissionPayload,
  validatePermissionOverridePayload,
  resolveEffectivePermissions,
} = require('../config/permissionCatalog');

const SCOPE_OPTIONS = ['system', 'operations', 'sales', 'finance'];

const defaultPermissions = (access = {}) =>
  normalizePermissions(
    MODULE_CATALOG.map((module) => ({
      moduleKey: module.moduleKey,
      allAccess: Boolean(access.allAccess),
      view: Boolean(access.view || access.allAccess),
      create: Boolean(access.create || access.allAccess),
      update: Boolean(access.update || access.allAccess),
      delete: Boolean(access.delete || access.allAccess),
      locked: Boolean(access.locked),
    }))
  );

const DEFAULT_ROLES = [
  {
    key: 'superadmin',
    name: 'Super Admin',
    description: 'Full system control across stock, reports, master data, and access control.',
    scope: 'system',
    isSystem: true,
    isActive: true,
    permissions: defaultPermissions({ allAccess: true, locked: true }),
  },
  {
    key: 'subadmin',
    name: 'Sub Admin',
    description: 'Operational admin with full business access except locked system governance.',
    scope: 'system',
    isSystem: true,
    isActive: true,
    permissions: defaultPermissions({ allAccess: true }),
  },
  {
    key: 'inventory_manager',
    name: 'Inventory Manager',
    description: 'Manages stock entry, stock list review, and report visibility.',
    scope: 'operations',
    isActive: true,
    permissions: [
      { moduleKey: 'dashboard', view: true },
      { moduleKey: 'master_data', view: true },
      { moduleKey: 'stock_list', view: true, update: true },
      { moduleKey: 'stock_entry', view: true, create: true, update: true },
      { moduleKey: 'reports', view: true },
      { moduleKey: 'roles_permissions', view: false },
    ],
  },
  {
    key: 'warehouse_supervisor',
    name: 'Warehouse Supervisor',
    description: 'Tracks inward stock, bale status, and operational stock views.',
    scope: 'operations',
    isActive: true,
    permissions: [
      { moduleKey: 'dashboard', view: true },
      { moduleKey: 'master_data', view: true },
      { moduleKey: 'stock_list', view: true },
      { moduleKey: 'stock_entry', view: true, create: true },
      { moduleKey: 'reports', view: true },
      { moduleKey: 'roles_permissions', view: false },
    ],
  },
  {
    key: 'sales_coordinator',
    name: 'Sales Coordinator',
    description: 'Reviews available stock and report outputs for customer commitments.',
    scope: 'sales',
    isActive: true,
    permissions: [
      { moduleKey: 'dashboard', view: true },
      { moduleKey: 'master_data', view: true },
      { moduleKey: 'stock_list', view: true },
      { moduleKey: 'stock_entry', view: true, update: true },
      { moduleKey: 'reports', view: true },
      { moduleKey: 'roles_permissions', view: false },
    ],
  },
  {
    key: 'accounts_assistant',
    name: 'Accounts Assistant',
    description: 'Primarily uses reports and stock visibility for billing coordination.',
    scope: 'finance',
    isActive: true,
    permissions: [
      { moduleKey: 'dashboard', view: true },
      { moduleKey: 'master_data', view: false },
      { moduleKey: 'stock_list', view: true },
      { moduleKey: 'stock_entry', view: false },
      { moduleKey: 'reports', view: true },
      { moduleKey: 'roles_permissions', view: false },
    ],
  },
];

const isScopeValid = (scope) => SCOPE_OPTIONS.includes(scope);

const getRoleSnapshot = (role) => ({
  roleId: role._id,
  roleKey: role.key,
  roleName: role.name,
});

const compactPermissionOverrides = (overrides = []) =>
  normalizePermissionOverrides(overrides)
    .map((override) => {
      const next = {
        moduleKey: override.moduleKey,
        moduleLabel: override.moduleLabel,
      };

      ['allAccess', 'view', 'create', 'update', 'delete'].forEach((field) => {
        if (typeof override[field] === 'boolean') {
          next[field] = override[field];
        }
      });

      return next;
    })
    .filter((override) => ['allAccess', 'view', 'create', 'update', 'delete'].some((field) => typeof override[field] === 'boolean'));

const serializeUser = (user, rolePermissions = []) => {
  const normalizedOverrides = normalizePermissionOverrides(user.permissionOverrides || []);
  const effectivePermissions = resolveEffectivePermissions(rolePermissions, normalizedOverrides);

  return {
    _id: user._id,
    fullName: user.fullName || user.username,
    username: user.username,
    email: user.email || '',
    roleId: user.roleId || null,
    roleKey: user.roleKey || 'superadmin',
    roleName: user.roleName || 'Super Admin',
    isActive: user.isActive !== false,
    mailStatus: user.mailStatus || 'Not queued',
    permissionOverrides: normalizedOverrides,
    effectivePermissions,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const getCatalogWithRules = () =>
  MODULE_CATALOG.map((module) => ({
    moduleKey: module.moduleKey,
    moduleLabel: module.moduleLabel,
    allowedActions: [...module.allowedActions],
    note: module.note,
  }));

const permissionWithRules = (permission) => {
  const module = MODULE_CATALOG.find((catalogItem) => catalogItem.moduleKey === permission.moduleKey);
  return {
    ...permission,
    allowedActions: module ? [...module.allowedActions] : [],
    note: module?.note || '',
  };
};

const ensureDefaultRoles = async () => {
  await Promise.all(
    DEFAULT_ROLES.map((role) =>
      Role.findOneAndUpdate(
        { key: role.key },
        {
          $setOnInsert: {
            ...role,
            permissions: normalizePermissions(role.permissions),
          },
        },
        { new: true, upsert: true }
      )
    )
  );
};

const serializeRole = (role) => ({
  _id: role._id,
  key: role.key,
  name: role.name,
  description: role.description,
  scope: role.scope,
  isSystem: role.isSystem,
  isActive: role.isActive,
  permissions: normalizePermissions(role.permissions).map(permissionWithRules),
  createdAt: role.createdAt,
  updatedAt: role.updatedAt,
});

const buildRolePermissionMap = (roles = []) =>
  new Map(roles.map((role) => [String(role._id), normalizePermissions(role.permissions)]));

const validateRoleFields = ({ name, key, scope, isActive }, { allowMissingName = false } = {}) => {
  const nextName = String(name || '').trim();
  if (!allowMissingName && !nextName) {
    return { isValid: false, message: 'Role name is required' };
  }

  if (typeof scope !== 'undefined' && !isScopeValid(scope)) {
    return { isValid: false, message: 'Role scope is invalid' };
  }

  if (typeof isActive !== 'undefined' && typeof isActive !== 'boolean') {
    return { isValid: false, message: 'Role status is invalid' };
  }

  const nextKey = sanitizeRoleKey(key || nextName);
  if (!allowMissingName && !nextKey) {
    return { isValid: false, message: 'Role key is invalid' };
  }

  return {
    isValid: true,
    nextName,
    nextKey,
  };
};

const enforceLockedPermissions = (currentPermissions, incomingPermissions) => {
  const byKey = new Map(currentPermissions.map((permission) => [permission.moduleKey, permission]));

  for (const permission of incomingPermissions) {
    const existingPermission = byKey.get(permission.moduleKey);
    if (!existingPermission?.locked) continue;

    const fields = ['allAccess', 'view', 'create', 'update', 'delete'];
    const modified = fields.some((field) => Boolean(existingPermission[field]) !== Boolean(permission[field]));
    if (modified) {
      return {
        isValid: false,
        message: `"${permission.moduleLabel}" permissions are locked by system defaults.`,
      };
    }
  }

  return { isValid: true };
};

exports.getRoles = async (req, res, next) => {
  try {
    await ensureDefaultRoles();

    const roles = await Role.find({}).sort({ isSystem: -1, name: 1 });
    const rolePermissionMap = buildRolePermissionMap(roles);
    const users = await User.find({})
      .select('fullName username email roleId roleKey roleName isActive mailStatus permissionOverrides createdAt updatedAt')
      .sort({ createdAt: -1 })
      .limit(8);

    res.json({
      success: true,
      data: {
        moduleCatalog: getCatalogWithRules(),
        roles: roles.map(serializeRole),
        recentUsers: users.map((user) => serializeUser(user, rolePermissionMap.get(String(user.roleId || '')) || [])),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    await ensureDefaultRoles();

    const [roles, users] = await Promise.all([
      Role.find({}).sort({ isSystem: -1, name: 1 }),
      User.find({}).sort({ createdAt: -1 }),
    ]);
    const rolePermissionMap = buildRolePermissionMap(roles);

    res.json({
      success: true,
      data: {
        roles: roles.map(serializeRole),
        users: users.map((user) => serializeUser(user, rolePermissionMap.get(String(user.roleId || '')) || [])),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createRole = async (req, res, next) => {
  try {
    await ensureDefaultRoles();

    const validated = validateRoleFields(req.body);
    if (!validated.isValid) {
      return res.status(400).json({ success: false, message: validated.message });
    }

    const scope = req.body.scope || 'operations';
    if (!isScopeValid(scope)) {
      return res.status(400).json({ success: false, message: 'Role scope is invalid' });
    }

    const existingRole = await Role.findOne({
      $or: [{ name: validated.nextName }, { key: validated.nextKey }],
    });

    if (existingRole) {
      return res.status(400).json({ success: false, message: 'Another role already uses this name or key' });
    }

    let permissionSource = [];
    const cloneRoleId = String(req.body.cloneRoleId || '').trim();
    if (cloneRoleId) {
      const cloneRole = await Role.findById(cloneRoleId);
      if (!cloneRole) {
        return res.status(400).json({ success: false, message: 'Role selected for cloning was not found' });
      }
      permissionSource = cloneRole.permissions || [];
    }

    if (Array.isArray(req.body.permissions)) {
      permissionSource = req.body.permissions;
    }

    const permissionValidation = validatePermissionPayload(permissionSource);
    if (!permissionValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: permissionValidation.errors[0] || 'Invalid role permissions',
        errors: permissionValidation.errors,
      });
    }

    const role = await Role.create({
      name: validated.nextName,
      key: validated.nextKey,
      description: String(req.body.description || '').trim(),
      scope,
      isActive: typeof req.body.isActive === 'boolean' ? req.body.isActive : true,
      isSystem: false,
      permissions: normalizePermissions(permissionSource).map((permission) => ({
        ...permission,
        locked: false,
      })),
    });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: serializeRole(role),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateRoleType = async (req, res, next) => {
  try {
    await ensureDefaultRoles();

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const payload = {
      ...req.body,
      name: typeof req.body.name === 'undefined' ? role.name : req.body.name,
      key: typeof req.body.key === 'undefined' ? role.key : req.body.key,
      scope: typeof req.body.scope === 'undefined' ? role.scope : req.body.scope,
      isActive: typeof req.body.isActive === 'undefined' ? role.isActive : req.body.isActive,
    };

    const validated = validateRoleFields(payload);
    if (!validated.isValid) {
      return res.status(400).json({ success: false, message: validated.message });
    }

    const nextDescription = String(req.body.description ?? role.description ?? '').trim();
    const roleIsInactive = role.isActive === false;
    const isActivatingRole = roleIsInactive && payload.isActive === true;
    const metadataChanged =
      validated.nextName !== role.name ||
      validated.nextKey !== role.key ||
      payload.scope !== role.scope ||
      nextDescription !== String(role.description || '').trim();

    if (roleIsInactive) {
      if (!isActivatingRole) {
        return res.status(400).json({
          success: false,
          message: 'Inactive role cannot be managed. Activate the role first.',
        });
      }

      if (metadataChanged) {
        return res.status(400).json({
          success: false,
          message: 'Inactive role can only be reactivated. Update role details after activation.',
        });
      }
    }

    const existingRole = await Role.findOne({
      _id: { $ne: role._id },
      $or: [{ name: validated.nextName }, { key: validated.nextKey }],
    });

    if (existingRole) {
      return res.status(400).json({ success: false, message: 'Another role already uses this name or key' });
    }

    role.name = validated.nextName;
    role.key = validated.nextKey;
    role.description = nextDescription;
    role.scope = payload.scope;
    role.isActive = payload.isActive;
    role.permissions = normalizePermissions(role.permissions);
    await role.save();

    await User.updateMany(
      { roleId: role._id },
      {
        $set: {
          roleKey: role.key,
          roleName: role.name,
        },
      }
    );

    res.json({
      success: true,
      message: 'Role type updated successfully',
      data: serializeRole(role),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateRolePermissions = async (req, res, next) => {
  try {
    await ensureDefaultRoles();

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (role.isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'Inactive role cannot be managed. Activate the role first.',
      });
    }

    const permissionValidation = validatePermissionPayload(req.body.permissions);
    if (!permissionValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: permissionValidation.errors[0] || 'Invalid role permissions',
        errors: permissionValidation.errors,
      });
    }

    const normalizedIncomingPermissions = normalizePermissions(req.body.permissions);
    const normalizedCurrentPermissions = normalizePermissions(role.permissions);
    const lockedValidation = enforceLockedPermissions(normalizedCurrentPermissions, normalizedIncomingPermissions);
    if (!lockedValidation.isValid) {
      return res.status(400).json({ success: false, message: lockedValidation.message });
    }

    role.permissions = normalizedIncomingPermissions;
    await role.save();

    res.json({
      success: true,
      message: 'Role permissions updated successfully',
      data: serializeRole(role),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    await ensureDefaultRoles();

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const nextFullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : user.fullName;
    const nextUsername = typeof req.body.username === 'string' ? req.body.username.trim() : user.username;
    const nextEmail =
      typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : user.email;
    const nextRoleId = typeof req.body.roleId === 'string' ? req.body.roleId.trim() : String(user.roleId || '');
    const nextStatus = typeof req.body.isActive === 'boolean' ? req.body.isActive : user.isActive !== false;
    const clearPermissionOverrides = req.body.clearPermissionOverrides === true;

    if (!nextUsername) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }

    if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      return res.status(400).json({ success: false, message: 'A valid email is required' });
    }

    const [existingUsername, existingEmail, role] = await Promise.all([
      User.findOne({ _id: { $ne: user._id }, username: nextUsername }),
      User.findOne({ _id: { $ne: user._id }, email: nextEmail }),
      nextRoleId ? Role.findById(nextRoleId) : null,
    ]);

    if (existingUsername) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    if (nextRoleId && !role) {
      return res.status(400).json({ success: false, message: 'Selected role was not found' });
    }

    if (role && role.isActive === false) {
      return res.status(400).json({ success: false, message: 'Selected role is inactive. Activate it first.' });
    }

    user.fullName = nextFullName || nextUsername;
    user.username = nextUsername;
    user.email = nextEmail;
    user.isActive = nextStatus;

    if (role) {
      user.roleId = role._id;
      user.roleKey = role.key;
      user.roleName = role.name;
    }

    if (clearPermissionOverrides) {
      user.permissionOverrides = [];
    }

    await user.save();

    const rolePermissions = role ? normalizePermissions(role.permissions || []) : [];

    res.json({
      success: true,
      message: 'User updated successfully',
      data: serializeUser(user, rolePermissions),
    });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    await ensureDefaultRoles();

    const fullName = String(req.body.fullName || '').trim();
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const roleId = String(req.body.roleId || '').trim();

    if (!fullName || !username || !email || !password || !roleId) {
      return res.status(400).json({ success: false, message: 'Full name, username, email, password, and role are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }

    if (/\s/.test(password)) {
      return res.status(400).json({ success: false, message: 'Password cannot contain spaces' });
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must include uppercase, lowercase, and numeric characters',
      });
    }

    const [existingUsername, existingEmail, role] = await Promise.all([
      User.findOne({ username }),
      User.findOne({ email }),
      Role.findById(roleId),
    ]);

    if (!role) {
      return res.status(400).json({ success: false, message: 'Selected role was not found' });
    }

    if (role.isActive === false) {
      return res.status(400).json({ success: false, message: 'Selected role is inactive. Activate it before assigning users.' });
    }

    if (existingUsername) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const user = await User.create({
      fullName,
      username,
      email,
      password,
      ...getRoleSnapshot(role),
      isActive: true,
      mailStatus: 'Pending email dispatch (simulation)',
      permissionOverrides: [],
    });

    const rolePermissions = normalizePermissions(role.permissions || []);

    res.status(201).json({
      success: true,
      message: 'User created successfully. Credentials saved and email queued for simulation.',
      data: serializeUser(user, rolePermissions),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUserPermissions = async (req, res, next) => {
  try {
    await ensureDefaultRoles();

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const permissionValidation = validatePermissionOverridePayload(req.body.permissionOverrides);
    if (!permissionValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: permissionValidation.errors[0] || 'Invalid user permission overrides',
        errors: permissionValidation.errors,
      });
    }

    const role = user.roleId ? await Role.findById(user.roleId) : null;
    if (!role || role.isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'Assign an active role to the user before configuring user-level permissions.',
      });
    }

    user.permissionOverrides = compactPermissionOverrides(req.body.permissionOverrides || []);
    await user.save();

    res.json({
      success: true,
      message: 'User permission overrides updated successfully',
      data: serializeUser(user, normalizePermissions(role.permissions || [])),
    });
  } catch (error) {
    next(error);
  }
};

exports.ensureDefaultRoles = ensureDefaultRoles;
