const Mill = require('../models/Mill');
const Quality = require('../models/Quality');
const Design = require('../models/Design');

// ─── Generic CRUD factory ─────────────────────────────────────────────────────

const createHandlers = (Model, label) => ({
  getAll: async (req, res, next) => {
    try {
      const filter = { isDeleted: false };
      if (req.query.includeInactive !== 'true') {
        filter.isActive = { $ne: false };
      }
      const items = await Model.find(filter).sort({ name: 1 });
      res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: `${label} name is required` });
      }
      const existing = await Model.findOne({ name: name.trim(), isDeleted: false });
      if (existing) {
        return res.status(400).json({ success: false, message: `${label} "${name.trim()}" already exists` });
      }
      const item = await Model.create({ name: name.trim() });
      res.status(201).json({ success: true, data: item, message: `${label} added successfully` });
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: `${label} name is required` });
      }
      // Check duplicate (excluding current)
      const existing = await Model.findOne({ name: name.trim(), isDeleted: false, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ success: false, message: `${label} "${name.trim()}" already exists` });
      }
      const item = await Model.findByIdAndUpdate(
        req.params.id,
        { name: name.trim() },
        { new: true, runValidators: true }
      );
      if (!item || item.isDeleted) {
        return res.status(404).json({ success: false, message: `${label} not found` });
      }
      res.json({ success: true, data: item, message: `${label} updated successfully` });
    } catch (err) {
      next(err);
    }
  },

  toggleStatus: async (req, res, next) => {
    try {
      const item = await Model.findOne({ _id: req.params.id, isDeleted: false });
      if (!item) {
        return res.status(404).json({ success: false, message: `${label} not found` });
      }

      item.isActive = item.isActive === false;
      await item.save();

      res.json({
        success: true,
        data: item,
        message: `${label} marked as ${item.isActive ? 'active' : 'inactive'}`,
      });
    } catch (err) {
      next(err);
    }
  },

  remove: async (req, res, next) => {
    try {
      const item = await Model.findByIdAndUpdate(
        req.params.id,
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      );
      if (!item) {
        return res.status(404).json({ success: false, message: `${label} not found` });
      }
      res.json({ success: true, message: `${label} deleted successfully` });
    } catch (err) {
      next(err);
    }
  },
});

const millHandlers = createHandlers(Mill, 'Mill');
const qualityHandlers = createHandlers(Quality, 'Quality');
const designHandlers = createHandlers(Design, 'Design');

module.exports = { millHandlers, qualityHandlers, designHandlers };
