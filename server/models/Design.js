const mongoose = require('mongoose');

const designSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Design number is required'],
      trim: true,
      unique: true,
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

designSchema.index({ name: 1, isDeleted: 1 });

module.exports = mongoose.model('Design', designSchema);
