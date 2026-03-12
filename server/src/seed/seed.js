require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Entity = require("../models/Entity");
const Admin = require("../models/AdminUser");
const User = require("../models/User");

const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME || "SuperAdmin";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@1234";
const DEFAULT_USER_EMAIL = String(process.env.DEFAULT_USER_EMAIL || "joshiyrj@gmail.com").toLowerCase().trim();
const DEFAULT_USER_PASSWORD = process.env.DEFAULT_USER_PASSWORD || "Admin@1234";
const DEFAULT_USER_NAME = process.env.DEFAULT_USER_NAME || "Joshiyrj";
const DEFAULT_USER_MOBILE = process.env.DEFAULT_USER_MOBILE || "9999999999";

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected (seed)");

  await Entity.deleteMany({});
  console.log("Cleared entities");

  const collections = await Entity.insertMany(
    ["Basics", "Premium", "Festive", "Summer", "Winter"].map((name, idx) => ({
      type: "collection",
      name,
      status: "active",
      sortOrder: idx,
      tags: ["seed"]
    }))
  );

  const items = [];
  let itemNum = 1;
  for (const col of collections) {
    items.push({
      type: "item",
      name: `Item ${itemNum++} - ${col.name}`,
      status: "active",
      sortOrder: 0,
      tags: ["seed"],
      description: `Seed item linked to ${col.name}`,
      collectionId: col._id,
      collectionName: col.name
    });
    items.push({
      type: "item",
      name: `Item ${itemNum++} - ${col.name}`,
      status: "active",
      sortOrder: 0,
      tags: ["seed"],
      description: `Seed item linked to ${col.name}`,
      collectionId: col._id,
      collectionName: col.name
    });
  }
  await Entity.insertMany(items);

  console.log("Seeded 5 collections + 10 items");

  try {
    const existing = await Admin.findOne({ username: DEFAULT_ADMIN_USERNAME }).lean();
    if (!existing) {
      const hash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
      await Admin.create({
        username: DEFAULT_ADMIN_USERNAME,
        passwordHash: hash,
        name: "Admin",
        email: "admin@smanagement.com",
        mobile: "9999999999"
      });
      console.log(`Admin seeded: ${DEFAULT_ADMIN_USERNAME} / <configured password>`);
    }
  } catch {
    // Ignore admin seeding when admin model is unavailable.
  }

  try {
    const existingUser = await User.findOne({ email: DEFAULT_USER_EMAIL }).lean();
    if (!existingUser) {
      const userHash = await bcrypt.hash(DEFAULT_USER_PASSWORD, 10);
      await User.create({
        name: DEFAULT_USER_NAME,
        email: DEFAULT_USER_EMAIL,
        mobile: DEFAULT_USER_MOBILE,
        passwordHash: userHash,
        status: "active"
      });
      console.log(`Default user seeded: ${DEFAULT_USER_EMAIL} / <configured password>`);
    }
  } catch {
    // Ignore user seeding when user model is unavailable.
  }

  await mongoose.disconnect();
  console.log("Seed complete");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
