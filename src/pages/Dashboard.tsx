import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, ArrowUpRight, ArrowDownRight, Activity, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { mutasiApi } from '@/services/api/mutasiApi';
import { dashboardApi } from '@/services/api/dashboardApi';
import { formatRupiah, formatDateTime } from '@/utils/format';
import type { MutasiKas } from '@/types';

const mutasiColumns: Column<MutasiKas>[] = [
  {
    key: 'noTransaksi',
    header: 'No. Transaksi',
    cell: (item) => (
      <span className="font-mono text-sm font-medium text-slate-700 dark:text-slate-300">{item.noTransaksi}</span>
    ),
  },
  {
    key: 'tanggal',
    header: 'Tanggal',
    cell: (item) => (
      <div className="flex flex-col">
        <span className="text-sm font-medium">{formatDateTime(item.createdAt).split(',')[0]}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(item.createdAt).split(',')[1]?.trim()}</span>
      </div>
    ),
  },
  {
    key: 'toko',
    header: 'Toko',
    cell: (item) => (
      <div className="flex flex-col">
        <span className="font-medium text-slate-900 dark:text-slate-100">{item.kodeToko}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{item.namaToko}</span>
      </div>
    ),
  },
  {
    key: 'metode',
    header: 'Metode',
    cell: (item) => (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        item.metode === 'CASH' 
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' 
          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      }`}>
        {item.metode}
      </span>
    ),
  },
  {
    key: 'jenis',
    header: 'Jenis',
    cell: (item) => {
      const jenis = item.jenis_kas ?? (item.nominalKirim && Number(item.nominalKirim) > 0 ? 'KIRIM' : (item.nominalTerima && Number(item.nominalTerima) > 0 ? 'TERIMA' : '-'));
      return (
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
          jenis === 'KIRIM' 
            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
            : jenis === 'TERIMA'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
        }`}>
          {jenis}
        </span>
      );
    },
  },
  {
    key: 'nominal',
    header: 'Nominal',
    cell: (item) => {
      let amount = item.nominalKirim ?? item.nominal_kirim ?? item.nominal ?? item.nominal_rp ?? item.nominalTerima ?? item.nominal_terima ?? null;
      // If explicit amount is zero or missing, try deriving from saldoAwal/saldoAkhir (useful for 'input saldo' entries)
      if ((amount === null || amount === 0) && (item.saldoAwal !== undefined && item.saldoAkhir !== undefined)) {
        const parsedAwal = Number(item.saldoAwal || 0);
        const parsedAkhir = Number(item.saldoAkhir || 0);
        const diff = parsedAkhir - parsedAwal;
        if (!isNaN(diff) && diff !== 0) amount = diff;
      }
      return amount === null ? <span className="text-muted-foreground">-</span> : <CurrencyDisplay amount={amount} />;
    },
    className: 'text-right font-medium',
  },
  {
    key: 'status',
    header: 'Status',
    cell: (item) => <StatusBadge status={item.status} />,
  },
];

