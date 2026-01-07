import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, User2, Lock, Wallet, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

const registerSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password tidak sama',
  path: ['confirmPassword'],
});

type LoginFormData = {
  username: string;
  password: string;
};

type RegisterFormData = {
  username: string;
  password: string;
  confirmPassword: string;
};

export default function Login() {
  const navigate = useNavigate();
  const { login, register: registerUser, isLoading, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [tab, setTab] = useState<'login' | 'register'>('login');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Login form
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Register form
  const {
    register: registerRegister,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
    reset: resetRegisterForm,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onLogin = async (data: LoginFormData) => {
    try {
      await login(data);
    } catch (error) {
      // Error handled in useAuth hook
    }
  };

  const onRegister = async (data: RegisterFormData) => {
    try {
      await registerUser({ username: data.username, password: data.password });
      setTab('login');
      resetRegisterForm();
    } catch (error) {
      // Error handled in useAuth hook
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left: Welcome Section */}
          <div className="hidden lg:flex flex-col items-center justify-center space-y-8 p-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
              <Card className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-0 shadow-2xl p-8 rounded-3xl">
                <div className="flex flex-col items-center space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-xl opacity-30"></div>
                    <div className="relative bg-gradient-to-r from-blue-600 to-purple-700 p-6 rounded-2xl shadow-xl">
                      <Wallet className="w-16 h-16 text-white" />
                    </div>
                  </div>
                  <div className="text-center space-y-3">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Sistem Mutasi Kas
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-300 font-medium">
                      Modern & Terpercaya
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                      Kelola transaksi kas toko Anda dengan sistem yang aman dan efisien
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Shield className="w-4 h-4 text-green-500" />
                    <span>Data terlindungi dengan enkripsi</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Right: Auth Form */}
          <div className="flex flex-col justify-center space-y-6">
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-xl">
              <CardHeader className="space-y-4 pb-6">
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {tab === 'login' ? 'Masuk Akun' : 'Buat Akun Baru'}
                      </CardTitle>
                      <CardDescription className="text-slate-600 dark:text-slate-400">
                        {tab === 'login'
                          ? 'Masukkan kredensial Anda untuk melanjutkan'
                          : 'Daftar untuk mendapatkan akses ke sistem'
                        }
                      </CardDescription>
                    </div>
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex rounded-lg bg-slate-100 dark:bg-slate-700 p-1">
                  <button
                    type="button"
                    onClick={() => setTab('login')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                      tab === 'login'
                        ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('register')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                      tab === 'register'
                        ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    Daftar
                  </button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {tab === 'login' ? (
                  <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                        Username
                      </Label>
                      <div className="relative">
                        <Input
                          id="username"
                          placeholder="Masukkan username Anda"
                          {...loginRegister('username')}
                          className={`h-11 pl-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-all duration-200 ${
                            loginErrors.username ? 'border-red-500 focus:border-red-500' : ''
                          }`}
                        />
                        <User2 className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 w-5 h-5" />
                      </div>
                      {loginErrors.username && (
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                          {loginErrors.username.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Masukkan password Anda"
                          {...loginRegister('password')}
                          className={`h-11 pl-11 pr-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-all duration-200 ${
                            loginErrors.password ? 'border-red-500 focus:border-red-500' : ''
                          }`}
                        />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 w-5 h-5" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {loginErrors.password && (
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                          {loginErrors.password.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Sedang Masuk...
                        </>
                      ) : (
                        <>
                          <User2 className="mr-2 h-5 w-5" />
                          Masuk
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleRegisterSubmit(onRegister)} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="reg-username" className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                        Username
                      </Label>
                      <div className="relative">
                        <Input
                          id="reg-username"
                          placeholder="Pilih username unik"
                          {...registerRegister('username')}
                          className={`h-11 pl-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-all duration-200 ${
                            registerErrors.username ? 'border-red-500 focus:border-red-500' : ''
                          }`}
                        />
                        <User2 className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 w-5 h-5" />
                      </div>
                      {registerErrors.username && (
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                          {registerErrors.username.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="reg-password"
                          type="password"
                          placeholder="Minimal 6 karakter"
                          {...registerRegister('password')}
                          className={`h-11 pl-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-all duration-200 ${
                            registerErrors.password ? 'border-red-500 focus:border-red-500' : ''
                          }`}
                        />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 w-5 h-5" />
                      </div>
                      {registerErrors.password && (
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                          {registerErrors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm-password" className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                        Konfirmasi Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="reg-confirm-password"
                          type="password"
                          placeholder="Ulangi password Anda"
                          {...registerRegister('confirmPassword')}
                          className={`h-11 pl-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-all duration-200 ${
                            registerErrors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''
                          }`}
                        />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 w-5 h-5" />
                      </div>
                      {registerErrors.confirmPassword && (
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                          {registerErrors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Sedang Mendaftar...
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-5 w-5" />
                          Daftar Akun
                        </>
                      )}
                    </Button>
                  </form>
                )}

                <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {tab === 'login' ? "Belum punya akun?" : "Sudah punya akun?"}{' '}
                    <button
                      type="button"
                      onClick={() => setTab(tab === 'login' ? 'register' : 'login')}
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline transition-colors"
                    >
                      {tab === 'login' ? 'Daftar sekarang' : 'Masuk di sini'}
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center text-xs text-slate-500 dark:text-slate-400">
              <p>© 2024 Sistem Mutasi Kas. Semua hak dilindungi.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

