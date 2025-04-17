import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { StoreSettings } from '@shared/schema';

interface User {
  id: number;
  username: string;
  displayName: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  storeId?: number | null;
}

interface AuthContextType {
  user: User | null;
  userStore: StoreSettings | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Protected routes - add more routes as needed
const PROTECTED_ROUTES = ['/', '/pos', '/inventory', '/reports', '/settings', '/customers', '/employees'];
const PUBLIC_ROUTES = ['/login'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userStore, setUserStore] = useState<StoreSettings | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [location, setLocation] = useLocation();

  // Use wouter's setLocation for navigation
  const navigate = (path: string) => setLocation(path);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const loadAuth = () => {
      try {
        const authData = localStorage.getItem('authData');
        if (authData) {
          const { user, accessToken, refreshToken, userStore } = JSON.parse(authData);
          setUser(user);
          setUserStore(userStore);
          setAccessToken(accessToken);
          setRefreshToken(refreshToken);
        }
      } catch (error) {
        console.error('Failed to load auth data:', error);
        // Clear potentially corrupted data
        localStorage.removeItem('authData');
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, []);

  // Load store information whenever the user changes
  useEffect(() => {
    const fetchUserStore = async () => {
      if (user?.storeId && accessToken) {
        try {
          const response = await apiRequest(
            'GET',
            `/api/store-settings/${user.storeId}`,
            undefined,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
          );

          if (response.ok) {
            const storeData = await response.json();
            setUserStore(storeData);

            // Update localStorage with store info
            const authData = JSON.parse(localStorage.getItem('authData') || '{}');
            authData.userStore = storeData;
            localStorage.setItem('authData', JSON.stringify(authData));
          }
        } catch (error) {
          console.error('Failed to fetch user store:', error);
        }
      } else {
        setUserStore(null);
      }
    };

    fetchUserStore();
  }, [user?.storeId, accessToken]);

  // Handle route protection
  useEffect(() => {
    const checkAuth = async () => {
      if (isLoading) return;

      const isProtectedRoute = PROTECTED_ROUTES.some(route => location === route);
      const isPublicRoute = PUBLIC_ROUTES.some(route => location === route);

      if (isProtectedRoute && !accessToken) {
        // Redirect to login if trying to access protected route without auth
        navigate('/login');
      } else if (isPublicRoute && accessToken) {
        // Redirect to home if already authenticated and trying to access login
        navigate('/');
      }
    };

    checkAuth();
  }, [isLoading, location, accessToken, navigate]);

  // Login function
  const login = async (username: string, password: string) => {
    setIsLoading(true);
    console.log("Starting login process for user:", username);

    try {
      console.log("Sending login request to /api/auth/login");

      // Use direct fetch for debugging to bypass existing apiRequest function
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      console.log("Login response status:", response.status);

      // Check if we got any response
      if (!response) {
        console.error("No response received from login request");
        throw new Error("Server not responding. Please try again later.");
      }

      // Handle non-ok responses
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Login failed with status:", response.status, errorText);
        let errorMessage = "Login failed";

        try {
          // Try to parse error as JSON
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If not JSON, use the raw error text if available
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      console.log("Login successful, parsing response");
      const data = await response.json();
      console.log("Login data received (token redacted):", { ...data, accessToken: "[REDACTED]", refreshToken: "[REDACTED]" });

      // Check if we have required fields
      if (!data.username) {
        console.error("Invalid user data received:", data);
        throw new Error("Invalid user data received");
      }

      // Build user object with defaults for missing fields
      const userData = {
        id: data.id || 0,
        username: data.username,
        displayName: data.displayName || data.username,
        role: data.role || "user",
        email: data.email,
        phone: data.phone,
        storeId: data.storeId
      };

      // Fetch store data if we have a storeId
      let storeData = null;
      if (userData.storeId) {
        try {
          const storeResponse = await fetch(`/api/store-settings/${userData.storeId}`, {
            headers: {
              'Authorization': `Bearer ${data.accessToken}`
            }
          });

          if (storeResponse.ok) {
            storeData = await storeResponse.json();
          }
        } catch (storeError) {
          console.error("Error fetching store info:", storeError);
        }
      }

      const authData = {
        user: userData,
        userStore: storeData,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };

      console.log("Setting auth state and redirecting");
      // Update state
      setUser(authData.user);
      setUserStore(authData.userStore);
      setAccessToken(authData.accessToken);
      setRefreshToken(authData.refreshToken);

      // Save to localStorage
      localStorage.setItem('authData', JSON.stringify(authData));

      // Navigate to home
      navigate('/');

    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);

    try {
      // Call logout API to invalidate refresh token on server
      if (accessToken) {
        await apiRequest('POST', '/api/auth/logout', {}, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear auth state regardless of API success
      setUser(null);
      setUserStore(null);
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem('authData');
      setIsLoading(false);
      navigate('/login');
    }
  };

  // Refresh token function
  const refreshAccessToken = async (): Promise<boolean> => {
    if (!refreshToken) return false;

    try {
      const response = await apiRequest('POST', '/api/auth/refresh-token', { refreshToken });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();

      // Update only the access token
      setAccessToken(data.accessToken);

      // Update localStorage
      const authData = JSON.parse(localStorage.getItem('authData') || '{}');
      authData.accessToken = data.accessToken;
      localStorage.setItem('authData', JSON.stringify(authData));

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, log the user out
      logout();
      return false;
    }
  };

  const value = {
    user,
    userStore,
    accessToken,
    refreshToken,
    isLoading,
    isAuthenticated: !!accessToken,
    login,
    logout,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
