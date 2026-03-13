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
        const roleById = await Role.findById(user.roleId);
        if (roleById) return roleById;
    }

    if (user?.roleKey) {
        const roleByKey = await Role.findOne({ key: String(user.roleKey).toLowerCase() });
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
            req.user = await User.findById(decoded.id).select('-password');

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
