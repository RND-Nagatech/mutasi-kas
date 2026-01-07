import { Menu, LogOut, User, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { storage } from '@/utils/storage';
import type { User as UserType } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const user = storage.getUser<UserType>();
  const { logout } = useAuth();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'light';
    setIsDark(theme === 'dark');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', !isDark);
  };

  const initials = (user?.username || user?.name || 'AD')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-40 flex h-20 items-center justify-between bg-gradient-to-r from-white/90 via-white/80 to-slate-50/90 dark:from-slate-900/90 dark:via-slate-800/80 dark:to-slate-900/90 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/30 px-4 lg:px-6 shadow-lg shadow-slate-900/5 dark:shadow-slate-900/20">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-10 w-10 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-all duration-200 hover:scale-105"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </Button>
        <div className="hidden lg:flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Selamat datang kembali
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {user?.username || user?.name || 'Admin'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-10 w-10 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-all duration-200 hover:scale-105 hover:rotate-12"
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-amber-500 transition-colors" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600 dark:text-slate-300 transition-colors" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-3 px-3 py-2 h-11 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-all duration-200 hover:scale-[1.02] border border-transparent hover:border-slate-200/50 dark:hover:border-slate-600/50"
            >
              <Avatar className="h-9 w-9 ring-2 ring-white/20 dark:ring-slate-600/50">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-xs text-white font-semibold shadow-inner">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                  {user?.username || user?.name || 'Admin'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
                  Administrator
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl shadow-slate-900/10 dark:shadow-slate-900/30 rounded-xl p-2"
          >
            <DropdownMenuLabel className="px-3 py-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-sm text-white font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {user?.username || user?.name || 'Admin'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Administrator
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-200/50 dark:bg-slate-700/50" />
            <DropdownMenuItem className="rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-colors">
              <User className="mr-3 h-4 w-4 text-slate-600 dark:text-slate-300" />
              <span>Profil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-200/50 dark:bg-slate-700/50" />
            <DropdownMenuItem
              className="rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 transition-colors"
              onClick={logout}
            >
              <LogOut className="mr-3 h-4 w-4" />
              <span>Keluar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
