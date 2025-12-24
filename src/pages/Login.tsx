import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, User2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/utils/storage';
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
    <div className="min-h-screen flex items-center justify-center bg-white font-sans">
      <div className="w-full max-w-4xl flex rounded-3xl shadow-2xl overflow-hidden bg-white animate-fade-in">
        {/* Left: Welcome & Illustration */}
        <div className="hidden md:flex flex-col items-center justify-center w-1/2 bg-[#295c6a] relative p-8 rounded-l-3xl">
          <div className="absolute left-0 top-0 h-full w-full rounded-l-3xl" style={{background: '#295c6a', zIndex: 0}} />
          <div className="relative z-10 flex flex-col items-center w-full">
            <img src="/Login.svg" alt="Welcome Illustration" className="w-64 h-64 object-contain mt-8 mb-4 drop-shadow-xl" draggable={false} style={{filter: 'grayscale(0.2) opacity(0.95)', background: '#295c6a', borderRadius: '1.5rem', padding: '1rem'}} />
          </div>
        </div>
        {/* Right: Login/Register Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center px-10 py-16">
          {tab === 'login' ? (
            <>
              <h2 className="text-2xl font-extrabold text-[#295c6a] mb-6 tracking-wide text-center">LOGIN</h2>
              <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-2">
                <div className="flex flex-col gap-1">
                  <div className="relative">
                    <Input
                      id="username"
                      placeholder="Username"
                      {...loginRegister('username')}
                      className={loginErrors.username ? 'border-destructive pl-10' : 'pl-10'}
                    />
                    <User2 className="absolute left-3 top-1/2 -translate-y-1/2 text-[#295c6a]" size={18} />
                  </div>
                  <div style={{ minHeight: 20 }}>
                    {loginErrors.username && (
                      <p className="text-xs text-destructive">{loginErrors.username.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="password"
                      {...loginRegister('password')}
                      className={loginErrors.password ? 'border-destructive pl-10 pr-10' : 'pl-10 pr-10'}
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#295c6a]" size={18} />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#295c6a]"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <div style={{ minHeight: 20 }}>
                    {loginErrors.password && (
                      <p className="text-xs text-destructive">{loginErrors.password.message}</p>
                    )}
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-full py-2 text-base font-bold bg-[#295c6a] hover:bg-[#3a6d7c] text-white shadow-lg transition-all duration-200" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Login
                </Button>
              </form>
              {/* <div className="flex justify-between mt-4 text-xs text-teal-400">
                <button className="hover:underline" type="button">Forgot</button>
                <button className="hover:underline" type="button">Help</button>
              </div> */}
              <div className="mt-8 text-center text-gray-500 text-sm">
                Don't have an account?{' '}
                <button
                  className="text-[#295c6a] font-semibold hover:underline focus:outline-none"
                  onClick={() => setTab('register')}
                  type="button"
                >
                  Register now
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-[#295c6a] mb-6 tracking-wide text-center">REGISTER</h2>
              <form onSubmit={handleRegisterSubmit(onRegister)} className="space-y-2">
                <div className="relative">
                  <Input
                    id="reg-username"
                    placeholder="Username"
                    {...registerRegister('username')}
                    className={registerErrors.username ? 'border-destructive pl-10' : 'pl-10'}
                  />
                  <User2 className="absolute left-3 top-1/2 -translate-y-1/2 text-[#295c6a]" size={18} />
                  {registerErrors.username && (
                    <p className="text-xs text-destructive mt-1">{registerErrors.username.message}</p>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Password"
                    {...registerRegister('password')}
                    className={registerErrors.password ? 'border-destructive pl-10' : 'pl-10'}
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#295c6a]" size={18} />
                  {registerErrors.password && (
                    <p className="text-xs text-destructive mt-1">{registerErrors.password.message}</p>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="reg-confirm-password"
                    type="password"
                    placeholder="Konfirmasi Password"
                    {...registerRegister('confirmPassword')}
                    className={registerErrors.confirmPassword ? 'border-destructive pl-10' : 'pl-10'}
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#295c6a]" size={18} />
                  {registerErrors.confirmPassword && (
                    <p className="text-xs text-destructive mt-1">{registerErrors.confirmPassword.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full rounded-full py-2 text-base font-bold bg-[#295c6a] hover:bg-[#3a6d7c] text-white shadow-md transition-all duration-200" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Register
                </Button>
              </form>
              <div className="mt-8 text-center text-gray-500 text-sm">
                Already have an accountx?{' '}
                <button
                  className="text-[#295c6a] font-semibold hover:underline focus:outline-none"
                  onClick={() => setTab('login')}
                  type="button"
                >
                  Login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

