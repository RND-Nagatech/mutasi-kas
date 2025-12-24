
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '@/utils/storage';
import { authApi } from '@/services/api/authApi';
import type { User, LoginRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';



export function useAuth() {

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Register function for new users
  const register = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      await authApi.register(credentials);
      toast({
        title: 'Registrasi Berhasil',
        description: 'Akun berhasil dibuat, silakan login.',
      });
      navigate('/login');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registrasi gagal';
      toast({
        title: 'Registrasi Gagal',
        description: message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    const token = storage.getToken();
    const storedUser = storage.getUser<User>();
    
    if (token && storedUser) {
      setUser(storedUser);
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(credentials);
      storage.setToken(response.token);
      // Simpan seluruh user object dari backend
      if (response.user) {
        storage.setUser(response.user);
        setUser(response.user);
      } else {
        // fallback jika backend tidak mengirim user lengkap
        storage.setUser({ username: credentials.username });
        setUser({ username: credentials.username } as any);
      }
      setIsAuthenticated(true);
      toast({
        title: 'Login Berhasil',
        description: `Selamat datang, ${response.user?.name || credentials.username}!`,
      });
      navigate('/dashboard');
    } catch (error: any) {
      let message = 'Login gagal';
      if (error?.response?.status === 400) {
        // Backend returns 400 for invalid credentials
        message = 'Username atau password salah.';
      } else if (error?.response?.data?.message) {
        message = error.response.data.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      toast({
        title: 'Login Gagal',
        description: message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [navigate, toast]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      storage.clear();
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
      toast({
        title: 'Logout Berhasil',
        description: 'Anda telah keluar dari sistem',
      });
    }
  }, [navigate, toast]);

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    register,
  };
}
