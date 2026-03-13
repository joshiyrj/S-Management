import { useState, useEffect } from 'react';
import { masterApi } from '../api/axios';
import toast from 'react-hot-toast';
import { MdAdd, MdEdit, MdDelete, MdCheck, MdClose, MdArrowUpward, MdArrowDownward, MdUnfoldMore } from 'react-icons/md';
import ConfirmModal from '../components/common/ConfirmModal';
import Spinner from '../components/common/Spinner';
import { formatDateDDMMYYYY } from '../utils/date';

const tabs = [
  { key: 'mills', label: 'Mill Names' },
  { key: 'qualities', label: 'Quality Names' },
  { key: 'designs', label: 'Design Numbers' },
];

const apiMap = {
  mills: { getAll: masterApi.getMills, create: masterApi.createMill, update: masterApi.updateMill, toggle: masterApi.toggleMillStatus, delete: masterApi.deleteMill },
  qualities: { getAll: masterApi.getQualities, create: masterApi.createQuality, update: masterApi.updateQuality, toggle: masterApi.toggleQualityStatus, delete: masterApi.deleteQuality },
  designs: { getAll: masterApi.getDesigns, create: masterApi.createDesign, update: masterApi.updateDesign, toggle: masterApi.toggleDesignStatus, delete: masterApi.deleteDesign },
};

const metaMap = {
  mills: {
    entityLabel: 'Mill',
    fieldLabel: 'Mill Name',
    placeholder: 'Enter mill name',
  },
  qualities: {
    entityLabel: 'Quality',
    fieldLabel: 'Quality Name',
    placeholder: 'Enter quality name',
  },
  designs: {
    entityLabel: 'Design Number',
    fieldLabel: 'Design Number',
    placeholder: 'Enter design number',
  },
};

const initialSort = { key: 'name', direction: 'asc' };

