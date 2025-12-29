import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Calendar, FileText, FileSpreadsheet } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StatusBadge } from '@/components/ui/status-badge';
import { CurrencyDisplay } from '@/components/ui/currency-display';
// TODO: Replace toko/rekening with backend API if available
import { mutasiApi } from '@/services/api/mutasiApi';
import { formatDate, formatDateTime, formatRupiah, formatDateForApi, formatNumber } from '@/utils/format';
import { exportKirimanSetoranPdf } from '@/services/export/exportKirimanSetoranPdf';
import { exportKirimanSetoranExcel } from '@/services/export/exportKirimanSetoranExcel';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { MutasiKas, MetodeTransaksi } from '@/types';

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
  
  const { toast } = useToast();

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

  const handleSearch = () => {
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
    setFilters(prev => ({
      ...prev,
      startDate: formatDateForApi(startDate),
      endDate: formatDateForApi(endDate),
      kodeToko: pendingFilters.kodeToko,
      jenisTransaksi: pendingFilters.jenisTransaksi,
      metode: pendingFilters.metode,
      rekeningId: pendingFilters.rekeningId,
    }));
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
    });
    toast({ title: 'Export Excel', description: 'Fitur export Excel akan memanggil endpoint backend' });
  };

  // columns will be computed after tokoList/rekeningList are available

  const mutasiList = Array.isArray(mutasiData) ? mutasiData : (mutasiData?.data || []);
  const tokoList = Array.isArray(tokoData) ? tokoData : (tokoData?.data || []);
  const rekeningList = Array.isArray(rekeningData) ? rekeningData : (rekeningData?.data || []);
  const showRekeningFilter = pendingFilters.metode === 'TRANSFER';

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
          // Transfer: prefer master rekening
          const noRekFromRow = getField(i, 'noRekening', 'no_rekening', 'rekening');
          const rekId = getField(i, 'rekeningId', 'rekening_id');
          const master = rekeningList.find((r: any) => r.noRekening === noRekFromRow || r.no_rekening === noRekFromRow || r.id === rekId || r._id === rekId);
          if (metode === 'TRANSFER') {
            if (master) {
              return (
                <div>
                  <p className="font-mono text-sm">{master.noRekening || master.no_rekening}</p>
                  <p className="text-xs text-muted-foreground">{master.namaRekening || master.nama_rekening}</p>
                </div>
              );
            }
            return noRekFromRow ? <span className="font-mono">{noRekFromRow}</span> : <span className="text-muted-foreground">-</span>;
          }

          // CASH or other: try gramasi (fallback) then row fields
          if (metode === 'CASH') {
            const gramRaw = getField(i, 'gramasi', 'gram', 'nominal_gr', 'nominalGr', 'nominalGrams', 'gramasiGr');
            if (gramRaw !== undefined && gramRaw !== null && (typeof gramRaw === 'number' || String(gramRaw).trim() !== '')) {
              const gramNum = typeof gramRaw === 'number' ? gramRaw : parseInt(String(gramRaw).replace(/[^0-9-]/g, ''), 10) || 0;
              if (gramNum > 0) return <span className="font-mono">{formatNumber(gramNum)} gr</span>;
            }
            const fromGramasi = typeof gramRaw === 'object' ? getField(gramRaw, 'noRekening', 'no_rekening') : gramRaw;
            const finalRek = fromGramasi || noRekFromRow || getField(i, 'no_rekening') || null;
            return finalRek ? <span className="font-mono">{finalRek}</span> : <span className="text-muted-foreground">-</span>;
          }

          const gramasi = getField(i, 'gramasi');
          const fromGramasi = typeof gramasi === 'object' ? getField(gramasi, 'noRekening', 'no_rekening') : gramasi;
          const finalRek = fromGramasi || noRekFromRow || getField(i, 'no_rekening') || null;
          return finalRek ? <span className="font-mono">{finalRek}</span> : <span className="text-muted-foreground">-</span>;
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
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Laporan Kiriman & Setoran Toko"
        description="Lihat laporan kiriman dan setoran berdasarkan toko"
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
                    {startDate ? formatDate(startDate) : 'Pilih'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
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
                    {endDate ? formatDate(endDate) : 'Pilih'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
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

            <div className="space-y-2">
              <Label>Kode Toko</Label>
              <Select
                value={pendingFilters.kodeToko || 'ALL'}
                onValueChange={(value) => setPendingFilters(prev => ({ ...prev, kodeToko: value === 'ALL' ? undefined : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="SEMUA" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="ALL">SEMUA</SelectItem>
                  {tokoList.map((toko: any) => (
                    <SelectItem key={toko.id || toko.kode_toko || toko.kodeToko} value={toko.kodeToko || toko.kode_toko}>
                      {toko.kodeToko || toko.kode_toko} {toko.namaToko || toko.nama_toko ? `- ${toko.namaToko || toko.nama_toko}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Jenis Transaksi</Label>
              <Select
                value={pendingFilters.jenisTransaksi || 'ALL'}
                onValueChange={(value) => setPendingFilters(prev => ({ ...prev, jenisTransaksi: value === 'ALL' ? undefined : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="SEMUA" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="ALL">SEMUA</SelectItem>
                  <SelectItem value="KIRIM">KIRIM</SelectItem>
                  <SelectItem value="TERIMA">TERIMA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Metode</Label>
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

            {showRekeningFilter && (
              <div className="space-y-2">
                <Label>Rekening</Label>
                <Select
                  value={pendingFilters.rekeningId || 'ALL'}
                  onValueChange={(value) => setPendingFilters(prev => ({ ...prev, rekeningId: value === 'ALL' ? undefined : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="SEMUA" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="ALL">SEMUA</SelectItem>
                    {rekeningList.map((rek: any) => (
                      <SelectItem key={rek.id || rek._id || rek.no_rekening} value={rek.id || rek._id}>
                        {rek.noRekening || rek.no_rekening} {rek.namaRekening || rek.nama_rekening ? `- ${rek.namaRekening || rek.nama_rekening}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              Tampilkan Laporan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      {showResults && filters.startDate && filters.endDate && (
        <>
          <DataTable
            columns={columns}
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
                  <td className="p-4" />
                  <td className="p-4 text-right font-semibold text-foreground">
                    <CurrencyDisplay amount={totalKirim} />
                  </td>
                  <td className="p-4 text-right font-semibold text-foreground">
                    <CurrencyDisplay amount={totalSetor} />
                  </td>
                  <td className="p-4" />
                  <td className="p-4" />
                  <td className="p-4" />
                  <td className="p-4" />
                </tr>
              </>
            )}
          />

          {/* External pagination + export (styled) */}
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

          {/* Totals moved into the table footer above */}

          {/* Summary cards removed */}
        </>
      )}
    </div>
  );
}
