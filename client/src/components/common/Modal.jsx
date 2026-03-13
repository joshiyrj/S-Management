import { useEffect } from 'react';
import { MdClose } from 'react-icons/md';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    full: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center px-3 py-4 sm:items-center sm:px-6 sm:py-8">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-slate-950/42 backdrop-blur-md" onClick={onClose} />

        {/* Modal */}
        <div
          className={`relative flex w-full ${sizeClasses[size]} max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/92 shadow-[0_28px_70px_-32px_rgba(15,23,42,0.7)] ring-1 ring-slate-200/70 backdrop-blur-xl sm:max-h-[calc(100vh-4rem)]`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/70 px-4 py-4 sm:px-6">
            <h2 className="pr-4 text-base font-bold text-slate-800 sm:text-lg">{title}</h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <MdClose className="text-xl" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
