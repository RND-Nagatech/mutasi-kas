import { useQuery } from '@tanstack/react-query';
import { Wallet, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
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
      <span className="font-mono text-sm">{item.noTransaksi}</span>
    ),
  },
  {
    key: 'tanggal',
    header: 'Tanggal',
    cell: (item) => formatDateTime(item.createdAt),
  },
  {
    key: 'toko',
    header: 'Toko',
    cell: (item) => (
      <div>
        <p className="font-medium">{item.kodeToko}</p>
        <p className="text-xs text-muted-foreground">{item.namaToko}</p>
      </div>
    ),
  },
  {
    key: 'metode',
    header: 'Metode',
    cell: (item) => (
      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
        item.metode === 'CASH' 
          ? 'bg-warning/10 text-warning' 
          : 'bg-info/10 text-info'
      }`}>
        {item.metode}
      </span>
    ),
  },
  {
    key: 'nominal',
    header: 'Nominal',
    cell: (item) => <CurrencyDisplay amount={item.nominalKirim} />,
    className: 'text-right',
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

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Ringkasan aktivitas dan transaksi kas hari ini"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Saldo Hari Ini"
          value={formatRupiah(summary?.saldoHariIni || 0)}
          icon={Wallet}
          isLoading={summaryLoading}
          iconClassName="bg-primary/10"
        />
        <StatCard
          title="Total Kirim Kas"
          value={formatRupiah(summary?.totalKirimKas || 0)}
          icon={ArrowUpRight}
          description="Hari ini"
          isLoading={summaryLoading}
          iconClassName="bg-destructive/10"
        />
        <StatCard
          title="Total Terima Kas"
          value={formatRupiah(summary?.totalTerimaKas || 0)}
          icon={ArrowDownRight}
          description="Hari ini"
          isLoading={summaryLoading}
          iconClassName="bg-success/10"
        />
        <StatCard
          title="Jumlah Transaksi"
          value={summary?.jumlahTransaksiHariIni || 0}
          icon={Activity}
          description="Hari ini"
          isLoading={summaryLoading}
          iconClassName="bg-info/10"
        />
      </div>

      {/* Recent Transactions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Transaksi Terbaru</h2>
          <a 
            href="/laporan/mutasi-kas" 
            className="text-sm text-primary hover:underline"
          >
            Lihat Semua
          </a>
        </div>
        <DataTable
          columns={mutasiColumns}
          data={recentMutasi}
          isLoading={mutasiLoading}
          keyExtractor={(item) => item.id}
          emptyMessage="Belum ada transaksi hari ini"
        />
      </div>
    </div>
  );
}
