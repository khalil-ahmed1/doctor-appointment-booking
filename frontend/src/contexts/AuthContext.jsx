import { createContext, useContext, useEffect, useState } from 'react';
import api, { setAuthToken } from '../lib/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data.user);
    } catch (error) {
      setUser(null);
      setAuthToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (data) => {
    const response = await api.post('/auth/login', data);
    if (response.data.data.accessToken) {
      setAuthToken(response.data.data.accessToken);
    }
    setUser(response.data.data.user);
    return response.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setAuthToken(null);
    }
  };

  const register = async (data) => {
    const response = await api.post('/auth/register', data);
    // User must login after registering as they don't get an accessToken in response
    return response.data;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading, login, logout, register, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
