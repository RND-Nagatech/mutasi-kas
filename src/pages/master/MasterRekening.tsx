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
          <p className="font-medium">{item.kodeBank}</p>
        </div>
      ),
    },
    {
      key: 'noRekening',
      header: 'No Rekening',
      cell: (item) => <span className="font-mono">{item.noRekening}</span>,
    },
    {
      key: 'namaRekening',
      header: 'Nama Rekening',
      cell: (item) => item.namaRekening,
    },
    {
      key: 'createdAt',
      header: 'Dibuat',
      cell: (item) => formatDateTimeWIB(item.createdAt),
    },
    {
      key: 'actions',
      header: '',
      cell: (item) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenForm(item);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(item);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      ),
      className: 'w-24',
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
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Master Rekening"
        description="Kelola data rekening bank untuk transaksi"
        actions={
          <Button className="bg-[#295c6a] hover:bg-[#1b3d47] text-white" onClick={() => handleOpenForm()}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Rekening
          </Button>
        }
      />

      <div className="flex items-center justify-between mb-2">
        <div>
          <label htmlFor="pageSize" className="mr-2 text-sm">Tampilkan</label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={handlePageSizeChange}
            className="border rounded px-2 py-1 text-sm"
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

      <DataTable
        columns={columns}
        data={paginatedRekening}
        isLoading={isLoading}
        keyExtractor={(item) => item.id}
        emptyMessage="Belum ada data rekening"
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-end items-center gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => handlePageChange(page - 1)}
          >
            Prev
          </Button>
          <span className="text-sm">Halaman {page} dari {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedRekening ? 'Edit Rekening' : 'Tambah Rekening Baru'}
            </DialogTitle>
            <DialogDescription>
              {selectedRekening
                ? 'Perbarui informasi rekening yang ada'
                : 'Masukkan informasi rekening baru'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankId">Bank</Label>
              <Controller
                name="bankId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={errors.bankId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Pilih Bank" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {Array.isArray(banks) && banks.length > 0 ? (
                        banks.map((bank) => (
                          <SelectItem key={String(bank._id)} value={String(bank.kode_bank)}>
                            {bank.kode_bank} - {bank.nama_bank}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-muted-foreground">Tidak ada bank tersedia</div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.bankId && (
                <p className="text-xs text-destructive">{errors.bankId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="noRekening">No Rekening</Label>
              <Input
                id="noRekening"
                placeholder="Contoh: 1234567890"
                {...register('noRekening')}
                className={errors.noRekening ? 'border-destructive' : ''}
              />
              {errors.noRekening && (
                <p className="text-xs text-destructive">{errors.noRekening.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="namaRekening">Nama Rekening</Label>
              <Input
                id="namaRekening"
                placeholder="Contoh: PT Mutasi Kas Pusat"
                {...register('namaRekening')}
                className={errors.namaRekening ? 'border-destructive' : ''}
              />
              {errors.namaRekening && (
                <p className="text-xs text-destructive">{errors.namaRekening.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Batal
              </Button>
              <Button type="submit" className="bg-[#295c6a] hover:bg-[#1b3d47] text-white" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedRekening ? 'Simpan' : 'Tambah'}
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
