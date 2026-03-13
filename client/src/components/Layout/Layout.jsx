import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import Modal from '../common/Modal';
import { KeyRound, LogOut, Menu, MoonStar, SunMedium, UserCog, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateDDMMYYYY } from '../../utils/date';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/master': 'Master Data',
  '/stocks': 'Stock List',
  '/stocks/add': 'Add New Stock',
  '/reports': 'Reports',
  '/roles': 'Roles & Permissions',
  '/roles/manage-roles': 'Manage Roles',
  '/roles/manage-permissions': 'Manage Permissions',
  '/roles/manage-users': 'Manage Users',
  '/roles/add-user': 'Add User',
};

const emptyPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const emptyPasswordErrors = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function Layout() {
  const location = useLocation();
  const { user, logout, updateProfile, changePassword, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isEdit = location.pathname.includes('/stocks/edit/');
  const title = isEdit
    ? 'Edit Stock'
    : location.pathname.startsWith('/roles/')
      ? pageTitles[location.pathname] || 'Roles & Permissions'
      : pageTitles[location.pathname] || 'Stock Management';
  const [accountOpen, setAccountOpen] = useState(false);
  const [profileName, setProfileName] = useState(user?.username || '');
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [passwordErrors, setPasswordErrors] = useState(emptyPasswordErrors);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setProfileName(user?.username || '');
  }, [user?.username]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!accountOpen) {
      setProfileName(user?.username || '');
      setProfileError('');
      setPasswordForm(emptyPasswordForm);
      setPasswordErrors(emptyPasswordErrors);
    }
  }, [accountOpen, user?.username]);

  useEffect(() => {
    refreshUser().catch(() => {});
  }, []);

  const validateProfile = () => {
    const nextError = profileName.trim() ? '' : 'Username is required';
    setProfileError(nextError);
    return !nextError;
  };

  const validatePasswordForm = () => {
    const nextErrors = { ...emptyPasswordErrors };
    const trimmedCurrentPassword = passwordForm.currentPassword.trim();
    const trimmedNewPassword = passwordForm.newPassword.trim();
    const trimmedConfirmPassword = passwordForm.confirmPassword.trim();

    if (!trimmedCurrentPassword) {
      nextErrors.currentPassword = 'Current password is required';
    }

    if (!trimmedNewPassword) {
      nextErrors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 8) {
      nextErrors.newPassword = 'Use at least 8 characters';
    } else if (/\s/.test(passwordForm.newPassword)) {
      nextErrors.newPassword = 'Password cannot contain spaces';
    } else if (!/[A-Z]/.test(passwordForm.newPassword)) {
      nextErrors.newPassword = 'Include at least one uppercase letter';
    } else if (!/[a-z]/.test(passwordForm.newPassword)) {
      nextErrors.newPassword = 'Include at least one lowercase letter';
    } else if (!/\d/.test(passwordForm.newPassword)) {
      nextErrors.newPassword = 'Include at least one number';
    } else if (passwordForm.newPassword === passwordForm.currentPassword) {
      nextErrors.newPassword = 'New password must be different from current password';
    }

    if (!trimmedConfirmPassword) {
      nextErrors.confirmPassword = 'Please confirm the new password';
    } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!validateProfile()) {
      toast.error('Please fill in the username field', { id: 'account-profile-validation' });
      return;
    }

    setProfileSaving(true);
    try {
      await updateProfile(profileName.trim());
      setProfileError('');
    } catch (error) {
      if ((error.message || '').toLowerCase().includes('username')) {
        setProfileError(error.message);
      } else {
        toast.error(error.message || 'Unable to update profile', { id: 'account-profile-error' });
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!validatePasswordForm()) {
      toast.error('Please fix the highlighted password fields', { id: 'account-password-validation' });
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(passwordForm);
      setPasswordForm(emptyPasswordForm);
      setPasswordErrors(emptyPasswordErrors);
      setAccountOpen(false);
    } catch (error) {
      const nextErrors = { ...emptyPasswordErrors };
      const message = error.message || 'Unable to change password';

      if (message.toLowerCase().includes('current password')) {
        nextErrors.currentPassword = message;
      } else if (message.toLowerCase().includes('confirm password') || message.toLowerCase().includes('match')) {
        nextErrors.confirmPassword = message;
      } else if (message.toLowerCase().includes('password')) {
        nextErrors.newPassword = message;
      } else {
        toast.error(message, { id: 'account-password-error' });
      }

      setPasswordErrors(nextErrors);
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-100 lg:flex lg:h-screen">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-6 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="mt-0.5 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
                aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={sidebarOpen}
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-slate-800 sm:text-xl">{title}</h1>
                <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
                  {formatDateDDMMYYYY(new Date())}
                </p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
              <button
                type="button"
                onClick={toggleTheme}
                className="theme-toggle-btn"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                <span className="hidden sm:block">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
              </button>
              <button
                type="button"
                onClick={() => setAccountOpen(true)}
                className={`flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors sm:px-3 ${
                  theme === 'dark' ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100'
                }`}
                title="Manage profile"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                  {user?.username?.substring(0, 2).toUpperCase() || 'ME'}
                </div>
                <span className="hidden max-w-[8rem] truncate text-sm font-medium text-slate-700 sm:block">
                  {user?.username || 'Admin'}
                </span>
              </button>
              <button
                onClick={logout}
                className={`rounded-lg p-2 text-slate-400 transition-colors ${
                  theme === 'dark' ? 'hover:bg-slate-800/80 hover:text-red-400' : 'hover:bg-red-50 hover:text-red-500'
                }`}
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-5 lg:p-6">
          <Outlet />
        </main>
      </div>

      <Modal open={accountOpen} onClose={() => setAccountOpen(false)} title="Account Settings" size="md">
        <div className="space-y-6">
          <form onSubmit={handleProfileSave} noValidate className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <UserCog className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Edit Profile</h3>
            </div>
            <div>
              <label className="form-label">Username</label>
              <input
                className={`form-input ${profileError ? 'form-input-error' : ''}`}
                value={profileName}
                onChange={(e) => {
                  setProfileName(e.target.value);
                  setProfileError('');
                }}
                placeholder="Enter username"
              />
              <p className="form-helper">This name is shown in the header and account menu.</p>
              {profileError && <p className="form-error">{profileError}</p>}
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary btn-sm w-full sm:w-auto" disabled={profileSaving}>
                {profileSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>

          <form onSubmit={handlePasswordSave} noValidate className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <KeyRound className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Change Password</h3>
            </div>
            <div>
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className={`form-input ${passwordErrors.currentPassword ? 'form-input-error' : ''}`}
                value={passwordForm.currentPassword}
                onChange={(e) => {
                  const value = e.target.value;
                  setPasswordForm((prev) => ({ ...prev, currentPassword: value }));
                  setPasswordErrors((prev) => ({ ...prev, currentPassword: '', newPassword: prev.newPassword === 'New password must be different from current password' ? '' : prev.newPassword }));
                }}
                placeholder="Current password"
              />
              {passwordErrors.currentPassword && <p className="form-error">{passwordErrors.currentPassword}</p>}
            </div>
            <div>
              <label className="form-label">New Password</label>
              <input
                type="password"
                className={`form-input ${passwordErrors.newPassword ? 'form-input-error' : ''}`}
                value={passwordForm.newPassword}
                onChange={(e) => {
                  const value = e.target.value;
                  setPasswordForm((prev) => ({ ...prev, newPassword: value }));
                  setPasswordErrors((prev) => ({ ...prev, newPassword: '', confirmPassword: '' }));
                }}
                placeholder="New password"
              />
              <p className="form-helper">Use at least 8 characters with uppercase, lowercase, and a number.</p>
              {passwordErrors.newPassword && <p className="form-error">{passwordErrors.newPassword}</p>}
            </div>
            <div>
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className={`form-input ${passwordErrors.confirmPassword ? 'form-input-error' : ''}`}
                value={passwordForm.confirmPassword}
                onChange={(e) => {
                  setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }));
                  setPasswordErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }}
                placeholder="Confirm new password"
              />
              {passwordErrors.confirmPassword && <p className="form-error">{passwordErrors.confirmPassword}</p>}
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary btn-sm w-full sm:w-auto" disabled={passwordSaving}>
                {passwordSaving ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
