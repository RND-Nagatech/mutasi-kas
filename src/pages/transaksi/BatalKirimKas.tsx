import { useState } from 'react';
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
import { formatDate, formatDateTime, formatDateForApi } from '@/utils/format';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { MutasiKas } from '@/types';

export default function BatalKirimKas() {
  const [filters, setFilters] = useState({
    tanggal: '',
    kodeToko: '',
    noTransaksi: '',
  });
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [selectedMutasi, setSelectedMutasi] = useState<MutasiKas | null>(null);
  const [alasan, setAlasan] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tokoData } = useQuery({
    queryKey: ['toko'],
    queryFn: () => mockTokoService.getAll(),
  });

  const { data: mutasiData, isLoading, refetch } = useQuery({
    queryKey: ['cancelable-mutasi', filters],
    queryFn: () => mockMutasiService.getCancelableMutasi({
      tanggal: filters.tanggal || undefined,
      kodeToko: filters.kodeToko || undefined,
      noTransaksi: filters.noTransaksi || undefined,
    }),
  });

  const batalMutation = useMutation({
    mutationFn: (data: { id: string }) => mutasiApi.cancelMutasi(data.id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['cancelable-mutasi'] });
      queryClient.invalidateQueries({ queryKey: ['recent-mutasi'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
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
    setFilters(prev => ({
      ...prev,
      tanggal: date ? formatDateForApi(date) : '',
    }));
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
    setFilters({ tanggal: '', kodeToko: '', noTransaksi: '' });
    setSelectedDate(undefined);
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

  const mutasiList = mutasiData?.data || [];
  const tokoList = tokoData?.data || [];
  const hasFilters = filters.tanggal || filters.kodeToko || filters.noTransaksi;

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
              <Popover>
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
                value={filters.kodeToko}
                onValueChange={(value) => setFilters(prev => ({ ...prev, kodeToko: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua Toko" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="">Semua Toko</SelectItem>
                  {tokoList.map((toko) => (
                    <SelectItem key={toko.id} value={toko.kodeToko}>
                      {toko.kodeToko} - {toko.namaToko}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>No. Transaksi</Label>
              <Input
                placeholder="Cari no. transaksi"
                value={filters.noTransaksi}
                onChange={(e) => setFilters(prev => ({ ...prev, noTransaksi: e.target.value }))}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={() => refetch()} className="flex-1">
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
        data={mutasiList}
        isLoading={isLoading}
        keyExtractor={(item) => item.id}
        emptyMessage="Tidak ada transaksi yang dapat dibatalkan"
      />

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
