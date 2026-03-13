export const hasPermission = (permissions = [], moduleKey, action = 'view') => {
  if (!moduleKey) return true;
  const modulePermission = (permissions || []).find((permission) => permission.moduleKey === moduleKey);
  if (!modulePermission) return false;
  if (modulePermission.allAccess) return true;
  return Boolean(modulePermission[action]);
};

export const routePermissionMatrix = [
  { path: '/dashboard', moduleKey: 'dashboard', action: 'view' },
  { path: '/master', moduleKey: 'master_data', action: 'view' },
  { path: '/stocks', moduleKey: 'stock_list', action: 'view' },
  { path: '/stocks/add', moduleKey: 'stock_entry', action: 'view' },
  { path: '/reports', moduleKey: 'reports', action: 'view' },
  { path: '/roles/manage-roles', moduleKey: 'roles_permissions', action: 'view' },
];

export const getFirstAllowedPath = (permissions = []) => {
  const match = routePermissionMatrix.find((route) => hasPermission(permissions, route.moduleKey, route.action));
  return match?.path || '/login';
};
