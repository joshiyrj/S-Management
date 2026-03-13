const mongoose = require('mongoose');

const baleDetailSchema = new mongoose.Schema(
  {
    sNo: { type: Number },
    baleNo: { type: String, required: true, trim: true },
    meter: { type: Number, required: true, min: [0.01, 'Meter must be greater than 0'] },
    billNo: { type: String, default: '', trim: true },
  },
  { _id: true }
);

const thanDetailSchema = new mongoose.Schema(
  {
    sNo: { type: Number },
    thanMeter: { type: Number, required: true, min: [0.01, 'Than meter must be greater than 0'] },
    checked: { type: Boolean, default: false },
    baleDetails: [baleDetailSchema],
  },
  { _id: true }
);

const stockSchema = new mongoose.Schema(
  {
    date: { type: Date, required: [true, 'Date is required'] },
    millId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mill', required: [true, 'Mill is required'] },
    millName: { type: String },
    type: {
      type: String,
      enum: { values: ['regular', 'mix'], message: 'Type must be regular or mix' },
      required: [true, 'Stock type is required'],
    },
    qualityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quality', required: [true, 'Quality is required'] },
    qualityName: { type: String },
    designId: { type: mongoose.Schema.Types.ObjectId, ref: 'Design', required: [true, 'Design is required'] },
    designName: { type: String },
    lotNo: { type: Number, required: [true, 'Lot number is required'], min: [1, 'Lot No must be at least 1'] },
    totalMeterReceived: {
      type: Number,
      required: [true, 'Total meter received is required'],
      min: [0.01, 'Total meter must be greater than 0'],
    },

    // Regular type fields
    baleDetails: [baleDetailSchema],

    // Mix type fields
    thanDetails: [thanDetailSchema],

    // Common
    second: { type: Number, default: 0, min: 0 },
    unchecked: { type: Number, default: 0, min: 0 },

    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ─── Virtuals ────────────────────────────────────────────────────────────────

stockSchema.virtual('meterOfTotalBales').get(function () {
  if (this.type === 'regular') {
    return Number(
      this.baleDetails.reduce((sum, b) => sum + (b.meter || 0), 0).toFixed(2)
    );
  }
  return 0;
});

stockSchema.virtual('meterOfTotalThan').get(function () {
  if (this.type === 'mix') {
    return Number(
      this.thanDetails.reduce((sum, t) => sum + (t.thanMeter || 0), 0).toFixed(2)
    );
  }
  return 0;
});

stockSchema.virtual('remaining').get(function () {
  const total = this.totalMeterReceived || 0;
  if (this.type === 'regular') {
    const baleSum = this.baleDetails.reduce((s, b) => s + (b.meter || 0), 0);
    return Number((total - baleSum).toFixed(2));
  } else {
    const thanSum = this.thanDetails.reduce((s, t) => s + (t.thanMeter || 0), 0);
    return Number((total - thanSum).toFixed(2));
  }
});

stockSchema.virtual('finalReport').get(function () {
  const total = this.totalMeterReceived || 0;
  const second = this.second || 0;
  const unchecked = this.unchecked || 0;
  if (this.type === 'regular') {
    const baleSum = this.baleDetails.reduce((s, b) => s + (b.meter || 0), 0);
    return Number((total - (baleSum + second + unchecked)).toFixed(2));
  } else {
    const thanSum = this.thanDetails.reduce((s, t) => s + (t.thanMeter || 0), 0);
    return Number((total - (thanSum + second + unchecked)).toFixed(2));
  }
});

stockSchema.virtual('meterSold').get(function () {
  if (this.type === 'regular') {
    return Number(
      this.baleDetails
        .filter((b) => b.billNo && b.billNo.trim() !== '')
        .reduce((s, b) => s + (b.meter || 0), 0)
        .toFixed(2)
    );
  } else {
    return Number(
      this.thanDetails
        .filter((t) => t.checked)
        .reduce((s, t) => s + (t.thanMeter || 0), 0)
        .toFixed(2)
    );
  }
});

stockSchema.virtual('stockRemaining').get(function () {
  if (this.type === 'regular') {
    return Number(
      this.baleDetails
        .filter((b) => !b.billNo || b.billNo.trim() === '')
        .reduce((s, b) => s + (b.meter || 0), 0)
        .toFixed(2)
    );
  } else {
    return Number(
      this.thanDetails
        .filter((t) => !t.checked)
        .reduce((s, t) => s + (t.thanMeter || 0), 0)
        .toFixed(2)
    );
  }
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
stockSchema.index({ millId: 1, qualityId: 1, designId: 1, lotNo: 1, isDeleted: 1 });
stockSchema.index({ type: 1, isDeleted: 1 });
stockSchema.index({ date: -1 });

module.exports = mongoose.model('Stock', stockSchema);
