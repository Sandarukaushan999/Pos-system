import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-storage') 
      ? JSON.parse(localStorage.getItem('auth-storage')).state?.token 
      : null;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear storage and reload
      localStorage.removeItem('auth-storage');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (username, password, role) => api.post('/auth/register', { username, password, role }),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (passwords) => api.put('/auth/change-password', passwords),
  deleteUser: (id) => api.delete(`/users/${id}`), // Use /users endpoint for deletion
};

export const inventoryAPI = {
  getAll: (params) => api.get('/inventory', { params }),
  getByBarcode: (barcode) => api.get(`/inventory/barcode/${barcode}`),
  create: (item) => api.post('/inventory', item),
  update: (id, item) => api.put(`/inventory/${id}`, item),
  updateStock: (id, data) => api.put(`/inventory/${id}/update-stock`, data),
  delete: (id) => api.delete(`/inventory/${id}`),
  getPending: () => api.get('/inventory/pending'),
  approve: (id, data) => api.put(`/inventory/${id}/approve`, data),
  getLowStock: () => api.get('/inventory/low-stock'),
  getExpiryAlerts: () => api.get('/inventory/expiry-alerts'),
  getStats: () => api.get('/inventory/stats'),
};

export const salesAPI = {
  getAll: (params) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`),
  create: (sale) => api.post('/sales', sale),
  delete: (id) => api.delete(`/sales/${id}`),
  getStats: (params) => api.get('/sales/stats/overview', { params }),
  getTopItems: (params) => api.get('/sales/stats/top-items', { params }),
  getGrouped: () => api.get('/sales/grouped'),
};

export const expensesAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  getById: (id) => api.get(`/expenses/${id}`),
  create: (expense) => api.post('/expenses', expense),
  update: (id, expense) => api.put(`/expenses/${id}`, expense),
  delete: (id) => api.delete(`/expenses/${id}`),
  getCategories: () => api.get('/expenses/categories/list'),
  getStats: (params) => api.get('/expenses/stats/overview', { params }),
};

export const reportsAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  generateSalesReport: (params) => api.get('/reports/sales/excel', { params }),
  generateInventoryReport: (params) => api.get('/reports/inventory/excel', { params }),
  generateExpensesReport: (params) => api.get('/reports/expenses/excel', { params }),
  generateBusinessReport: (params) => api.get('/reports/business/excel', { params }),
  downloadExcel: (type, fileName) => api.get(`/reports/download/${type}/${fileName}`, { responseType: 'blob' }),
};

export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  updateRole: (id, role) => api.put(`/users/${id}`, { role }),
  delete: (id) => api.delete(`/users/${id}`),
};

export const settingsAPI = {
  exportData: () => api.get('/settings/export'),
  importData: (data) => api.post('/settings/import', { data }),
  resetSystem: () => api.post('/settings/reset'),
};

export default api; 