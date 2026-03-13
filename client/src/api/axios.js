import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    const { token } = JSON.parse(userInfo);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.message || 'Something went wrong';

    // Auto logout on 401 Unauthorized
    if (err.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    }

    return Promise.reject(new Error(message));
  }
);

// ─── Master Data APIs ─────────────────────────────────────────────────────────

export const masterApi = {
  getMills: (params) => api.get('/master/mills', { params }),
  createMill: (data) => api.post('/master/mills', data),
  updateMill: (id, data) => api.put(`/master/mills/${id}`, data),
  toggleMillStatus: (id) => api.patch(`/master/mills/${id}/status`),
  deleteMill: (id) => api.delete(`/master/mills/${id}`),

  getQualities: (params) => api.get('/master/qualities', { params }),
  createQuality: (data) => api.post('/master/qualities', data),
  updateQuality: (id, data) => api.put(`/master/qualities/${id}`, data),
  toggleQualityStatus: (id) => api.patch(`/master/qualities/${id}/status`),
  deleteQuality: (id) => api.delete(`/master/qualities/${id}`),

  getDesigns: (params) => api.get('/master/designs', { params }),
  createDesign: (data) => api.post('/master/designs', data),
  updateDesign: (id, data) => api.put(`/master/designs/${id}`, data),
  toggleDesignStatus: (id) => api.patch(`/master/designs/${id}/status`),
  deleteDesign: (id) => api.delete(`/master/designs/${id}`),
};

// ─── Stock APIs ───────────────────────────────────────────────────────────────

export const stockApi = {
  getAll: (params) => api.get('/stocks', { params }),
  getOne: (id) => api.get(`/stocks/${id}`),
  create: (data) => api.post('/stocks', data),
  update: (id, data) => api.put(`/stocks/${id}`, data),
  remove: (id) => api.delete(`/stocks/${id}`),
  getStats: () => api.get('/stocks/stats'),
};

// ─── Report APIs ──────────────────────────────────────────────────────────────

export const reportApi = {
  getReport: (params) => api.get('/reports', { params }),
  downloadReport: (format, params) =>
    api.get('/reports/export', {
      params: { ...params, format },
      responseType: 'blob',
    }),
};

export const authApi = {
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

export const rolesApi = {
  getAll: () => api.get('/roles'),
  getUsers: () => api.get('/roles/users'),
  createRole: (data) => api.post('/roles', data),
  updateRoleType: (id, data) => api.put(`/roles/${id}/type`, data),
  updateRolePermissions: (id, data) => api.put(`/roles/${id}/permissions`, data),
  createUser: (data) => api.post('/roles/users', data),
  updateUser: (id, data) => api.put(`/roles/users/${id}`, data),
  updateUserPermissions: (id, data) => api.put(`/roles/users/${id}/permissions`, data),
};

export default api;
