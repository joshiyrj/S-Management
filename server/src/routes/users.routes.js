const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const User = require("../models/User");
const { signToken, verifyToken, cookieOptions, clearCookieOptions } = require("../lib/auth");

const USER_COOKIE = "s_management_user_token";

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
});

const ProfileUpdateSchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.string().email().optional(),
    mobile: z.string().trim().min(8).max(20).optional()
}).refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required"
});

const PasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(4).max(128)
});

// Middleware: requireUser
async function requireUser(req, res, next) {
    try {
        const token = req.cookies?.[USER_COOKIE];
        if (!token) return res.status(401).json({ message: "Not authenticated" });

        const decoded = verifyToken(token);
        if (!decoded.userId) return res.status(401).json({ message: "Invalid token" });

        const user = await User.findById(decoded.userId).select("-passwordHash").lean();
        if (!user) return res.status(401).json({ message: "User not found" });
        if (user.status === "suspended") return res.status(403).json({ message: "Account suspended" });

        req.user = { id: user._id.toString(), ...user };
        next();
    } catch {
        return res.status(401).json({ message: "Session expired. Please login again." });
    }
}

// User Registration has been disabled per admin request.

// POST /api/users/login
router.post("/login", async (req, res, next) => {
    try {
        const { email, password } = LoginSchema.parse(req.body);
        const normalizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) return res.status(401).json({ message: "Invalid email or password" });

        if (user.status === "suspended") return res.status(403).json({ message: "Account suspended. Contact admin." });

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) return res.status(401).json({ message: "Invalid email or password" });

        const token = signToken({ userId: user._id.toString() });
        res.cookie(USER_COOKIE, token, cookieOptions());
        res.json({ ok: true, user: { _id: user._id, name: user.name, email: user.email, mobile: user.mobile } });
    } catch (e) { next(e); }
});

// POST /api/users/logout
router.post("/logout", (_, res) => {
    res.clearCookie(USER_COOKIE, clearCookieOptions());
    res.json({ ok: true });
});

// GET /api/users/me
router.get("/me", requireUser, (req, res) => {
    res.json(req.user);
});

// PUT /api/users/profile — update name, email, mobile
router.put("/profile", requireUser, async (req, res, next) => {
    try {
        const { name, email, mobile } = ProfileUpdateSchema.parse(req.body);
        const update = {};

        if (name !== undefined) {
            if (!name.trim()) return res.status(400).json({ message: "Name is required" });
            update.name = name.trim();
        }
        if (email !== undefined) {
            const emailLower = email.toLowerCase().trim();
            const existing = await User.findOne({ email: emailLower, _id: { $ne: req.user.id } });
            if (existing) return res.status(400).json({ message: "This email is already taken" });
            update.email = emailLower;
        }
        if (mobile !== undefined) {
            if (!mobile.trim() || mobile.trim().length < 8) return res.status(400).json({ message: "Mobile must be at least 8 digits" });
            update.mobile = mobile.trim();
        }

        const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select("-passwordHash").lean();
        res.json(user);
    } catch (e) { next(e); }
});

// PUT /api/users/password — change password (10-minute cooldown)
router.put("/password", requireUser, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = PasswordSchema.parse(req.body);

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Check 10-minute cooldown
        if (user.lastPasswordChange) {
            const elapsed = Date.now() - new Date(user.lastPasswordChange).getTime();
            const cooldownMs = 10 * 60 * 1000; // 10 minutes
            if (elapsed < cooldownMs) {
                const remaining = Math.ceil((cooldownMs - elapsed) / 60000);
                return res.status(429).json({
                    message: `Password can only be changed once every 10 minutes. Please wait ${remaining} minute(s).`,
                    cooldownRemaining: cooldownMs - elapsed
                });
            }
        }

        // Verify current password
        const match = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!match) return res.status(401).json({ message: "Current password is incorrect" });

        // Update password
        user.passwordHash = await bcrypt.hash(newPassword, 10);
        user.lastPasswordChange = new Date();
        await user.save();

        res.json({ ok: true, message: "Password changed successfully" });
    } catch (e) { next(e); }
});

module.exports = router;
module.exports.requireUser = requireUser;
module.exports.USER_COOKIE = USER_COOKIE;
