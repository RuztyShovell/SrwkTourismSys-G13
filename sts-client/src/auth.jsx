import React, { createContext, useContext, useState, useCallback } from 'react';
import { api, setSession, clearSession, getAccount } from './api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [account, setAccount] = useState(getAccount());

  const login = useCallback(async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    setSession(data);
    setAccount(data.account);
    return data.account;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await api('/auth/register', { method: 'POST', body: payload });
    setSession(data);
    setAccount(data.account);
    return data.account;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setAccount(null);
  }, []);

  return (
    <AuthContext.Provider value={{ account, login, register, logout, isLoggedIn: !!account }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
