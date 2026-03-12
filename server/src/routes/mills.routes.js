const router = require("express").Router();
const { requireAdmin } = require("../middlewares/requireAdmin");
const Mill = require("../models/Mill");
const { parseCsvObjects, normalizeStatus } = require("../lib/csv");

router.use(requireAdmin);

const SORTABLE_FIELDS = new Set(["name", "location", "contactPerson", "status", "createdAt", "updatedAt"]);

function resolveSort(sort, order) {
    const field = SORTABLE_FIELDS.has(sort) ? sort : "createdAt";
    const direction = order === "asc" ? 1 : -1;
    return { [field]: direction };
}

// GET /api/mills - list with search, sort, pagination
router.get("/", async (req, res, next) => {
    try {
        const { search, sort = "createdAt", order = "desc", page = 1, limit = 10, status } = req.query;
        const filter = {};
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.max(1, Math.min(100, Number(limit) || 10));

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { location: { $regex: search, $options: "i" } },
                { contactPerson: { $regex: search, $options: "i" } }
            ];
        }
        if (status && status !== "all") filter.status = status;

        const skip = (pageNum - 1) * limitNum;
        const sortObj = resolveSort(sort, order);

        const [items, total] = await Promise.all([
            Mill.find(filter).sort(sortObj).skip(skip).limit(limitNum).lean(),
            Mill.countDocuments(filter)
        ]);

        res.json({
            items,
            total,
            page: pageNum,
            totalPages: Math.max(1, Math.ceil(total / limitNum))
        });
    } catch (e) { next(e); }
});

// POST /api/mills - create
router.post("/", async (req, res, next) => {
    try {
        const { name, location, contactPerson, phone, status, notes } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: "Name is required" });

        const mill = await Mill.create({
            name: name.trim(),
            location: location?.trim() || "",
            contactPerson: contactPerson?.trim() || "",
            phone: phone?.trim() || "",
            status: status || "active",
            notes: notes || ""
        });
        res.status(201).json(mill);
    } catch (e) {
        if (e.code === 11000) return res.status(400).json({ message: "A mill with this name already exists" });
        next(e);
    }
});

// PUT /api/mills/:id - update
router.put("/:id", async (req, res, next) => {
    try {
        const update = {};
        const fields = ["name", "location", "contactPerson", "phone", "status", "notes"];
        for (const f of fields) {
            if (req.body[f] !== undefined) update[f] = typeof req.body[f] === "string" ? req.body[f].trim() : req.body[f];
        }
        if (update.name !== undefined && !update.name) {
            return res.status(400).json({ message: "Name is required" });
        }

        const mill = await Mill.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!mill) return res.status(404).json({ message: "Mill not found" });
        res.json(mill);
    } catch (e) { next(e); }
});

// DELETE /api/mills/:id
router.delete("/:id", async (req, res, next) => {
    try {
        const mill = await Mill.findByIdAndDelete(req.params.id);
        if (!mill) return res.status(404).json({ message: "Mill not found" });
        res.json({ ok: true, message: `Mill "${mill.name}" deleted` });
    } catch (e) { next(e); }
});

// POST /api/mills/bulk/delete
router.post("/bulk/delete", async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: "No IDs provided" });
        const result = await Mill.deleteMany({ _id: { $in: ids } });
        res.json({ ok: true, deletedCount: result.deletedCount });
    } catch (e) { next(e); }
});

// POST /api/mills/bulk/status
router.post("/bulk/status", async (req, res, next) => {
    try {
        const { ids, status } = req.body;
        if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: "No IDs provided" });
        if (!["active", "inactive"].includes(status)) return res.status(400).json({ message: "Invalid status" });
        await Mill.updateMany({ _id: { $in: ids } }, { status });
        res.json({ ok: true });
    } catch (e) { next(e); }
});

// POST /api/mills/bulk/import
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
            const name = String(row.name || "").trim();
            if (!name) {
                skipped.push({ row: record.rowNumber, reason: "name is required" });
                continue;
            }

            operations.push({
                updateOne: {
                    filter: { name },
                    update: {
                        $set: {
                            name,
                            location: String(row.location || "").trim(),
                            contactPerson: String(row.contactPerson || "").trim(),
                            phone: String(row.phone || "").trim(),
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

        const result = await Mill.bulkWrite(operations, { ordered: false });
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

// POST /api/mills/merge - merge multiple mills into one
router.post("/merge", async (req, res, next) => {
    try {
        const { sourceIds, targetId } = req.body;
        if (!Array.isArray(sourceIds) || !sourceIds.length || !targetId) {
            return res.status(400).json({ message: "sourceIds and targetId required" });
        }
        await Mill.deleteMany({ _id: { $in: sourceIds.filter(id => id !== targetId) } });
        const target = await Mill.findById(targetId).lean();
        if (!target) return res.status(404).json({ message: "Target mill not found" });
        res.json({ ok: true, message: `Merged into "${target.name}"`, target });
    } catch (e) { next(e); }
});

module.exports = router;
