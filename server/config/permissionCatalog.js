const ACTION_KEYS = ['view', 'create', 'update', 'delete'];
const OVERRIDE_KEYS = ['allAccess', ...ACTION_KEYS];

const MODULE_CATALOG = [
  {
    moduleKey: 'dashboard',
    moduleLabel: 'Dashboard',
    allowedActions: ['view'],
    note: 'Dashboard is read-only.',
  },
  {
    moduleKey: 'master_data',
    moduleLabel: 'Master Data',
    allowedActions: ['view', 'create', 'update', 'delete'],
    note: 'Master records can be managed fully.',
  },
  {
    moduleKey: 'stock_list',
    moduleLabel: 'Stock List',
    allowedActions: ['view', 'update', 'delete'],
    note: 'Stock list allows update/delete from listing screens.',
  },
  {
    moduleKey: 'stock_entry',
    moduleLabel: 'Add / Edit Stock',
    allowedActions: ['view', 'create', 'update'],
    note: 'Stock entry supports create/update, not delete.',
  },
  {
    moduleKey: 'reports',
    moduleLabel: 'Reports',
    allowedActions: ['view'],
    note: 'Reports are auto-generated and read-only.',
  },
  {
    moduleKey: 'roles_permissions',
    moduleLabel: 'Roles & Permissions',
    allowedActions: ['view', 'create', 'update'],
    note: 'Role management supports view/create/update.',
  },
];

const MODULE_MAP = new Map(MODULE_CATALOG.map((module) => [module.moduleKey, module]));

const buildPermissionId = (moduleKey) => `perm_${String(moduleKey || '').trim().toLowerCase()}`;

const sanitizeRoleKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const normalizeNullableBoolean = (value) => {
  if (value === true) return true;
  if (value === false) return false;
  return null;
};

const normalizePermissions = (permissions = []) => {
  const permissionMap = new Map(
    Array.isArray(permissions)
      ? permissions
          .filter((permission) => permission && typeof permission === 'object')
          .map((permission) => [permission.moduleKey, permission])
      : []
  );

  return MODULE_CATALOG.map((module) => {
    const source = permissionMap.get(module.moduleKey) || {};
    const allowedActionSet = new Set(module.allowedActions);

    const nextPermission = {
      permissionId: String(source.permissionId || buildPermissionId(module.moduleKey)),
      moduleKey: module.moduleKey,
      moduleLabel: module.moduleLabel,
      allAccess: Boolean(source.allAccess),
      view: allowedActionSet.has('view') ? Boolean(source.view) : false,
      create: allowedActionSet.has('create') ? Boolean(source.create) : false,
      update: allowedActionSet.has('update') ? Boolean(source.update) : false,
      delete: allowedActionSet.has('delete') ? Boolean(source.delete) : false,
      locked: Boolean(source.locked),
      isDeleted: false,
      deletedAt: null,
    };

    if (nextPermission.allAccess) {
      module.allowedActions.forEach((actionKey) => {
        nextPermission[actionKey] = true;
      });
    }

    if ((nextPermission.create || nextPermission.update || nextPermission.delete) && allowedActionSet.has('view')) {
      nextPermission.view = true;
    }

    nextPermission.allAccess =
      module.allowedActions.length > 0 &&
      module.allowedActions.every((actionKey) => Boolean(nextPermission[actionKey]));

    return nextPermission;
  });
};

const normalizePermissionOverrides = (overrides = []) => {
  const overrideMap = new Map(
    Array.isArray(overrides)
      ? overrides
          .filter((override) => override && typeof override === 'object')
          .map((override) => [String(override.moduleKey || '').trim(), override])
      : []
  );

  return MODULE_CATALOG.map((module) => {
    const source = overrideMap.get(module.moduleKey) || {};
    const allowedActionSet = new Set(module.allowedActions);

    const nextOverride = {
      moduleKey: module.moduleKey,
      moduleLabel: module.moduleLabel,
      allAccess: normalizeNullableBoolean(source.allAccess),
      view: allowedActionSet.has('view') ? normalizeNullableBoolean(source.view) : null,
      create: allowedActionSet.has('create') ? normalizeNullableBoolean(source.create) : null,
      update: allowedActionSet.has('update') ? normalizeNullableBoolean(source.update) : null,
      delete: allowedActionSet.has('delete') ? normalizeNullableBoolean(source.delete) : null,
    };

    if (typeof nextOverride.allAccess === 'boolean') {
      module.allowedActions.forEach((actionKey) => {
        nextOverride[actionKey] = nextOverride.allAccess;
      });
    }

    if (nextOverride.view === false && allowedActionSet.has('view')) {
      ['create', 'update', 'delete'].forEach((actionKey) => {
        if (allowedActionSet.has(actionKey) && nextOverride[actionKey] === null) {
          nextOverride[actionKey] = false;
        }
      });
    }

    ['create', 'update', 'delete'].forEach((actionKey) => {
      if (allowedActionSet.has(actionKey) && nextOverride[actionKey] === true && allowedActionSet.has('view')) {
        nextOverride.view = true;
      }
    });

    const overrideActionValues = module.allowedActions.map((actionKey) => nextOverride[actionKey]);
    const hasOverrideForEachAction = overrideActionValues.every((value) => typeof value === 'boolean');
    nextOverride.allAccess = hasOverrideForEachAction ? overrideActionValues.every(Boolean) : null;

    return nextOverride;
  });
};

