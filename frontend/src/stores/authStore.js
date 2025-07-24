import { create } from 'zustand';
import api from '../services/api';

export const useAuthStore = create((set, get) => ({
  // State
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Actions
  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { username, password });
      if (response.data.success) {
        const { user, token } = response.data;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
        return { success: true };
      } else {
        throw new Error(response.data.error || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      set({
        isLoading: false,
        error: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  },

  logout: () => {
    delete api.defaults.headers.common['Authorization'];
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  },

  register: async (username, password, role = 'cashier') => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.post('/auth/register', { username, password, role });
      
      if (response.data.success) {
        set({ isLoading: false, error: null });
        return { success: true, user: response.data.user };
      } else {
        throw new Error(response.data.error || 'Registration failed');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
      set({
        isLoading: false,
        error: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.put('/auth/change-password', { 
        currentPassword, 
        newPassword 
      });
      
      if (response.data.success) {
        set({ isLoading: false, error: null });
        return { success: true };
      } else {
        throw new Error(response.data.error || 'Password change failed');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Password change failed';
      set({
        isLoading: false,
        error: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  },

  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
      
      if (response.data.success) {
        set({ user: response.data.user });
        return { success: true, user: response.data.user };
      } else {
        throw new Error(response.data.error || 'Failed to get profile');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to get profile';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  clearError: () => {
    set({ error: null });
  }
})); 