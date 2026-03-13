import { NavLink, useLocation } from 'react-router-dom';
import {
  MdDashboard,
  MdInventory,
  MdPlaylistAdd,
  MdBarChart,
  MdBuildCircle,
  MdFactory,
  MdShield,
} from 'react-icons/md';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/dashboard', icon: MdDashboard, label: 'Dashboard', moduleKey: 'dashboard', action: 'view' },
  { to: '/master', icon: MdBuildCircle, label: 'Master Data', moduleKey: 'master_data', action: 'view' },
  { to: '/stocks', icon: MdInventory, label: 'Stock List', moduleKey: 'stock_list', action: 'view' },
  { to: '/stocks/add', icon: MdPlaylistAdd, label: 'Add Stock', moduleKey: 'stock_entry', action: 'view' },
  { to: '/reports', icon: MdBarChart, label: 'Reports', moduleKey: 'reports', action: 'view' },
  { to: '/roles', icon: MdShield, label: 'Roles & Permissions', moduleKey: 'roles_permissions', action: 'view' },
];

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const location = useLocation();
  const { hasPermission } = useAuth();
  const visibleNavItems = navItems.filter((item) => hasPermission(item.moduleKey, item.action));

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[88vw] flex-shrink-0 flex-col bg-slate-900 text-white shadow-2xl transition-transform duration-300 ease-out lg:static lg:h-screen lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="border-b border-slate-700 px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500">
            <MdFactory className="text-xl text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Manihar Enterprises</p>
            <p className="text-xs text-slate-400">Stock Management</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Navigation
        </p>
        <ul className="space-y-1">
          {visibleNavItems.map(({ to, icon: Icon, label }) => {
            const isActive =
              to === '/stocks/add'
                ? location.pathname === '/stocks/add'
                : location.pathname.startsWith(to) &&
                  !(to === '/stocks' && location.pathname === '/stocks/add');

            return (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="flex-shrink-0 text-lg" />
                  {label}
                </NavLink>
              </li>
            );
          })}
          {!visibleNavItems.length ? (
            <li className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-xs text-slate-400">
              No modules are enabled for this account.
            </li>
          ) : null}
        </ul>
      </nav>

      <div className="border-t border-slate-700 px-5 py-4 sm:px-6">
        <p className="text-center text-xs text-slate-500">Copyright 2026 Manihar Enterprises</p>
      </div>
    </aside>
  );
}
