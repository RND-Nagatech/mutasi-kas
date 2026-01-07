import { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { masterTokoApi } from '@/services/api/masterTokoApi';
import { mutasiApi } from '@/services/api/mutasiApi';
import { mutasiKasApi } from '@/services/api/mutasiKasApi';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate, formatDateTime, formatDateForApi } from '@/utils/format';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { MutasiKas } from '@/types';

export default function TerimaKas() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [dateOpen, setDateOpen] = useState(false);
  const [pendingToko, setPendingToko] = useState<string | undefined>(undefined);
  const [showResults, setShowResults] = useState(false);
  const [searchParams, setSearchParams] = useState<null | { startDate: string; endDate: string; kodeToko?: string }>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tokoData } = useQuery({ queryKey: ['toko'], queryFn: () => masterTokoApi.getAll() });
  const tokoList = Array.isArray(tokoData) ? tokoData : (tokoData?.data || []);

  const { user } = useAuth();

  const { data: mutasiData, isLoading, refetch } = useQuery({
    queryKey: ['terima-mutasi', searchParams, user?.username],
    enabled: !!searchParams,
    queryFn: async () => {
      if (!searchParams) return [];
      const res = await mutasiApi.getMutasi({ startDate: searchParams.startDate, endDate: searchParams.endDate, kodeToko: searchParams.kodeToko });
      const list = Array.isArray(res) ? res : (res?.data || []);
      // only show KIRIM transactions that are still open/pending
      return list.filter((m: any) => {
        const jenis = (m.jenisKas || m.jenis_kas || m.jenis || '').toString().toUpperCase();
        const status = (m.status || m.status_validasi || m.statusValidasi || '').toString().toUpperCase();
        // Exclude transactions created by the current user (these are KirimKas created from this UI)
        const createdBy = (m.createdBy || m.created_by || '').toString();
        const isFromOther = user ? createdBy !== user.username : true;
        return jenis === 'KIRIM' && (status === 'OPEN' || status === '' || status === 'PENDING') && isFromOther;
      });
    },
  });

  const mutasiList = Array.isArray(mutasiData) ? mutasiData : (mutasiData?.data || []);

  // selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAllOnPage = (rows: any[]) => {
    const all = new Set(selectedIds);
    const allSelected = rows.every(r => all.has(r.id));
    if (allSelected) {
      rows.forEach(r => all.delete(r.id));
    } else {
      rows.forEach(r => all.add(r.id));
    }
    setSelectedIds(all);
  };

  const [detailMutasi, setDetailMutasi] = useState<MutasiKas | null>(null);

  const createMutasiMutation = useMutation({
    mutationFn: (payload: any) => mutasiApi.createMutasi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terima-mutasi'] });
      queryClient.invalidateQueries({ queryKey: ['laporan-mutasi'] });
      queryClient.invalidateQueries({ queryKey: ['laporan-kiriman-setoran'] });
      queryClient.invalidateQueries({ queryKey: ['recent-mutasi'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast({ title: 'Berhasil', description: 'Transaksi diterima dan disimpan' });
      setSelectedIds(new Set());
      refetch();
    },
    onError: (err: any) => {
      toast({ title: 'Gagal', description: err?.message || 'Gagal menyimpan transaksi', variant: 'destructive' });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (data: any) => mutasiApi.cancelMutasi(data.id, data.alasan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terima-mutasi'] });
      queryClient.invalidateQueries({ queryKey: ['laporan-mutasi'] });
      queryClient.invalidateQueries({ queryKey: ['laporan-kiriman-setoran'] });
      queryClient.invalidateQueries({ queryKey: ['recent-mutasi'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast({ title: 'Berhasil', description: 'Transaksi dibatalkan' });
      setSelectedIds(new Set());
      refetch();
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err?.message || 'Gagal membatalkan', variant: 'destructive' }),
  });

  const handleSearch = () => {
    const sd = new Date(selectedDate);
    sd.setHours(0,0,0,0);
    const ed = new Date(selectedDate);
    ed.setHours(23,59,59,999);
    setSearchParams({ startDate: sd.toISOString(), endDate: ed.toISOString(), kodeToko: pendingToko });
    setShowResults(true);
  };

  const handleTerima = async () => {
    if (selectedIds.size === 0) {
      toast({ title: 'Validasi', description: 'Pilih transaksi yang akan diterima', variant: 'destructive' });
      return;
    }
    // create TERIMA mutasi for each selected
    const items = mutasiList.filter((m:any) => selectedIds.has(m.id));
    for (const it of items) {
      const kodeToko = it.kodeToko || it.kode_toko;
      const metode = it.metode || 'CASH';
      const noRek = (it as any).noRekening || (it as any).no_rekening || '-';
      const nominal = Number((it as any).nominal_rp ?? (it as any).nominalRp ?? it.nominalKirim ?? (it as any).nominal ?? 0) || 0;

      // fetch last saldo akhir for this toko/metode/noRek to compute saldo_awal and saldo_akhir
      let saldoAwal = 0;
      try {
        const last = await mutasiKasApi.getLastSaldoAkhir({ kodeToko, metode, noRekening: noRek });
        if (last && typeof last.saldoAkhir !== 'undefined') saldoAwal = Number(last.saldoAkhir) || 0;
        else if (last && typeof last.saldoAkhir === 'undefined' && typeof last.saldoAkhir === 'number') saldoAwal = Number(last.saldoAkhir) || 0;
      } catch (err) {
        // fallback to zero if API fails
        saldoAwal = 0;
      }

      const payload: any = {
        kode_toko: kodeToko,
        metode,
        no_rekening: noRek,
        nominal_rp: nominal,
        gramasi: (it as any).gramasi ?? (it as any).gram ?? 0,
        keterangan: `Terima dari ${it.noTransaksi || it.no_transaksi || '-'}`,
        saldo_awal: saldoAwal,
        saldo_akhir: saldoAwal + nominal,
        kode_bank: it.kode_bank || '-',
        tanggal: new Date().toISOString(),
        jam: new Date().toLocaleTimeString('id-ID', { hour12: false }),
        jenisKas: 'TERIMA',
      };

      // await sequentially to simplify error handling
      await createMutasiMutation.mutateAsync(payload);
    }
  };

  const handleReject = async () => {
    if (selectedIds.size === 0) {
      toast({ title: 'Validasi', description: 'Pilih transaksi yang akan direject', variant: 'destructive' });
      return;
    }
    const alasan = window.prompt('Masukkan alasan reject (opsional)') || '';
    const items = mutasiList.filter((m:any) => selectedIds.has(m.id));
    for (const it of items) {
      await cancelMutation.mutateAsync({ id: it.id, alasan });
    }
  };

  const columns: Column<any>[] = useMemo(() => {
    const allSelected = mutasiList.length > 0 && mutasiList.every((r: any) => selectedIds.has(r.id));
    return [
      {
        key: 'select', header: (
          <div className="pl-2">
            <Checkbox checked={allSelected} onCheckedChange={() => selectAllOnPage(mutasiList)} />
          </div>
        ),
        cell: (item) => (
          <div className="pl-2">
            <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
          </div>
        ),
        className: 'w-12',
      },
      { key: 'noTransaksi', header: 'No. Transaksi', cell: (item) => <span className="font-mono text-sm">{(item as any).noTransaksi || (item as any).no_transaksi}</span> },
      { key: 'tanggal', header: 'Tanggal', cell: (item) => formatDateTime((item as any).createdAt || (item as any).created_at) },
      { key: 'toko', header: 'Toko', cell: (item) => (item as any).kodeToko || (item as any).kode_toko || '-' },
      { key: 'nominal', header: 'Nominal', cell: (item) => <CurrencyDisplay amount={(item as any).nominal_rp || (item as any).nominalRp || (item as any).nominalKirim || (item as any).nominal || 0} />, className: 'text-right' },
      { key: 'inputBy', header: 'Input Oleh', cell: (item) => (item as any).createdBy || (item as any).created_by || '-' },
    ];
  }, [selectedIds, mutasiList]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Terima Setoran</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Terima kiriman kas dari toko</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg shadow-sm">
        <div className="grid gap-6 lg:grid-cols-3">
        {/* Filter Form */}
        <Card className="lg:col-span-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
          <CardHeader className="space-y-3">
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">Filter Transaksi</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Pilih tanggal dan toko untuk menampilkan transaksi kiriman yang belum diterima
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Pilih tanggal'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto bg-popover p-0" align="start">
                    <CalendarComponent mode="single" selected={selectedDate} onSelect={(d) => { setSelectedDate(d as Date); setDateOpen(false); }} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Kode Toko</Label>
                <Select value={pendingToko ?? 'ALL'} onValueChange={(val) => setPendingToko(val === 'ALL' ? undefined : val)}>
                  <SelectTrigger className="w-full justify-between text-left font-normal">
                    <SelectValue placeholder="SEMUA" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48 overflow-auto bg-popover">
                    <SelectItem value="ALL">SEMUA</SelectItem>
                    {tokoList.map((t: any) => (
                      <SelectItem key={t.id || t.kode_toko || t.kodeToko} value={t.kodeToko || t.kode_toko}>
                        {t.namaToko || t.nama_toko || t.kodeToko || t.kode_toko}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 flex items-end justify-end gap-2">
                <Button onClick={handleSearch} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200">
                  <Search className="mr-2 h-4 w-4" /> Tampilkan
                </Button>
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
                <CurrencyDisplay amount={mutasiList.reduce((sum, item) => sum + ((item as any).nominal_rp || (item as any).nominalRp || (item as any).nominalKirim || (item as any).nominal || 0), 0)} />
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Nominal</div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {showResults && (
        <>
          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">Daftar Transaksi Kiriman</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Pilih transaksi yang akan diterima atau ditolak
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} data={mutasiList} isLoading={isLoading} keyExtractor={(item) => item.id} onRowClick={(item) => setDetailMutasi(item)} emptyMessage="Tidak ada transaksi untuk tanggal dan toko ini" />
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Button 
                  onClick={handleTerima} 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md transition-all duration-200" 
                  disabled={selectedIds.size === 0}
                >
                  Terima ({selectedIds.size})
                </Button>
                <Button 
                  onClick={handleReject} 
                  variant="destructive" 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md transition-all duration-200" 
                  disabled={selectedIds.size === 0}
                >
                  Reject ({selectedIds.size})
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={!!detailMutasi} onOpenChange={() => setDetailMutasi(null)}>
        <DialogContent className="bg-white dark:bg-slate-800 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Detail Kiriman
            </DialogTitle>
          </DialogHeader>
          {detailMutasi && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">No. Transaksi</div>
                  <div className="font-mono text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 px-3 py-2 rounded-md border">{detailMutasi.noTransaksi || (detailMutasi as any).no_transaksi}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Toko</div>
                  <div className="text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 px-3 py-2 rounded-md border">{detailMutasi.namaToko || (detailMutasi as any).nama_toko || detailMutasi.kodeToko}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Nominal</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 px-3 py-2 rounded-md border">
                    <CurrencyDisplay amount={(detailMutasi as any).nominal_rp || detailMutasi.nominalKirim || (detailMutasi as any).nominal || 0} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Metode</div>
                  <div className="text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 px-3 py-2 rounded-md border font-medium">{detailMutasi.metode}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Keterangan</div>
                <div className="text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 px-3 py-2 rounded-md border min-h-[2.5rem]">{detailMutasi.keterangan || (detailMutasi as any).keterangan_transaksi || '-'}</div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-6 border-t border-slate-200 dark:border-slate-700">
            <Button 
              variant="outline" 
              onClick={() => setDetailMutasi(null)} 
              className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-200 font-medium px-6"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
