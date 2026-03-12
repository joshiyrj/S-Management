const router = require("express").Router();
const { requireAdmin } = require("../middlewares/requireAdmin");
const Quantity = require("../models/Quantity");
const { parseCsvObjects, normalizeStatus } = require("../lib/csv");

router.use(requireAdmin);

const SORTABLE_FIELDS = new Set(["label", "value", "unit", "category", "status", "createdAt", "updatedAt"]);

function resolveSort(sort, order) {
    const field = SORTABLE_FIELDS.has(sort) ? sort : "createdAt";
    const direction = order === "asc" ? 1 : -1;
    return { [field]: direction };
}

// GET /api/quantities
router.get("/", async (req, res, next) => {
    try {
        const { search, sort = "createdAt", order = "desc", page = 1, limit = 10, status } = req.query;
        const filter = {};
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.max(1, Math.min(100, Number(limit) || 10));

        if (search) {
            filter.$or = [
                { label: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } },
                { unit: { $regex: search, $options: "i" } }
            ];
        }
        if (status && status !== "all") filter.status = status;

        const skip = (pageNum - 1) * limitNum;
        const sortObj = resolveSort(sort, order);

        const [items, total] = await Promise.all([
            Quantity.find(filter).sort(sortObj).skip(skip).limit(limitNum).lean(),
            Quantity.countDocuments(filter)
        ]);

        res.json({
            items,
            total,
            page: pageNum,
            totalPages: Math.max(1, Math.ceil(total / limitNum))
        });
    } catch (e) { next(e); }
});

// POST /api/quantities
router.post("/", async (req, res, next) => {
    try {
        const { label, value, unit, category, status, notes } = req.body;
        const numericValue = Number(value || 0);
        if (!label?.trim()) return res.status(400).json({ message: "Label is required" });
        if (value !== undefined && value !== null && value !== "" && !Number.isFinite(numericValue)) return res.status(400).json({ message: "Value must be a valid number" });

        const qty = await Quantity.create({
            label: label.trim(),
            value: numericValue,
            unit: unit?.trim() || "pcs",
            category: category?.trim() || "",
            status: status || "active",
            notes: notes || ""
        });
        res.status(201).json(qty);
    } catch (e) { next(e); }
});

// PUT /api/quantities/:id
router.put("/:id", async (req, res, next) => {
    try {
        const update = {};
        const fields = ["label", "value", "unit", "category", "status", "notes"];
        for (const f of fields) {
            if (req.body[f] !== undefined) {
                if (f === "value") {
                    const numericValue = Number(req.body[f]);
                    if (!Number.isFinite(numericValue)) {
                        return res.status(400).json({ message: "Value must be a valid number" });
                    }
                    update[f] = numericValue;
                } else {
                    update[f] = typeof req.body[f] === "string" ? req.body[f].trim() : req.body[f];
                }
            }
        }
        if (update.label !== undefined && !update.label) {
            return res.status(400).json({ message: "Label is required" });
        }

        const qty = await Quantity.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!qty) return res.status(404).json({ message: "Quantity not found" });
        res.json(qty);
    } catch (e) { next(e); }
});

// DELETE /api/quantities/:id
router.delete("/:id", async (req, res, next) => {
    try {
        const qty = await Quantity.findByIdAndDelete(req.params.id);
        if (!qty) return res.status(404).json({ message: "Quantity not found" });
        res.json({ ok: true, message: `Quantity "${qty.label}" deleted` });
    } catch (e) { next(e); }
});

// POST /api/quantities/bulk/delete
router.post("/bulk/delete", async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: "No IDs provided" });
        const result = await Quantity.deleteMany({ _id: { $in: ids } });
        res.json({ ok: true, deletedCount: result.deletedCount });
    } catch (e) { next(e); }
});

// POST /api/quantities/bulk/status
router.post("/bulk/status", async (req, res, next) => {
    try {
        const { ids, status } = req.body;
        if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: "No IDs provided" });
        if (!["active", "inactive"].includes(status)) return res.status(400).json({ message: "Invalid status" });
        await Quantity.updateMany({ _id: { $in: ids } }, { status });
        res.json({ ok: true });
    } catch (e) { next(e); }
});

// POST /api/quantities/bulk/import
router.post("/bulk/import", async (req, res, next) => {
    try {
        const csv = req.body?.csv;
        if (typeof csv !== "string" || !csv.trim()) {
            return res.status(400).json({ message: "CSV content is required" });
        }

        const { records } = parseCsvObjects(csv);
        if (!records.length) {
            return res.status(400).json({ message: "CSV has no data rows" });
        }

        const operations = [];
        const skipped = [];

        for (const record of records) {
            const row = record.data;
            const label = String(row.label || "").trim();
            const value = Number(String(row.value || "").trim());

            if (!label) {
                skipped.push({ row: record.rowNumber, reason: "label is required" });
                continue;
            }
            if (!Number.isFinite(value)) {
                skipped.push({ row: record.rowNumber, reason: "value must be numeric" });
                continue;
            }

            operations.push({
                updateOne: {
                    filter: { label },
                    update: {
                        $set: {
                            label,
                            value,
                            unit: String(row.unit || "pcs").trim() || "pcs",
                            category: String(row.category || "").trim(),
                            status: normalizeStatus(row.status),
                            notes: String(row.notes || "").trim()
                        }
                    },
                    upsert: true
                }
            });
        }

        if (!operations.length) {
            return res.status(400).json({ message: "No valid rows found for import", skipped });
        }

        const result = await Quantity.bulkWrite(operations, { ordered: false });
        res.json({
            ok: true,
            imported: operations.length,
            created: result.upsertedCount || 0,
            updated: result.modifiedCount || 0,
            skipped: skipped.length,
            errors: skipped.slice(0, 25)
        });
    } catch (e) { next(e); }
});

// POST /api/quantities/merge
router.post("/merge", async (req, res, next) => {
    try {
        const { sourceIds, targetId } = req.body;
        if (!Array.isArray(sourceIds) || !sourceIds.length || !targetId) {
            return res.status(400).json({ message: "sourceIds and targetId required" });
        }
        const sources = await Quantity.find({ _id: { $in: sourceIds.filter(id => id !== targetId) } }).lean();
        const totalValue = sources.reduce((sum, s) => sum + s.value, 0);
        await Quantity.findByIdAndUpdate(targetId, { $inc: { value: totalValue } });
        await Quantity.deleteMany({ _id: { $in: sourceIds.filter(id => id !== targetId) } });
        const target = await Quantity.findById(targetId).lean();
        if (!target) return res.status(404).json({ message: "Target quantity not found" });
        res.json({ ok: true, message: `Merged into "${target.label}" (total: ${target.value})`, target });
    } catch (e) { next(e); }
});

module.exports = router;
