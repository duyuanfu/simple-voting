import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('tenant_token'));
  const [tenant, setTenant] = useState(() => {
    const saved = localStorage.getItem('tenant_info');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          setTenant(res.data);
          localStorage.setItem('tenant_info', JSON.stringify(res.data));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (newToken, newTenant) => {
    localStorage.setItem('tenant_token', newToken);
    localStorage.setItem('tenant_info', JSON.stringify(newTenant));
    setToken(newToken);
    setTenant(newTenant);
  };

  const logout = () => {
    localStorage.removeItem('tenant_token');
    localStorage.removeItem('tenant_info');
    setToken(null);
    setTenant(null);
  };

  return (
    <AuthContext.Provider value={{ token, tenant, login, logout, loading, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
