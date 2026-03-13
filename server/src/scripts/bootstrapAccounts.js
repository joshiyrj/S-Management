require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const AdminUser = require("../models/AdminUser");
const User = require("../models/User");

function normalizeEmail(value) {
  return String(value || "").toLowerCase().trim();
}

async function createAdminIfConfigured() {
  const username = String(process.env.ADMIN_USERNAME || "").trim();
  const password = String(process.env.ADMIN_PASSWORD || "");

  if (!username || !password) {
    console.log("Admin bootstrap skipped: ADMIN_USERNAME or ADMIN_PASSWORD is missing.");
    return;
  }

  const existing = await AdminUser.findOne({ username }).lean();
  if (existing) {
    console.log(`Admin bootstrap skipped: "${username}" already exists.`);
    return;
  }

  await AdminUser.create({
    username,
    passwordHash: await bcrypt.hash(password, 10),
    name: String(process.env.ADMIN_NAME || "Administrator").trim(),
    email: normalizeEmail(process.env.ADMIN_EMAIL || "admin@smanagement.com"),
    mobile: String(process.env.ADMIN_MOBILE || "").trim()
  });

  console.log(`Admin account created: ${username}`);
}

async function createUserIfConfigured() {
  const email = normalizeEmail(process.env.DEFAULT_USER_EMAIL);
  const password = String(process.env.DEFAULT_USER_PASSWORD || "");

  if (!email || !password) {
    console.log("User bootstrap skipped: DEFAULT_USER_EMAIL or DEFAULT_USER_PASSWORD is missing.");
    return;
  }

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    console.log(`User bootstrap skipped: "${email}" already exists.`);
    return;
  }

  await User.create({
    name: String(process.env.DEFAULT_USER_NAME || "Client User").trim(),
    email,
    mobile: String(process.env.DEFAULT_USER_MOBILE || "").trim(),
    passwordHash: await bcrypt.hash(password, 10),
    status: "active"
  });

  console.log(`User account created: ${email}`);
}

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required to bootstrap accounts.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");

  await createAdminIfConfigured();
  await createUserIfConfigured();

  await mongoose.disconnect();
  console.log("Bootstrap complete");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
