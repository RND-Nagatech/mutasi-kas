import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { saldoCashApi } from '@/services/api/saldoCashApi';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import RupiahInput from '@/components/ui/rupiah-input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function InputSaldoCash() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [nominal, setNominal] = useState('');
  const [nominalNumber, setNominalNumber] = useState<number>(0);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading, error: errorData } = useQuery({
    queryKey: ['saldo-cash-list'],
    queryFn: saldoCashApi.get,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    if (!nominalNumber || nominalNumber <= 0) {
      setError('Nominal harus lebih dari 0');
      setLoading(false);
      return;
    }
    try {
      await saldoCashApi.input({ nominal: nominalNumber, input_by: user?.username || user?.name || '-' });
      setSuccess(true);
      setNominal('');
      setNominalNumber(0);
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['saldo-cash-list'] });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal menyimpan saldo cash');
    } finally {
      setLoading(false);
    }
  };

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const dataList = Array.isArray(data?.data) ? data.data : [];
  const totalData = dataList.length;
  const totalPages = Math.ceil(totalData / pageSize);
  const paginatedData = dataList.slice((page - 1) * pageSize, page * pageSize);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Master Saldo Cash</h1>
          <p className="text-muted-foreground">Daftar seluruh saldo cash</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="bg-[#295c6a] hover:bg-[#1b3d47] text-white">
          <Plus className="mr-2 h-4 w-4" />
         Tambah Data
        </Button>
      </div>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Saldo Cash</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nominal">Nominal Saldo Cash</Label>
              <RupiahInput
                id="nominal"
                value={nominalNumber}
                onValueChange={(v) => { setNominalNumber(v); setNominal(String(v)); }}
                placeholder="Masukkan nominal saldo cash"
                required
                className={error ? 'border-destructive' : ''}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-[#295c6a] hover:bg-[#1b3d47] text-white" disabled={loading || nominalNumber <= 0}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
            {success && <div className="mt-2 text-green-600">Saldo cash berhasil disimpan!</div>}
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Saldo Cash</CardTitle>
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
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Input Oleh</TableHead>
                  <TableHead>Tanggal Input</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Array.isArray(paginatedData) && paginatedData.length > 0) ? (
                  paginatedData.map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell><CurrencyDisplay amount={item.nominal} /></TableCell>
                      <TableCell>{item.input_by}</TableCell>
                      <TableCell>{item.tanggal ? new Date(item.tanggal).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">Tidak ada data</TableCell>
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
