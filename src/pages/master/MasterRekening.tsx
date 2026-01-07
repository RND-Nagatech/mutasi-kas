import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { rekeningApi } from '@/services/api/rekeningApi';
import { bankApi } from '@/services/api/bankApi';
import { formatDateTimeWIB } from '@/utils/format';
import { useToast } from '@/hooks/use-toast';
import type { Rekening, CreateRekeningRequest } from '@/types';

const rekeningSchema = z.object({
  bankId: z.string().min(1, 'Bank wajib dipilih'),
  noRekening: z.string().min(1, 'No Rekening wajib diisi').max(50, 'Maksimal 50 karakter'),
  namaRekening: z.string().min(1, 'Nama Rekening wajib diisi').max(100, 'Maksimal 100 karakter'),
});

type RekeningFormData = {
  bankId: string;
  noRekening: string;
  namaRekening: string;
};

export default function MasterRekening() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRekening, setSelectedRekening] = useState<Rekening | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rekeningData, isLoading, error: rekeningError } = useQuery({
    queryKey: ['rekening'],
    queryFn: () => rekeningApi.getAll(),
  });

  if (rekeningError) {
    // eslint-disable-next-line no-console
    console.error('Error fetching rekening:', rekeningError);
  }

  const { data: banksData } = useQuery({
    queryKey: ['banks'],
    queryFn: () => bankApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateRekeningRequest) => rekeningApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['rekening'] });
      toast({ title: 'Berhasil', description: response.message });
      handleCloseForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string } & CreateRekeningRequest) => rekeningApi.update(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['rekening'] });
      toast({ title: 'Berhasil', description: response.message });
      handleCloseForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rekeningApi.delete(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['rekening'] });
      toast({ title: 'Berhasil', description: response.message });
      setIsDeleteOpen(false);
      setSelectedRekening(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<RekeningFormData>({
    resolver: zodResolver(rekeningSchema),
  });

  const handleOpenForm = (rekening?: Rekening) => {
    if (rekening) {
      setSelectedRekening(rekening);
      reset({
        bankId: rekening.kodeBank || '',
        noRekening: rekening.noRekening || '',
        namaRekening: rekening.namaRekening || '',
      });
    } else {
      setSelectedRekening(null);
      reset({ bankId: '', noRekening: '', namaRekening: '' });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedRekening(null);
    reset();
  };

  const onSubmit = (data: RekeningFormData) => {
    // Gunakan camelCase sesuai dengan tipe CreateRekeningRequest
    const payload: CreateRekeningRequest = {
      bankId: data.bankId,
      noRekening: data.noRekening,
      namaRekening: data.namaRekening,
    };
    if (selectedRekening) {
      updateMutation.mutate({
        id: selectedRekening.id,
        ...payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (rekening: Rekening) => {
    setSelectedRekening(rekening);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedRekening) {
      deleteMutation.mutate(selectedRekening.id);
    }
  };

  const columns: Column<Rekening>[] = [
    {
      key: 'bank',
      header: 'Bank',
      cell: (item) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">{item.kodeBank}</p>
        </div>
      ),
    },
    {
      key: 'noRekening',
      header: 'No Rekening',
      cell: (item) => <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{item.noRekening}</span>,
    },
    {
      key: 'namaRekening',
      header: 'Nama Rekening',
      cell: (item) => <span className="font-medium text-slate-900 dark:text-slate-100">{item.namaRekening}</span>,
    },
    {
      key: 'createdAt',
      header: 'Dibuat',
      cell: (item) => {
        if (!item.createdAt || isNaN(new Date(item.createdAt).getTime())) {
          return <span className="text-slate-500 dark:text-slate-400">-</span>;
        }
        return (
          <div className="text-sm">
            <div className="font-medium text-slate-900 dark:text-slate-100">{formatDateTimeWIB(item.createdAt).split(',')[0]}</div>
            <div className="text-slate-500 dark:text-slate-400">{formatDateTimeWIB(item.createdAt).split(',')[1]?.trim()}</div>
          </div>
        );
      },
    },
    {
      key: 'editedBy',
      header: 'Diedit oleh',
      cell: (item) => <span className="text-slate-700 dark:text-slate-300">{item.editedBy ? item.editedBy : '-'}</span>,
    },
    {
      key: 'actions',
      header: '',
      cell: (item) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenForm(item);
            }}
            className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(item);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      className: 'w-20',
    },
  ];

  // Data rekening sudah di-mapping di rekeningApi.getAll
  const rekeningList = Array.isArray(rekeningData) ? rekeningData : [];
  // Map _id to id for frontend consistency
  const banks = Array.isArray(banksData?.data)
    ? banksData.data.map((item: any) => ({ ...item, id: item._id }))
    : [];
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalData = rekeningList.length;
  const totalPages = Math.ceil(totalData / pageSize);
  const paginatedRekening = rekeningList.slice((page - 1) * pageSize, page * pageSize);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Master Rekening</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">Kelola data rekening bank untuk transaksi</p>
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200" 
              onClick={() => handleOpenForm()}
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah Rekening
            </Button>
          </div>

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
            data={paginatedRekening}
            isLoading={isLoading}
            keyExtractor={(item) => item.id}
            emptyMessage="Belum ada data rekening"
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

          {/* Form Dialog */}
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
              <DialogHeader className="space-y-3">
                <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {selectedRekening ? 'Edit Rekening' : 'Tambah Rekening Baru'}
                </DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400">
                  {selectedRekening
                    ? 'Perbarui informasi rekening yang ada'
                    : 'Masukkan informasi rekening baru'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="bankId" className="text-sm font-medium text-slate-700 dark:text-slate-300">Bank</Label>
                  <Controller
                    name="bankId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={`border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500 ${errors.bankId ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}>
                          <SelectValue placeholder="Pilih Bank" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          {Array.isArray(banks) && banks.length > 0 ? (
                            banks.map((bank) => (
                              <SelectItem key={String(bank._id)} value={String(bank.kode_bank)}>
                                {bank.kode_bank} - {bank.nama_bank}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">Tidak ada bank tersedia</div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.bankId && (
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.bankId.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="noRekening" className="text-sm font-medium text-slate-700 dark:text-slate-300">No Rekening</Label>
                  <Input
                    id="noRekening"
                    placeholder="Contoh: 1234567890"
                    {...register('noRekening')}
                    className={`border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500 ${errors.noRekening ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  />
                  {errors.noRekening && (
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.noRekening.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="namaRekening" className="text-sm font-medium text-slate-700 dark:text-slate-300">Nama Rekening</Label>
                  <Input
                    id="namaRekening"
                    placeholder="Contoh: PT Mutasi Kas Pusat"
                    {...register('namaRekening')}
                    className={`border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500 ${errors.namaRekening ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  />
                  {errors.namaRekening && (
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.namaRekening.message}
                    </p>
                  )}
                </div>

                <DialogFooter className="gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCloseForm}
                    className="border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {selectedRekening ? 'Simpan Perubahan' : 'Tambah Rekening'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation */}
          <ConfirmDialog
            open={isDeleteOpen}
            onOpenChange={setIsDeleteOpen}
            title="Hapus Rekening"
            description={`Apakah Anda yakin ingin menghapus rekening "${selectedRekening?.noRekening}"? Tindakan ini tidak dapat dibatalkan.`}
            confirmText="Hapus"
            variant="destructive"
            isLoading={deleteMutation.isPending}
            onConfirm={confirmDelete}
          />
        </div>
  );
}
