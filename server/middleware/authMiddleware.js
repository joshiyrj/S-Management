const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const {
    MODULE_CATALOG,
    hasModulePermission,
    normalizePermissions,
    normalizePermissionOverrides,
    resolveEffectivePermissions,
} = require('../config/permissionCatalog');
const { ensureDefaultRoles } = require('../controllers/roleController');

const ROLE_CACHE_TTL_MS = 5 * 60 * 1000;
const roleCache = new Map();

const getCachedRole = (cacheKey) => {
    const cached = roleCache.get(cacheKey);
    if (!cached) return null;
    if (cached.expiresAt < Date.now()) {
        roleCache.delete(cacheKey);
        return null;
    }
    return cached.role;
};

const setCachedRole = (role) => {
    if (!role || !role._id) return;
    const cacheEntry = {
        role,
        expiresAt: Date.now() + ROLE_CACHE_TTL_MS,
    };
    roleCache.set(String(role._id), cacheEntry);
    roleCache.set(`key:${String(role.key || '').toLowerCase()}`, cacheEntry);
};

const findRoleByIdCached = async (roleId) => {
    const cacheKey = String(roleId || '');
    if (!cacheKey) return null;
    const cached = getCachedRole(cacheKey);
    if (cached) return cached;

    const role = await Role.findById(roleId).lean();
    if (role) setCachedRole(role);
    return role;
};

const findRoleByKeyCached = async (roleKey) => {
    const cacheKey = `key:${String(roleKey || '').toLowerCase()}`;
    if (!roleKey) return null;
    const cached = getCachedRole(cacheKey);
    if (cached) return cached;

    const role = await Role.findOne({ key: String(roleKey).toLowerCase() }).lean();
    if (role) setCachedRole(role);
    return role;
};

const fallbackPermissionsForRoleKey = (roleKey) => {
    const elevatedRole = ['superadmin', 'subadmin'].includes(String(roleKey || '').toLowerCase());
    if (!elevatedRole) {
        return normalizePermissions([]);
    }

    return normalizePermissions(
        MODULE_CATALOG.map((module) => ({
            moduleKey: module.moduleKey,
            allAccess: true,
        }))
    );
};

const resolveRoleForUser = async (user) => {
    if (user?.roleId) {
        const roleById = await findRoleByIdCached(user.roleId);
        if (roleById) return roleById;
    }

    if (user?.roleKey) {
        const roleByKey = await findRoleByKeyCached(user.roleKey);
        if (roleByKey) return roleByKey;
    }

    return null;
};

const attachEffectivePermissions = async (user) => {
    await ensureDefaultRoles();

    const role = await resolveRoleForUser(user);
    const rolePermissions = role
        ? normalizePermissions(role.permissions || [])
        : fallbackPermissionsForRoleKey(user.roleKey);
    const permissionOverrides = normalizePermissionOverrides(user.permissionOverrides || []);
    const effectivePermissions = resolveEffectivePermissions(rolePermissions, permissionOverrides);

    if (role && role.isActive === false) {
        return {
            isValid: false,
            message: 'Assigned role is inactive. Contact an administrator.',
        };
    }

    user.permissions = effectivePermissions;
    user.permissionOverrides = permissionOverrides;
    if (role) {
        user.roleId = role._id;
        user.roleKey = role.key;
        user.roleName = role.name;
    }

    return { isValid: true };
};

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

            // Get user from the token
            req.user = await User.findById(decoded.id).select(
                '_id fullName username email roleId roleKey roleName isActive permissionOverrides createdAt updatedAt'
            );

            if (!req.user || req.user.isActive === false) {
                return res.status(401).json({ success: false, message: 'User account is inactive' });
            }

            const accessValidation = await attachEffectivePermissions(req.user);
            if (!accessValidation.isValid) {
                return res.status(401).json({ success: false, message: accessValidation.message });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
};

const requirePermission = (moduleKey, action = 'view') => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    if (!hasModulePermission(req.user.permissions || [], moduleKey, action)) {
        return res.status(403).json({
            success: false,
            message: `You do not have permission to ${action} ${moduleKey}.`,
        });
    }

    next();
};

module.exports = { protect, requirePermission };
