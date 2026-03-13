const Stock = require('../models/Stock');

const pad = (value) => String(value).padStart(2, '0');

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const escapeCsvCell = (value) => {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapePdfText = (value) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const buildReportFilter = (query = {}) => {
  const { millId, qualityId, designId, lotNo, type } = query;
  const filter = { isDeleted: false };

  if (millId) filter.millId = millId;
  if (qualityId) filter.qualityId = qualityId;
  if (designId) filter.designId = designId;
  if (lotNo) filter.lotNo = Number(lotNo);
  if (type) filter.type = type;

  return filter;
};

const toNum = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const calculateRowMetrics = (stock) => {
  const total = toNum(stock.totalMeterReceived);
  const second = toNum(stock.second);
  const unchecked = toNum(stock.unchecked);

  if (stock.type === 'regular') {
    const meterOfTotalBales = Number((stock.baleDetails || []).reduce((sum, bale) => sum + toNum(bale.meter), 0).toFixed(2));
    const meterSold = Number(
      (stock.baleDetails || [])
        .filter((bale) => bale.billNo && String(bale.billNo).trim() !== '')
        .reduce((sum, bale) => sum + toNum(bale.meter), 0)
        .toFixed(2)
    );
    const stockRemaining = Number((meterOfTotalBales - meterSold).toFixed(2));

    return {
      meterOfTotalBales,
      meterOfTotalThan: 0,
      meterSold,
      stockRemaining,
      remaining: Number((total - meterOfTotalBales).toFixed(2)),
      finalReport: Number((total - (meterOfTotalBales + second + unchecked)).toFixed(2)),
    };
  }

  const meterOfTotalThan = Number((stock.thanDetails || []).reduce((sum, than) => sum + toNum(than.thanMeter), 0).toFixed(2));
  const meterSold = Number(
    (stock.thanDetails || [])
      .filter((than) => than.checked)
      .reduce((sum, than) => sum + toNum(than.thanMeter), 0)
      .toFixed(2)
  );
  const stockRemaining = Number((meterOfTotalThan - meterSold).toFixed(2));

  return {
    meterOfTotalBales: 0,
    meterOfTotalThan,
    meterSold,
    stockRemaining,
    remaining: Number((total - meterOfTotalThan).toFixed(2)),
    finalReport: Number((total - (meterOfTotalThan + second + unchecked)).toFixed(2)),
  };
};

const mapStockToReportRow = (stock, isLotFiltered) => {
  const metrics = calculateRowMetrics(stock);
  const base = {
    _id: stock._id,
    date: stock.date,
    millName: stock.millName,
    qualityName: stock.qualityName,
    designName: stock.designName,
    lotNo: stock.lotNo,
    type: stock.type,
    totalMeterReceived: stock.totalMeterReceived,
    second: stock.second,
    unchecked: stock.unchecked,
    finalReport: metrics.finalReport,
    meterSold: metrics.meterSold,
    stockRemaining: metrics.stockRemaining,
    meterOfTotalBales: metrics.meterOfTotalBales,
    meterOfTotalThan: metrics.meterOfTotalThan,
    remaining: metrics.remaining,
  };

  if (stock.type === 'regular') {
    const unsoldBales = stock.baleDetails.filter((bale) => !bale.billNo || bale.billNo.trim() === '');
    const soldBales = stock.baleDetails.filter((bale) => bale.billNo && bale.billNo.trim() !== '');

    return {
      ...base,
      unsoldBales,
      soldBales: isLotFiltered ? soldBales : [],
    };
  }

  const inStockThans = stock.thanDetails.filter((than) => !than.checked);
  const soldThans = stock.thanDetails.filter((than) => than.checked);

  return {
    ...base,
    inStockThans,
    soldThans,
    thanDetails: stock.thanDetails,
  };
};

const buildReportPayload = async (query = {}) => {
  const filter = buildReportFilter(query);
  const stocks = await Stock.find(filter)
    .sort({ date: -1, lotNo: 1, createdAt: -1 })
    .lean();
  const isLotFiltered = Boolean(query.lotNo);

  const rows = stocks.map((stock) => mapStockToReportRow(stock, isLotFiltered));
  const summary = {
    totalReceived: Number(stocks.reduce((sum, stock) => sum + (stock.totalMeterReceived || 0), 0).toFixed(2)),
    totalSold: Number(stocks.reduce((sum, stock) => sum + (stock.meterSold || 0), 0).toFixed(2)),
    totalInStock: Number(stocks.reduce((sum, stock) => sum + (stock.stockRemaining || 0), 0).toFixed(2)),
    count: stocks.length,
  };

  return { rows, summary, isLotFiltered };
};

const flattenRowsForExport = (rows) =>
  rows.map((row) => ({
    Date: formatDate(row.date),
    Mill: row.millName,
    Quality: row.qualityName,
    Design: row.designName,
    'Lot No': row.lotNo,
    Type: row.type === 'regular' ? 'Regular' : 'Mix',
    'Received (m)': Number(row.totalMeterReceived || 0).toFixed(2),
    'Flow Meter (m)': Number((row.type === 'regular' ? row.meterOfTotalBales : row.meterOfTotalThan) || 0).toFixed(2),
    'Second (m)': Number(row.second || 0).toFixed(2),
    'Unchecked (m)': Number(row.unchecked || 0).toFixed(2),
    'Final Report (m)': Number(row.finalReport || 0).toFixed(2),
    'Sold (m)': Number(row.meterSold || 0).toFixed(2),
    'In Stock (m)': Number(row.stockRemaining || 0).toFixed(2),
  }));

const getFilterLines = (query = {}) => [
  `Mill: ${query.millId || 'All'}`,
  `Quality: ${query.qualityId || 'All'}`,
  `Design: ${query.designId || 'All'}`,
  `Lot No: ${query.lotNo || 'All'}`,
  `Type: ${query.type || 'All'}`,
];

const buildCsv = (rows, summary) => {
  const exportRows = flattenRowsForExport(rows);
  const headers = Object.keys(exportRows[0] || {
    Date: '',
    Mill: '',
    Quality: '',
    Design: '',
    'Lot No': '',
    Type: '',
    'Received (m)': '',
    'Flow Meter (m)': '',
    'Second (m)': '',
    'Unchecked (m)': '',
    'Final Report (m)': '',
    'Sold (m)': '',
    'In Stock (m)': '',
  });

  const lines = [
    headers.join(','),
    ...exportRows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(',')),
    '',
    `Summary Count,${summary.count}`,
    `Summary Total Received,${summary.totalReceived.toFixed(2)}`,
    `Summary Total Sold,${summary.totalSold.toFixed(2)}`,
    `Summary Total In Stock,${summary.totalInStock.toFixed(2)}`,
  ];

  return lines.join('\n');
};

