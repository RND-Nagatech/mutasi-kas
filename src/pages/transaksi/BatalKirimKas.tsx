import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, XCircle, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StatusBadge } from '@/components/ui/status-badge';
import { CurrencyDisplay } from '@/components/ui/currency-display';
// TODO: Replace toko with backend API if available
import { mutasiApi } from '@/services/api/mutasiApi';
import { masterTokoApi } from '@/services/api/masterTokoApi';
import { formatDate, formatDateTime, formatDateForApi } from '@/utils/format';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { MutasiKas } from '@/types';

export default function BatalKirimKas() {
  const today = new Date();
  const [pendingFilters, setPendingFilters] = useState({
    tanggal: formatDateForApi(today),
    kodeToko: '',
    noTransaksi: '',
  });
  const [activeFilters, setActiveFilters] = useState<null | {
    tanggal?: string;
    kodeToko?: string;
    noTransaksi?: string;
  }>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [dateOpen, setDateOpen] = useState<boolean>(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [selectedMutasi, setSelectedMutasi] = useState<MutasiKas | null>(null);
  const [alasan, setAlasan] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tokoData } = useQuery({
    queryKey: ['toko'],
    queryFn: () => masterTokoApi.getAll(),
  });

  const { data: mutasiData, isLoading, refetch } = useQuery({
    queryKey: ['cancelable-mutasi', activeFilters],
    enabled: !!activeFilters,
    queryFn: async () => {
      const params = activeFilters || {};

      // If user provided noTransaksi, prioritize searching by transaction number
      // and do not include date filters in the request.
      const requestParams: any = {};
      if (params.kodeToko) requestParams.kodeToko = params.kodeToko;

      if (params.noTransaksi) {
        const res = await mutasiApi.getMutasi(requestParams);
        const list = Array.isArray(res) ? res : (res?.data || []);
        const filtered = list.filter((m: any) => {
          const jenis = (m.jenisKas || m.jenis_kas || m.jenis || '').toString().toUpperCase();
          const status = (m.status || m.status_validasi || m.statusValidasi || '').toString().toUpperCase();
          return jenis === 'KIRIM' && (status === 'OPEN' || status === '' || status === 'PENDING');
        });
        // match transaction number (contains) to be forgiving
        return filtered.filter((m: any) => (m.noTransaksi || m.no_transaksi || '').toString().includes(params.noTransaksi!));
      }

      // Otherwise, search by tanggal (startDate=endDate)
      const res = await mutasiApi.getMutasi({
        startDate: params.tanggal || undefined,
        endDate: params.tanggal || undefined,
        kodeToko: params.kodeToko || undefined,
      });
      const list = Array.isArray(res) ? res : (res?.data || []);
      return list.filter((m: any) => {
        const jenis = (m.jenisKas || m.jenis_kas || m.jenis || '').toString().toUpperCase();
        const status = (m.status || m.status_validasi || m.statusValidasi || '').toString().toUpperCase();
        return jenis === 'KIRIM' && (status === 'OPEN' || status === '' || status === 'PENDING');
      });
    },
  });

  const batalMutation = useMutation({
    mutationFn: (data: any) => mutasiApi.cancelMutasi(data.id, data.alasan),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['cancelable-mutasi'] });
      queryClient.invalidateQueries({ queryKey: ['recent-mutasi'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      // Also invalidate report queries so report pages refresh automatically
      queryClient.invalidateQueries({ queryKey: ['laporan-mutasi'] });
      queryClient.invalidateQueries({ queryKey: ['laporan-kiriman-setoran'] });
      toast({ title: 'Berhasil', description: response.message || 'Mutasi berhasil dibatalkan' });
      setIsCancelOpen(false);
      setSelectedMutasi(null);
      setAlasan('');
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: (error as Error).message, variant: 'destructive' });
    },
  });

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setPendingFilters(prev => ({
      ...prev,
      tanggal: date ? formatDateForApi(date) : '',
    }));
    setDateOpen(false);
  };

  const handleCancel = (mutasi: MutasiKas) => {
    setSelectedMutasi(mutasi);
    setIsCancelOpen(true);
  };

  const confirmCancel = () => {
    if (selectedMutasi && alasan.trim()) {
      batalMutation.mutate({ id: selectedMutasi.id, alasan });
    }
  };

  const clearFilters = () => {
    setPendingFilters({ tanggal: formatDateForApi(today), kodeToko: '', noTransaksi: '' });
    setSelectedDate(today);
    setActiveFilters(null);
  };

  const handleSearch = () => {
    setActiveFilters({ ...pendingFilters });
  };

  const columns: Column<MutasiKas>[] = [
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
        <span>{item.metode}</span>
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
      cell: (item) => <span>{item.status}</span>,
    },
    {
      key: 'actions',
      header: '',
      cell: (item) => (
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => handleCancel(item)}
        >
          <XCircle className="mr-1 h-4 w-4" />
          Batalkan
        </Button>
      ),
      className: 'w-32',
    },
  ];

  const mutasiList = !activeFilters ? [] : (Array.isArray(mutasiData) ? mutasiData : (mutasiData?.data || []));
  const tokoList = Array.isArray(tokoData) ? tokoData : (tokoData?.data || []);
  const hasFilters = pendingFilters.tanggal || pendingFilters.kodeToko || pendingFilters.noTransaksi;

  // Pagination (client-side)
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const pageSizes = [10, 50, 100];
  const pageCount = Math.max(1, Math.ceil(mutasiList.length / pageSize));
  const pagedMutasi = mutasiList.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when data or pageSize changes
  useEffect(() => setPage(1), [mutasiList, pageSize]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Batal Kirim Kas</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Batalkan transaksi kirim kas yang masih berstatus OPEN</p>
        </div>
      </div>

      <div className=" rounded-lg shadow-sm">
        <div className="grid gap-6 lg:grid-cols-3">
        {/* Filter Form */}
        <Card className="lg:col-span-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
          <CardHeader className="space-y-3">
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">Filter Transaksi</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Pilih kriteria pencarian untuk menemukan transaksi yang akan dibatalkan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !selectedDate && 'text-muted-foreground'
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? formatDate(selectedDate) : 'Pilih tanggal'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Kode Toko</Label>
                <Select
                  value={pendingFilters.kodeToko || 'ALL'}
                  onValueChange={(value) => setPendingFilters(prev => ({ ...prev, kodeToko: value === 'ALL' ? '' : value }))}
                >
                  <SelectTrigger className="w-full justify-between text-left font-normal">
                    <SelectValue placeholder="Semua Toko" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover max-h-48 overflow-auto">
                    <SelectItem value="ALL">Semua Toko</SelectItem>
                    {tokoList.map((t: any) => (
                      <SelectItem key={t.id || t.kode_toko || t.kodeToko} value={t.kodeToko || t.kode_toko}>
                        {(t.kodeToko || t.kode_toko) || '-'} - {(t.namaToko || t.nama_toko || t.kodeToko || t.kode_toko) || '-'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>No. Transaksi</Label>
                <Input
                  placeholder="Cari no. transaksi"
                  value={pendingFilters.noTransaksi}
                  onChange={(e) => setPendingFilters(prev => ({ ...prev, noTransaksi: e.target.value }))}
                />
              </div>

              <div className="flex items-end gap-2">
                <Button onClick={handleSearch} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200">
                  <Search className="mr-2 h-4 w-4" />
                  Cari
                </Button>
                {hasFilters && (
                  <Button variant="outline" onClick={clearFilters} className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{mutasiList.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Transaksi Ditemukan</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                <CurrencyDisplay amount={mutasiList.reduce((sum, item) => sum + (item.nominalKirim || 0), 0)} />
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Nominal</div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Data Table */}
      <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">Daftar Transaksi Kiriman</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Transaksi yang dapat dibatalkan (status OPEN/PENDING)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={pagedMutasi}
            isLoading={isLoading}
            keyExtractor={(item) => item.id}
            emptyMessage={!activeFilters ? 'Klik Cari untuk menampilkan data' : 'Tidak ada transaksi yang dapat dibatalkan'}
          />
        </CardContent>
      </Card>

      {/* Pagination controls */}
      {mutasiList.length > 0 && (
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Tampilkan:</Label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border rounded-md px-3 py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                >
                  {pageSizes.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <span className="text-sm text-slate-600 dark:text-slate-400">per halaman</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2 px-3 py-2 bg-white/50 dark:bg-slate-800/50 rounded-md">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{page}</span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">dari {pageCount}</span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount}
                  className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50"
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="bg-white dark:bg-slate-800 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl sm:max-w-md">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Batalkan Transaksi
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Anda akan membatalkan transaksi{' '}
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                {selectedMutasi?.noTransaksi}
              </span>
            </DialogDescription>
          </DialogHeader>

          {selectedMutasi && (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-4 space-y-3 border border-slate-200 dark:border-slate-600">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Toko</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{selectedMutasi.namaToko}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Nominal</span>
                <CurrencyDisplay amount={selectedMutasi.nominalKirim} className="font-semibold text-slate-900 dark:text-slate-100" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Metode</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{selectedMutasi.metode}</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label htmlFor="alasan" className="text-sm font-medium text-slate-900 dark:text-slate-100 uppercase tracking-wide">Alasan Pembatalan</Label>
            <Textarea
              id="alasan"
              placeholder="Masukkan alasan pembatalan..."
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              rows={3}
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-red-500"
            />
          </div>

          <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-700 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelOpen(false);
                setAlasan('');
              }}
              className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-200"
            >
              Tutup
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={!alasan.trim() || batalMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
            >
              {batalMutation.isPending ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Membatalkan...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Batalkan Transaksi
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
