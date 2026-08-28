import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axiosInstance from '../api/axiosInstance';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await axiosInstance.post('/auth/login', { email, password });
          // ApiResponse wraps payload under data.data
          const payload = data.data ?? data;
          const token = payload.accessToken;
          const user = payload.user;
          localStorage.setItem('accessToken', token);
          set({ user, accessToken: token, isAuthenticated: true, isLoading: false });
          return data;
        } finally {
          set((s) => s.isLoading ? { isLoading: false } : {});
        }
      },

      register: async (name, email, password, phone) => {
        set({ isLoading: true });
        try {
          const { data } = await axiosInstance.post('/auth/register', { name, email, password, phone });
          // ApiResponse wraps payload under data.data
          const payload = data.data ?? data;
          const token = payload.accessToken;
          const user = payload.user;
          localStorage.setItem('accessToken', token);
          set({ user, accessToken: token, isAuthenticated: true, isLoading: false });
          return data;
        } finally {
          set((s) => s.isLoading ? { isLoading: false } : {});
        }
      },

      logout: async () => {
        try {
          await axiosInstance.post('/auth/logout');
        } finally {
          localStorage.removeItem('accessToken');
          set({ user: null, accessToken: null, isAuthenticated: false });
        }
      },

      // Fetch fresh user data from server (called on app boot for logged-in users)
      fetchMe: async () => {
        try {
          const { data } = await axiosInstance.get('/auth/me');
          const u = data.data?.user ?? data.user;
          if (u) {
            set((state) => ({
              user: {
                id: u._id ?? u.id,
                name: u.name,
                email: u.email,
                phone: u.phone ?? null,
                role: u.role ?? state.user?.role ?? 'customer',
              },
              isAuthenticated: true,
            }));
          }
        } catch (err) {
          // Only invalidate session on explicit 401 — ignore transient errors
          // so a network blip doesn't silently log the user out.
          if (err?.response?.status === 401) {
            localStorage.removeItem('accessToken');
            set({ user: null, accessToken: null, isAuthenticated: false });
          }
        }
      },

      setLoading: (val) => set({ isLoading: val }),
    }),
    {
      name: 'doodcafe-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;

