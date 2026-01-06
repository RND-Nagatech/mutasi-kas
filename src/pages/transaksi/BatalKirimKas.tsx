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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Batal Kirim Kas"
        description="Batalkan transaksi kirim kas yang masih berstatus OPEN"
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter Transaksi</CardTitle>
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
              <Button onClick={handleSearch} className="flex-1">
                <Search className="mr-2 h-4 w-4" />
                Cari
              </Button>
              {hasFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={pagedMutasi}
        isLoading={isLoading}
        keyExtractor={(item) => item.id}
        emptyMessage={!activeFilters ? 'Klik Cari untuk menampilkan data' : 'Tidak ada transaksi yang dapat dibatalkan'}
      />

      {/* Pagination controls */}
      {mutasiList.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border rounded px-3 py-2 bg-white"
            >
              {pageSizes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 border rounded-md disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >Previous</button>
            <div className="inline-flex items-center gap-2">
              <span className="px-3 py-2 border rounded-md bg-white">{page}</span>
              <span className="text-sm text-muted-foreground">of {pageCount}</span>
            </div>
            <button
              className="px-3 py-2 border rounded-md disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
            >Next</button>
          </div>
        </div>
      )}

      {/* Cancel Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Batalkan Transaksi</DialogTitle>
            <DialogDescription>
              Anda akan membatalkan transaksi{' '}
              <span className="font-mono font-medium">{selectedMutasi?.noTransaksi}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedMutasi && (
            <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Toko</span>
                <span className="font-medium">{selectedMutasi.namaToko}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nominal</span>
                <CurrencyDisplay amount={selectedMutasi.nominalKirim} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Metode</span>
                <span>{selectedMutasi.metode}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="alasan">Alasan Pembatalan</Label>
            <Textarea
              id="alasan"
              placeholder="Masukkan alasan pembatalan..."
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCancelOpen(false);
                setAlasan('');
              }}
            >
              Tutup
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={!alasan.trim() || batalMutation.isPending}
            >
              {batalMutation.isPending ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Membatalkan...
                </>
              ) : (
                'Batalkan Transaksi'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
