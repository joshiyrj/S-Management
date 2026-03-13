const mongoose = require('mongoose');

let isConnected = false;
let connectPromise = null;

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectPromise) {
    return connectPromise;
  }

  try {
    connectPromise = mongoose.connect(process.env.MONGO_URI, {
      dbName: 'stock_management',
    });

    const conn = await connectPromise;
    isConnected = true;
    connectPromise = null;

    if (process.env.NODE_ENV !== 'test') {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    }

    return conn.connection;
  } catch (error) {
    connectPromise = null;
    isConnected = false;
    throw new Error(`MongoDB connection error: ${error.message}`);
  }
};

module.exports = connectDB;

