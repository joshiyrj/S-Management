import { MdWarning } from 'react-icons/md';

export default function ConfirmModal({ open, onClose, onConfirm, title = 'Confirm Delete', message, loading }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/42 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_28px_70px_-32px_rgba(15,23,42,0.7)] ring-1 ring-slate-200/70 backdrop-blur-xl sm:p-6">
        <div className="mb-4 flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            <MdWarning className="text-red-500 text-2xl" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{message || 'This action cannot be undone.'}</p>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button onClick={onClose} className="btn-secondary btn-sm w-full sm:w-auto" disabled={loading}>
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-danger btn-sm w-full sm:w-auto" disabled={loading}>
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
