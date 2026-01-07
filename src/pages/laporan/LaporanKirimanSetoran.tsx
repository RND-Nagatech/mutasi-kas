import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Calendar, FileText, FileSpreadsheet, Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { masterTokoApi } from '@/services/api/masterTokoApi';
import { rekeningApi } from '@/services/api/rekeningApi';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { StatusBadge } from '@/components/ui/status-badge';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
// TODO: Replace toko/rekening with backend API if available
import { mutasiApi } from '@/services/api/mutasiApi';
import { formatDate, formatDateTime, formatRupiah, formatDateForApi, formatNumber } from '@/utils/format';
import { exportKirimanSetoranPdf } from '@/services/export/exportKirimanSetoranPdf';
import { exportKirimanSetoranExcel } from '@/services/export/exportKirimanSetoranExcel';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { MutasiKas, MetodeTransaksi } from '@/types';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface KirimanSetoranFilter {
  startDate: string;
  endDate: string;
  kodeToko?: string;
  jenisTransaksi?: string;
  metode?: MetodeTransaksi;
  rekeningId?: string;
}

export default function LaporanKirimanSetoran() {
  const [filters, setFilters] = useState<KirimanSetoranFilter>({
    startDate: '',
    endDate: '',
  });
  // UI-level pending filters: changes here should NOT immediately trigger query
  const [pendingFilters, setPendingFilters] = useState<KirimanSetoranFilter>({
    startDate: '',
    endDate: '',
  });
  const [startDate, setStartDate] = useState<Date>(() => new Date());
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [startOpen, setStartOpen] = useState<boolean>(false);
  const [endOpen, setEndOpen] = useState<boolean>(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [openToko, setOpenToko] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tokoData } = useQuery({
    queryKey: ['toko'],
    queryFn: () => masterTokoApi.getAll(),
  });

  const { data: rekeningData } = useQuery({
    queryKey: ['rekening'],
    queryFn: () => rekeningApi.getAll(),
  });

  const { data: mutasiData, isLoading } = useQuery({
    queryKey: ['laporan-kiriman-setoran', filters],
    queryFn: () => mutasiApi.getMutasi({
      startDate: filters.startDate,
      endDate: filters.endDate,
      kodeToko: filters.kodeToko,
      metode: filters.metode,
      jenisTransaksi: filters.jenisTransaksi,
    }),
    enabled: !!filters.startDate && !!filters.endDate,
  });

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      toast({
        title: 'Validasi',
        description: 'Pilih tanggal awal dan akhir',
        variant: 'destructive',
      });
      return;
    }
    if (startDate.getTime() > endDate.getTime()) {
      setDateError('Tanggal awal tidak boleh lebih besar dari tanggal akhir');
      return;
    }
    const newFilters = {
      ...filters,
      startDate: formatDateForApi(startDate),
      endDate: formatDateForApi(endDate),
      kodeToko: pendingFilters.kodeToko,
      jenisTransaksi: pendingFilters.jenisTransaksi,
      metode: pendingFilters.metode,
      rekeningId: pendingFilters.rekeningId,
    } as KirimanSetoranFilter;

    try {
      if (!newFilters.metode) {
        // If metode is "ALL" (undefined), prefetch both CASH and TRANSFER and the combined key
        await Promise.all([
          queryClient.fetchQuery({
            queryKey: ['laporan-kiriman-setoran', { ...newFilters, metode: 'CASH' }],
            queryFn: () => mutasiApi.getMutasi({
              startDate: newFilters.startDate,
              endDate: newFilters.endDate,
              kodeToko: newFilters.kodeToko,
              metode: 'CASH',
              jenisTransaksi: newFilters.jenisTransaksi,
            }),
          }),
          queryClient.fetchQuery({
            queryKey: ['laporan-kiriman-setoran', { ...newFilters, metode: 'TRANSFER' }],
            queryFn: () => mutasiApi.getMutasi({
              startDate: newFilters.startDate,
              endDate: newFilters.endDate,
              kodeToko: newFilters.kodeToko,
              metode: 'TRANSFER',
              jenisTransaksi: newFilters.jenisTransaksi,
            }),
          }),
          queryClient.fetchQuery({
            queryKey: ['laporan-kiriman-setoran', newFilters],
            queryFn: () => mutasiApi.getMutasi({
              startDate: newFilters.startDate,
              endDate: newFilters.endDate,
              kodeToko: newFilters.kodeToko,
              metode: newFilters.metode,
              jenisTransaksi: newFilters.jenisTransaksi,
            }),
          }),
        ]);
      } else {
        await queryClient.fetchQuery({
          queryKey: ['laporan-kiriman-setoran', newFilters],
          queryFn: () => mutasiApi.getMutasi({
            startDate: newFilters.startDate,
            endDate: newFilters.endDate,
            kodeToko: newFilters.kodeToko,
            metode: newFilters.metode,
            jenisTransaksi: newFilters.jenisTransaksi,
          }),
        });
      }
    } catch (err) {
      console.warn('prefetch failed', err);
    }

    setFilters(newFilters);
    setShowResults(true);
  };

  // validate dates immediately when changed
  useEffect(() => {
    if (!startDate || !endDate) {
      setDateError(null);
      return;
    }
    if (startDate.getTime() > endDate.getTime()) {
      setDateError('Tanggal awal tidak boleh lebih besar dari tanggal akhir');
    } else {
      setDateError(null);
    }
  }, [startDate, endDate]);

  // Do not auto-populate filters on mount; user must click "Tampilkan Laporan" to show data

  const handleExportPDF = () => {
    const title = 'Laporan Kiriman & Setoran Toko';
    const sd = startDate ?? (filters.startDate ? new Date(filters.startDate) : new Date());
    const ed = endDate ?? (filters.endDate ? new Date(filters.endDate) : new Date());
    exportKirimanSetoranPdf({
      title,
      startDate: sd,
      endDate: ed,
      filters,
      data: mutasiList,
      rekeningList,
    });
  };

  const handleExportExcel = () => {
    const title = 'Laporan Kiriman & Setoran Toko';
    const sd = startDate ?? (filters.startDate ? new Date(filters.startDate) : new Date());
    const ed = endDate ?? (filters.endDate ? new Date(filters.endDate) : new Date());
    exportKirimanSetoranExcel({
      title,
      startDate: sd,
      endDate: ed,
      filters,
      data: mutasiList,
      rekeningList,
    });
  };

  // columns will be computed after tokoList/rekeningList are available

  const mutasiListRaw = Array.isArray(mutasiData) ? mutasiData : (mutasiData?.data || []);
  const tokoList = Array.isArray(tokoData) ? tokoData : (tokoData?.data || []);
  const rekeningList = Array.isArray(rekeningData) ? rekeningData : (rekeningData?.data || []);
  const showRekeningFilter = pendingFilters.metode === 'TRANSFER';

  const selectedRekeningLabel = (() => {
    if (!pendingFilters.rekeningId) return '';
    const sel = rekeningList.find((r: any) => r.id === pendingFilters.rekeningId || r._id === pendingFilters.rekeningId);
    if (!sel) return '';
    const kode = sel.kodeBank || sel.kode_bank || '';
    const no = sel.noRekening || sel.no_rekening || '';
    return kode ? `${kode} - ${no}` : no;
  })();

  const selectedKodeTokoLabel = (() => {
    if (!pendingFilters.kodeToko) return '';
    const sel = tokoList.find((t: any) => (t.kodeToko === pendingFilters.kodeToko) || (t.kode_toko === pendingFilters.kodeToko));
    if (!sel) return String(pendingFilters.kodeToko);
    return `${sel.kodeToko || sel.kode_toko}${sel.namaToko || sel.nama_toko ? ' - ' + (sel.namaToko || sel.nama_toko) : ''}`;
  })();

  const selectedJenisLabel = pendingFilters.jenisTransaksi || 'SEMUA';
  const selectedMetodeLabel = pendingFilters.metode || 'SEMUA';

  // Apply local filtering for rekening because backend response may not include rekeningId
  const mutasiList = (() => {
    if (!filters.rekeningId) return mutasiListRaw;
    const selectedRek = rekeningList.find((r: any) => r.id === filters.rekeningId || r._id === filters.rekeningId);
    if (!selectedRek) return mutasiListRaw;
    const targetNo = String(selectedRek.noRekening || selectedRek.no_rekening || '').replace(/[^0-9]/g, '');
    if (!targetNo) return mutasiListRaw;
    return mutasiListRaw.filter((m: any) => {
      const rowNo = String(m.noRekening || m.no_rekening || m.rekening || '').replace(/[^0-9]/g, '');
      return rowNo === targetNo;
    });
  })();

  const columns: Column<MutasiKas>[] = useMemo(() => {
    const getField = (obj: any, ...keys: string[]) => {
      for (const k of keys) {
        if (obj == null) continue;
        if (k in obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
      }
      return undefined;
    };

    return [
      {
        key: 'no',
        header: 'No',
        cell: (item) => {
          const idx = mutasiList.findIndex(m => m.id === item.id);
          return <span>{idx >= 0 ? idx + 1 : '-'}</span>;
        },
      },
      {
        key: 'kodeToko',
        header: 'Kode Toko',
        cell: (item) => {
          const i: any = item;
          const kode = getField(i, 'kodeToko', 'kode_toko', 'tokoKode') || '-';
          const master = tokoList.find((t: any) => (t.kodeToko === kode) || (t.kode_toko === kode) || t.id === i.tokoId);
          const nama = master?.namaToko || master?.nama_toko || getField(i, 'namaToko', 'nama_toko') || '-';
          return (
            <div>
              <p className="font-medium">{kode}</p>
              <p className="text-xs text-muted-foreground">{nama}</p>
            </div>
          );
        },
      },
      {
        key: 'tanggal',
        header: 'Tanggal',
        cell: (item) => formatDate(getField(item, 'createdAt', 'created_at')),
      },
      {
        key: 'jam',
        header: 'Jam',
        cell: (item) => {
          const d = new Date(getField(item, 'createdAt', 'created_at') || new Date());
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        },
      },
      {
        key: 'kirim',
        header: 'Kirim',
        cell: (item) => {
          const i: any = item;
          const jenis = (getField(i, 'jenisKas', 'jenis_kas', 'jenis') || '').toString().toUpperCase();
          const amt = getField(i, 'nominalRp', 'nominal_rp', 'nominalKirim', 'nominal_kirim', 'nominal', 'amount') || 0;
          return jenis === 'KIRIM' ? <CurrencyDisplay amount={Number(amt) || 0} /> : <span className="text-muted-foreground">-</span>;
        },
        className: 'text-right',
      },
      {
        key: 'setor',
        header: 'Setor',
        cell: (item) => {
          const i: any = item;
          const jenis = (getField(i, 'jenisKas', 'jenis_kas', 'jenis') || '').toString().toUpperCase();
          const amt = getField(i, 'nominalRp', 'nominal_rp', 'nominalSetor', 'nominal_setor', 'nominal', 'amount') || 0;
          return jenis === 'TERIMA' ? <CurrencyDisplay amount={Number(amt) || 0} /> : <span className="text-muted-foreground">-</span>;
        },
        className: 'text-right',
      },
      {
        key: 'pembuat',
        header: 'Pembuat',
        cell: (item) => {
          const i: any = item;
          return getField(i, 'createdBy', 'created_by', 'created_by_name') || '-';
        },
      },
      {
        key: 'penerima',
        header: 'Penerima',
        cell: (item) => {
          const i: any = item;
          return getField(i, 'validBy', 'valid_by', 'validated_by') || '-';
        },
      },
      {
        key: 'metode',
        header: 'Metode',
        cell: (item) => {
          const metode = (getField(item as any, 'metode') || '').toString().toUpperCase();
          return <span className="whitespace-nowrap">{metode || '-'}</span>;
        },
        className: 'text-center whitespace-nowrap',
      },
      {
        key: 'noRekening',
        header: 'No Rekening',
        cell: (item) => {
          const i: any = item;
          const metode = (getField(i, 'metode') || '').toString().toUpperCase();

          // CASH: show gramasi (e.g., "123 gr") or fallback to account number
          if (metode === 'CASH') {
            const gramRaw = getField(i, 'gramasi', 'gram', 'nominal_gr', 'nominalGr', 'nominalGrams', 'gramasiGr');
            if (gramRaw !== undefined && gramRaw !== null && (typeof gramRaw === 'number' || String(gramRaw).trim() !== '')) {
              const gramNum = typeof gramRaw === 'number' ? gramRaw : parseInt(String(gramRaw).replace(/[^0-9-]/g, ''), 10) || 0;
              if (gramNum > 0) return <span className="font-mono">{formatNumber(gramNum)} gr</span>;
            }
            const fromGramasi = typeof gramRaw === 'object' ? getField(gramRaw, 'noRekening', 'no_rekening') : gramRaw;
            const finalRek = fromGramasi || getField(i, 'noRekening', 'no_rekening') || null;
            return finalRek ? <span className="font-mono">{finalRek}</span> : <span className="text-muted-foreground">-</span>;
          }

          // Non-CASH: prefer kode bank - no rekening
          const noRekFromRow = getField(i, 'noRekening', 'no_rekening', 'rekening') || '';
          const rekId = getField(i, 'rekeningId', 'rekening_id') || null;
          const master = rekeningList.find((r: any) => r.id === rekId || r._id === rekId || (r.noRekening || r.no_rekening) === noRekFromRow);

          const kodeBank = master?.kodeBank || master?.kode_bank || getField(i, 'kodeBank', 'kode_bank') || '';
          const account = master?.noRekening || master?.no_rekening || noRekFromRow || null;

          if (!account) return <span className="text-muted-foreground">-</span>;
          return (
            <div>
              <p className="font-mono text-sm">{kodeBank ? `${kodeBank} - ${account}` : account}</p>
            </div>
          );
        },
      },
    ];
  }, [tokoList, rekeningList, mutasiList]);

  // Pagination (client-side)
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const pageSizes = [10, 50, 100];
  const pageCount = Math.max(1, Math.ceil(mutasiList.length / pageSize));
  const pagedMutasi = mutasiList.slice((page - 1) * pageSize, page * pageSize);
  // reset page when filters/data or pageSize changes
  useEffect(() => setPage(1), [mutasiList, pageSize]);

  // Totals for Kirim / Setor
  const totalKirim = mutasiList.reduce((sum, m: any) => {
    const jenis = (m.jenisKas || m.jenis_kas || m.jenis || '').toString().toUpperCase();
    const amt = Number(m.nominalRp ?? m.nominal_rp ?? m.nominalKirim ?? m.nominal_kirim ?? m.nominal ?? 0) || 0;
    return sum + (jenis === 'KIRIM' ? amt : 0);
  }, 0);

  const totalSetor = mutasiList.reduce((sum, m: any) => {
    const jenis = (m.jenisKas || m.jenis_kas || m.jenis || '').toString().toUpperCase();
    const amt = Number(m.nominalRp ?? m.nominal_rp ?? m.nominalTerima ?? m.nominal_terima ?? m.nominal ?? 0) || 0;
    return sum + (jenis === 'TERIMA' ? amt : 0);
  }, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Laporan Kiriman & Setoran Toko</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Lihat laporan kiriman dan setoran berdasarkan toko</p>
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
            </CardHeader>
            <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
                      onSelect={(d) => {
                        setStartDate(d as Date);
                        setDateError(null);
                        setStartOpen(false);
                      }}
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
                      onSelect={(d) => {
                        setEndDate(d as Date);
                        setDateError(null);
                        setEndOpen(false);
                      }}
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
                      className={`w-full justify-between bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 h-9 ${!pendingFilters.kodeToko && 'text-slate-500 dark:text-slate-400'}`}
                    >
                      {pendingFilters.kodeToko
                        ? (() => {
                            const sel = tokoList.find((t: any) => (t.kodeToko === pendingFilters.kodeToko) || (t.kode_toko === pendingFilters.kodeToko));
                            return sel ? `${sel.kodeToko || sel.kode_toko} - ${sel.namaToko || sel.nama_toko}` : "Pilih Toko";
                          })()
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
                              setPendingFilters(prev => ({ ...prev, kodeToko: undefined }));
                              setOpenToko(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-3.5 w-3.5 ${
                                !pendingFilters.kodeToko ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <span>SEMUA TOKO</span>
                          </CommandItem>
                          {tokoList.map((toko: any) => (
                            <CommandItem
                              key={toko.id || toko.kode_toko || toko.kodeToko}
                              value={`${toko.kodeToko || toko.kode_toko} ${toko.namaToko || toko.nama_toko}`}
                              onSelect={() => {
                                setPendingFilters(prev => ({ ...prev, kodeToko: toko.kodeToko || toko.kode_toko }));
                                setOpenToko(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-3.5 w-3.5 ${
                                  pendingFilters.kodeToko === (toko.kodeToko || toko.kode_toko) ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{toko.namaToko || toko.nama_toko}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{toko.kodeToko || toko.kode_toko}</span>
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
                <Label className="text-sm font-medium text-slate-900 dark:text-slate-100 uppercase tracking-wide">Jenis Transaksi</Label>
                <Select
                  value={pendingFilters.jenisTransaksi || 'ALL'}
                  onValueChange={(value) => setPendingFilters(prev => ({ ...prev, jenisTransaksi: value === 'ALL' ? undefined : value }))}
                >
                  <SelectTrigger className="w-full justify-between text-left font-normal bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-all duration-200 h-9">
                    <SelectValue placeholder="SEMUA" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectItem value="ALL">SEMUA</SelectItem>
                    <SelectItem value="KIRIM">KIRIM</SelectItem>
                    <SelectItem value="TERIMA">TERIMA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-900 dark:text-slate-100 uppercase tracking-wide">Metode</Label>
                <Select
                  value={pendingFilters.metode || 'ALL'}
                  onValueChange={(value) => 
                    setPendingFilters(prev => ({ 
                      ...prev, 
                      metode: value === 'ALL' ? undefined : (value as MetodeTransaksi),
                      rekeningId: value !== 'TRANSFER' ? undefined : prev.rekeningId,
                    }))
                  }
                >
                  <SelectTrigger className="w-full justify-between text-left font-normal bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-all duration-200 h-9">
                    <SelectValue placeholder="SEMUA" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectItem value="ALL">SEMUA</SelectItem>
                    <SelectItem value="CASH">CASH</SelectItem>
                    <SelectItem value="TRANSFER">TRANSFER</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {showRekeningFilter && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-900 dark:text-slate-100 uppercase tracking-wide">Rekening</Label>
                  <Select
                    value={pendingFilters.rekeningId || 'ALL'}
                    onValueChange={(value) => setPendingFilters(prev => ({ ...prev, rekeningId: value === 'ALL' ? undefined : value }))}
                  >
                    <SelectTrigger className="w-full justify-between text-left font-normal bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-all duration-200 h-9">
                      <SelectValue placeholder="SEMUA" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="ALL">SEMUA</SelectItem>
                        {rekeningList.map((rek: any) => {
                          const label = ((rek.kodeBank || rek.kode_bank) ? (rek.kodeBank || rek.kode_bank) + ' - ' : '') + (rek.noRekening || rek.no_rekening);
                          return (
                            <SelectItem key={rek.id || rek._id || rek.no_rekening} value={rek.id || rek._id} title={label}>
                              {label}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleSearch}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200 px-4 py-2 h-9"
              >
                <Search className="mr-2 h-3.5 w-3.5" />
                Tampilkan Laporan
              </Button>
            </div>
          </CardContent>
        </Card>

          {/* Data Table */}
          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
            <CardHeader className="space-y-3">
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Data Laporan Kiriman & Setoran
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Memuat data...</span>
                  </div>
                </div>
              ) : mutasiList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">Tidak ada data</h3>
                  <p className="text-slate-600 dark:text-slate-400 max-w-sm">
                    Belum ada data laporan kiriman dan setoran untuk kriteria yang dipilih. Silakan ubah filter atau tambahkan data baru.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <span>Menampilkan {pagedMutasi.length} dari {mutasiList.length} data</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportExcel}
                        className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 h-9"
                      >
                        <Download className="mr-2 h-3.5 w-3.5" />
                        Export Excel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportPDF}
                        className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 h-9"
                      >
                        <Download className="mr-2 h-3.5 w-3.5" />
                        Export PDF
                      </Button>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <TableHead className="font-semibold text-slate-900 dark:text-slate-100">No</TableHead>
                          <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Kode Toko</TableHead>
                          <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Tanggal</TableHead>
                          <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Jam</TableHead>
                          <TableHead className="font-semibold text-slate-900 dark:text-slate-100 text-right">Kirim</TableHead>
                          <TableHead className="font-semibold text-slate-900 dark:text-slate-100 text-right">Setor</TableHead>
                          <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Pembuat</TableHead>
                          <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Penerima</TableHead>
                          <TableHead className="font-semibold text-slate-900 dark:text-slate-100 text-center">Metode</TableHead>
                          <TableHead className="font-semibold text-slate-900 dark:text-slate-100">No Rekening</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedMutasi.map((item: any, index: number) => (
                          <TableRow key={item.id || index} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors duration-150">
                            <TableCell className="font-medium text-slate-900 dark:text-slate-100">{(page - 1) * pageSize + index + 1}</TableCell>
                            <TableCell className="text-slate-700 dark:text-slate-300">
                              <div>
                                <p className="font-medium">{item.kodeToko || item.kode_toko || item.tokoKode || '-'}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {(() => {
                                    const kode = item.kodeToko || item.kode_toko || item.tokoKode;
                                    const master = tokoList.find((t: any) => (t.kodeToko === kode) || (t.kode_toko === kode) || t.id === item.tokoId);
                                    return master?.namaToko || master?.nama_toko || item.namaToko || item.nama_toko || '-';
                                  })()}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-700 dark:text-slate-300">{formatDate(item.createdAt || item.created_at)}</TableCell>
                            <TableCell className="text-slate-700 dark:text-slate-300">
                              {(() => {
                                const d = new Date(item.createdAt || item.created_at || new Date());
                                return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              })()}
                            </TableCell>
                            <TableCell className="text-right font-medium text-slate-900 dark:text-slate-100">
                              {(() => {
                                const jenis = (item.jenisKas || item.jenis_kas || item.jenis || '').toString().toUpperCase();
                                const amt = item.nominalRp || item.nominal_rp || item.nominalKirim || item.nominal_kirim || item.nominal || item.amount || 0;
                                return jenis === 'KIRIM' ? <CurrencyDisplay amount={Number(amt) || 0} /> : <span className="text-slate-400 dark:text-slate-500">-</span>;
                              })()}
                            </TableCell>
                            <TableCell className="text-right font-medium text-slate-900 dark:text-slate-100">
                              {(() => {
                                const jenis = (item.jenisKas || item.jenis_kas || item.jenis || '').toString().toUpperCase();
                                const amt = item.nominalRp || item.nominal_rp || item.nominalSetor || item.nominal_setor || item.nominal || item.amount || 0;
                                return jenis === 'TERIMA' ? <CurrencyDisplay amount={Number(amt) || 0} /> : <span className="text-slate-400 dark:text-slate-500">-</span>;
                              })()}
                            </TableCell>
                            <TableCell className="text-slate-700 dark:text-slate-300">{item.createdBy || item.created_by || item.created_by_name || '-'}</TableCell>
                            <TableCell className="text-slate-700 dark:text-slate-300">{item.validBy || item.valid_by || item.validated_by || '-'}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={(item.metode || '').toString().toUpperCase() === 'CASH' ? 'outline' : 'secondary'} className="text-xs">
                                {item.metode || '-'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-700 dark:text-slate-300">
                              {(() => {
                                const metode = (item.metode || '').toString().toUpperCase();
                                if (metode === 'CASH') {
                                  const gramRaw = item.gramasi || item.gram || item.nominal_gr || item.nominalGr || item.nominalGrams || item.gramasiGr;
                                  if (gramRaw !== undefined && gramRaw !== null && (typeof gramRaw === 'number' || String(gramRaw).trim() !== '')) {
                                    const gramNum = typeof gramRaw === 'number' ? gramRaw : parseInt(String(gramRaw).replace(/[^0-9-]/g, ''), 10) || 0;
                                    if (gramNum > 0) return <span className="font-mono">{formatNumber(gramNum)} gr</span>;
                                  }
                                  const fromGramasi = typeof gramRaw === 'object' ? gramRaw.noRekening || gramRaw.no_rekening : gramRaw;
                                  const finalRek = fromGramasi || item.noRekening || item.no_rekening || item.rekening || null;
                                  return finalRek ? <span className="font-mono">{finalRek}</span> : <span className="text-slate-400 dark:text-slate-500">-</span>;
                                }
                                const noRekFromRow = item.noRekening || item.no_rekening || item.rekening || '';
                                const rekId = item.rekeningId || item.rekening_id || null;
                                const master = rekeningList.find((r: any) => r.id === rekId || r._id === rekId || (r.noRekening || r.no_rekening) === noRekFromRow);
                                const kodeBank = master?.kodeBank || master?.kode_bank || item.kodeBank || item.kode_bank || '';
                                const account = master?.noRekening || master?.no_rekening || noRekFromRow || null;
                                if (!account) return <span className="text-slate-400 dark:text-slate-500">-</span>;
                                return <span className="font-mono text-sm">{kodeBank ? `${kodeBank} - ${account}` : account}</span>;
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Total Row */}
                        <TableRow className="bg-slate-50 dark:bg-slate-700/50 border-t-2 border-slate-200 dark:border-slate-600">
                          <TableCell className="font-semibold text-slate-900 dark:text-slate-100" colSpan={4}>Total</TableCell>
                          <TableCell className="text-right font-semibold text-slate-900 dark:text-slate-100">
                            <CurrencyDisplay amount={totalKirim} />
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-900 dark:text-slate-100">
                            <CurrencyDisplay amount={totalSetor} />
                          </TableCell>
                          <TableCell colSpan={4}></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Tampilkan</span>
                      <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                        <SelectTrigger className="w-20 h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {pageSizes.map((size) => (
                            <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-slate-600 dark:text-slate-400">per halaman</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Halaman</span>
                        <span className="px-2 py-1 bg-blue-600 text-white rounded text-sm font-medium">{page}</span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">dari {pageCount}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                        disabled={page >= pageCount}
                        className="h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
