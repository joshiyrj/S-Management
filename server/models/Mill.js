const mongoose = require('mongoose');

const millSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Mill name is required'],
      trim: true,
      unique: true,
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

millSchema.index({ name: 1, isDeleted: 1 });

module.exports = mongoose.model('Mill', millSchema);
