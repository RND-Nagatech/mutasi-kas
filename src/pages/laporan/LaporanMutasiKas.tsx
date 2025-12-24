import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, FileText, FileSpreadsheet, Calendar } from 'lucide-react';
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
import { formatDate, formatDateTime, formatRupiah, formatDateForApi } from '@/utils/format';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { MutasiKas, LaporanMutasiFilter, MetodeTransaksi } from '@/types';

export default function LaporanMutasiKas() {
  const [filters, setFilters] = useState<LaporanMutasiFilter>({
    type: 'DETAIL',
    startDate: '',
    endDate: '',
    kodeToko: '',
    metode: undefined,
  });
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  
  const { toast } = useToast();

  const { data: tokoData } = useQuery({
    queryKey: ['toko'],
    queryFn: () => masterTokoApi.getAll(),
  });

  const { data: rekeningData } = useQuery({
    queryKey: ['rekening'],
    queryFn: () => rekeningApi.getAll(),
  });

  const { data: mutasiData, isLoading, refetch } = useQuery({
    queryKey: ['laporan-mutasi', filters],
    queryFn: () => mutasiApi.getMutasi({
      type: filters.type,
      startDate: filters.startDate,
      endDate: filters.endDate,
      kodeToko: filters.kodeToko,
      metode: filters.metode,
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
    setFilters(prev => ({
      ...prev,
      startDate: formatDateForApi(startDate),
      endDate: formatDateForApi(endDate),
    }));
  };

  const handleExportPDF = () => {
    toast({
      title: 'Export PDF',
      description: 'Fitur export PDF akan memanggil endpoint backend',
    });
  };

  const handleExportExcel = () => {
    toast({
      title: 'Export Excel',
      description: 'Fitur export Excel akan memanggil endpoint backend',
    });
  };

  // Kolom untuk DETAIL
  const columnsDetail: Column<any>[] = [
    { key: 'no', header: 'No', cell: (item) => mutasiList.indexOf(item) + 1 },
    { key: 'tanggal', header: 'Tanggal', cell: (item) => formatDateTime(item.createdAt || item.tanggal) },
    { key: 'saldoAwal', header: 'Saldo Awal', cell: (item) => <CurrencyDisplay amount={item.saldoAwal} />, className: 'text-right' },
    { key: 'nominalTerima', header: 'Terima', cell: (item) => <CurrencyDisplay amount={item.nominalTerima} />, className: 'text-right' },
    { key: 'nominalKirim', header: 'Kirim', cell: (item) => <CurrencyDisplay amount={item.nominalKirim} />, className: 'text-right' },
    { key: 'saldoAkhir', header: 'Saldo Akhir', cell: (item) => <CurrencyDisplay amount={item.saldoAkhir} />, className: 'text-right' },
    { key: 'keterangan', header: 'Keterangan', cell: (item) => item.keterangan },
    { key: 'noRekening', header: 'No Rekening', cell: (item) => item.noRekening || '-' },
  ];

  // Kolom untuk REKAP
  const columnsRekap: Column<any>[] = [
    { key: 'no', header: 'No', cell: (item) => mutasiList.indexOf(item) + 1 },
    { key: 'tanggal', header: 'Tanggal', cell: (item) => formatDateTime(item.tanggal) },
    { key: 'saldoAwal', header: 'Saldo Awal', cell: (item) => <CurrencyDisplay amount={item.saldoAwal} />, className: 'text-right' },
    { key: 'totalTerima', header: 'Total Terima', cell: (item) => <CurrencyDisplay amount={item.totalTerima} />, className: 'text-right' },
    { key: 'totalKirim', header: 'Total Kirim', cell: (item) => <CurrencyDisplay amount={item.totalKirim} />, className: 'text-right' },
    { key: 'saldoAkhir', header: 'Saldo Akhir', cell: (item) => <CurrencyDisplay amount={item.saldoAkhir} />, className: 'text-right' },
  ];

  const mutasiList = Array.isArray(mutasiData) ? mutasiData : mutasiData?.data || [];
  const tokoList = tokoData?.data || [];

  // Total untuk DETAIL
  const totalTerima = mutasiList.reduce((sum, m) => sum + (m.nominalTerima || 0), 0);
  const totalKirim = mutasiList.reduce((sum, m) => sum + (m.nominalKirim || 0), 0);
  // Total untuk REKAP
  const totalRekapTerima = mutasiList.reduce((sum, m) => sum + (m.totalTerima || 0), 0);
  const totalRekapKirim = mutasiList.reduce((sum, m) => sum + (m.totalKirim || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Laporan Mutasi Kas"
        description="Lihat dan export laporan mutasi kas"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportPDF}>
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        }
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="DETAIL">Detail</SelectItem>
                  <SelectItem value="REKAP">Rekap</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tanggal Awal</Label>
              <Popover>
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
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Tanggal Akhir</Label>
              <Popover>
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
                    onSelect={setEndDate}
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
                  <SelectValue placeholder="Semua Toko" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="ALL">Semua Toko</SelectItem>
                  {tokoList.map((toko) => (
                    <SelectItem key={toko.id} value={toko.kodeToko}>
                      {toko.kodeToko}
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
                  <SelectValue placeholder="Semua Metode" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="ALL">Semua Metode</SelectItem>
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

      {/* Data Table */}
      {filters.startDate && filters.endDate && (
        <>
          {filters.type === 'DETAIL' ? (
            <>
              <DataTable
                columns={columnsDetail}
                data={mutasiList}
                isLoading={isLoading}
                keyExtractor={(item) => item.id}
                emptyMessage="Tidak ada data untuk filter yang dipilih"
              />
              {mutasiList.length > 0 && (
                <Card>
                  <CardContent className="py-4">
                    <div className="flex justify-end items-center gap-8">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Terima</p>
                        <p className="text-xl font-bold">{formatRupiah(totalTerima)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Kirim</p>
                        <p className="text-xl font-bold">{formatRupiah(totalKirim)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <>
              <DataTable
                columns={columnsRekap}
                data={mutasiList}
                isLoading={isLoading}
                keyExtractor={(_item) => String(mutasiList.indexOf(_item))}
                emptyMessage="Tidak ada data untuk filter yang dipilih"
              />
              {mutasiList.length > 0 && (
                <Card>
                  <CardContent className="py-4">
                    <div className="flex justify-end items-center gap-8">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Terima</p>
                        <p className="text-xl font-bold">{formatRupiah(totalRekapTerima)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Kirim</p>
                        <p className="text-xl font-bold">{formatRupiah(totalRekapKirim)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
