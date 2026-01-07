import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { rekeningApi } from '@/services/api/rekeningApi';
import { saldoRekeningApi } from '@/services/api/saldoRekeningApi';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { DataTable, type Column } from '@/components/ui/data-table';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RupiahInput from '@/components/ui/rupiah-input';
import { Label } from '@/components/ui/label';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
    if (!noRekening || !nominal || Number(nominal) <= 0) {
      setError('Rekening dan nominal harus diisi, nominal harus > 0');
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

  const columns: Column<any>[] = [
    {
      key: 'noRekening',
      header: 'No Rekening',
      cell: (item) => <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{item.no_rekening || item.noRekening}</span>,
    },
    {
      key: 'nominal',
      header: 'Nominal',
      cell: (item) => <CurrencyDisplay amount={item.nominal} />,
    },
    {
      key: 'inputBy',
      header: 'Input Oleh',
      cell: (item) => <span className="text-slate-700 dark:text-slate-300">{item.input_by}</span>,
    },
    {
      key: 'tanggal',
      header: 'Tanggal Input',
      cell: (item) => {
        const date = item.tanggal || item.created_at;
        if (!date) return <span className="text-slate-500 dark:text-slate-400">-</span>;
        return (
          <div className="text-sm">
            <div className="font-medium text-slate-900 dark:text-slate-100">
              {new Date(date).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}
            </div>
            <div className="text-slate-500 dark:text-slate-400">
              {new Date(date).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Master Saldo Rekening</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Kelola data saldo rekening untuk transaksi</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200" 
          onClick={() => setIsFormOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah Data
        </Button>
      </div>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Tambah Saldo Rekening
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Masukkan informasi saldo rekening baru
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="rekening" className="text-sm font-medium text-slate-700 dark:text-slate-300">Rekening</Label>
              <Select value={noRekening} onValueChange={setNoRekening} required>
                <SelectTrigger id="rekening" className={`border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500 ${!noRekening ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}>
                  <SelectValue placeholder="Pilih rekening" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  {rekeningList.map((r: any) => (
                    <SelectItem key={r.id} value={r.noRekening}>{r.namaRekening}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!noRekening && error && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  Rekening wajib dipilih
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nominal" className="text-sm font-medium text-slate-700 dark:text-slate-300">Nominal Saldo Rekening</Label>
              <RupiahInput
                id="nominal"
                value={nominal ? Number(nominal) : undefined}
                onValueChange={(val) => setNominal(String(val))}
                placeholder="Masukkan nominal saldo rekening"
                required
                className={`border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500 ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
              />
              {error && <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                {error}
              </p>}
            </div>
            <DialogFooter className="gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsFormOpen(false)}
                className="border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200" 
                disabled={loading || Number(nominal) <= 0}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
            {success && <div className="mt-2 text-green-600 dark:text-green-400">Saldo rekening berhasil disimpan!</div>}
          </form>
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tampilkan</span>
          <select
            id="pageSize"
            value={pageSize}
            onChange={handlePageSizeChange}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value={10}>10</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-slate-600 dark:text-slate-400">data per halaman</span>
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Total: <span className="font-semibold text-slate-900 dark:text-slate-100">{totalData}</span> rekening
        </div>
      </div>

      <DataTable
        columns={columns}
        data={paginatedSaldo}
        isLoading={isLoadingSaldo}
        keyExtractor={(item) => `${item.no_rekening || item.noRekening}`}
        emptyMessage="Belum ada data saldo rekening"
        className="shadow-sm bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50"
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Menampilkan {Math.min((page - 1) * pageSize + 1, totalData)} - {Math.min(page * pageSize, totalData)} dari {totalData} rekening
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => handlePageChange(page - 1)}
              className="border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            >
              Sebelumnya
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      pageNum === page
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
