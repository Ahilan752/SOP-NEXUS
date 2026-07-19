import { create } from 'zustand';
import { apiClient } from '../services/api';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';

export interface Department {
  _id: string;
  name: string;
  description: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  department: Department | null;
  savedSops: string[];
}

export interface NotificationItem {
  _id: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'APPROVAL' | 'REJECTION';
  link: string;
  createdAt: string;
  isRead: boolean;
}

export interface SopItem {
  _id: string;
  title: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  tags: string[];
  department: { _id: string; name: string } | null;
  createdBy: { _id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  publishedVersion?: {
    versionNumber: string;
    createdAt: string;
  } | null;
  editableVersion?: {
    versionNumber: string;
    status: 'Draft' | 'Pending Approval' | 'Rejected';
    createdAt: string;
  } | null;
}

interface AppState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  sops: SopItem[];
  departments: Department[];
  notifications: NotificationItem[];
  toast: { message: string; type: string } | null;
  
  showToast: (message: string, type?: string) => void;
  clearToast: () => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
  fetchSops: (search?: string) => Promise<void>;
  fetchDepartments: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,
  sops: [],
  departments: [],
  notifications: [],
  toast: null,

  showToast: (message, type = 'info') => {
    set({ toast: { message, type } });
    setTimeout(() => {
      set({ toast: null });
    }, 4000);
  },

  clearToast: () => set({ toast: null }),

  login: (token, user) => {
    localStorage.setItem('sop_token', token);
    set({ token, user, isAuthenticated: true });
    
    // Connect Socket IO for real-time notifications
    connectSocket(user.id, user.role, user.department?._id);

    // Setup socket listener
    const socket = getSocket();
    socket.off('notification'); // avoid duplicates
    socket.on('notification', (data: { message: string; type: string }) => {
      get().showToast(data.message, data.type);
      get().fetchNotifications();
    });
  },

  logout: () => {
    localStorage.removeItem('sop_token');
    disconnectSocket();
    set({ token: null, user: null, isAuthenticated: false, sops: [], notifications: [] });
  },

  initAuth: async () => {
    const cachedToken = localStorage.getItem('sop_token');
    if (!cachedToken) {
      set({ isInitialized: true });
      return;
    }

    try {
      set({ token: cachedToken });
      const response = await apiClient.get('/auth/me');
      const user = response.data;
      
      set({ user, isAuthenticated: true });
      
      // Connect Socket
      connectSocket(user.id, user.role, user.department?._id);

      // Listen for socket events
      const socket = getSocket();
      socket.off('notification');
      socket.on('notification', (data: { message: string; type: string }) => {
        get().showToast(data.message, data.type);
        get().fetchNotifications();
      });
    } catch (error) {
      console.error('Session initialization failed:', error);
      localStorage.removeItem('sop_token');
      set({ token: null, user: null, isAuthenticated: false });
    } finally {
      set({ isInitialized: true });
    }
  },

  fetchSops: async (search = '') => {
    try {
      const url = search ? `/sops?search=${encodeURIComponent(search)}` : '/sops';
      const response = await apiClient.get(url);
      set({ sops: response.data });
    } catch (error) {
      console.error('Fetch SOPs failed:', error);
    }
  },

  fetchDepartments: async () => {
    try {
      const response = await apiClient.get('/departments');
      set({ departments: response.data });
    } catch (error) {
      console.error('Fetch departments failed:', error);
    }
  },

  fetchNotifications: async () => {
    if (!get().isAuthenticated) return;
    try {
      const response = await apiClient.get('/notifications');
      set({ notifications: response.data });
    } catch (error) {
      console.error('Fetch notifications failed:', error);
    }
  },

  markNotificationRead: async (id) => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n._id === id ? { ...n, isRead: true } : n
        )
      }));
    } catch (error) {
      console.error('Mark notification read failed:', error);
    }
  },

  markAllNotificationsRead: async () => {
    try {
      await apiClient.put('/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true }))
      }));
    } catch (error) {
      console.error('Mark all notifications read failed:', error);
    }
  }
}));
