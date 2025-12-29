import { useState, useEffect } from 'react';
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
    key: 'jenis',
    header: 'Jenis',
    cell: (item) => {
      const jenis = item.jenis_kas ?? (item.nominalKirim && Number(item.nominalKirim) > 0 ? 'KIRIM' : (item.nominalTerima && Number(item.nominalTerima) > 0 ? 'TERIMA' : '-'));
      return <span className="text-sm">{jenis}</span>;
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
          <div className="flex items-center gap-3">
            <label className="text-sm">Tampilkan</label>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded border px-2 py-1 text-sm">
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <select value={filterJenis} onChange={(e) => setFilterJenis(e.target.value as any)} className="rounded border px-2 py-1 text-sm">
              <option value="ALL">All</option>
              <option value="KIRIM">Kirim</option>
              <option value="TERIMA">Terima</option>
            </select>

            <a href="/laporan/mutasi-kas" className="text-sm text-primary hover:underline">Lihat Semua</a>
          </div>
        </div>
        <DataTable
          columns={mutasiColumns}
          data={pagedMutasi}
          isLoading={mutasiLoading}
          keyExtractor={(item) => item.id}
          emptyMessage="Belum ada transaksi hari ini"
        />

        {/* Pagination controls */}
        {filteredMutasi.length > pageSize && (
          <div className="mt-3 flex items-center justify-end gap-2">
            <button className="rounded border px-3 py-1 text-sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
            <span className="text-sm">Halaman {page} dari {pageCount}</span>
            <button className="rounded border px-3 py-1 text-sm" disabled={page === pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
