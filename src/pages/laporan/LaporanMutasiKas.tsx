import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
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
import type { LaporanMutasiFilter, MetodeTransaksi } from '@/types';
import { Check, ChevronsUpDown } from 'lucide-react';

export default function LaporanMutasiKas() {
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date>(today);
  const [startOpen, setStartOpen] = useState<boolean>(false);
  const [endOpen, setEndOpen] = useState<boolean>(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [openToko, setOpenToko] = useState(false);
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
  
  // Ensure we fetch fresh data before applying filters so user doesn't need a page refresh
  const queryClient = useQueryClient();
  const handleSearchFetch = async () => {
    if (!filters.type) {
      toast({ title: 'Validasi', description: 'Pilih tipe laporan terlebih dahulu', variant: 'destructive' });
      return;
    }
    if (!startDate || !endDate) {
      toast({ title: 'Validasi', description: 'Pilih tanggal awal dan akhir', variant: 'destructive' });
      return;
    }
    if (startDate.getTime() > endDate.getTime()) {
      setDateError('Tanggal awal tidak boleh lebih besar dari tanggal akhir');
      setSearchParams(null);
      return;
    }

    const startIso = new Date(startDate);
    startIso.setHours(0, 0, 0, 0);
    const endIso = new Date(endDate);
    endIso.setHours(23, 59, 59, 999);
    const newFilters = {
      ...filters,
      startDate: startIso.toISOString(),
      endDate: endIso.toISOString(),
      kodeToko: filters.kodeToko,
      metode: filters.metode,
    } as LaporanMutasiFilter;

    try {
      if (!newFilters.metode) {
        // If metode is ALL, prefetch both CASH and TRANSFER and also the combined key
        await Promise.all([
          queryClient.fetchQuery({
            queryKey: ['laporan-mutasi', { ...newFilters, metode: 'CASH' }],
            queryFn: () => mutasiApi.getMutasi({ ...newFilters, metode: 'CASH' }),
          }),
          queryClient.fetchQuery({
            queryKey: ['laporan-mutasi', { ...newFilters, metode: 'TRANSFER' }],
            queryFn: () => mutasiApi.getMutasi({ ...newFilters, metode: 'TRANSFER' }),
          }),
          queryClient.fetchQuery({
            queryKey: ['laporan-mutasi', newFilters],
            queryFn: () => mutasiApi.getMutasi(newFilters),
          }),
        ]);
      } else {
        await queryClient.fetchQuery({
          queryKey: ['laporan-mutasi', newFilters],
          queryFn: () => mutasiApi.getMutasi(newFilters),
        });
      }
      setFilters(newFilters);
      setSearchParams(newFilters);
    } catch (err) {
      console.warn('prefetch failed', err);
      setFilters(newFilters);
      setSearchParams(newFilters);
    }
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
  };

  // Kolom untuk DETAIL
    const columnsDetail: Column<any>[] = [
    { key: 'no', header: 'No', cell: (item) => mutasiList.indexOf(item) + 1 },
    { key: 'tanggal', header: 'Tanggal', cell: (item) => {
        const raw = item.tanggal || item.createdAt;
        return raw ? formatDate(raw) : '-';
      } },
    { key: 'saldoAwal', header: 'Saldo Awal', cell: (item) => <CurrencyDisplay amount={item.saldoAwal || item.saldo_awal || 0} />, className: 'text-right' },
    { key: 'terima', header: 'Terima', cell: (item) => {
        const jenis = (item.jenisKas || item.jenis_kas || item.jenis || '').toString().toUpperCase();
        const terima = jenis === 'TERIMA' ? (item.nominalTerima || item.nominal_terima || item.nominal_rp_terima || 0) : 0;
        return <CurrencyDisplay amount={terima} />;
      }, className: 'text-right' },
    { key: 'kirim', header: 'Kirim', cell: (item) => {
        const jenis = (item.jenisKas || item.jenis_kas || item.jenis || '').toString().toUpperCase();
        const kirim = jenis === 'KIRIM' ? (item.nominal_rp || item.nominalRp || item.nominalKirim || item.nominal_kirim || 0) : 0;
        return <CurrencyDisplay amount={kirim} />;
      }, className: 'text-right' },
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

  const selectedTypeLabel = filters.type || '';
  const selectedKodeTokoLabel = tokoOptions.find(t => t.kode === filters.kodeToko)?.label || (filters.kodeToko || '');
  const selectedMetodeLabel = filters.metode || 'SEMUA';

  // Total untuk DETAIL (hitung sesuai jenis per baris)
  const totalTerima = mutasiList.reduce((sum, m) => {
    const jenis = (m.jenisKas || m.jenis_kas || m.jenis || '').toString().toUpperCase();
    const terima = jenis === 'TERIMA' ? Number(m.nominalTerima ?? m.nominal_terima ?? m.nominal_rp_terima ?? 0) : 0;
    return sum + terima;
  }, 0);
  const totalKirim = mutasiList.reduce((sum, m) => {
    const jenis = (m.jenisKas || m.jenis_kas || m.jenis || '').toString().toUpperCase();
    const kirim = jenis === 'KIRIM' ? Number(m.nominal_rp ?? m.nominalRp ?? m.nominalKirim ?? m.nominal_kirim ?? 0) : 0;
    return sum + kirim;
  }, 0);
  const totalSaldoAkhir = mutasiList.reduce((sum, m) => sum + (m.saldoAkhir || m.saldo_akhir || 0), 0);
  // Total untuk REKAP
  const totalRekapTerima = mutasiList.reduce((sum, m) => sum + (m.totalTerima || 0), 0);
  const totalRekapKirim = mutasiList.reduce((sum, m) => sum + (m.totalKirim || 0), 0);
  const totalRekapSaldoAkhir = mutasiList.reduce((sum, m) => sum + (m.saldoAkhir || m.saldo_akhir || 0), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Laporan Mutasi Kas</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Lihat dan export laporan mutasi kas</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg shadow-sm">
        <div className="space-y-4">
          {/* Filters */}
          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
            <CardHeader className="space-y-3">
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                Filter Laporan
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Pilih kriteria laporan yang ingin ditampilkan
              </CardDescription>
            </CardHeader>
            <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-900 dark:text-slate-100 uppercase tracking-wide">Tipe Laporan</Label>
                <Select
                  value={filters.type}
                  onValueChange={(value: 'DETAIL' | 'REKAP') =>
                    setFilters(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger title={selectedTypeLabel} className="w-full justify-between text-left font-normal bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-all duration-200 h-9">
                    <SelectValue placeholder="Pilih Type Laporan" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectItem value="DETAIL">Detail</SelectItem>
                    <SelectItem value="REKAP">Rekap</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-900 dark:text-slate-100 uppercase tracking-wide">Tanggal Awal</Label>
                <Popover open={startOpen} onOpenChange={setStartOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 h-9',
                        !startDate && 'text-slate-500 dark:text-slate-400'
                      )}
                    >
                      <Calendar className="mr-2 h-3.5 w-3.5 text-blue-600" />
                      {startDate ? formatDate(startDate) : 'Pilih tanggal'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => { setStartDate(d); setDateError(null); setStartOpen(false); }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {dateError && <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">{dateError}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-900 dark:text-slate-100 uppercase tracking-wide">Tanggal Akhir</Label>
                <Popover open={endOpen} onOpenChange={setEndOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 h-9',
                        !endDate && 'text-slate-500 dark:text-slate-400'
                      )}
                    >
                      <Calendar className="mr-2 h-3.5 w-3.5 text-blue-600" />
                      {endDate ? formatDate(endDate) : 'Pilih tanggal'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl" align="start">
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

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-900 dark:text-slate-100 uppercase tracking-wide">Kode Toko</Label>
                <Popover open={openToko} onOpenChange={setOpenToko}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openToko}
                      className={`w-full justify-between bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 h-9 ${!filters.kodeToko && 'text-slate-500 dark:text-slate-400'}`}
                    >
                      {filters.kodeToko
                        ? tokoOptions.find((toko) => toko.kode === filters.kodeToko)?.label || "Pilih Toko"
                        : "SEMUA TOKO"}
                      <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl" align="start">
                    <Command>
                      <CommandInput placeholder="Cari toko..." className="h-8" />
                      <CommandList>
                        <CommandEmpty>Toko tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="ALL"
                            onSelect={() => {
                              setFilters(prev => ({ ...prev, kodeToko: undefined }));
                              setOpenToko(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-3.5 w-3.5 ${
                                !filters.kodeToko ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <span>SEMUA TOKO</span>
                          </CommandItem>
                          {tokoOptions.map((toko) => (
                            <CommandItem
                              key={toko.id}
                              value={`${toko.kode} ${toko.label}`}
                              onSelect={() => {
                                setFilters(prev => ({ ...prev, kodeToko: toko.kode }));
                                setOpenToko(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-3.5 w-3.5 ${
                                  filters.kodeToko === toko.kode ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{toko.label}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{toko.kode}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-900 dark:text-slate-100 uppercase tracking-wide">Metode</Label>
                <Select
                  value={filters.metode || 'ALL'}
                  onValueChange={(value) =>
                    setFilters(prev => ({
                      ...prev,
                      metode: value === 'ALL' ? undefined : (value as MetodeTransaksi)
                    }))
                  }
                >
                  <SelectTrigger title={selectedMetodeLabel} className="w-full justify-between text-left font-normal bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-all duration-200 h-9">
                    <SelectValue placeholder="SEMUA" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="ALL">SEMUA</SelectItem>
                    <SelectItem value="CASH">CASH</SelectItem>
                    <SelectItem value="TRANSFER">TRANSFER</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleSearchFetch}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200 px-4 py-2 h-9"
              >
                <Search className="mr-2 h-3.5 w-3.5" />
                Tampilkan Laporan
              </Button>
            </div>
          </CardContent>
        </Card>

      {/* Report header is only used for export (PDF/Excel). Do not render on screen. */}

        {/* Data Table */}
        {searchParams && searchParams.startDate && searchParams.endDate && (
          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
            <CardHeader className="space-y-3">
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {searchParams?.type === 'DETAIL' ? 'Laporan Detail Mutasi Kas' : 'Laporan Rekap Mutasi Kas'}
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Periode: {formatDate(startDate)} - {formatDate(endDate)}
                {filters.kodeToko && ` | Toko: ${selectedKodeTokoLabel}`}
                {filters.metode && ` | Metode: ${selectedMetodeLabel}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
            {searchParams?.type === 'DETAIL' ? (
              <DataTable
                columns={columnsDetail}
                data={pagedMutasi}
                isLoading={isLoading}
                keyExtractor={(item) => item.id}
                emptyMessage="Tidak ada data untuk filter yang dipilih"
                footer={(
                <>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-600">
                  <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 text-base">Total</td>
                  <td className="p-3" />
                  <td className="p-3" />
                  <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100 text-base">
                    <CurrencyDisplay amount={totalTerima} />
                  </td>
                  <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100 text-base">
                    <CurrencyDisplay amount={totalKirim} />
                  </td>
                  <td className="p-3" />
                  <td className="p-3" colSpan={3} />
                </tr>

                </>
                )}

              />
            ) : (
              <DataTable
                columns={columnsRekap}
                data={pagedMutasi}
                isLoading={isLoading}
                keyExtractor={(_item) => String(mutasiList.indexOf(_item))}
                emptyMessage="Tidak ada data untuk filter yang dipilih"
                footer={(
                  <>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-600">
                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 text-base">Total</td>
                    <td className="p-3" colSpan={2} />
                    <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100 text-base">
                      <CurrencyDisplay amount={totalRekapTerima} />
                    </td>
                    <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100 text-base">
                      <CurrencyDisplay amount={totalRekapKirim} />
                    </td>
                    <td className="p-3" />
                  </tr>

                  </>
                )}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Export buttons — shown after clicking 'Tampilkan Laporan' */}
      {searchParams && searchParams.startDate && searchParams.endDate && (
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
          <CardHeader className="space-y-3">
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">Export & Navigasi</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Export laporan atau navigasi halaman data
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-slate-900 dark:text-slate-100">Tampilkan</Label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 transition-all duration-200 text-sm h-8"
                >
                  {pageSizes.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <span className="text-sm text-slate-600 dark:text-slate-400">entri per halaman</span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-200 h-8 px-3"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md h-8">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{page}</span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">dari {pageCount}</span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount}
                  className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-200 h-8 px-3"
                >
                  Next
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleExportPDF}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow-md transition-all duration-200 py-2 font-medium h-9"
              >
                📄 Export PDF
              </Button>
              <Button
                onClick={handleExportExcel}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md transition-all duration-200 py-2 font-medium h-9"
              >
                📊 Export Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

        </div>
      </div>
    </div>
  );
}
