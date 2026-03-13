import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdCheck, MdGroup, MdLock, MdPersonAdd, MdRefresh, MdSecurity, MdShield } from 'react-icons/md';
import { rolesApi } from '../api/axios';
import Spinner from '../components/common/Spinner';

const ACTIONS = ['view', 'create', 'update', 'delete'];
const MATRIX_ACTIONS = ['allAccess', ...ACTIONS];

const SECTIONS = [
  { key: 'manage-roles', label: 'Manage Roles', icon: MdShield, helper: 'Role metadata and status' },
  { key: 'manage-permissions', label: 'Role Matrix', icon: MdSecurity, helper: 'Role-level permission matrix' },
  { key: 'manage-users', label: 'User Matrix', icon: MdGroup, helper: 'User-level overrides over role access' },
  { key: 'add-user', label: 'Add User', icon: MdPersonAdd, helper: 'Create user and assign role' },
];

const SCOPES = ['system', 'operations', 'sales', 'finance'];

const emptyUserForm = { fullName: '', username: '', email: '', password: '', roleId: '' };

const tBool = (v) => (v === true ? true : v === false ? false : null);
const sortRoles = (roles) =>
  [...roles].sort((a, b) => (Number(Boolean(b.isSystem)) - Number(Boolean(a.isSystem))) || String(a.name || '').localeCompare(String(b.name || '')));

const normalizeRolePermissions = (catalog = [], permissions = []) => {
  const byKey = new Map((permissions || []).map((p) => [p.moduleKey, p]));
  return catalog.map((m) => {
    const s = byKey.get(m.moduleKey) || {};
    const allowed = new Set(m.allowedActions || []);
    const next = {
      moduleKey: m.moduleKey,
      moduleLabel: m.moduleLabel,
      allAccess: Boolean(s.allAccess),
      view: allowed.has('view') ? Boolean(s.view) : false,
      create: allowed.has('create') ? Boolean(s.create) : false,
      update: allowed.has('update') ? Boolean(s.update) : false,
      delete: allowed.has('delete') ? Boolean(s.delete) : false,
      locked: Boolean(s.locked),
    };
    if (next.allAccess) (m.allowedActions || []).forEach((a) => { next[a] = true; });
    if ((next.create || next.update || next.delete) && allowed.has('view')) next.view = true;
    next.allAccess = (m.allowedActions || []).length > 0 && (m.allowedActions || []).every((a) => Boolean(next[a]));
    return next;
  });
};

const normalizeUserOverride = (module, source = {}) => {
  const allowed = new Set(module.allowedActions || []);
  const next = {
    moduleKey: module.moduleKey,
    moduleLabel: module.moduleLabel,
    allAccess: tBool(source.allAccess),
    view: allowed.has('view') ? tBool(source.view) : null,
    create: allowed.has('create') ? tBool(source.create) : null,
    update: allowed.has('update') ? tBool(source.update) : null,
    delete: allowed.has('delete') ? tBool(source.delete) : null,
  };
  if (typeof next.allAccess === 'boolean') (module.allowedActions || []).forEach((a) => { next[a] = next.allAccess; });
  if (next.view === false && allowed.has('view')) ['create', 'update', 'delete'].forEach((a) => { if (allowed.has(a) && next[a] === null) next[a] = false; });
  ['create', 'update', 'delete'].forEach((a) => { if (allowed.has(a) && next[a] === true && allowed.has('view')) next.view = true; });
  const vals = (module.allowedActions || []).map((a) => next[a]);
  next.allAccess = vals.every((v) => typeof v === 'boolean') ? vals.every(Boolean) : null;
  return next;
};

const normalizeUserOverrides = (catalog = [], overrides = []) => {
  const byKey = new Map((overrides || []).map((o) => [o.moduleKey, o]));
  return catalog.map((m) => normalizeUserOverride(m, byKey.get(m.moduleKey) || {}));
};

const makeUserDraftMap = (users = []) =>
  users.reduce((acc, u) => {
    acc[u._id] = { fullName: u.fullName || '', username: u.username || '', email: u.email || '', roleId: u.roleId || '', isActive: u.isActive !== false };
    return acc;
  }, {});

const makeUserOverrideMap = (users = [], catalog = []) =>
  users.reduce((acc, u) => {
    acc[u._id] = normalizeUserOverrides(catalog, u.permissionOverrides || []);
    return acc;
  }, {});

