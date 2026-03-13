const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    permissionId: { type: String, required: true, trim: true },
    moduleKey: { type: String, required: true, trim: true },
    moduleLabel: { type: String, required: true, trim: true },
    allAccess: { type: Boolean, default: false },
    view: { type: Boolean, default: false },
    create: { type: Boolean, default: false },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
    locked: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    scope: {
      type: String,
      enum: ['system', 'operations', 'sales', 'finance'],
      default: 'operations',
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    permissions: [permissionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Role', roleSchema);
