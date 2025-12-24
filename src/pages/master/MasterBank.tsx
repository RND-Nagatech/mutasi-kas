import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { bankApi } from '@/services/api/bankApi';
import { formatDateTimeWIB } from '@/utils/format';
import { useToast } from '@/hooks/use-toast';
import type { Bank, CreateBankRequest } from '@/types';

const bankSchema = z.object({
  kodeBank: z.string().min(1, 'Kode Bank wajib diisi').max(10, 'Maksimal 10 karakter'),
  namaBank: z.string().min(1, 'Nama Bank wajib diisi').max(100, 'Maksimal 100 karakter'),
  nomorAkun: z.string().min(1, 'Nomor Akun wajib diisi').max(50, 'Maksimal 50 karakter'),
});

type BankFormData = {
  kodeBank: string;
  namaBank: string;
  nomorAkun: string;
};



export default function MasterBank() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: banksData, isLoading } = useQuery({
    queryKey: ['banks'],
    queryFn: () => bankApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateBankRequest) => bankApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast({ title: 'Berhasil', description: response.message });
      handleCloseForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string } & CreateBankRequest) => bankApi.update(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast({ title: 'Berhasil', description: response.message });
      handleCloseForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bankApi.delete(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast({ title: 'Berhasil', description: response.message });
      setIsDeleteOpen(false);
      setSelectedBank(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BankFormData>({
    resolver: zodResolver(bankSchema),
  });

  const handleOpenForm = (bank?: Bank) => {
    if (bank) {
      setSelectedBank(bank);
      reset({
        kodeBank: bank.kodeBank || '',
        namaBank: bank.namaBank || '',
        nomorAkun: bank.nomorAkun || '',
      });
    } else {
      setSelectedBank(null);
      reset({ kodeBank: '', namaBank: '', nomorAkun: '' });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedBank(null);
    reset();
  };

  const onSubmit = (data: BankFormData) => {
    if (selectedBank) {
      updateMutation.mutate({ id: selectedBank.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (bank: Bank) => {
    setSelectedBank(bank);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedBank) {
      deleteMutation.mutate(selectedBank.id);
    }
  };

  const columns: Column<Bank>[] = [
    {
      key: 'kodeBank',
      header: 'Kode Bank',
      cell: (item) => <span className="font-mono font-medium">{item.kodeBank}</span>,
    },
    {
      key: 'namaBank',
      header: 'Nama Bank',
      cell: (item) => item.namaBank,
    },
    {
      key: 'nomorAkun',
      header: 'Nomor Akun',
      cell: (item) => <span className="font-mono">{item.nomorAkun}</span>,
    },
    {
      key: 'createdAt',
      header: 'Dibuat',
      cell: (item) => {
        if (!item.createdAt || isNaN(new Date(item.createdAt).getTime())) {
          return '-';
        }
        return formatDateTimeWIB(item.createdAt);
      },
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

  // Map _id to id for frontend consistency
  const banks = Array.isArray(banksData?.data)
    ? banksData.data.map((item: any) => ({
        ...item,
        id: item._id,
        kodeBank: item.kode_bank,
        namaBank: item.nama_bank,
        nomorAkun: item.nomor_akun,
        createdAt: item.created_at,
      }))
    : [];
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalData = banks.length;
  const totalPages = Math.ceil(totalData / pageSize);
  const paginatedBanks = banks.slice((page - 1) * pageSize, page * pageSize);

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
        title="Master Bank"
        description="Kelola data master bank untuk transaksi"
        actions={
          <Button className="bg-[#295c6a] hover:bg-[#1b3d47] text-white" onClick={() => handleOpenForm()}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Bank
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
        data={paginatedBanks}
        isLoading={isLoading}
        keyExtractor={(item) => item.id}
        emptyMessage="Belum ada data bank"
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
              {selectedBank ? 'Edit Bank' : 'Tambah Bank Baru'}
            </DialogTitle>
            <DialogDescription>
              {selectedBank
                ? 'Perbarui informasi bank yang ada'
                : 'Masukkan informasi bank baru'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kodeBank">Kode Bank</Label>
              <Input
                id="kodeBank"
                placeholder="Contoh: BCA"
                {...register('kodeBank')}
                className={errors.kodeBank ? 'border-destructive' : ''}
              />
              {errors.kodeBank && (
                <p className="text-xs text-destructive">{errors.kodeBank.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="namaBank">Nama Bank</Label>
              <Input
                id="namaBank"
                placeholder="Contoh: Bank Central Asia"
                {...register('namaBank')}
                className={errors.namaBank ? 'border-destructive' : ''}
              />
              {errors.namaBank && (
                <p className="text-xs text-destructive">{errors.namaBank.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nomorAkun">Nomor Akun</Label>
              <Input
                id="nomorAkun"
                placeholder="Contoh: 1234567890"
                {...register('nomorAkun')}
                className={errors.nomorAkun ? 'border-destructive' : ''}
              />
              {errors.nomorAkun && (
                <p className="text-xs text-destructive">{errors.nomorAkun.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Batal
              </Button>
              <Button type="submit" className="bg-[#295c6a] hover:bg-[#1b3d47] text-white" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedBank ? 'Simpan' : 'Tambah'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Hapus Bank"
        description={`Apakah Anda yakin ingin menghapus bank "${selectedBank?.namaBank || ''}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
