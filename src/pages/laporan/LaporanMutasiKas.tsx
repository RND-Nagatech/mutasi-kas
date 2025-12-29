import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StatusBadge } from '@/components/ui/status-badge';
import { CurrencyDisplay } from '@/components/ui/currency-display';
// TODO: Replace toko with backend API if available
import { mutasiApi } from '@/services/api/mutasiApi';
import { masterTokoApi } from '@/services/api/masterTokoApi';
import { rekeningApi } from '@/services/api/rekeningApi';
import { formatDate, formatDateTime, formatRupiah, formatDateForApi, formatNumber } from '@/utils/format';
import { exportMutasiKasPdf } from '@/services/export/exportMutasiKasPdf';
import { exportMutasiKasExcel } from '@/services/export/exportMutasiKasExcel';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { MutasiKas, LaporanMutasiFilter, MetodeTransaksi } from '@/types';

export default function LaporanMutasiKas() {
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date>(today);
  const [startOpen, setStartOpen] = useState<boolean>(false);
  const [endOpen, setEndOpen] = useState<boolean>(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LaporanMutasiFilter>({
    startDate: formatDateForApi(today),
    endDate: formatDateForApi(today),
    kodeToko: '',
    metode: undefined,
  });
  
  const { toast } = useToast();

  const { data: tokoData } = useQuery({
    queryKey: ['toko'],
    queryFn: () => masterTokoApi.getAll(),
  });
  const [searchParams, setSearchParams] = useState<LaporanMutasiFilter | null>(null);

  const { data: rekeningData } = useQuery({
    queryKey: ['rekening'],
    queryFn: () => rekeningApi.getAll(),
  });

  const { data: mutasiData, isLoading, refetch } = useQuery({
    queryKey: ['laporan-mutasi', searchParams],
    queryFn: () => {
      if (!searchParams) return [];
      // If REKAP and metode is not specified (SEMUA), fetch both CASH and TRANSFER and merge by date
      if (searchParams.type === 'REKAP' && !searchParams.metode) {
        return Promise.all([
          mutasiApi.getMutasi({ ...searchParams, metode: 'CASH' }),
          mutasiApi.getMutasi({ ...searchParams, metode: 'TRANSFER' }),
        ]).then(([cashRes, transferRes]) => {
          // both responses are arrays of { tanggal, saldoAwal, totalTerima, totalKirim, saldoAkhir }
          const map: Record<string, any> = {};
          const pushRow = (rows: any[]) => {
            (rows || []).forEach((r: any) => {
              const t = r.tanggal;
              if (!map[t]) map[t] = { tanggal: t, saldoAwal: 0, totalTerima: 0, totalKirim: 0, saldoAkhir: 0 };
              map[t].saldoAwal += Number(r.saldoAwal || r.saldo_awal || 0);
              map[t].totalTerima += Number(r.totalTerima || r.total_terima || 0);
              map[t].totalKirim += Number(r.totalKirim || r.total_kirim || 0);
              map[t].saldoAkhir += Number(r.saldoAkhir || r.saldo_akhir || 0);
            });
          };
          pushRow(cashRes || []);
          pushRow(transferRes || []);
          // convert map to sorted array by tanggal
          return Object.keys(map).sort().map(k => ({ ...map[k], tanggal: k }));
        });
      }
      return mutasiApi.getMutasi({
        type: searchParams.type,
        startDate: searchParams.startDate,
        endDate: searchParams.endDate,
        kodeToko: searchParams.kodeToko,
        metode: searchParams.metode,
      });
    },
    enabled: !!searchParams,
  });

  // Log raw response for debugging
  useEffect(() => {
    console.log('mutasiData (raw):', mutasiData);
  }, [mutasiData]);

  const handleSearch = () => {
    if (!filters.type) {
      toast({ title: 'Validasi', description: 'Pilih tipe laporan terlebih dahulu', variant: 'destructive' });
      return;
    }
    if (!startDate || !endDate) {
      toast({
        title: 'Validasi',
        description: 'Pilih tanggal awal dan akhir',
        variant: 'destructive',
      });
      return;
    }
    // protect: start date must not be after end date (inline error handled elsewhere)
    if (startDate.getTime() > endDate.getTime()) {
      setDateError('Tanggal awal tidak boleh lebih besar dari tanggal akhir');
      setSearchParams(null);
      return;
    }
    setDateError(null);
    // send start as start-of-day ISO and end as end-of-day ISO to include full date range
    const startIso = new Date(startDate);
    startIso.setHours(0, 0, 0, 0);
    const endIso = new Date(endDate);
    endIso.setHours(23, 59, 59, 999);
    const newFilters = {
      ...filters,
      startDate: startIso.toISOString(),
      endDate: endIso.toISOString(),
    } as LaporanMutasiFilter;
    setFilters(newFilters);
    setSearchParams(newFilters);
  };

  // validate dates immediately when changed
  useEffect(() => {
    if (!startDate || !endDate) {
      setDateError(null);
      return;
    }
    if (startDate.getTime() > endDate.getTime()) {
      setDateError('Tanggal awal tidak boleh lebih besar dari tanggal akhir');
      setSearchParams(null);
    } else {
      setDateError(null);
    }
  }, [startDate, endDate]);

  const handleExportPDF = () => {
    const title = `Laporan Mutasi Kas Pusat (${filters.type === 'DETAIL' ? 'Detail' : 'Rekap'})`;
    exportMutasiKasPdf({
      title,
      startDate,
      endDate,
      filters,
      data: mutasiList,
    });
  };

  const handleExportExcel = () => {
    const title = `Laporan Mutasi Kas Pusat (${filters.type === 'DETAIL' ? 'Detail' : 'Rekap'})`;
    exportMutasiKasExcel({
      title,
      startDate,
      endDate,
      filters,
      data: mutasiList,
    });
    toast({
      title: 'Export Excel',
      description: 'File Excel sedang diunduh',
    });
  };

  // Kolom untuk DETAIL
    const columnsDetail: Column<any>[] = [
    { key: 'no', header: 'No', cell: (item) => mutasiList.indexOf(item) + 1 },
    { key: 'tanggal', header: 'Tanggal', cell: (item) => {
        const raw = item.tanggal || item.createdAt;
        return raw ? formatDate(raw) : '-';
      } },
    { key: 'saldoAwal', header: 'Saldo Awal', cell: (item) => <CurrencyDisplay amount={item.saldoAwal || item.saldo_awal || 0} />, className: 'text-right' },
    { key: 'terima', header: 'Terima', cell: (item) => <CurrencyDisplay amount={item.nominalTerima || item.nominal_terima || item.nominal_rp_terima || 0} />, className: 'text-right' },
    { key: 'kirim', header: 'Kirim', cell: (item) => <CurrencyDisplay amount={item.nominal_rp || item.nominalRp || item.nominalKirim || item.nominal_kirim || 0} />, className: 'text-right' },
    { key: 'tipe', header: 'Tipe', cell: (item) => {
        const terima = item.nominalTerima || item.nominal_terima || item.nominal_rp_terima || 0;
        const kirim = item.nominal_rp || item.nominalRp || item.nominalKirim || item.nominal_kirim || 0;
        return terima > 0 ? 'Terima' : (kirim > 0 ? 'Kirim' : (item.metode || '-'));
      }, className: 'text-center' },
    { key: 'saldoAkhir', header: 'Saldo Akhir', cell: (item) => <CurrencyDisplay amount={item.saldoAkhir || item.saldo_akhir || 0} />, className: 'text-right' },
    { key: 'keterangan', header: 'Keterangan', cell: (item) => item.keterangan || item.keterangan_transaksi || '-' },
    { key: 'noRekening', header: 'No Rekening', cell: (item) => (
      item.metode === 'CASH'
        ? (() => {
            const gramRaw = item.gramasi ?? item.gram ?? item.nominal_gr ?? item.nominalGr ?? item.nominalGrams ?? item.gramasiGr;
            if (typeof gramRaw === 'number' || (typeof gramRaw === 'string' && String(gramRaw).trim() !== '')) {
              const gramNum = typeof gramRaw === 'number' ? gramRaw : parseInt(String(gramRaw).replace(/[^0-9-]/g, ''), 10) || 0;
              if (gramNum > 0) return `${formatNumber(gramNum)} gr`;
            }
            return item.noRekening || item.no_rekening || '-';
          })()
        : (item.noRekening || item.no_rekening || '-')
      )},
  ];

  // Kolom untuk REKAP
  const columnsRekap: Column<any>[] = [
    { key: 'no', header: 'No', cell: (item) => mutasiList.indexOf(item) + 1 },
    { key: 'tanggal', header: 'Tanggal', cell: (item) => formatDate(item.tanggal) },
    { key: 'saldoAwal', header: 'Saldo Awal', cell: (item) => <CurrencyDisplay amount={item.saldoAwal} />, className: 'text-right' },
    { key: 'totalTerima', header: 'Total Terima', cell: (item) => <CurrencyDisplay amount={item.totalTerima} />, className: 'text-right' },
    { key: 'totalKirim', header: 'Total Kirim', cell: (item) => <CurrencyDisplay amount={item.totalKirim} />, className: 'text-right' },
    { key: 'saldoAkhir', header: 'Saldo Akhir', cell: (item) => <CurrencyDisplay amount={item.saldoAkhir} />, className: 'text-right' },
  ];

  const mutasiList = Array.isArray(mutasiData) ? mutasiData : mutasiData?.data || [];
  const tokoList = Array.isArray(tokoData) ? tokoData : tokoData?.data || [];

  // Pagination (client-side)
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const pageSizes = [10, 50, 100];
  const pageCount = Math.max(1, Math.ceil(mutasiList.length / pageSize));
  const pagedMutasi = mutasiList.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when data or pageSize changes
  useEffect(() => setPage(1), [mutasiList, pageSize]);

  const rowCount = mutasiList.length;

  // Helper to display toko label/value safely (tm_cabang may use different keys)
  const tokoOptions = tokoList.map((toko: any) => ({
    id: toko.id || toko._id || toko.kode_toko || toko.kodeToko,
    kode: toko.kode_toko || toko.kodeToko || toko.id || toko._id,
    label: toko.nama_toko || toko.namaToko || toko.kode_toko || toko.kodeToko || String(toko.id || toko._id),
  }));

  // Total untuk DETAIL
  const totalTerima = mutasiList.reduce((sum, m) => sum + (m.nominalTerima || m.nominal_terima || m.nominal_rp_terima || 0), 0);
  const totalKirim = mutasiList.reduce((sum, m) => sum + (m.nominal_rp || m.nominalRp || m.nominalKirim || m.nominal_kirim || 0), 0);
  const totalSaldoAkhir = mutasiList.reduce((sum, m) => sum + (m.saldoAkhir || m.saldo_akhir || 0), 0);
  // Total untuk REKAP
  const totalRekapTerima = mutasiList.reduce((sum, m) => sum + (m.totalTerima || 0), 0);
  const totalRekapKirim = mutasiList.reduce((sum, m) => sum + (m.totalKirim || 0), 0);
  const totalRekapSaldoAkhir = mutasiList.reduce((sum, m) => sum + (m.saldoAkhir || m.saldo_akhir || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Laporan Mutasi Kas"
        description="Lihat dan export laporan mutasi kas"
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Tipe Laporan</Label>
              <Select
                value={filters.type}
                onValueChange={(value: 'DETAIL' | 'REKAP') => 
                  setFilters(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih type laporan" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="DETAIL">Detail</SelectItem>
                  <SelectItem value="REKAP">Rekap</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tanggal Awal</Label>
              <Popover open={startOpen} onOpenChange={setStartOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {startDate ? formatDate(startDate) : 'Pilih tanggal'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => { setStartDate(d); setDateError(null); setStartOpen(false); }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {dateError && <p className="text-xs text-destructive mt-1">{dateError}</p>}
            </div>

            <div className="space-y-2">
              <Label>Tanggal Akhir</Label>
              <Popover open={endOpen} onOpenChange={setEndOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {endDate ? formatDate(endDate) : 'Pilih tanggal'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => { setEndDate(d); setDateError(null); setEndOpen(false); }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Kode Toko</Label>
              <Select
                value={filters.kodeToko || 'ALL'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, kodeToko: value === 'ALL' ? undefined : value }))}
              >
                <SelectTrigger>
                    <SelectValue placeholder="SEMUA" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                    <SelectItem value="ALL">SEMUA</SelectItem>
                  {tokoOptions.map((toko) => (
                    <SelectItem key={toko.id} value={toko.kode}>
                      {toko.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Metode</Label>
              <Select
                value={filters.metode || 'ALL'}
                onValueChange={(value) => 
                  setFilters(prev => ({ 
                    ...prev, 
                    metode: value === 'ALL' ? undefined : (value as MetodeTransaksi) 
                  }))
                }
              >
                <SelectTrigger>
                    <SelectValue placeholder="SEMUA" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                    <SelectItem value="ALL">SEMUA</SelectItem>
                  <SelectItem value="CASH">CASH</SelectItem>
                  <SelectItem value="TRANSFER">TRANSFER</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              Tampilkan Laporan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report header is only used for export (PDF/Excel). Do not render on screen. */}

      {/* Data Table */}
      {searchParams && searchParams.startDate && searchParams.endDate && (
        <>
          {searchParams?.type === 'DETAIL' ? (
            <>
              <DataTable
                columns={columnsDetail}
                data={pagedMutasi}
                isLoading={isLoading}
                keyExtractor={(item) => item.id}
                emptyMessage="Tidak ada data untuk filter yang dipilih"
                footer={(
                <>
                <tr className="bg-muted/50 border-t">
                  <td className="p-4 font-semibold text-foreground">Total</td>
                  <td className="p-4" />
                  <td className="p-4" />
                  <td className="p-4 text-right font-semibold text-foreground">
                    <CurrencyDisplay amount={totalTerima} />
                  </td>
                  <td className="p-4 text-right font-semibold text-foreground">
                    <CurrencyDisplay amount={totalKirim} />
                  </td>
                  <td className="p-4" />
                  <td className="p-4" colSpan={3} />
                </tr>
                
                </>
                )}

              />
              
            </>
          ) : (
            <>
              <DataTable
                columns={columnsRekap}
                data={pagedMutasi}
                isLoading={isLoading}
                keyExtractor={(_item) => String(mutasiList.indexOf(_item))}
                emptyMessage="Tidak ada data untuk filter yang dipilih"
                footer={(
                  <>
                  <tr className="bg-muted/50 border-t">
                    <td className="p-4 font-semibold text-foreground">Total</td>
                    <td className="p-4" colSpan={2} />
                    <td className="p-4 text-right font-semibold text-foreground">
                      <CurrencyDisplay amount={totalRekapTerima} />
                    </td>
                    <td className="p-4 text-right font-semibold text-foreground">
                      <CurrencyDisplay amount={totalRekapKirim} />
                    </td>
                    <td className="p-4" />
                  </tr>
                  
                  </>
                )}
              />
            </>
          )}
        </>
      )}
      {/* Export buttons — shown after clicking 'Tampilkan Laporan' and placed below table (outside table) */}
      {searchParams && searchParams.startDate && searchParams.endDate && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
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

          <div className="grid grid-cols-2 gap-4 mt-4">
            <button
              onClick={handleExportPDF}
              className="w-full py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm"
            >
              Export PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="w-full py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm"
            >
              Export Excel
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}
