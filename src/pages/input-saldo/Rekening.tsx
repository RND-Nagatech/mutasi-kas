import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { rekeningApi } from '@/services/api/rekeningApi';
import { saldoRekeningApi } from '@/services/api/saldoRekeningApi';
import { useAuth } from '@/hooks/useAuth';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function InputSaldoRekening() {
    // ...existing code...

    // Pagination state and logic (must be after saldoList declaration)
    // Move below saldoList declaration

    // Ambil data saldo rekening dari backend (getAll)
    const { data: saldoData, isLoading: isLoadingSaldo } = useQuery<any>({
      queryKey: ['saldo-rekening-list'],
      queryFn: saldoRekeningApi.getAll,
    });
    const saldoList = Array.isArray(saldoData?.data) ? saldoData.data : [];

    // Pagination state and logic
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const saldoListArr = Array.isArray(saldoList) ? saldoList : [];
    const totalData = saldoListArr.length;
    const totalPages = Math.ceil(totalData / pageSize);
    const paginatedSaldo = saldoListArr.slice((page - 1) * pageSize, page * pageSize);

    const handlePageChange = (newPage: number) => {
      setPage(newPage);
    };
    const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setPageSize(Number(e.target.value));
      setPage(1);
    };
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [nominal, setNominal] = useState('');
  const [noRekening, setNoRekening] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: rekeningListData, isLoading: isLoadingRekening } = useQuery<any>({
    queryKey: ['master-rekening'],
    queryFn: rekeningApi.getAll,
  });
  const rekeningList = Array.isArray(rekeningListData)
    ? rekeningListData.map((item: any) => ({
        id: item.id,
        namaRekening: item.namaRekening,
        noRekening: item.noRekening,
        kodeBank: item.kodeBank,
      }))
    : [];
  // ...existing code...

  const queryClient = useQueryClient();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    if (!noRekening || !nominal) {
      setError('Rekening dan nominal harus diisi');
      setLoading(false);
      return;
    }
    try {
      await saldoRekeningApi.input({
        noRekening,
        nominal: Number(nominal),
        input_by: user?.username || user?.name || '-',
      });
      setSuccess(true);
      setNoRekening('');
      setNominal('');
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['saldo-rekening-list'] });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal menyimpan saldo rekening');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Master Saldo Rekening</h1>
          <p className="text-muted-foreground">Daftar seluruh saldo rekening</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} variant="default">
          + Tambah Data
        </Button>
      </div>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Saldo Rekening</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rekening">Rekening</Label>
              <Select value={noRekening} onValueChange={setNoRekening} required>
                <SelectTrigger id="rekening" className="w-full">
                  <SelectValue placeholder="Pilih rekening" />
                </SelectTrigger>
                <SelectContent>
                  {rekeningList.map((r: any) => (
                    <SelectItem key={r.id} value={r.noRekening}>{r.namaRekening}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nominal">Nominal Saldo Rekening</Label>
              <Input
                id="nominal"
                type="number"
                value={nominal}
                onChange={e => setNominal(e.target.value)}
                placeholder="Masukkan nominal saldo rekening"
                required
                className={error ? 'border-destructive' : ''}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-[#295c6a] hover:bg-[#1b3d47] text-white" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
            {success && <div className="mt-2 text-green-600">Saldo rekening berhasil disimpan!</div>}
          </form>
        </DialogContent>
      </Dialog>
      <Card>
        <CardHeader>
          <CardTitle>Daftar Saldo Rekening</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <label htmlFor="pageSize" className="mr-2 text-sm">Tampilkan</label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={handlePageSizeChange}
                className="rounded border px-2 py-1 text-sm"
              >
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="ml-2 text-sm">data</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {totalData}
            </div>
          </div>
          {isLoadingSaldo ? (
            <div>Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Rekening</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Input Oleh</TableHead>
                  <TableHead>Tanggal Input</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSaldo.length > 0 ? (
                  paginatedSaldo.map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{item.no_rekening || item.noRekening}</TableCell>
                      <TableCell>{item.nominal}</TableCell>
                      <TableCell>{item.input_by}</TableCell>
                      <TableCell>{item.tanggal ? new Date(item.tanggal).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : item.created_at ? new Date(item.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Tidak ada data</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                className="rounded border px-2 py-1 text-sm"
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
              >
                Prev
              </button>
              <span className="text-sm">Halaman {page} dari {totalPages}</span>
              <button
                className="rounded border px-2 py-1 text-sm"
                disabled={page === totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
