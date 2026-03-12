const { connectDB } = require("../server/src/lib/db");
const { createApp } = require("../server/src/app");

const app = createApp();

module.exports = async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (err) {
    console.error("Vercel handler error:", err);
    return res.status(500).json({ message: "Server initialization failed" });
  }
};