export default function Dashboard() {
  // Fetch summary from backend
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.getSummary(),
  });
  const { data: mutasiData, isLoading: mutasiLoading } = useQuery({
    queryKey: ['recent-mutasi'],
    queryFn: () => mutasiApi.getMutasi(),
  });
  const recentMutasi = mutasiData || [];
  // Filters and pagination for recent transactions
  const [filterJenis, setFilterJenis] = useState<'ALL' | 'KIRIM' | 'TERIMA'>('ALL');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => setPage(1), [filterJenis, pageSize, mutasiData]);

  const todayStr = new Date().toDateString();
  const filteredMutasi = recentMutasi.filter((m: any) => {
    // Only include transactions from today (local timezone)
    const created = m.createdAt ? new Date(m.createdAt) : null;
    if (!created) return false;
    if (created.toDateString() !== todayStr) return false;

    // Then apply jenis filter
    if (filterJenis === 'ALL') return true;
    const jenis = m.jenis_kas ?? (m.nominalKirim && Number(m.nominalKirim) > 0 ? 'KIRIM' : (m.nominalTerima && Number(m.nominalTerima) > 0 ? 'TERIMA' : null));
    return jenis === filterJenis;
  });

  const pageCount = Math.max(1, Math.ceil(filteredMutasi.length / pageSize));
  const pagedMutasi = filteredMutasi.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-800 dark:via-blue-900 dark:to-indigo-900">
        <div className="absolute inset-0 bg-black/10 dark:bg-black/20"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>

        <div className="relative px-6 py-12 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Dashboard
              </h1>
              <p className="mt-4 text-xl text-blue-100 sm:text-2xl">
                Ringkasan aktivitas dan transaksi kas hari ini
              </p>
              <div className="mt-8 flex items-center justify-center gap-4 text-sm text-blue-200">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date().toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                <div className="h-4 w-px bg-blue-300/50"></div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span>Real-time Updates</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="h-12 w-full fill-white dark:fill-slate-800">
            <path d="M0,32L48,37.3C96,43,192,53,288,58.7C384,64,480,64,576,58.7C672,53,768,43,864,48C960,53,1056,75,1152,80C1248,85,1344,75,1392,69.3L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
          </svg>
        </div>
      </div>

      <div className="relative -mt-1 px-6 py-8 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Quick Stats Overview */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 border border-slate-200 dark:border-slate-700">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Saldo Hari Ini</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {summaryLoading ? (
                      <div className="h-8 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
                    ) : (
                      formatRupiah(summary?.saldoHariIni || 0)
                    )}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100"></div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 border border-slate-200 dark:border-slate-700">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Kirim Kas</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {summaryLoading ? (
                      <div className="h-8 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
                    ) : (
                      formatRupiah(summary?.totalKirimKas || 0)
                    )}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Hari ini</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/25">
                  <ArrowUpRight className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-pink-500 transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100"></div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 border border-slate-200 dark:border-slate-700">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Terima Kas</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {summaryLoading ? (
                      <div className="h-8 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
                    ) : (
                      formatRupiah(summary?.totalTerimaKas || 0)
                    )}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Hari ini</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/25">
                  <ArrowDownRight className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500 transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100"></div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 border border-slate-200 dark:border-slate-700">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-violet-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Jumlah Transaksi</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {summaryLoading ? (
                      <div className="h-8 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
                    ) : (
                      summary?.jumlahTransaksiHariIni || 0
                    )}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Hari ini</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/25">
                  <Activity className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-violet-500 transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100"></div>
            </div>
          </div>

      {/* Recent Transactions */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Transaksi Terbaru</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Aktivitas transaksi kas hari ini</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tampilkan:</label>
              <select 
                value={pageSize} 
                onChange={(e) => setPageSize(Number(e.target.value))} 
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Filter:</label>
              <select 
                value={filterJenis} 
                onChange={(e) => setFilterJenis(e.target.value as any)} 
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="ALL">Semua</option>
                <option value="KIRIM">Kirim</option>
                <option value="TERIMA">Terima</option>
              </select>
            </div>

            <a 
              href="/laporan/mutasi-kas" 
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Lihat Semua
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
        <DataTable
          columns={mutasiColumns}
          data={pagedMutasi}
          isLoading={mutasiLoading}
          keyExtractor={(item) => item.id}
          emptyMessage="Belum ada transaksi hari ini"
          className="shadow-sm bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50"
          onRowClick={(item) => {
            // Optional: bisa ditambahkan navigasi ke detail transaksi
            console.log('Row clicked:', item);
          }}
        />

        {/* Pagination controls */}
        {filteredMutasi.length > pageSize && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Menampilkan {Math.min((page - 1) * pageSize + 1, filteredMutasi.length)} - {Math.min(page * pageSize, filteredMutasi.length)} dari {filteredMutasi.length} transaksi
            </div>
            <div className="flex items-center gap-2">
              <button 
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={page === 1} 
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ArrowUpRight className="h-4 w-4 rotate-[-135deg]" />
                Sebelumnya
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(pageCount - 4, page - 2)) + i;
                  if (pageNum > pageCount) return null;
                  return (
                    <button
                      key={pageNum}
                      className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        pageNum === page
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button 
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={page === pageCount} 
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              >
                Selanjutnya
                <ArrowUpRight className="h-4 w-4 rotate-45" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
    </div>
  );
}
