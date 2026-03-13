const User = require('../models/User');
const Role = require('../models/Role');
const jwt = require('jsonwebtoken');
const {
    MODULE_CATALOG,
    normalizePermissions,
    normalizePermissionOverrides,
    resolveEffectivePermissions,
} = require('../config/permissionCatalog');
const { ensureDefaultRoles } = require('./roleController');

const passwordHasUppercase = /[A-Z]/;
const passwordHasLowercase = /[a-z]/;
const passwordHasNumber = /\d/;
const passwordHasWhitespace = /\s/;

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

const buildUserAccessPayload = async (user) => {
    await ensureDefaultRoles();

    const role = await resolveRoleForUser(user);
    const rolePermissions = role
        ? normalizePermissions(role.permissions || [])
        : fallbackPermissionsForRoleKey(user.roleKey);
    const permissionOverrides = normalizePermissionOverrides(user.permissionOverrides || []);
    const effectivePermissions = resolveEffectivePermissions(rolePermissions, permissionOverrides);

    return {
        role,
        permissionOverrides,
        effectivePermissions,
    };
};

const getUserPayload = async (user, includeToken = false) => {
    const { role, permissionOverrides, effectivePermissions } = await buildUserAccessPayload(user);

    const payload = {
        _id: user._id,
        username: user.username,
        fullName: user.fullName || user.username,
        email: user.email || '',
        roleId: role?._id || user.roleId || null,
        roleKey: role?.key || user.roleKey || 'superadmin',
        roleName: role?.name || user.roleName || 'Super Admin',
        isActive: user.isActive !== false,
        permissionOverrides,
        permissions: effectivePermissions,
    };

    if (includeToken) {
        payload.token = generateToken(user._id);
    }

    return payload;
};

// Generate JWT for authenticated users
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '30d',
    });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        await ensureDefaultRoles();

        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Please provide both username and password' });
        }

        // Check for user
        const user = await User.findOne({ username });

        if (user && user.isActive === false) {
            return res.status(401).json({ success: false, message: 'Your account is inactive. Please contact an administrator.' });
        }

        if (user && (await user.matchPassword(password))) {
            const responsePayload = await getUserPayload(user, true);
            res.json({
                success: true,
                data: responsePayload,
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
};

const getMe = async (req, res) => {
    const responsePayload = await getUserPayload(req.user);
    res.json({
        success: true,
        data: responsePayload,
    });
};

const updateProfile = async (req, res) => {
    try {
        const { username } = req.body;

        if (!username || !username.trim()) {
            return res.status(400).json({ success: false, message: 'Username is required' });
        }

        const normalizedUsername = username.trim();
        const existingUser = await User.findOne({
            username: normalizedUsername,
            _id: { $ne: req.user._id },
        });

        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }

        const user = await User.findById(req.user._id);
        user.username = normalizedUsername;
        await user.save();

        const responsePayload = await getUserPayload(user, true);
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: responsePayload,
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Server error while updating profile' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (![currentPassword, newPassword, confirmPassword].every((value) => typeof value === 'string' && value.trim())) {
            return res.status(400).json({ success: false, message: 'All password fields are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
        }

        if (passwordHasWhitespace.test(newPassword)) {
            return res.status(400).json({ success: false, message: 'New password cannot contain spaces' });
        }

        if (!passwordHasUppercase.test(newPassword)) {
            return res.status(400).json({ success: false, message: 'New password must include at least one uppercase letter' });
        }

        if (!passwordHasLowercase.test(newPassword)) {
            return res.status(400).json({ success: false, message: 'New password must include at least one lowercase letter' });
        }

        if (!passwordHasNumber.test(newPassword)) {
            return res.status(400).json({ success: false, message: 'New password must include at least one number' });
        }

        if (newPassword === currentPassword) {
            return res.status(400).json({ success: false, message: 'New password must be different from current password' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'New password and confirm password must match' });
        }

        const user = await User.findById(req.user._id);
        const isMatch = await user.matchPassword(currentPassword);

        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Server error while changing password' });
    }
};

module.exports = {
    login,
    getMe,
    updateProfile,
    changePassword,
};