function FieldError({ message }) {
  return <p className={`form-feedback ${message ? 'form-error' : 'text-transparent'}`}>{message || 'x'}</p>;
}

function StatusPill({ active }) {
  return <span className={`badge ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{active ? 'Active' : 'Inactive'}</span>;
}

function MatrixButton({ active, onClick, disabled, tone = 'slate', label }) {
  const activeMap = {
    slate: 'border-slate-400 bg-slate-100 text-slate-700',
    green: 'border-emerald-400 bg-emerald-50 text-emerald-700',
    blue: 'border-blue-400 bg-blue-50 text-blue-700',
    red: 'border-rose-400 bg-rose-50 text-rose-700',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex min-h-10 items-center gap-1 rounded-lg border px-2 text-xs font-semibold ${active ? activeMap[tone] : 'border-slate-200 bg-white text-slate-500'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <MdCheck className={active ? 'text-current' : 'text-transparent'} />{label}
    </button>
  );
}

export default function RolesPermissions() {
  const navigate = useNavigate();
  const location = useLocation();
  const { section } = useParams();
  const sectionSet = useMemo(() => new Set(SECTIONS.map((s) => s.key)), []);
  const activeSection = sectionSet.has(section) ? section : 'manage-roles';

  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [moduleCatalog, setModuleCatalog] = useState([]);
  const [users, setUsers] = useState([]);
  const [userDrafts, setUserDrafts] = useState({});
  const [userOverrideDrafts, setUserOverrideDrafts] = useState({});

  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [roleDraft, setRoleDraft] = useState(null);
  const [rolePermissionsDraft, setRolePermissionsDraft] = useState([]);

  const [createUserForm, setCreateUserForm] = useState(emptyUserForm);
  const [createUserErrors, setCreateUserErrors] = useState({});
  const [roleErrors, setRoleErrors] = useState({});

  const [savingRole, setSavingRole] = useState(false);
  const [savingRolePerms, setSavingRolePerms] = useState(false);
  const [savingUserId, setSavingUserId] = useState('');
  const [savingUserOverrides, setSavingUserOverrides] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  const moduleByKey = useMemo(() => new Map((moduleCatalog || []).map((m) => [m.moduleKey, m])), [moduleCatalog]);
  const selectedRole = useMemo(() => roles.find((r) => r._id === selectedRoleId) || roles[0] || null, [roles, selectedRoleId]);
  const selectedUser = useMemo(() => users.find((u) => u._id === selectedUserId) || users[0] || null, [users, selectedUserId]);

  const loadWorkspace = async (keepRoleId = '', keepUserId = '') => {
    setLoading(true);
    try {
      const [rolesRes, usersRes] = await Promise.all([rolesApi.getAll(), rolesApi.getUsers()]);
      const nextRoles = sortRoles(rolesRes.data.data.roles || []);
      const nextCatalog = rolesRes.data.data.moduleCatalog || [];
      const nextUsers = usersRes.data.data.users || [];
      setRoles(nextRoles);
      setModuleCatalog(nextCatalog);
      setUsers(nextUsers);
      setUserDrafts(makeUserDraftMap(nextUsers));
      setUserOverrideDrafts(makeUserOverrideMap(nextUsers, nextCatalog));
      const qRoleId = new URLSearchParams(location.search).get('roleId');
      const roleId = keepRoleId || qRoleId || selectedRoleId || nextRoles[0]?._id || '';
      const userId = keepUserId || selectedUserId || nextUsers[0]?._id || '';
      setSelectedRoleId(nextRoles.some((r) => r._id === roleId) ? roleId : nextRoles[0]?._id || '');
      setSelectedUserId(nextUsers.some((u) => u._id === userId) ? userId : nextUsers[0]?._id || '');
    } catch (error) {
      toast.error(error.message || 'Unable to load roles workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sectionSet.has(section)) navigate('/roles/manage-roles', { replace: true });
  }, [section, sectionSet, navigate]);

  useEffect(() => { loadWorkspace(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    const qRoleId = new URLSearchParams(location.search).get('roleId');
    if (qRoleId && roles.some((r) => r._id === qRoleId)) setSelectedRoleId(qRoleId);
  }, [location.search, roles]);

  useEffect(() => {
    if (!selectedRole) {
      setRoleDraft(null);
      setRolePermissionsDraft([]);
      return;
    }
    setRoleDraft({
      _id: selectedRole._id,
      name: selectedRole.name || '',
      key: selectedRole.key || '',
      scope: selectedRole.scope || 'operations',
      description: selectedRole.description || '',
      isActive: selectedRole.isActive !== false,
    });
    setRolePermissionsDraft(normalizeRolePermissions(moduleCatalog, selectedRole.permissions || []));
    setRoleErrors({});
  }, [selectedRole, moduleCatalog]);

  useEffect(() => {
    if (!createUserForm.roleId && roles.find((r) => r.isActive !== false)?._id) {
      setCreateUserForm((c) => ({ ...c, roleId: roles.find((r) => r.isActive !== false)?._id || '' }));
    }
  }, [createUserForm.roleId, roles]);

  const selectedUserDraft = selectedUser ? userDrafts[selectedUser._id] || null : null;
  const selectedUserRole = selectedUserDraft ? roles.find((r) => r._id === selectedUserDraft.roleId) || null : null;
  const selectedUserRolePerms = useMemo(() => {
    const perms = normalizeRolePermissions(moduleCatalog, selectedUserRole?.permissions || []);
    return new Map(perms.map((p) => [p.moduleKey, p]));
  }, [moduleCatalog, selectedUserRole]);
  const selectedUserOverrides = selectedUser ? userOverrideDrafts[selectedUser._id] || normalizeUserOverrides(moduleCatalog, []) : [];

  const toggleRolePermission = (moduleKey, action) => {
    if (!selectedRole || selectedRole.isActive === false) return;
    setRolePermissionsDraft((curr) => curr.map((p) => {
      if (p.moduleKey !== moduleKey || p.locked) return p;
      const module = moduleByKey.get(moduleKey);
      const allowed = module?.allowedActions || [];
      const allowedSet = new Set(allowed);
      const next = { ...p };
      if (action === 'allAccess') {
        const v = !p.allAccess;
        allowed.forEach((a) => { next[a] = v; });
      } else {
        if (!allowedSet.has(action)) return p;
        next[action] = !p[action];
        if (action === 'view' && !next.view) ['create', 'update', 'delete'].forEach((a) => { if (allowedSet.has(a)) next[a] = false; });
        if (['create', 'update', 'delete'].includes(action) && next[action] && allowedSet.has('view')) next.view = true;
      }
      ACTIONS.forEach((a) => { if (!allowedSet.has(a)) next[a] = false; });
      next.allAccess = allowed.length > 0 && allowed.every((a) => Boolean(next[a]));
      return next;
    }));
  };

  const saveRoleType = async () => {
    if (!roleDraft) return;
    const errs = {};
    if (!roleDraft.name.trim()) errs.name = 'Role name is required';
    if (!roleDraft.key.trim()) errs.key = 'Role key is required';
    if (!SCOPES.includes(roleDraft.scope)) errs.scope = 'Select a valid scope';
    setRoleErrors(errs);
    if (Object.keys(errs).length) return;
    setSavingRole(true);
    try {
      const res = await rolesApi.updateRoleType(roleDraft._id, {
        name: roleDraft.name.trim(),
        key: roleDraft.key.trim(),
        scope: roleDraft.scope,
        description: roleDraft.description.trim(),
        isActive: roleDraft.isActive,
      });
      const updated = res.data.data;
      setRoles((curr) => sortRoles(curr.map((r) => (r._id === updated._id ? updated : r))));
      toast.success(res.data.message || 'Role updated');
    } catch (error) {
      toast.error(error.message || 'Unable to update role');
    } finally {
      setSavingRole(false);
    }
  };

  const saveRolePermissions = async () => {
    if (!selectedRole) return;
    if (selectedRole.isActive === false) return toast.error('Activate role before editing matrix');
    setSavingRolePerms(true);
    try {
      const res = await rolesApi.updateRolePermissions(selectedRole._id, { permissions: rolePermissionsDraft });
      const updated = res.data.data;
      setRoles((curr) => sortRoles(curr.map((r) => (r._id === updated._id ? updated : r))));
      setRolePermissionsDraft(normalizeRolePermissions(moduleCatalog, updated.permissions || []));
      toast.success(res.data.message || 'Role permissions updated');
    } catch (error) {
      toast.error(error.message || 'Unable to save role permissions');
    } finally {
      setSavingRolePerms(false);
    }
  };

  const updateUserDraft = (userId, field, value) => {
    setUserDrafts((curr) => ({ ...curr, [userId]: { ...curr[userId], [field]: value } }));
  };

  const saveUserBasics = async (userId) => {
    const draft = userDrafts[userId];
    if (!draft) return;
    if (!draft.username?.trim()) return toast.error('Username is required');
    if (!draft.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) return toast.error('Valid email is required');
    if (!roles.find((r) => r._id === draft.roleId && r.isActive !== false)) return toast.error('Select an active role');

    setSavingUserId(userId);
    try {
      const res = await rolesApi.updateUser(userId, {
        fullName: draft.fullName?.trim(),
        username: draft.username.trim(),
        email: draft.email.trim(),
        roleId: draft.roleId,
        isActive: draft.isActive,
      });
      const updated = res.data.data;
      setUsers((curr) => curr.map((u) => (u._id === updated._id ? updated : u)));
      setUserDrafts((curr) => ({ ...curr, [updated._id]: { fullName: updated.fullName || '', username: updated.username || '', email: updated.email || '', roleId: updated.roleId || '', isActive: updated.isActive !== false } }));
      setUserOverrideDrafts((curr) => ({ ...curr, [updated._id]: normalizeUserOverrides(moduleCatalog, updated.permissionOverrides || []) }));
      toast.success(res.data.message || 'User updated');
    } catch (error) {
      toast.error(error.message || 'Unable to update user');
    } finally {
      setSavingUserId('');
    }
  };

  const mutateOverrides = (updater) => {
    if (!selectedUser) return;
    setUserOverrideDrafts((curr) => {
      const base = curr[selectedUser._id] || normalizeUserOverrides(moduleCatalog, []);
      return { ...curr, [selectedUser._id]: updater(base.map((x) => ({ ...x }))) };
    });
  };

  const cycleUserPermission = (moduleKey, action) => {
    if (!selectedUser || !selectedUserRole) return;
    mutateOverrides((curr) => curr.map((o) => {
      if (o.moduleKey !== moduleKey) return o;
      const module = moduleByKey.get(moduleKey);
      if (!module) return o;
      const role = selectedUserRolePerms.get(moduleKey) || {};
      const allowed = new Set(module.allowedActions || []);
      const next = { ...o };
      if (action === 'allAccess') {
        const roleAll = (module.allowedActions || []).length > 0 && (module.allowedActions || []).every((a) => Boolean(role[a]));
        if (typeof next.allAccess === 'boolean') {
          (module.allowedActions || []).forEach((a) => { next[a] = null; });
          next.allAccess = null;
        } else {
          const v = !roleAll;
          (module.allowedActions || []).forEach((a) => { next[a] = v; });
          next.allAccess = v;
        }
        return normalizeUserOverride(module, next);
      }
      if (!allowed.has(action)) return o;
      next[action] = typeof next[action] === 'boolean' ? null : !Boolean(role[action]);
      return normalizeUserOverride(module, next);
    }));
  };

  const clearModuleOverrides = (moduleKey) => mutateOverrides((curr) => curr.map((o) => {
    if (o.moduleKey !== moduleKey) return o;
    const module = moduleByKey.get(moduleKey);
    return module ? normalizeUserOverride(module, {}) : o;
  }));

  const clearAllOverrides = () => {
    if (!selectedUser) return;
    setUserOverrideDrafts((curr) => ({ ...curr, [selectedUser._id]: normalizeUserOverrides(moduleCatalog, []) }));
  };

  const saveUserOverrides = async () => {
    if (!selectedUser) return;
    if (!selectedUserRole || selectedUserRole.isActive === false) return toast.error('Assign active role before override');
    setSavingUserOverrides(true);
    try {
      const res = await rolesApi.updateUserPermissions(selectedUser._id, { permissionOverrides: selectedUserOverrides });
      const updated = res.data.data;
      setUsers((curr) => curr.map((u) => (u._id === updated._id ? updated : u)));
      setUserOverrideDrafts((curr) => ({ ...curr, [updated._id]: normalizeUserOverrides(moduleCatalog, updated.permissionOverrides || []) }));
      toast.success(res.data.message || 'User overrides updated');
    } catch (error) {
      toast.error(error.message || 'Unable to save user overrides');
    } finally {
      setSavingUserOverrides(false);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!createUserForm.fullName.trim()) errs.fullName = 'Full name is required';
    if (!createUserForm.username.trim()) errs.username = 'Username is required';
    if (!createUserForm.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createUserForm.email.trim())) errs.email = 'Enter valid email';
    if (!createUserForm.password.trim()) errs.password = 'Password is required';
    else if (createUserForm.password.length < 8) errs.password = 'Min 8 chars required';
    if (!createUserForm.roleId) errs.roleId = 'Select role';
    setCreateUserErrors(errs);
    if (Object.keys(errs).length) return;
    setCreatingUser(true);
    try {
      const res = await rolesApi.createUser({ ...createUserForm, fullName: createUserForm.fullName.trim(), username: createUserForm.username.trim(), email: createUserForm.email.trim() });
      toast.success(res.data.message || 'User created');
      setCreateUserForm({ ...emptyUserForm, roleId: roles.find((r) => r.isActive !== false)?._id || '' });
      setCreateUserErrors({});
      await loadWorkspace(selectedRoleId, res.data.data?._id || '');
    } catch (error) {
      toast.error(error.message || 'Unable to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  if (loading && !roles.length) return <Spinner center />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">Total Roles</p><p className="mt-2 text-2xl font-bold text-slate-900">{roles.length}</p></div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">Active Roles</p><p className="mt-2 text-2xl font-bold text-slate-900">{roles.filter((r) => r.isActive !== false).length}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Managed Users</p><p className="mt-2 text-2xl font-bold text-slate-900">{users.length}</p></div>
        <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-500">Modules</p><p className="mt-2 text-2xl font-bold text-slate-900">{moduleCatalog.length}</p></div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="card space-y-2 p-3">
          <p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Access Workspace</p>
          {SECTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.key}
                to={`/roles/${item.key}`}
                className={({ isActive }) => `block rounded-xl border px-3 py-3 transition-colors ${isActive ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-transparent bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white'}`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm"><Icon className="text-lg" /></span>
                  <div><p className="text-sm font-semibold">{item.label}</p><p className="mt-0.5 text-xs text-slate-400">{item.helper}</p></div>
                </div>
              </NavLink>
            );
          })}
          <button type="button" onClick={() => loadWorkspace(selectedRoleId, selectedUserId)} className="btn-secondary btn-sm mt-3 w-full"><MdRefresh className="text-lg" />Refresh Data</button>
        </aside>

        <div className="space-y-4">
          <div className="card space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-500">{SECTIONS.find((s) => s.key === activeSection)?.label}</p>
            <h2 className="text-2xl font-bold text-slate-900">Roles & Permissions</h2>
            <p className="text-sm text-slate-500">Role access is the base policy. User matrix values are explicit grants/revokes and can be removed to inherit role policy again.</p>
          </div>

          {activeSection === 'manage-roles' && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
                {roles.map((r) => (
                  <button key={r._id} type="button" onClick={() => setSelectedRoleId(r._id)} className={`w-full rounded-xl border px-3 py-3 text-left ${r._id === selectedRole?._id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-center justify-between"><p className="font-semibold text-slate-800">{r.name}</p><StatusPill active={r.isActive !== false} /></div>
                    <p className="mt-1 text-xs text-slate-500">{r.key}</p>
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                {!roleDraft ? <div className="py-16 text-center text-slate-500">Select a role</div> : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div><label className="form-label">Role Name</label><input className={`form-input ${roleErrors.name ? 'form-input-error' : ''}`} value={roleDraft.name} onChange={(e) => { setRoleDraft((c) => ({ ...c, name: e.target.value })); setRoleErrors((c) => ({ ...c, name: '' })); }} /><FieldError message={roleErrors.name} /></div>
                      <div><label className="form-label">Role Key</label><input className={`form-input ${roleErrors.key ? 'form-input-error' : ''}`} value={roleDraft.key} onChange={(e) => { setRoleDraft((c) => ({ ...c, key: e.target.value })); setRoleErrors((c) => ({ ...c, key: '' })); }} /><FieldError message={roleErrors.key} /></div>
                      <div><label className="form-label">Scope</label><select className={`form-select ${roleErrors.scope ? 'form-input-error' : ''}`} value={roleDraft.scope} onChange={(e) => { setRoleDraft((c) => ({ ...c, scope: e.target.value })); setRoleErrors((c) => ({ ...c, scope: '' })); }}>{SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}</select><FieldError message={roleErrors.scope} /></div>
                      <div><label className="form-label">Status</label><select className="form-select" value={roleDraft.isActive ? 'active' : 'inactive'} onChange={(e) => setRoleDraft((c) => ({ ...c, isActive: e.target.value === 'active' }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                    </div>
                    <div><label className="form-label">Description</label><textarea rows={3} className="form-input" value={roleDraft.description} onChange={(e) => setRoleDraft((c) => ({ ...c, description: e.target.value }))} /></div>
                    <div className="flex justify-end"><button type="button" className="btn-primary" onClick={saveRoleType} disabled={savingRole}>{savingRole ? 'Saving...' : 'Save Role Type'}</button></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'manage-permissions' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm font-semibold text-slate-700">Role</label>
                <select className="form-select max-w-xs" value={selectedRole?._id || ''} onChange={(e) => setSelectedRoleId(e.target.value)}>{roles.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}</select>
                {selectedRole ? <StatusPill active={selectedRole.isActive !== false} /> : null}
              </div>
              <div className="overflow-x-auto">
                <p className="mb-2 text-xs text-slate-500 md:hidden">Swipe horizontally to edit the role matrix.</p>
                <table className="min-w-[960px] w-full text-sm">
                  <thead className="table-header"><tr><th className="px-3 py-3 text-left">Module</th>{MATRIX_ACTIONS.map((a) => <th key={a} className="px-2 py-3 text-center">{a}</th>)}<th className="px-3 py-3 text-center">Lock</th></tr></thead>
                  <tbody>
                    {rolePermissionsDraft.map((p) => {
                      const m = moduleByKey.get(p.moduleKey);
                      const allowed = new Set(m?.allowedActions || []);
                      return (
                        <tr key={p.moduleKey} className="table-row align-top">
                          <td className="px-3 py-3"><p className="font-semibold text-slate-800">{p.moduleLabel}</p><p className="mt-1 text-xs text-slate-500">{m?.note || ''}</p></td>
                          {MATRIX_ACTIONS.map((a) => (
                            <td key={a} className="px-2 py-3 text-center">{a !== 'allAccess' && !allowed.has(a) ? <span className="text-xs text-slate-400">N/A</span> : <MatrixButton label={a} active={Boolean(p[a])} tone="green" disabled={selectedRole?.isActive === false || p.locked} onClick={() => toggleRolePermission(p.moduleKey, a)} />}</td>
                          ))}
                          <td className="px-3 py-3 text-center">{p.locked ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700"><MdLock /> Locked</span> : <span className="text-xs text-slate-400">Open</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end"><button type="button" className="btn-primary" onClick={saveRolePermissions} disabled={savingRolePerms}>{savingRolePerms ? 'Saving...' : 'Save Role Matrix'}</button></div>
            </div>
          )}

          {activeSection === 'manage-users' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="space-y-3 md:hidden">
                  {users.map((u) => {
                    const d = userDrafts[u._id] || {};
                    return (
                      <div key={u._id} className={`rounded-xl border p-3 ${selectedUser?._id === u._id ? 'border-blue-400 bg-blue-50/60' : 'border-slate-200 bg-slate-50/40'}`}>
                        <div className="space-y-2">
                          <input className="form-input py-1.5" value={d.fullName || ''} onChange={(e) => updateUserDraft(u._id, 'fullName', e.target.value)} placeholder="Full name" />
                          <input className="form-input py-1.5" value={d.username || ''} onChange={(e) => updateUserDraft(u._id, 'username', e.target.value)} placeholder="Username" />
                          <input className="form-input py-1.5" value={d.email || ''} onChange={(e) => updateUserDraft(u._id, 'email', e.target.value)} placeholder="Email" />
                          <select className="form-select py-1.5" value={d.roleId || ''} onChange={(e) => updateUserDraft(u._id, 'roleId', e.target.value)}>
                            <option value="">Select role</option>
                            {roles.map((r) => (
                              <option key={r._id} value={r._id} disabled={r.isActive === false}>
                                {r.name}{r.isActive === false ? ' (Inactive)' : ''}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center justify-between">
                            <label className="inline-flex items-center gap-2 text-xs">
                              <input type="checkbox" checked={d.isActive !== false} onChange={(e) => updateUserDraft(u._id, 'isActive', e.target.checked)} />
                              {d.isActive !== false ? 'Active' : 'Inactive'}
                            </label>
                            <div className="flex gap-2">
                              <button type="button" className="btn-secondary btn-xs" onClick={() => setSelectedUserId(u._id)}>Matrix</button>
                              <button type="button" className="btn-primary btn-xs" onClick={() => saveUserBasics(u._id)} disabled={savingUserId === u._id}>{savingUserId === u._id ? 'Saving...' : 'Save'}</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-[980px] w-full text-sm">
                    <thead className="table-header"><tr><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Username</th><th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-left">Role</th><th className="px-3 py-2 text-center">Status</th><th className="px-3 py-2 text-center">Action</th></tr></thead>
                    <tbody>
                      {users.map((u) => {
                        const d = userDrafts[u._id] || {};
                        return (
                          <tr key={u._id} className={`table-row ${selectedUser?._id === u._id ? 'bg-blue-50/50' : ''}`}>
                            <td className="px-3 py-2"><input className="form-input py-1.5" value={d.fullName || ''} onChange={(e) => updateUserDraft(u._id, 'fullName', e.target.value)} /></td>
                            <td className="px-3 py-2"><input className="form-input py-1.5" value={d.username || ''} onChange={(e) => updateUserDraft(u._id, 'username', e.target.value)} /></td>
                            <td className="px-3 py-2"><input className="form-input py-1.5" value={d.email || ''} onChange={(e) => updateUserDraft(u._id, 'email', e.target.value)} /></td>
                            <td className="px-3 py-2"><select className="form-select py-1.5" value={d.roleId || ''} onChange={(e) => updateUserDraft(u._id, 'roleId', e.target.value)}><option value="">Select role</option>{roles.map((r) => <option key={r._id} value={r._id} disabled={r.isActive === false}>{r.name}{r.isActive === false ? ' (Inactive)' : ''}</option>)}</select></td>
                            <td className="px-3 py-2 text-center"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={d.isActive !== false} onChange={(e) => updateUserDraft(u._id, 'isActive', e.target.checked)} /><span className="text-xs">{d.isActive !== false ? 'Active' : 'Inactive'}</span></label></td>
                            <td className="px-3 py-2"><div className="flex justify-center gap-2"><button type="button" className="btn-secondary btn-xs" onClick={() => setSelectedUserId(u._id)}>Matrix</button><button type="button" className="btn-primary btn-xs" onClick={() => saveUserBasics(u._id)} disabled={savingUserId === u._id}>{savingUserId === u._id ? 'Saving...' : 'Save'}</button></div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                {!selectedUser ? <div className="py-10 text-center text-slate-500">Select a user for override matrix.</div> : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">User Override Matrix</h3>
                        <p className="mt-1 text-sm text-slate-500">User: <span className="font-semibold">{selectedUser.username}</span> · Role: <span className="font-semibold">{selectedUserRole?.name || 'Unassigned'}</span></p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="badge bg-emerald-100 text-emerald-700">Role Allow</span>
                        <span className="badge bg-slate-100 text-slate-600">Role Deny</span>
                        <span className="badge bg-blue-100 text-blue-700">User Grant</span>
                        <span className="badge bg-rose-100 text-rose-700">User Revoke</span>
                      </div>
                    </div>
                    {!selectedUserRole ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">Assign an active role first.</div> : (
                      <>
                        <p className="text-xs text-slate-500 md:hidden">Swipe horizontally to manage module-level overrides.</p>
                        <div className="overflow-x-auto">
                          <table className="min-w-[1080px] w-full text-sm">
                            <thead className="table-header"><tr><th className="px-3 py-3 text-left">Module</th><th className="px-3 py-3 text-left">Role Access</th>{MATRIX_ACTIONS.map((a) => <th key={a} className="px-2 py-3 text-center">{a}</th>)}<th className="px-3 py-3 text-center">Clear</th></tr></thead>
                            <tbody>
                              {selectedUserOverrides.map((o) => {
                                const m = moduleByKey.get(o.moduleKey);
                                const allowed = new Set(m?.allowedActions || []);
                                const role = selectedUserRolePerms.get(o.moduleKey) || {};
                                const roleAll = (m?.allowedActions || []).length > 0 && (m?.allowedActions || []).every((a) => Boolean(role[a]));
                                return (
                                  <tr key={o.moduleKey} className="table-row align-top">
                                    <td className="px-3 py-3"><p className="font-semibold text-slate-800">{m?.moduleLabel || o.moduleLabel}</p><p className="mt-1 text-xs text-slate-500">{m?.note || ''}</p></td>
                                    <td className="px-3 py-3"><div className="flex flex-wrap gap-1.5">{(m?.allowedActions || []).map((a) => <span key={a} className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${role[a] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{a}:{role[a] ? 'Allow' : 'Deny'}</span>)}</div></td>
                                    {MATRIX_ACTIONS.map((a) => {
                                      if (a !== 'allAccess' && !allowed.has(a)) return <td key={a} className="px-2 py-3 text-center text-xs text-slate-400">N/A</td>;
                                      const ov = tBool(o[a]);
                                      const roleValue = a === 'allAccess' ? roleAll : Boolean(role[a]);
                                      const tone = ov === null ? (roleValue ? 'green' : 'slate') : (ov ? 'blue' : 'red');
                                      const label = ov === null ? (roleValue ? 'Role Allow' : 'Role Deny') : (ov ? 'User Grant' : 'User Revoke');
                                      return <td key={a} className="px-2 py-3 text-center"><MatrixButton active tone={tone} label={label} disabled={selectedUserRole.isActive === false} onClick={() => cycleUserPermission(o.moduleKey, a)} /></td>;
                                    })}
                                    <td className="px-3 py-3 text-center"><button type="button" className="btn-secondary btn-xs" onClick={() => clearModuleOverrides(o.moduleKey)} disabled={selectedUserRole.isActive === false}>Clear</button></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className="btn-secondary" onClick={clearAllOverrides} disabled={selectedUserRole.isActive === false}>Clear All Overrides</button><button type="button" className="btn-primary" onClick={saveUserOverrides} disabled={savingUserOverrides || selectedUserRole.isActive === false}>{savingUserOverrides ? 'Saving...' : 'Save User Overrides'}</button></div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'add-user' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <form className="space-y-4" onSubmit={createUser} noValidate>
                <h3 className="text-lg font-semibold text-slate-900">Create User</h3>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div><label className="form-label">Full Name</label><input className={`form-input ${createUserErrors.fullName ? 'form-input-error' : ''}`} value={createUserForm.fullName} onChange={(e) => { setCreateUserForm((c) => ({ ...c, fullName: e.target.value })); setCreateUserErrors((c) => ({ ...c, fullName: '' })); }} /><FieldError message={createUserErrors.fullName} /></div>
                  <div><label className="form-label">Username</label><input className={`form-input ${createUserErrors.username ? 'form-input-error' : ''}`} value={createUserForm.username} onChange={(e) => { setCreateUserForm((c) => ({ ...c, username: e.target.value })); setCreateUserErrors((c) => ({ ...c, username: '' })); }} /><FieldError message={createUserErrors.username} /></div>
                  <div><label className="form-label">Email</label><input className={`form-input ${createUserErrors.email ? 'form-input-error' : ''}`} value={createUserForm.email} onChange={(e) => { setCreateUserForm((c) => ({ ...c, email: e.target.value })); setCreateUserErrors((c) => ({ ...c, email: '' })); }} /><FieldError message={createUserErrors.email} /></div>
                  <div><label className="form-label">Role</label><select className={`form-select ${createUserErrors.roleId ? 'form-input-error' : ''}`} value={createUserForm.roleId} onChange={(e) => { setCreateUserForm((c) => ({ ...c, roleId: e.target.value })); setCreateUserErrors((c) => ({ ...c, roleId: '' })); }}><option value="">Select role</option>{roles.map((r) => <option key={r._id} value={r._id} disabled={r.isActive === false}>{r.name}{r.isActive === false ? ' (Inactive)' : ''}</option>)}</select><FieldError message={createUserErrors.roleId} /></div>
                </div>
                <div><label className="form-label">Temporary Password</label><input type="password" className={`form-input ${createUserErrors.password ? 'form-input-error' : ''}`} value={createUserForm.password} onChange={(e) => { setCreateUserForm((c) => ({ ...c, password: e.target.value })); setCreateUserErrors((c) => ({ ...c, password: '' })); }} /><FieldError message={createUserErrors.password} /></div>
                <div className="flex justify-end"><button type="submit" className="btn-primary" disabled={creatingUser}>{creatingUser ? 'Creating...' : 'Create User'}</button></div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

