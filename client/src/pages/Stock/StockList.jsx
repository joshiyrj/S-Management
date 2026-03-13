import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { stockApi, masterApi } from '../../api/axios';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import ConfirmModal from '../../components/common/ConfirmModal';
import { MdAdd, MdDelete, MdEdit, MdFilterAlt, MdSearch, MdVisibility } from 'react-icons/md';
import Modal from '../../components/common/Modal';
import { formatDateDDMMYYYY } from '../../utils/date';

function ViewStockModal({ stock, onClose }) {
  if (!stock) return null;

  const isRegular = stock.type === 'regular';

  return (
    <Modal open={!!stock} onClose={onClose} title={`Stock Details - Lot #${stock.lotNo}`} size="xl">
      <div className="space-y-5 text-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Date', value: formatDateDDMMYYYY(stock.date) },
            { label: 'Mill', value: stock.millName },
            { label: 'Quality', value: stock.qualityName },
            { label: 'Design No.', value: stock.designName },
            { label: 'Lot No.', value: stock.lotNo },
            { label: 'Type', value: isRegular ? 'Regular' : 'Mix' },
            { label: 'Total Meter Received', value: `${stock.totalMeterReceived?.toFixed(2)} m` },
            { label: 'Second', value: `${stock.second?.toFixed(2)} m` },
            { label: 'Unchecked', value: `${stock.unchecked?.toFixed(2)} m` },
            { label: 'Final Report', value: `${stock.finalReport?.toFixed(2)} m` },
            { label: 'Meter Sold', value: `${stock.meterSold?.toFixed(2)} m` },
            { label: 'Stock Remaining', value: `${stock.stockRemaining?.toFixed(2)} m` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-slate-50 p-3">
              <p className="mb-0.5 text-xs font-medium text-slate-400">{label}</p>
              <p className="font-semibold text-slate-800">{value}</p>
            </div>
          ))}
        </div>

        {isRegular ? (
          <div>
            <p className="mb-2 font-semibold text-slate-700">Bale Details</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[560px] w-full text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="px-3 py-2 text-left">S.No</th>
                    <th className="px-3 py-2 text-left">Bale No</th>
                    <th className="px-3 py-2 text-right">Meter</th>
                    <th className="px-3 py-2 text-left">Bill No</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.baleDetails?.map((bale) => (
                    <tr key={bale._id} className="table-row">
                      <td className="px-3 py-2">{bale.sNo}</td>
                      <td className="px-3 py-2 font-medium">{bale.baleNo}</td>
                      <td className="px-3 py-2 text-right">{bale.meter?.toFixed(2)}</td>
                      <td className="px-3 py-2">{bale.billNo || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`badge ${bale.billNo?.trim() ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {bale.billNo?.trim() ? 'Sold' : 'In Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-blue-50 font-semibold">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-right text-xs text-slate-600">Total:</td>
                    <td className="px-3 py-2 text-right text-xs">{stock.meterOfTotalBales?.toFixed(2)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-2 font-semibold text-slate-700">Than Details</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[480px] w-full text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="px-3 py-2 text-left">S.No</th>
                    <th className="px-3 py-2 text-right">Than Meter</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2 text-left">Bale Details</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.thanDetails?.map((than) => (
                    <tr key={than._id} className="table-row">
                      <td className="px-3 py-2">{than.sNo}</td>
                      <td className="px-3 py-2 text-right">{than.thanMeter?.toFixed(2)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`badge ${than.checked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {than.checked ? 'Sold' : 'In Stock'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {than.baleDetails?.length ? (
                          <span className="text-blue-600">{than.baleDetails.length} bale(s)</span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function StockList() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ type: '', search: '' });
  const [mills, setMills] = useState([]);
  const [advFilters, setAdvFilters] = useState({ millId: '', qualityId: '', designId: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewStock, setViewStock] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    masterApi.getMills()
      .then((response) => setMills(response.data.data))
      .catch(console.error);
  }, []);

  const fetchStocks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, ...filters, ...advFilters };
      Object.keys(params).forEach((key) => !params[key] && delete params[key]);
      const response = await stockApi.getAll(params);
      setStocks(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [page, filters, advFilters]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await stockApi.remove(deleteTarget._id);
      toast.success('Stock deleted successfully', { id: 'stock-delete' });
      setDeleteTarget(null);
      fetchStocks();
    } catch (error) {
      toast.error(error.message, { id: 'stock-delete' });
    } finally {
      setDeleting(false);
    }
  };

  const resetFilters = () => {
    setFilters({ type: '', search: '' });
    setAdvFilters({ millId: '', qualityId: '', designId: '' });
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 font-bold text-slate-700">
            <MdFilterAlt className="text-blue-500" /> Filters
          </h2>
          <Link to="/stocks/add" className="btn-primary btn-sm w-full sm:w-auto">
            <MdAdd className="text-lg" /> Add Stock
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative md:col-span-2 xl:col-span-2">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="form-input pl-8"
              placeholder="Search mill, quality, design..."
              value={filters.search}
              onChange={(event) => {
                setFilters((current) => ({ ...current, search: event.target.value }));
                setPage(1);
              }}
            />
          </div>
          <select
            className="form-select"
            value={filters.type}
            onChange={(event) => {
              setFilters((current) => ({ ...current, type: event.target.value }));
              setPage(1);
            }}
          >
            <option value="">All Types</option>
            <option value="regular">Regular</option>
            <option value="mix">Mix</option>
          </select>
          <select
            className="form-select"
            value={advFilters.millId}
            onChange={(event) => {
              setAdvFilters((current) => ({ ...current, millId: event.target.value }));
              setPage(1);
            }}
          >
            <option value="">All Mills</option>
            {mills.map((mill) => (
              <option key={mill._id} value={mill._id}>{mill.name}</option>
            ))}
          </select>
          <button className="btn-secondary btn-sm w-full xl:w-auto" onClick={resetFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <Spinner center />
        ) : stocks.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-xl">No stock entries found</p>
            <p className="mt-1 text-sm">Try adjusting filters or add new stock</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 p-4 md:hidden">
              {stocks.map((stock, idx) => (
                <div key={stock._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Entry {(page - 1) * 10 + idx + 1}
                      </p>
                      <h3 className="mt-1 truncate text-base font-semibold text-slate-800">{stock.millName}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {stock.qualityName} / {stock.designName}
                      </p>
                    </div>
                    <span className={`badge ${stock.type === 'regular' ? 'badge-regular' : 'badge-mix'}`}>
                      {stock.type === 'regular' ? 'Regular' : 'Mix'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-400">Date</p>
                      <p className="mt-1 font-medium text-slate-700">{formatDateDDMMYYYY(stock.date)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-400">Lot No</p>
                      <p className="mt-1 font-mono font-semibold text-slate-700">{stock.lotNo}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-400">Received</p>
                      <p className="mt-1 font-mono font-semibold text-slate-700">{stock.totalMeterReceived?.toFixed(2)} m</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-3">
                      <p className="text-xs text-emerald-500">Sold</p>
                      <p className="mt-1 font-mono font-semibold text-emerald-700">{stock.meterSold?.toFixed(2)} m</p>
                    </div>
                    <div className="col-span-2 rounded-xl bg-blue-50 p-3">
                      <p className="text-xs text-blue-500">In Stock</p>
                      <p className="mt-1 font-mono text-lg font-semibold text-blue-700">{stock.stockRemaining?.toFixed(2)} m</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="btn-secondary btn-sm flex-1"
                      onClick={() => setViewStock(stock)}
                      title="View"
                    >
                      <MdVisibility className="text-lg" /> View
                    </button>
                    <button
                      className="btn-secondary btn-sm flex-1"
                      onClick={() => navigate(`/stocks/edit/${stock._id}`)}
                      title="Edit"
                    >
                      <MdEdit className="text-lg" /> Edit
                    </button>
                    <button
                      className="btn-danger btn-sm w-full"
                      onClick={() => setDeleteTarget(stock)}
                      title="Delete"
                    >
                      <MdDelete className="text-lg" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Mill</th>
                    <th className="px-4 py-3 text-left">Quality</th>
                    <th className="px-4 py-3 text-left">Design</th>
                    <th className="px-4 py-3 text-center">Lot No</th>
                    <th className="px-4 py-3 text-center">Type</th>
                    <th className="px-4 py-3 text-right">Received (m)</th>
                    <th className="px-4 py-3 text-right">Sold (m)</th>
                    <th className="px-4 py-3 text-right">In Stock (m)</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((stock, idx) => (
                    <tr key={stock._id} className="table-row">
                      <td className="px-4 py-3 text-slate-400">{(page - 1) * 10 + idx + 1}</td>
                      <td className="px-4 py-3">{formatDateDDMMYYYY(stock.date)}</td>
                      <td className="px-4 py-3 font-medium">{stock.millName}</td>
                      <td className="px-4 py-3">{stock.qualityName}</td>
                      <td className="px-4 py-3">{stock.designName}</td>
                      <td className="px-4 py-3 text-center font-mono">{stock.lotNo}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${stock.type === 'regular' ? 'badge-regular' : 'badge-mix'}`}>
                          {stock.type === 'regular' ? 'Regular' : 'Mix'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{stock.totalMeterReceived?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600">{stock.meterSold?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-blue-600">{stock.stockRemaining?.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-1">
                          <button
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                            onClick={() => setViewStock(stock)}
                            title="View"
                          >
                            <MdVisibility className="text-lg" />
                          </button>
                          <button
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
                            onClick={() => navigate(`/stocks/edit/${stock._id}`)}
                            title="Edit"
                          >
                            <MdEdit className="text-lg" />
                          </button>
                          <button
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            onClick={() => setDeleteTarget(stock)}
                            title="Delete"
                          >
                            <MdDelete className="text-lg" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>Showing {stocks.length} of {pagination.total} entries</span>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setPage((current) => current - 1)}
                  disabled={page <= 1}
                >
                  Prev
                </button>
                <span className="rounded-lg bg-blue-50 px-3 py-1.5 font-medium text-blue-600">
                  {page} / {pagination.pages}
                </span>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page >= pagination.pages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <ViewStockModal stock={viewStock} onClose={() => setViewStock(null)} />
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Stock Entry"
        message={`Delete stock lot #${deleteTarget?.lotNo} - ${deleteTarget?.millName}?`}
        loading={deleting}
      />
    </div>
  );
}
