function parseCsvRows(text) {
  const input = String(text || "").replace(/^\uFEFF/, "");
  if (!input.trim()) {
    throw new Error("CSV content is empty");
  }

  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === "\"") {
        const next = input[i + 1];
        if (next === "\"") {
          value += "\"";
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        value += ch;
      }
      continue;
    }

    if (ch === "\"") {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(value.trim());
      value = "";
      continue;
    }

    if (ch === "\n") {
      row.push(value.trim());
      value = "";
      if (row.some((cell) => cell !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    if (ch === "\r") continue;

    value += ch;
  }

  row.push(value.trim());
  if (row.some((cell) => cell !== "")) {
    rows.push(row);
  }

  if (inQuotes) {
    throw new Error("CSV contains an unclosed quoted value");
  }

  if (!rows.length) {
    throw new Error("CSV has no rows");
  }

  return rows;
}

function parseCsvObjects(text) {
  const rows = parseCsvRows(text);
  const headers = rows[0].map((header) => String(header || "").trim());

  if (!headers.length || headers.some((header) => !header)) {
    throw new Error("CSV header row is invalid");
  }

  const records = rows.slice(1).map((cells, index) => {
    const data = {};
    for (let i = 0; i < headers.length; i += 1) {
      data[headers[i]] = String(cells[i] ?? "").trim();
    }
    return {
      rowNumber: index + 2,
      data
    };
  });

  return { headers, records };
}

function normalizeStatus(status, fallback = "active") {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "active" || normalized === "inactive") {
    return normalized;
  }
  return fallback;
}

function toNumber(value, fallback = 0) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return fallback;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : fallback;
}

function parseTags(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];
  return raw
    .split(/[|;,]/g)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

module.exports = {
  parseCsvObjects,
  normalizeStatus,
  toNumber,
  parseTags
};
