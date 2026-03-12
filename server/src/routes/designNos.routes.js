const router = require("express").Router();
const { requireAdmin } = require("../middlewares/requireAdmin");
const DesignNo = require("../models/DesignNo");
const { parseCsvObjects, normalizeStatus } = require("../lib/csv");

router.use(requireAdmin);

const SORTABLE_FIELDS = new Set(["designNumber", "title", "category", "color", "mill", "status", "createdAt", "updatedAt"]);

function resolveSort(sort, order) {
    const field = SORTABLE_FIELDS.has(sort) ? sort : "createdAt";
    const direction = order === "asc" ? 1 : -1;
    return { [field]: direction };
}

// GET /api/design-nos
router.get("/", async (req, res, next) => {
    try {
        const { search, sort = "createdAt", order = "desc", page = 1, limit = 10, status } = req.query;
        const filter = {};
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.max(1, Math.min(100, Number(limit) || 10));

        if (search) {
            filter.$or = [
                { designNumber: { $regex: search, $options: "i" } },
                { title: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } },
                { mill: { $regex: search, $options: "i" } }
            ];
        }
        if (status && status !== "all") filter.status = status;

        const skip = (pageNum - 1) * limitNum;
        const sortObj = resolveSort(sort, order);

        const [items, total] = await Promise.all([
            DesignNo.find(filter).sort(sortObj).skip(skip).limit(limitNum).lean(),
            DesignNo.countDocuments(filter)
        ]);

        res.json({
            items,
            total,
            page: pageNum,
            totalPages: Math.max(1, Math.ceil(total / limitNum))
        });
    } catch (e) { next(e); }
});

// POST /api/design-nos
router.post("/", async (req, res, next) => {
    try {
        const { designNumber, title, category, color, mill, status, notes } = req.body;
        if (!designNumber?.trim()) return res.status(400).json({ message: "Design number is required" });

        const design = await DesignNo.create({
            designNumber: designNumber.trim(),
            title: title?.trim() || "",
            category: category?.trim() || "",
            color: color?.trim() || "",
            mill: mill?.trim() || "",
            status: status || "active",
            notes: notes || ""
        });
        res.status(201).json(design);
    } catch (e) {
        if (e.code === 11000) return res.status(400).json({ message: "This design number already exists" });
        next(e);
    }
});

// PUT /api/design-nos/:id
router.put("/:id", async (req, res, next) => {
    try {
        const update = {};
        const fields = ["designNumber", "title", "category", "color", "mill", "status", "notes"];
        for (const f of fields) {
            if (req.body[f] !== undefined) update[f] = typeof req.body[f] === "string" ? req.body[f].trim() : req.body[f];
        }
        if (update.designNumber !== undefined && !update.designNumber) {
            return res.status(400).json({ message: "Design number is required" });
        }

        const design = await DesignNo.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!design) return res.status(404).json({ message: "Design not found" });
        res.json(design);
    } catch (e) {
        if (e.code === 11000) return res.status(400).json({ message: "This design number already exists" });
        next(e);
    }
});

// DELETE /api/design-nos/:id
router.delete("/:id", async (req, res, next) => {
    try {
        const design = await DesignNo.findByIdAndDelete(req.params.id);
        if (!design) return res.status(404).json({ message: "Design not found" });
        res.json({ ok: true, message: `Design "${design.designNumber}" deleted` });
    } catch (e) { next(e); }
});

// POST /api/design-nos/bulk/delete
router.post("/bulk/delete", async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: "No IDs provided" });
        const result = await DesignNo.deleteMany({ _id: { $in: ids } });
        res.json({ ok: true, deletedCount: result.deletedCount });
    } catch (e) { next(e); }
});

// POST /api/design-nos/bulk/status
router.post("/bulk/status", async (req, res, next) => {
    try {
        const { ids, status } = req.body;
        if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: "No IDs provided" });
        if (!["active", "inactive"].includes(status)) return res.status(400).json({ message: "Invalid status" });
        await DesignNo.updateMany({ _id: { $in: ids } }, { status });
        res.json({ ok: true });
    } catch (e) { next(e); }
});

// POST /api/design-nos/bulk/import
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
            const designNumber = String(row.designNumber || "").trim();
            if (!designNumber) {
                skipped.push({ row: record.rowNumber, reason: "designNumber is required" });
                continue;
            }

            operations.push({
                updateOne: {
                    filter: { designNumber },
                    update: {
                        $set: {
                            designNumber,
                            title: String(row.title || "").trim(),
                            category: String(row.category || "").trim(),
                            color: String(row.color || "").trim(),
                            mill: String(row.mill || "").trim(),
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

        const result = await DesignNo.bulkWrite(operations, { ordered: false });
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

// POST /api/design-nos/merge
router.post("/merge", async (req, res, next) => {
    try {
        const { sourceIds, targetId } = req.body;
        if (!Array.isArray(sourceIds) || !sourceIds.length || !targetId) {
            return res.status(400).json({ message: "sourceIds and targetId required" });
        }
        await DesignNo.deleteMany({ _id: { $in: sourceIds.filter(id => id !== targetId) } });
        const target = await DesignNo.findById(targetId).lean();
        if (!target) return res.status(404).json({ message: "Target design no not found" });
        res.json({ ok: true, message: `Merged into "${target.designNumber}"`, target });
    } catch (e) { next(e); }
});

module.exports = router;
