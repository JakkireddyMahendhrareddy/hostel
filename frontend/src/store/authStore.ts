import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, User } from '../services/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  initializeAuth: () => Promise<void>;
  verifyAndSyncAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (identifier: string, password: string) => {
        try {
          const response = await authService.login({ identifier, password });
          set({
            user: response.data.user,
            isAuthenticated: true,
            isLoading: false,
          });
          // Broadcast to other tabs
          window.localStorage.setItem('auth-change-event', Date.now().toString());
        } catch (error) {
          set({ user: null, isAuthenticated: false });
          throw error;
        }
      },

      logout: async () => {
        await authService.logout();
        set({ user: null, isAuthenticated: false });
        // Broadcast to other tabs
        window.localStorage.setItem('auth-change-event', Date.now().toString());
      },

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },

      initializeAuth: async () => {
        const token = localStorage.getItem('authToken');
        const storedUser = authService.getStoredUser();
        
        if (!token || !storedUser) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        // Verify token matches stored user by fetching current user from backend
        try {
          const currentUser = await authService.getCurrentUser();
          
          // Check if stored user matches current user from token
          if (currentUser.user_id === storedUser.user_id && currentUser.role_id === storedUser.role_id) {
            set({
              user: currentUser,
              isAuthenticated: true,
              isLoading: false,
            });
            // Update stored user to ensure it's in sync
            localStorage.setItem('user', JSON.stringify(currentUser));
          } else {
            // Mismatch - clear and logout
            await authService.logout();
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          // Token invalid or expired
          await authService.logout();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      verifyAndSyncAuth: async () => {
        const token = localStorage.getItem('authToken');
        if (!token) {
          set({ user: null, isAuthenticated: false });
          return;
        }

        try {
          const currentUser = await authService.getCurrentUser();
          const state = get();
          
          // If user changed, update state
          if (!state.user || state.user.user_id !== currentUser.user_id || state.user.role_id !== currentUser.role_id) {
            set({
              user: currentUser,
              isAuthenticated: true,
            });
            localStorage.setItem('user', JSON.stringify(currentUser));
          }
        } catch (error) {
          // Token invalid
          await authService.logout();
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'hostel-auth-storage', // unique name for localStorage key
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Listen for storage changes (other tabs logging in/out)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'authToken' || e.key === 'user' || e.key === 'auth-change-event') {
      const store = useAuthStore.getState();
      store.verifyAndSyncAuth();
    }
  });
}