function MasterSection({ tabKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [sortConfig, setSortConfig] = useState(initialSort);

  const { entityLabel, fieldLabel, placeholder } = metaMap[tabKey];

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }

      return { key, direction: key === 'createdAt' ? 'desc' : 'asc' };
    });
  };

  const getSortValue = (item, key) => {
    if (key === 'name') return item.name ?? '';
    if (key === 'createdAt') return new Date(item.createdAt).getTime();
    if (key === 'status') return item.isActive === false ? 'Inactive' : 'Active';
    return '';
  };

  const sortedItems = [...items].sort((a, b) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    const valueA = getSortValue(a, sortConfig.key);
    const valueB = getSortValue(b, sortConfig.key);

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      const comparison = valueA.localeCompare(valueB, undefined, { sensitivity: 'base', numeric: true });
      if (comparison !== 0) return comparison * direction;
    } else if (valueA !== valueB) {
      return (valueA - valueB) * direction;
    }

    return (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base', numeric: true });
  });

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <MdUnfoldMore className="table-sort-icon" />;
    return sortConfig.direction === 'asc'
      ? <MdArrowUpward className="table-sort-icon opacity-100" />
      : <MdArrowDownward className="table-sort-icon opacity-100" />;
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiMap[tabKey].getAll({ includeInactive: true });
      setItems(res.data.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [tabKey]);

  const handleAdd = async () => {
    if (!newName.trim()) { setError(`${entityLabel} name is required`); return; }
    setAdding(true);
    setError('');
    try {
      await apiMap[tabKey].create({ name: newName.trim() });
      toast.success(`${entityLabel} added successfully`, { id: `${tabKey}-create` });
      setNewName('');
      fetchItems();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async (id) => {
    if (!editName.trim()) {
      setEditError(`${entityLabel} name is required`);
      return;
    }
    setEditError('');
    setSaving(true);
    try {
      await apiMap[tabKey].update(id, { name: editName.trim() });
      toast.success(`${entityLabel} updated`, { id: `${tabKey}-update` });
      setEditId(null);
      setEditName('');
      setEditError('');
      fetchItems();
    } catch (err) {
      setEditError(err.message || `Unable to update ${entityLabel.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiMap[tabKey].delete(deleteTarget._id);
      toast.success(`${entityLabel} deleted`, { id: `${tabKey}-delete` });
      setDeleteTarget(null);
      fetchItems();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (item) => {
    setTogglingId(item._id);
    try {
      const res = await apiMap[tabKey].toggle(item._id);
      setItems((prev) => prev.map((current) => (current._id === item._id ? res.data.data : current)));
      toast.success(res.data.message, { id: 'master-status-toggle' });
    } catch (err) {
      toast.error(err.message, { id: 'master-status-toggle' });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Form */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <p className="text-sm font-semibold text-slate-700 mb-3">Add New {entityLabel}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1">
            <input
              type="text"
              className={`form-input ${error ? 'form-input-error' : ''}`}
              placeholder={placeholder}
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            {error && <p className="form-error">{error}</p>}
          </div>
          <button className="btn-primary w-full sm:w-auto" onClick={handleAdd} disabled={adding}>
            <MdAdd className="text-lg" />
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {/* Items List */}
      {loading ? (
        <Spinner center />
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <p className="text-lg font-medium">No {entityLabel} entries yet</p>
          <p className="text-sm mt-1">Add your first {entityLabel.toLowerCase()} above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="space-y-4 p-4 md:hidden">
            {sortedItems.map((item, idx) => (
              <div key={item._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Entry {idx + 1}</p>
                    {editId === item._id ? (
                      <div className="mt-2">
                        <input
                          className={`form-input ${editError ? 'form-input-error' : ''}`}
                          value={editName}
                          onChange={(e) => {
                            setEditName(e.target.value);
                            setEditError('');
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && handleEdit(item._id)}
                          autoFocus
                        />
                        {editError && <p className="form-error">{editError}</p>}
                      </div>
                    ) : (
                      <h3 className="mt-1 break-words text-base font-semibold text-slate-800">{item.name}</h3>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(item)}
                    disabled={togglingId === item._id}
                    className={`status-toggle min-w-0 ${item.isActive === false ? 'status-toggle-inactive' : 'status-toggle-active'}`}
                    aria-pressed={item.isActive !== false}
                  >
                    <span className="status-toggle-track">
                      <span className="status-toggle-thumb" />
                    </span>
                    <span className="status-toggle-label">{item.isActive === false ? 'Inactive' : 'Active'}</span>
                  </button>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">Created</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {formatDateDDMMYYYY(item.createdAt)}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {editId === item._id ? (
                    <>
                      <button
                        className="btn-success btn-sm flex-1"
                        onClick={() => handleEdit(item._id)}
                        disabled={saving}
                      >
                        <MdCheck /> {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="btn-secondary btn-sm flex-1"
                        onClick={() => { setEditId(null); setEditName(''); setEditError(''); }}
                      >
                        <MdClose /> Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn-secondary btn-sm flex-1"
                        onClick={() => { setEditId(item._id); setEditName(item.name); }}
                      >
                        <MdEdit /> Edit
                      </button>
                      <button
                        className="btn-danger btn-sm flex-1"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <MdDelete /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full table-fixed text-sm">
              <thead className="table-header">
                <tr>
                  <th className="w-14 px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">
                    <button
                      type="button"
                      className={`table-sort-button ${sortConfig.key === 'name' ? 'table-sort-button-active' : ''}`}
                      onClick={() => handleSort('name')}
                      title={`Sort by ${fieldLabel}`}
                    >
                      <span>{fieldLabel}</span>
                      {renderSortIcon('name')}
                    </button>
                  </th>
                  <th className="w-40 px-4 py-3 text-left">
                    <button
                      type="button"
                      className={`table-sort-button ${sortConfig.key === 'createdAt' ? 'table-sort-button-active' : ''}`}
                      onClick={() => handleSort('createdAt')}
                      title="Sort by created date"
                    >
                      <span>Created</span>
                      {renderSortIcon('createdAt')}
                    </button>
                  </th>
                  <th className="w-44 px-4 py-3 text-left">
                    <button
                      type="button"
                      className={`table-sort-button ${sortConfig.key === 'status' ? 'table-sort-button-active' : ''}`}
                      onClick={() => handleSort('status')}
                      title="Sort by status"
                    >
                      <span>Status</span>
                      {renderSortIcon('status')}
                    </button>
                  </th>
                  <th className="w-48 px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item, idx) => (
                  <tr key={item._id} className="table-row">
                    <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 break-words">
                      {editId === item._id ? (
                        <div>
                          <input
                            className={`form-input py-1 ${editError ? 'form-input-error' : ''}`}
                            value={editName}
                            onChange={(e) => {
                              setEditName(e.target.value);
                              setEditError('');
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleEdit(item._id)}
                            autoFocus
                          />
                          {editError && <p className="form-error">{editError}</p>}
                        </div>
                      ) : (
                        item.name
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {formatDateDDMMYYYY(item.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        disabled={togglingId === item._id}
                        className={`status-toggle ${item.isActive === false ? 'status-toggle-inactive' : 'status-toggle-active'}`}
                        aria-pressed={item.isActive !== false}
                        title={`Set ${item.name} as ${item.isActive === false ? 'Active' : 'Inactive'}`}
                      >
                        <span className="status-toggle-track">
                          <span className="status-toggle-thumb" />
                        </span>
                        <span className="status-toggle-label">{item.isActive === false ? 'Inactive' : 'Active'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        {editId === item._id ? (
                          <>
                            <button
                              className="btn-success btn-xs"
                              onClick={() => handleEdit(item._id)}
                              disabled={saving}
                            >
                              <MdCheck /> {saving ? '...' : 'Save'}
                            </button>
                            <button
                              className="btn-secondary btn-xs"
                              onClick={() => { setEditId(null); setEditName(''); setEditError(''); }}
                            >
                              <MdClose /> Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn-secondary btn-xs"
                              onClick={() => { setEditId(item._id); setEditName(item.name); setEditError(''); }}
                            >
                              <MdEdit /> Edit
                            </button>
                            <button
                              className="btn-danger btn-xs"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <MdDelete /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete ${entityLabel}`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        loading={deleting}
      />
    </div>
  );
}

export default function MasterData() {
  const [activeTab, setActiveTab] = useState('mills');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="overflow-x-auto border-b border-slate-200 px-2 pt-2">
          <div className="flex min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <MasterSection key={activeTab} tabKey={activeTab} />
        </div>
      </div>
    </div>
  );
}
