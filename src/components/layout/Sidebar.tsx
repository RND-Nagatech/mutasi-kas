import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Wallet,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { mt } from 'date-fns/locale';

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
    icon: Building2,
    children: [
      { title: 'Master Bank', href: '/master/bank' },
      { title: 'Master Rekening', href: '/master/rekening' },
    ],
  },
  // Menu baru Master Toko
  {
    title: 'Master Toko',
    href: '/master/toko',
    icon: Building2,
  },
  {
    title: 'Input Saldo',
    icon: Wallet,
    children: [
      { title: 'Saldo Cash', href: '/input-saldo/cash' },
      { title: 'Saldo Rekening', href: '/input-saldo/rekening' },
    ],
  },
  {
    title: 'Transaksi Kas',
    icon: Wallet,
    children: [
      { title: 'Kirim Kas', href: '/transaksi/kirim' },
      { title: 'Batal Kirim Kas', href: '/transaksi/batal-kirim' },
      { title: 'Terima Kas', href: '/transaksi/terima' },
    ],
  },
  {
    title: 'Laporan',
    icon: FileText,
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
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 bg-[#295c6a] transition-transform duration-300 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center border-b border-[#a8aaae] pl-4 pr-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 shadow-md">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-sm lg:text-base font-bold text-white tracking-wide">
                Mutasi Kas
              </div>
              <div className="text-xs lg:text-sm text-[#b6d4e3]">Pusat</div>
            </div>
          </div>
          {/* mobile close moved to bottom for easier access */}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.title}>
                {/* Single menu */}
                {item.href ? (
                  <NavLink
                    to={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 text-sm lg:text-base transition-all rounded-md',
                      isActive(item.href)
                        ? 'bg-white/95 text-[#295c6a] font-semibold'
                        : 'text-white hover:bg-white/10'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.title}
                  </NavLink>
                ) : (
                  <>
                    {/* Parent menu */}
                    <button
                      onClick={() => toggleExpanded(item.title)}
                      className={cn(
                        'flex w-full items-center justify-between px-4 py-2.5 text-sm lg:text-base rounded-md transition-colors',
                        isParentActive(item.children)
                          ? 'text-white font-semibold'
                          : 'text-white hover:bg-white/10'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        {item.title}
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform opacity-80',
                          expandedItems.includes(item.title) && 'rotate-180'
                        )}
                      />
                    </button>

                    {/* Submenu */}
                    {expandedItems.includes(item.title) && item.children && (
                      <ul className="mt-1 space-y-1 pl-6 lg:pl-9">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <NavLink
                              to={child.href}
                              onClick={onClose}
                              className={cn(
                                'relative block px-3 py-1.5 text-sm lg:text-base rounded-md transition-all',
                                isActive(child.href)
                                  ? 'bg-white/90 text-[#295c6a] font-medium'
                                  : 'text-[#b6d4e3] hover:bg-white/10 hover:text-white'
                              )}
                            >
                              {isActive(child.href) && (
                                <span className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r bg-[#295c6a]" />
                              )}
                              {child.title}
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
        </nav>
      </aside>
      {/* Mobile bottom close button */}
      <div className="lg:hidden">
        <div className="fixed left-48 bottom-10 z-50">
          <button onClick={onClose} aria-label="Tutup menu" className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 shadow-lg ring-1 ring-white/10">
            &lt;
          </button>
        </div>
      </div>
    </>
  );
}
