import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Wallet,
  FileText,
  ChevronDown,
  CreditCard,
  Receipt,
  TrendingUp,
  Settings,
  Store,
  Banknote,
  ArrowUpRight,
  ArrowDownLeft,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  children?: { title: string; href: string }[];
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Master Data',
    icon: Settings,
    children: [
      { title: 'Master Bank', href: '/master/bank' },
      { title: 'Master Rekening', href: '/master/rekening' },
      { title: 'API Tokens', href: '/master/api-tokens' },
      { title: 'Master Toko', href: '/master/toko' },
    ],
  },
  {
    title: 'Input Saldo',
    icon: Banknote,
    children: [
      { title: 'Saldo Cash', href: '/input-saldo/cash' },
      { title: 'Saldo Rekening', href: '/input-saldo/rekening' },
    ],
  },
  {
    title: 'Transaksi Kas',
    icon: CreditCard,
    children: [
      { title: 'Kirim Kas', href: '/transaksi/kirim' },
      { title: 'Terima Kas', href: '/transaksi/terima' },
      { title: 'Batal Kirim Kas', href: '/transaksi/batal-kirim' },
    ],
  },
  {
    title: 'Permintaan Transfer',
    href: '/permintaan-transfer',
    icon: Receipt,
  },
  {
    title: 'Laporan',
    icon: TrendingUp,
    children: [
      { title: 'Laporan Mutasi Kas', href: '/laporan/mutasi-kas' },
      { title: 'Laporan Kiriman & Setoran', href: '/laporan/kiriman-setoran' },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const isActive = (href: string) => location.pathname === href;
  const isParentActive = (children?: { href: string }[]) =>
    children?.some((child) => location.pathname === child.href);

  /** auto expand based on route */
  useEffect(() => {
    navigation.forEach((item) => {
      if (item.children && isParentActive(item.children)) {
        setExpandedItems((prev) =>
          prev.includes(item.title) ? prev : [...prev, item.title]
        );
      }
    });
  }, [location.pathname]);

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-md lg:hidden animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-72 bg-gradient-to-b from-white/95 via-white/90 to-slate-50/95 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-2xl border-r border-slate-200/50 dark:border-slate-700/50 transition-all duration-500 ease-in-out lg:translate-x-0 shadow-2xl shadow-slate-900/10 dark:shadow-slate-900/50',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-slate-800/80 dark:to-slate-700/80">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 shadow-xl shadow-blue-500/25 dark:shadow-blue-500/40">
              <Wallet className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
                Mutasi Kas
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                Sistem Pusat
              </div>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-4">
            {/* Main Navigation */}
            <div className="space-y-1">
              <div className="px-2 mb-2">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Navigasi Utama
                </h3>
              </div>
              <ul className="space-y-1">
                {navigation.slice(0, 1).map((item) => (
                  <li key={item.title}>
                    <NavLink
                      to={item.href!}
                      onClick={onClose}
                      className={cn(
                        'group relative flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 ease-out hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-sm hover:shadow-slate-900/5 dark:hover:shadow-slate-900/10 hover:bg-slate-100/80 dark:hover:bg-slate-700/80',
                        isActive(item.href!)
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 dark:shadow-blue-500/40'
                          : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white'
                      )}
                    >
                      <div className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3',
                        isActive(item.href!)
                          ? 'bg-white/20'
                          : 'bg-slate-100 dark:bg-slate-700 group-hover:bg-blue-500/20 group-hover:shadow-md group-hover:shadow-blue-500/15'
                      )}>
                        <item.icon className={cn(
                          'h-3.5 w-3.5 transition-all duration-300',
                          isActive(item.href!)
                            ? 'text-white'
                            : 'text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:scale-110'
                        )} />
                      </div>
                      <span className="font-medium">{item.title}</span>
                      {isActive(item.href!) && (
                        <div className="ml-auto h-2 w-2 rounded-full bg-white animate-pulse" />
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Management Section */}
            <div className="space-y-1">
              <div className="px-2 mb-2">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Manajemen Data
                </h3>
              </div>
              <ul className="space-y-0.5">
                {navigation.slice(1, 3).map((item) => (
                  <li key={item.title}>
                    {item.href ? (
                      <NavLink
                        to={item.href}
                        onClick={onClose}
                        className={cn(
                          'group flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[1.01] hover:shadow-sm',
                          isActive(item.href)
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 dark:shadow-blue-500/40'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-white'
                        )}
                      >
                        <div className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                          isActive(item.href)
                            ? 'bg-white/20'
                            : 'bg-slate-100 dark:bg-slate-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50'
                        )}>
                          <item.icon className={cn(
                            'h-3.5 w-3.5 transition-colors',
                            isActive(item.href)
                              ? 'text-white'
                              : 'text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                          )} />
                        </div>
                        <span className="font-medium">{item.title}</span>
                        {isActive(item.href) && (
                          <div className="ml-auto h-2 w-2 rounded-full bg-white animate-pulse" />
                        )}
                      </NavLink>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleExpanded(item.title)}
                          className={cn(
                            'group relative flex w-full items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 ease-out hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-sm hover:shadow-slate-900/5 dark:hover:shadow-slate-900/10 hover:bg-slate-100/80 dark:hover:bg-slate-700/80',
                            isParentActive(item.children)
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 dark:shadow-blue-500/40'
                              : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3',
                              isParentActive(item.children)
                                ? 'bg-white/20'
                                : 'bg-slate-100 dark:bg-slate-700 group-hover:bg-blue-500/20 group-hover:shadow-md group-hover:shadow-blue-500/15'
                            )}>
                              <item.icon className={cn(
                                'h-3.5 w-3.5 transition-all duration-300',
                                isParentActive(item.children)
                                  ? 'text-white'
                                  : 'text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:scale-110'
                              )} />
                            </div>
                            <span className="font-medium">{item.title}</span>
                          </div>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 transition-transform duration-200',
                              expandedItems.includes(item.title) ? 'rotate-180 text-white' : 'text-slate-400 dark:text-slate-500'
                            )}
                          />
                        </button>

                        {expandedItems.includes(item.title) && item.children && (
                          <ul className="mt-1 space-y-0.5 ml-8">
                            {item.children.map((child) => (
                              <li key={child.href}>
                                <NavLink
                                  to={child.href}
                                  onClick={onClose}
                                  className={cn(
                                    'group flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200 hover:scale-[1.01]',
                                    isActive(child.href)
                                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold border-l-2 border-blue-500'
                                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200'
                                  )}
                                >
                                  <div className={cn(
                                    'h-1 w-1 rounded-full transition-colors',
                                    isActive(child.href)
                                      ? 'bg-blue-500'
                                      : 'bg-slate-400 dark:bg-slate-500 group-hover:bg-blue-400'
                                  )} />
                                  <span>{child.title}</span>
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Transaction Section */}
            <div className="space-y-1">
              <div className="px-2 mb-2">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Transaksi & Laporan
                </h3>
              </div>
              <ul className="space-y-0.5">
                {navigation.slice(3).map((item) => (
                  <li key={item.title}>
                    {item.href ? (
                      <NavLink
                        to={item.href}
                        onClick={onClose}
                        className={cn(
                          'group relative flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 ease-out hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-sm hover:shadow-slate-900/5 dark:hover:shadow-slate-900/10 hover:bg-slate-100/80 dark:hover:bg-slate-700/80',
                          isActive(item.href)
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 dark:shadow-blue-500/40'
                            : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white'
                        )}
                      >
                        <div className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3',
                          isActive(item.href)
                            ? 'bg-white/20'
                            : 'bg-slate-100 dark:bg-slate-700 group-hover:bg-blue-500/20 group-hover:shadow-md group-hover:shadow-blue-500/15'
                        )}>
                          <item.icon className={cn(
                            'h-3.5 w-3.5 transition-all duration-300',
                            isActive(item.href)
                              ? 'text-white'
                              : 'text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:scale-110'
                          )} />
                        </div>
                        <span className="font-medium">{item.title}</span>
                        {isActive(item.href) && (
                          <div className="ml-auto h-2 w-2 rounded-full bg-white animate-pulse" />
                        )}
                      </NavLink>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleExpanded(item.title)}
                          className={cn(
                            'group relative flex w-full items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 ease-out hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-sm hover:shadow-slate-900/5 dark:hover:shadow-slate-900/10 hover:bg-slate-100/80 dark:hover:bg-slate-700/80',
                            isParentActive(item.children)
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 dark:shadow-blue-500/40'
                              : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3',
                              isParentActive(item.children)
                                ? 'bg-white/20'
                                : 'bg-slate-100 dark:bg-slate-700 group-hover:bg-blue-500/20 group-hover:shadow-md group-hover:shadow-blue-500/15'
                            )}>
                              <item.icon className={cn(
                                'h-3.5 w-3.5 transition-all duration-300',
                                isParentActive(item.children)
                                  ? 'text-white'
                                  : 'text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:scale-110'
                              )} />
                            </div>
                            <span className="font-medium">{item.title}</span>
                          </div>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 transition-transform duration-200',
                              expandedItems.includes(item.title) ? 'rotate-180 text-white' : 'text-slate-400 dark:text-slate-500'
                            )}
                          />
                        </button>

                        {expandedItems.includes(item.title) && item.children && (
                          <ul className="mt-1 space-y-0.5 ml-8">
                            {item.children.map((child) => (
                              <li key={child.href}>
                                <NavLink
                                  to={child.href}
                                  onClick={onClose}
                                  className={cn(
                                    'group flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-300 ease-out hover:scale-[1.03] hover:translate-x-1 hover:shadow-sm hover:bg-slate-100/80 dark:hover:bg-slate-700/80',
                                    isActive(child.href)
                                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold border-l-2 border-blue-500 shadow-sm'
                                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                  )}
                                >
                                  <div className={cn(
                                    'h-1 w-1 rounded-full transition-all duration-300 group-hover:scale-125',
                                    isActive(child.href)
                                      ? 'bg-blue-500'
                                      : 'bg-slate-400 dark:bg-slate-500 group-hover:bg-blue-400/60 group-hover:shadow-sm group-hover:shadow-blue-500/30'
                                  )} />
                                  <span>{child.title}</span>
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}
