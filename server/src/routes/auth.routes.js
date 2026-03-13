const router = require("express").Router();
const bcrypt = require("bcryptjs");
const AdminUser = require("../models/AdminUser");
const { signToken, cookieOptions, clearCookieOptions } = require("../lib/auth");
const { z } = require("zod");

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});
const ADMIN_COOKIE = process.env.COOKIE_NAME || "s_management_token";

router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = LoginSchema.parse(req.body);
    const normalizedUsername = username.trim();
    const admin = await AdminUser.findOne({ username: normalizedUsername });
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });

    const passwordOk = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ adminId: admin._id.toString() });

    res.cookie(ADMIN_COOKIE, token, cookieOptions());
    return res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/logout", async (req, res) => {
  res.clearCookie(ADMIN_COOKIE, clearCookieOptions());
  res.json({ ok: true });
});

module.exports = router;
