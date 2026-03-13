const mongoose = require('mongoose');

const qualitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Quality name is required'],
      trim: true,
      unique: true,
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

qualitySchema.index({ name: 1, isDeleted: 1 });

module.exports = mongoose.model('Quality', qualitySchema);
