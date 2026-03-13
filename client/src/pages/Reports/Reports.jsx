import { useEffect, useRef, useState } from 'react';
import { masterApi, reportApi } from '../../api/axios';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import Spinner from '../../components/common/Spinner';
import {
  MdClear,
  MdFactory,
  MdGridOn,
  MdPictureAsPdf,
  MdPrint,
  MdSearch,
  MdTableChart,
} from 'react-icons/md';
import { formatDateDDMMYYYY } from '../../utils/date';

function SummaryCard({ label, value, tone }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function ReportValueCard({ label, value, tone }) {
  return (
    <div className={`rounded-2xl border p-3 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 font-mono text-xl font-bold text-slate-900">{Number(value || 0).toFixed(2)} m</p>
    </div>
  );
}

function FilterChip({ label, value }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm">
      <span className="font-medium text-slate-800">{label}:</span>
      <span className="ml-1">{value || 'All'}</span>
    </span>
  );
}

function ReportEntryHeader({ stock, toneClass }) {
  return (
    <div className={`flex flex-col gap-4 border-b px-4 py-4 sm:px-5 ${toneClass}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">{stock.millName}</h3>
            <span className={`badge ${stock.type === 'regular' ? 'badge-regular' : 'badge-mix'}`}>
              {stock.type === 'regular' ? 'Regular' : 'Mix'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {stock.qualityName} - {stock.designName} - Lot {stock.lotNo}
          </p>
        </div>
        <div className="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
          {formatDateDDMMYYYY(stock.date)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ReportValueCard label="Received" value={stock.totalMeterReceived} tone="border-blue-200 bg-white/85" />
        <ReportValueCard label="Sold" value={stock.meterSold} tone="border-emerald-200 bg-white/85" />
        <ReportValueCard label="In Stock" value={stock.stockRemaining} tone="border-amber-200 bg-white/85" />
      </div>
    </div>
  );
}

function RegularTable({ stock, isLotFiltered }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <ReportEntryHeader stock={stock} toneClass="border-blue-100 bg-gradient-to-r from-blue-50 via-white to-slate-50" />
      <div className="space-y-5 p-4 sm:p-5">
        {stock.unsoldBales?.length > 0 ? (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Bales In Stock</p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[320px] w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Bale No</th>
                    <th className="px-3 py-2 text-right">Meter</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.unsoldBales.map((bale) => (
                    <tr key={bale._id} className="table-row">
                      <td className="px-3 py-2">{bale.sNo}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{bale.baleNo}</td>
                      <td className="px-3 py-2 text-right font-mono">{Number(bale.meter || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {isLotFiltered && stock.soldBales?.length > 0 ? (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Bales Sold</p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[520px] w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Bale No</th>
                    <th className="px-3 py-2 text-right">Meter</th>
                    <th className="px-3 py-2 text-left">Bill No</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.soldBales.map((bale) => (
                    <tr key={bale._id} className="table-row">
                      <td className="px-3 py-2">{bale.sNo}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{bale.baleNo}</td>
                      <td className="px-3 py-2 text-right font-mono">{Number(bale.meter || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 font-medium text-emerald-600">{bale.billNo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ReportValueCard label="Second" value={stock.second} tone="border-slate-200 bg-slate-50" />
          <ReportValueCard label="Unchecked" value={stock.unchecked} tone="border-slate-200 bg-slate-50" />
          <ReportValueCard label="Final Report" value={stock.finalReport} tone="border-blue-200 bg-blue-50" />
        </div>
      </div>
    </div>
  );
}

function MixTable({ stock }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <ReportEntryHeader stock={stock} toneClass="border-purple-100 bg-gradient-to-r from-purple-50 via-white to-slate-50" />
      <div className="space-y-5 p-4 sm:p-5">
        {stock.inStockThans?.length > 0 ? (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Thans In Stock</p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[360px] w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-right">Than Meter</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.inStockThans.map((than) => (
                    <tr key={than._id} className="table-row">
                      <td className="px-3 py-2">{than.sNo}</td>
                      <td className="px-3 py-2 text-right font-mono">{Number(than.thanMeter || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="badge bg-slate-100 text-slate-600">In Stock</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ReportValueCard label="Total Than Meter" value={stock.meterOfTotalThan} tone="border-purple-200 bg-purple-50" />
          <ReportValueCard label="Meter Sold" value={stock.meterSold} tone="border-emerald-200 bg-emerald-50" />
          <ReportValueCard label="Final Report" value={stock.finalReport} tone="border-purple-200 bg-purple-50" />
        </div>
      </div>
    </div>
  );
}

const emptyFilters = { millId: '', qualityId: '', designId: '', lotNo: '', type: '' };

export default function Reports() {
  const [mills, setMills] = useState([]);
  const [qualities, setQualities] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [downloading, setDownloading] = useState('');
  const printRef = useRef(null);

  useEffect(() => {
    Promise.all([masterApi.getMills(), masterApi.getQualities(), masterApi.getDesigns()])
      .then(([millsResponse, qualitiesResponse, designsResponse]) => {
        setMills(millsResponse.data.data);
        setQualities(qualitiesResponse.data.data);
        setDesigns(designsResponse.data.data);
      })
      .catch((error) => {
        toast.error(error.message || 'Unable to load report filters');
      });

    handleSearch();
  }, []);

  const getCleanFilters = () => {
    const params = { ...filters };
    Object.keys(params).forEach((key) => {
      if (!params[key]) {
        delete params[key];
      }
    });
    return params;
  };

  const getFilterLabel = (list, id) => list.find((item) => item._id === id)?.name || '';

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const response = await reportApi.getReport(getCleanFilters());
      setReportData(response.data.data);
      setSummary(response.data.summary);
    } catch (error) {
      toast.error(error.message || 'Unable to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFilters(emptyFilters);
    setReportData([]);
    setSummary(null);
    setSearched(false);
  };

  const handlePrint = useReactToPrint({ content: () => printRef.current });

  const handleDownload = async (format) => {
    setDownloading(format);
    try {
      const response = await reportApi.downloadReport(format, getCleanFilters());
      const mimeType = response.headers?.['content-type'] || 'application/octet-stream';
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: mimeType });
      const disposition = response.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const fileName = match?.[1] || `stock-report.${format}`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${format.toUpperCase()} report`, { id: `report-download-${format}` });
    } catch (error) {
      toast.error(error.message || 'Unable to download report', { id: `report-download-${format}` });
    } finally {
      setDownloading('');
    }
  };

  const isLotFiltered = Boolean(filters.lotNo);
  const filterSummary = [
    { label: 'Mill', value: getFilterLabel(mills, filters.millId) },
    { label: 'Quality', value: getFilterLabel(qualities, filters.qualityId) },
    { label: 'Design', value: getFilterLabel(designs, filters.designId) },
    { label: 'Lot', value: filters.lotNo || '' },
    { label: 'Type', value: filters.type ? (filters.type === 'regular' ? 'Regular' : 'Mix') : '' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-5 text-white shadow-xl sm:p-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">Report Center</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Stock Reports</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {filterSummary.map((chip) => (
                <FilterChip key={chip.label} label={chip.label} value={chip.value} />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">Quick Totals</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-blue-100">Records</p>
                <p className="mt-1 text-3xl font-bold">{summary?.count ?? reportData.length}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-sm text-blue-100">Received</p>
                  <p className="mt-1 text-xl font-bold">{Number(summary?.totalReceived || 0).toFixed(2)} m</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-sm text-blue-100">In Stock</p>
                  <p className="mt-1 text-xl font-bold">{Number(summary?.totalInStock || 0).toFixed(2)} m</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card no-print space-y-5">
        <h3 className="text-xl font-bold text-slate-900">Search & Export</h3>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 xl:grid-cols-5">
          <select
            className="form-select"
            value={filters.millId}
            onChange={(event) => setFilters((current) => ({ ...current, millId: event.target.value }))}
          >
            <option value="">All Mills</option>
            {mills.map((mill) => (
              <option key={mill._id} value={mill._id}>
                {mill.name}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            value={filters.qualityId}
            onChange={(event) => setFilters((current) => ({ ...current, qualityId: event.target.value }))}
          >
            <option value="">All Qualities</option>
            {qualities.map((quality) => (
              <option key={quality._id} value={quality._id}>
                {quality.name}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            value={filters.designId}
            onChange={(event) => setFilters((current) => ({ ...current, designId: event.target.value }))}
          >
            <option value="">All Designs</option>
            {designs.map((design) => (
              <option key={design._id} value={design._id}>
                {design.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            className="form-input"
            placeholder="Lot No."
            value={filters.lotNo}
            onChange={(event) => setFilters((current) => ({ ...current, lotNo: event.target.value }))}
          />

          <select
            className="form-select"
            value={filters.type}
            onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
          >
            <option value="">All Types</option>
            <option value="regular">Regular</option>
            <option value="mix">Mix</option>
          </select>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="btn-primary w-full sm:w-auto" onClick={handleSearch} disabled={loading}>
              <MdSearch className="text-lg" /> {loading ? 'Generating...' : 'Generate Report'}
            </button>
            <button className="btn-secondary w-full sm:w-auto" onClick={handleClear}>
              <MdClear className="text-lg" /> Clear Filters
            </button>
            <button className="btn-secondary w-full sm:w-auto" onClick={handlePrint} disabled={!reportData.length}>
              <MdPrint className="text-lg" /> Print
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button className="btn-secondary w-full" onClick={() => handleDownload('pdf')} disabled={!reportData.length || downloading === 'pdf'}>
              <MdPictureAsPdf className="text-lg" /> {downloading === 'pdf' ? 'Preparing...' : 'PDF'}
            </button>
            <button className="btn-secondary w-full" onClick={() => handleDownload('xls')} disabled={!reportData.length || downloading === 'xls'}>
              <MdGridOn className="text-lg" /> {downloading === 'xls' ? 'Preparing...' : 'XLS'}
            </button>
            <button className="btn-secondary w-full" onClick={() => handleDownload('csv')} disabled={!reportData.length || downloading === 'csv'}>
              <MdTableChart className="text-lg" /> {downloading === 'csv' ? 'Preparing...' : 'CSV'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <Spinner center />
      ) : searched ? (
        <div ref={printRef} className="print-area space-y-5">
          <div className="hidden print-only mb-6">
            <h1 className="text-2xl font-bold">Manihar Enterprises</h1>
            <h2 className="text-lg font-semibold text-slate-600">Stock Report</h2>
            <p className="text-sm text-slate-400">Generated: {new Date().toLocaleString('en-IN')}</p>
            <hr className="my-3" />
          </div>

          {summary ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Records" value={summary.count} tone="border-slate-200 bg-white" />
              <SummaryCard label="Total Received" value={`${Number(summary.totalReceived || 0).toFixed(2)} m`} tone="border-blue-200 bg-blue-50" />
              <SummaryCard label="Total Sold" value={`${Number(summary.totalSold || 0).toFixed(2)} m`} tone="border-emerald-200 bg-emerald-50" />
              <SummaryCard label="Total In Stock" value={`${Number(summary.totalInStock || 0).toFixed(2)} m`} tone="border-amber-200 bg-amber-50" />
            </div>
          ) : null}

          {reportData.length === 0 ? (
            <div className="card py-12 text-center text-slate-400">
              <MdFactory className="mx-auto mb-4 text-6xl opacity-30" />
              <p className="text-xl font-semibold text-slate-500">No records found</p>
            </div>
          ) : (
            <div className="space-y-5">
              {reportData.map((stock) =>
                stock.type === 'regular' ? (
                  <RegularTable key={stock._id} stock={stock} isLotFiltered={isLotFiltered} />
                ) : (
                  <MixTable key={stock._id} stock={stock} />
                )
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
