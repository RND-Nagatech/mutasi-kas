import { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Terima Setoran" description="Terima kiriman kas dari toko" />

      <Card>
        <CardHeader>
          <CardTitle>Filter Transaksi</CardTitle>
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
              <Button onClick={handleSearch} className="flex items-center"><Search className="mr-2 h-4 w-4" /> Tampilkan</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showResults && (
        <>
          <DataTable columns={columns} data={mutasiList} isLoading={isLoading} keyExtractor={(item) => item.id} onRowClick={(item) => setDetailMutasi(item)} emptyMessage="Tidak ada transaksi untuk tanggal dan toko ini" />

          <div className="mt-4 flex gap-3">
            <button onClick={handleTerima} className="w-full rounded-md bg-emerald-700 py-2 text-sm font-medium text-white hover:bg-emerald-800">Terima</button>
            <button onClick={handleReject} className="w-full rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700">Reject</button>
          </div>
        </>
      )}

      <Dialog open={!!detailMutasi} onOpenChange={() => setDetailMutasi(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Kiriman</DialogTitle>
          </DialogHeader>
          {detailMutasi && (
            <div className="space-y-2">
                    <div><strong>No. Transaksi:</strong> {detailMutasi.noTransaksi || (detailMutasi as any).no_transaksi}</div>
                    <div><strong>Toko:</strong> {detailMutasi.namaToko || (detailMutasi as any).nama_toko || detailMutasi.kodeToko}</div>
                    <div><strong>Nominal:</strong> <CurrencyDisplay amount={(detailMutasi as any).nominal_rp || detailMutasi.nominalKirim || (detailMutasi as any).nominal || 0} /></div>
                    <div><strong>Metode:</strong> {detailMutasi.metode}</div>
                    <div><strong>Keterangan:</strong> {detailMutasi.keterangan || (detailMutasi as any).keterangan_transaksi || '-'}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailMutasi(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