const buildExcel = (rows, summary, query) => {
  const exportRows = flattenRowsForExport(rows);
  const headers = Object.keys(exportRows[0] || {
    Date: '',
    Mill: '',
    Quality: '',
    Design: '',
    'Lot No': '',
    Type: '',
    'Received (m)': '',
    'Flow Meter (m)': '',
    'Second (m)': '',
    'Unchecked (m)': '',
    'Final Report (m)': '',
    'Sold (m)': '',
    'In Stock (m)': '',
  });

  const filterRows = getFilterLines(query)
    .map((line) => `<tr><td colspan="${headers.length}" style="padding:6px 10px;color:#475569;">${escapeHtml(line)}</td></tr>`)
    .join('');

  const bodyRows = exportRows
    .map(
      (row) =>
        `<tr>${headers
          .map((header) => `<td style="padding:8px 10px;border:1px solid #dbeafe;">${escapeHtml(row[header])}</td>`)
          .join('')}</tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Segoe UI, Arial, sans-serif; padding: 18px; color: #0f172a; }
      h1 { margin: 0 0 8px; font-size: 22px; }
      h2 { margin: 0 0 14px; font-size: 14px; color: #475569; }
      table { border-collapse: collapse; width: 100%; }
      th { background: #e0f2fe; color: #1e3a8a; border: 1px solid #bfdbfe; padding: 8px 10px; text-align: left; }
      .summary td { background: #f8fafc; font-weight: 600; }
    </style>
  </head>
  <body>
    <h1>Stock Report</h1>
    <h2>Generated ${escapeHtml(new Date().toLocaleString('en-IN'))}</h2>
    <table>
      ${filterRows}
      <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
      ${bodyRows}
      <tr class="summary"><td colspan="${headers.length - 1}">Total Records</td><td>${summary.count}</td></tr>
      <tr class="summary"><td colspan="${headers.length - 1}">Total Received (m)</td><td>${summary.totalReceived.toFixed(2)}</td></tr>
      <tr class="summary"><td colspan="${headers.length - 1}">Total Sold (m)</td><td>${summary.totalSold.toFixed(2)}</td></tr>
      <tr class="summary"><td colspan="${headers.length - 1}">Total In Stock (m)</td><td>${summary.totalInStock.toFixed(2)}</td></tr>
    </table>
  </body>
</html>`;
};

const buildPdf = (rows, summary, query) => {
  const exportRows = flattenRowsForExport(rows);
  const lines = [
    'Stock Report',
    `Generated: ${new Date().toLocaleString('en-IN')}`,
    ...getFilterLines(query),
    '',
    `Total records: ${summary.count}`,
    `Total received: ${summary.totalReceived.toFixed(2)} m`,
    `Total sold: ${summary.totalSold.toFixed(2)} m`,
    `Total in stock: ${summary.totalInStock.toFixed(2)} m`,
    '',
    'Date | Mill | Quality | Design | Lot | Type | Recv | Flow | Final | Sold | Stock',
  ];

  exportRows.forEach((row) => {
    lines.push(
      [
        row.Date,
        row.Mill,
        row.Quality,
        row.Design,
        row['Lot No'],
        row.Type,
        row['Received (m)'],
        row['Flow Meter (m)'],
        row['Final Report (m)'],
        row['Sold (m)'],
        row['In Stock (m)'],
      ]
        .join(' | ')
        .slice(0, 118)
    );
  });

  const pageSize = 34;
  const pages = [];

  for (let index = 0; index < lines.length; index += pageSize) {
    pages.push(lines.slice(index, index + pageSize));
  }

  const objects = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };

  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds = [];

  pages.forEach((pageLines) => {
    const contentStream = [
      'BT',
      '/F1 10 Tf',
      '40 800 Td',
      '14 TL',
      ...pageLines.flatMap((line, index) => (index === 0 ? [`(${escapePdfText(line)}) Tj`] : ['T*', `(${escapePdfText(line)}) Tj`])),
      'ET',
    ].join('\n');

    const contentId = addObject(`<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`
    );
    pageIds.push(pageId);
  });

  const pagesId = addObject(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  pageIds.forEach((pageId, index) => {
    objects[pageId - 1] = objects[pageId - 1].replace('/Parent 0 0 R', `/Parent ${pagesId} 0 R`);
  });

  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
};

exports.getReport = async (req, res, next) => {
  try {
    const { rows, summary } = await buildReportPayload(req.query);
    res.json({ success: true, data: rows, summary });
  } catch (error) {
    next(error);
  }
};

exports.exportReport = async (req, res, next) => {
  try {
    const format = String(req.query.format || 'csv').toLowerCase();
    const { rows, summary } = await buildReportPayload(req.query);
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const csv = buildCsv(rows, summary);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="stock-report-${stamp}.csv"`);
      return res.send(csv);
    }

    if (format === 'xls') {
      const workbook = buildExcel(rows, summary, req.query);
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="stock-report-${stamp}.xls"`);
      return res.send(workbook);
    }

    if (format === 'pdf') {
      const pdf = buildPdf(rows, summary, req.query);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="stock-report-${stamp}.pdf"`);
      return res.send(pdf);
    }

    return res.status(400).json({ success: false, message: 'Unsupported export format. Use pdf, xls, or csv.' });
  } catch (error) {
    next(error);
  }
};