const validatePermissionPayload = (permissions) => {
  if (!Array.isArray(permissions)) {
    return {
      isValid: false,
      errors: ['Permissions payload must be an array of module permissions.'],
    };
  }

  const seen = new Set();
  const errors = [];

  permissions.forEach((permission, index) => {
    if (!permission || typeof permission !== 'object') {
      errors.push(`Permission entry at index ${index} is invalid.`);
      return;
    }

    const moduleKey = String(permission.moduleKey || '').trim();
    if (!moduleKey) {
      errors.push(`Permission entry at index ${index} is missing moduleKey.`);
      return;
    }

    if (seen.has(moduleKey)) {
      errors.push(`Duplicate permission entry for module "${moduleKey}".`);
      return;
    }
    seen.add(moduleKey);

    const module = MODULE_MAP.get(moduleKey);
    if (!module) {
      errors.push(`Module "${moduleKey}" is not supported.`);
      return;
    }

    const allowedActionSet = new Set(module.allowedActions);

    ['permissionId', 'allAccess', ...ACTION_KEYS, 'locked', 'isDeleted'].forEach((field) => {
      if (typeof permission[field] !== 'undefined' && typeof permission[field] !== 'boolean') {
        if (field === 'permissionId') {
          if (typeof permission[field] !== 'string') {
            errors.push(`"${module.moduleLabel}" -> "${field}" must be a string.`);
          }
          return;
        }
        errors.push(`"${module.moduleLabel}" -> "${field}" must be true or false.`);
      }
    });

    ACTION_KEYS.forEach((actionKey) => {
      if (permission[actionKey] === true && !allowedActionSet.has(actionKey)) {
        errors.push(`"${module.moduleLabel}" does not support "${actionKey}" permission.`);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validatePermissionOverridePayload = (overrides) => {
  if (!Array.isArray(overrides)) {
    return {
      isValid: false,
      errors: ['User permission overrides must be an array of module overrides.'],
    };
  }

  const seen = new Set();
  const errors = [];

  overrides.forEach((override, index) => {
    if (!override || typeof override !== 'object') {
      errors.push(`Override entry at index ${index} is invalid.`);
      return;
    }

    const moduleKey = String(override.moduleKey || '').trim();
    if (!moduleKey) {
      errors.push(`Override entry at index ${index} is missing moduleKey.`);
      return;
    }

    if (seen.has(moduleKey)) {
      errors.push(`Duplicate override entry for module "${moduleKey}".`);
      return;
    }
    seen.add(moduleKey);

    const module = MODULE_MAP.get(moduleKey);
    if (!module) {
      errors.push(`Module "${moduleKey}" is not supported.`);
      return;
    }

    const allowedActionSet = new Set(module.allowedActions);

    OVERRIDE_KEYS.forEach((field) => {
      if (typeof override[field] === 'undefined') return;
      if (override[field] !== null && typeof override[field] !== 'boolean') {
        errors.push(`"${module.moduleLabel}" -> "${field}" must be true, false, or null.`);
        return;
      }

      if (ACTION_KEYS.includes(field) && override[field] === true && !allowedActionSet.has(field)) {
        errors.push(`"${module.moduleLabel}" does not support "${field}" permission.`);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const toResolvedRoleAccess = (rolePermission, allowedActionSet) => {
  const roleAccess = {
    allAccess: false,
    view: allowedActionSet.has('view') ? Boolean(rolePermission.view) : false,
    create: allowedActionSet.has('create') ? Boolean(rolePermission.create) : false,
    update: allowedActionSet.has('update') ? Boolean(rolePermission.update) : false,
    delete: allowedActionSet.has('delete') ? Boolean(rolePermission.delete) : false,
  };

  roleAccess.allAccess =
    [...allowedActionSet].length > 0 &&
    [...allowedActionSet].every((actionKey) => Boolean(roleAccess[actionKey]));

  return roleAccess;
};

const resolveEffectivePermissions = (rolePermissions = [], permissionOverrides = []) => {
  const roleMap = new Map(normalizePermissions(rolePermissions).map((permission) => [permission.moduleKey, permission]));
  const overrideMap = new Map(
    normalizePermissionOverrides(permissionOverrides).map((override) => [override.moduleKey, override])
  );

  return MODULE_CATALOG.map((module) => {
    const allowedActionSet = new Set(module.allowedActions);
    const rolePermission = roleMap.get(module.moduleKey) || {};
    const userOverride = overrideMap.get(module.moduleKey) || {};
    const roleAccess = toResolvedRoleAccess(rolePermission, allowedActionSet);

    const nextPermission = {
      permissionId: buildPermissionId(module.moduleKey),
      moduleKey: module.moduleKey,
      moduleLabel: module.moduleLabel,
      note: module.note,
      allowedActions: [...module.allowedActions],
      allAccess: false,
      view: false,
      create: false,
      update: false,
      delete: false,
      roleAccess: {
        allAccess: roleAccess.allAccess,
        view: roleAccess.view,
        create: roleAccess.create,
        update: roleAccess.update,
        delete: roleAccess.delete,
      },
      userOverride: {
        allAccess: normalizeNullableBoolean(userOverride.allAccess),
        view: normalizeNullableBoolean(userOverride.view),
        create: normalizeNullableBoolean(userOverride.create),
        update: normalizeNullableBoolean(userOverride.update),
        delete: normalizeNullableBoolean(userOverride.delete),
      },
      source: {
        allAccess: 'role',
        view: 'role',
        create: 'role',
        update: 'role',
        delete: 'role',
      },
    };

    ACTION_KEYS.forEach((actionKey) => {
      if (!allowedActionSet.has(actionKey)) {
        nextPermission[actionKey] = false;
        nextPermission.userOverride[actionKey] = null;
        nextPermission.source[actionKey] = 'none';
        return;
      }

      const overrideValue = userOverride[actionKey];
      if (typeof overrideValue === 'boolean') {
        nextPermission[actionKey] = overrideValue;
        nextPermission.source[actionKey] = 'user';
      } else {
        nextPermission[actionKey] = Boolean(roleAccess[actionKey]);
      }
    });

    if ((nextPermission.create || nextPermission.update || nextPermission.delete) && allowedActionSet.has('view')) {
      if (nextPermission.view === false) {
        nextPermission.view = true;
        if (nextPermission.source.view === 'role') {
          nextPermission.source.view = 'derived';
        }
      }
    }

    const effectiveAllAccess = module.allowedActions.length > 0 && module.allowedActions.every((actionKey) => nextPermission[actionKey]);
    const overrideActionValues = module.allowedActions.map((actionKey) => nextPermission.userOverride[actionKey]);
    const hasOverrideForAllActions = overrideActionValues.every((value) => typeof value === 'boolean');

    nextPermission.allAccess = effectiveAllAccess;
    nextPermission.userOverride.allAccess = hasOverrideForAllActions ? overrideActionValues.every(Boolean) : null;
    nextPermission.source.allAccess = nextPermission.userOverride.allAccess === null ? 'role' : 'user';

    return nextPermission;
  });
};

const hasModulePermission = (permissions = [], moduleKey, action = 'view') => {
  const module = MODULE_MAP.get(moduleKey);
  if (!module || !module.allowedActions.includes(action)) {
    return false;
  }

  const modulePermission = (permissions || []).find((permission) => permission.moduleKey === moduleKey);
  if (!modulePermission) return false;

  if (modulePermission.allAccess) return true;
  return Boolean(modulePermission[action]);
};

module.exports = {
  ACTION_KEYS,
  MODULE_CATALOG,
  MODULE_MAP,
  buildPermissionId,
  sanitizeRoleKey,
  normalizePermissions,
  normalizePermissionOverrides,
  validatePermissionPayload,
  validatePermissionOverridePayload,
  resolveEffectivePermissions,
  hasModulePermission,
};
