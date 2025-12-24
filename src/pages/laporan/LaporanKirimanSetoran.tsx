import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Calendar } from 'lucide-react';
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
import { formatDate, formatDateTime, formatRupiah, formatDateForApi } from '@/utils/format';
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

  const { data: mutasiData, isLoading } = useQuery({
    queryKey: ['laporan-kiriman-setoran', filters],
    queryFn: () => mutasiApi.getMutasi({
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
      key: 'rekening',
      header: 'Rekening',
      cell: (item) => item.noRekening ? (
        <div>
          <p className="font-mono text-sm">{item.noRekening}</p>
          <p className="text-xs text-muted-foreground">{item.namaRekening}</p>
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
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
      cell: (item) => <StatusBadge status={item.status} />,
    },
  ];

  const mutasiList = mutasiData?.data || [];
  const tokoList = tokoData?.data || [];
  const rekeningList = rekeningData?.data || [];
  const showRekeningFilter = filters.metode === 'TRANSFER';

  // Calculate totals by status
  const totalByStatus = {
    DONE: mutasiList.filter(m => m.status === 'DONE').reduce((sum, m) => sum + m.nominalKirim, 0),
    OPEN: mutasiList.filter(m => m.status === 'OPEN').reduce((sum, m) => sum + m.nominalKirim, 0),
    CANCEL: mutasiList.filter(m => m.status === 'CANCEL').reduce((sum, m) => sum + m.nominalKirim, 0),
  };

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
                    {startDate ? formatDate(startDate) : 'Pilih'}
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
                    {endDate ? formatDate(endDate) : 'Pilih'}
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
                  <SelectValue placeholder="Semua" />
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
              <Label>Jenis Transaksi</Label>
              <Select
                value={filters.jenisTransaksi || 'ALL'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, jenisTransaksi: value === 'ALL' ? undefined : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="ALL">Semua</SelectItem>
                  <SelectItem value="KIRIM">Kirim</SelectItem>
                  <SelectItem value="SETORAN">Setoran</SelectItem>
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
                    metode: value === 'ALL' ? undefined : (value as MetodeTransaksi),
                    rekeningId: value !== 'TRANSFER' ? undefined : prev.rekeningId,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="ALL">Semua</SelectItem>
                  <SelectItem value="CASH">CASH</SelectItem>
                  <SelectItem value="TRANSFER">TRANSFER</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showRekeningFilter && (
              <div className="space-y-2">
                <Label>Rekening</Label>
                <Select
                  value={filters.rekeningId || 'ALL'}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, rekeningId: value === 'ALL' ? undefined : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="ALL">Semua</SelectItem>
                    {rekeningList.map((rek) => (
                      <SelectItem key={rek.id} value={rek.id}>
                        {rek.noRekening}
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
      {filters.startDate && filters.endDate && (
        <>
          <DataTable
            columns={columns}
            data={mutasiList}
            isLoading={isLoading}
            keyExtractor={(item) => item.id}
            emptyMessage="Tidak ada data untuk filter yang dipilih"
          />

          {/* Summary Cards */}
          {mutasiList.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="py-4">
                  <p className="text-sm text-muted-foreground">Total Selesai</p>
                  <p className="text-xl font-bold text-success">{formatRupiah(totalByStatus.DONE)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <p className="text-sm text-muted-foreground">Total Open</p>
                  <p className="text-xl font-bold text-info">{formatRupiah(totalByStatus.OPEN)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <p className="text-sm text-muted-foreground">Total Dibatalkan</p>
                  <p className="text-xl font-bold text-destructive">{formatRupiah(totalByStatus.CANCEL)}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
