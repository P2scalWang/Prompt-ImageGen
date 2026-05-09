import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { findUser, saveSession, getSession, clearSession, initializeStorage } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    initializeStorage()
      .then(() => {
        if (!mounted) return;
        setUser(getSession());
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(getSession());
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const found = await findUser(username, password);
    if (found) {
      const sessionUser = { id: found.id, username: found.username, role: found.role };
      setUser(sessionUser);
      saveSession(sessionUser);
      return { success: true, user: sessionUser };
    }
    return { success: false, error: 'Username หรือ Password ไม่ถูกต้อง' };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    clearSession();
  }, []);

  const isAdmin = user?.role === 'admin';
  const isAuthenticated = !!user;

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
