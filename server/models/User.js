const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const permissionOverrideSchema = new mongoose.Schema(
  {
    moduleKey: {
      type: String,
      required: true,
      trim: true,
    },
    moduleLabel: {
      type: String,
      trim: true,
      default: '',
    },
    allAccess: {
      type: Boolean,
      default: null,
    },
    view: {
      type: Boolean,
      default: null,
    },
    create: {
      type: Boolean,
      default: null,
    },
    update: {
      type: Boolean,
      default: null,
    },
    delete: {
      type: Boolean,
      default: null,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      default: '',
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      required: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      default: null,
    },
    roleKey: {
      type: String,
      trim: true,
      lowercase: true,
      default: 'superadmin',
    },
    roleName: {
      type: String,
      trim: true,
      default: 'Super Admin',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    mailStatus: {
      type: String,
      trim: true,
      default: 'Not queued',
    },
    permissionOverrides: {
      type: [permissionOverrideSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', userSchema);
