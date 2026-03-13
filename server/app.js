require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const masterRoutes = require('./routes/masterRoutes');
const stockRoutes = require('./routes/stockRoutes');
const reportRoutes = require('./routes/reportRoutes');
const authRoutes = require('./routes/authRoutes');
const roleRoutes = require('./routes/roleRoutes');

const { protect } = require('./middleware/authMiddleware');

const app = express();

const defaultOrigins = ['http://localhost:5173'];
const envOrigins = [process.env.CLIENT_URL, process.env.FRONTEND_URL]
  .filter(Boolean)
  .flatMap((value) => String(value).split(',').map((origin) => origin.trim()).filter(Boolean));
const vercelOrigins = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
  .filter(Boolean)
  .map((value) => `https://${String(value).trim()}`);
const allowedOrigins = new Set([...defaultOrigins, ...envOrigins, ...vercelOrigins]);
const allowAllOrigins =
  process.env.CORS_ALLOW_ALL === 'true' ||
  (process.env.NODE_ENV === 'production' && envOrigins.length === 0);
const vercelOriginPattern = /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/;

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || allowAllOrigins || allowedOrigins.has(origin) || vercelOriginPattern.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS origin not allowed'));
    },
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/master', protect, masterRoutes);
app.use('/api/stocks', protect, stockRoutes);
app.use('/api/reports', protect, reportRoutes);
app.use('/api/roles', protect, roleRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

connectDB().catch((error) => {
  console.error(error.message || 'MongoDB connection failed');
});

module.exports = app;

