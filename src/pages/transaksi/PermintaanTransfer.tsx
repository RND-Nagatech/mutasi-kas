import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, type Column } from '@/components/ui/data-table';
import RupiahInput from '@/components/ui/rupiah-input';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate, formatDateTime, formatDateForApi } from '@/utils/format';
import { masterTokoApi } from '@/services/api/masterTokoApi';
import { rekeningApi } from '@/services/api/rekeningApi';
import { permintaanTransferApi } from '@/services/api/permintaanTransferApi';
import type {
  PermintaanTransfer,
  StatusPermintaanTransfer,
  CreatePermintaanTransferRequest,
} from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const formSchema = z.object({
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  nominalRp: z.number().min(1, 'Nominal wajib diisi'),
  inputBy: z.string().min(1, 'Input by wajib diisi'),
  noRekeningTujuan: z.string().min(1, 'Rekening tujuan wajib diisi'),
  namaBankTujuan: z.string().min(1, 'Nama bank tujuan wajib diisi'),
  atasNamaPenerima: z.string().min(1, 'Atas nama penerima wajib diisi'),
  kodeTokoPeminta: z.string().min(1, 'Toko peminta wajib dipilih'),
});

type FormValues = z.infer<typeof formSchema>;

const today = new Date();

export default function PermintaanTransferPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    startDate: formatDateForApi(today),
    endDate: formatDateForApi(today),
    kodeToko: 'ALL',
    status: 'ALL' as 'ALL' | StatusPermintaanTransfer,
  });
  const [searchParams, setSearchParams] = useState<null | {
    startDate: string;
    endDate: string;
    kodeToko?: string;
    status?: 'ALL' | StatusPermintaanTransfer;
  }>({
    startDate: formatDateForApi(today),
    endDate: formatDateForApi(today),
    status: 'ALL',
  });

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<PermintaanTransfer | null>(null);
  const [selectedSourceRekening, setSelectedSourceRekening] = useState('');
  const [selected, setSelected] = useState<PermintaanTransfer | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: tokoData } = useQuery({
    queryKey: ['toko'],
    queryFn: () => masterTokoApi.getAll(),
  });

  const { data: rekeningData } = useQuery({
    queryKey: ['rekening'],
    queryFn: () => rekeningApi.getAll(),
  });

  const { data: listData, isLoading } = useQuery({
    queryKey: ['permintaan-transfer', searchParams],
    enabled: !!searchParams,
    refetchOnMount: 'always',
    queryFn: async () => {
      if (!searchParams) return [];
      return permintaanTransferApi.list({
        startDate: searchParams.startDate,
        endDate: searchParams.endDate,
        kodeToko: searchParams.kodeToko,
        status: searchParams.status,
      });
    },
  });
  const { data: openListData, isLoading: isLoadingOpenList } = useQuery({
    queryKey: ['permintaan-transfer-open-highlight'],
    refetchOnMount: 'always',
    queryFn: async () => {
      return permintaanTransferApi.list({
        status: 'OPEN',
      });
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tanggal: formatDateForApi(today),
      nominalRp: 0,
      inputBy: '',
      noRekeningTujuan: '',
      namaBankTujuan: '',
      atasNamaPenerima: '',
      kodeTokoPeminta: '',
    },
  });

  const openCreate = () => {
    setSelected(null);
    form.reset({
      tanggal: formatDateForApi(today),
      nominalRp: 0,
      inputBy: '',
      noRekeningTujuan: '',
      namaBankTujuan: '',
      atasNamaPenerima: '',
      kodeTokoPeminta: '',
    });
    setFormOpen(true);
  };

  const openEdit = (item: PermintaanTransfer) => {
    setSelected(item);
    form.reset({
      tanggal: item.tanggal ? formatDateForApi(new Date(item.tanggal)) : formatDateForApi(today),
      nominalRp: item.nominalRp || 0,
      inputBy: item.inputBy || '',
      noRekeningTujuan: item.noRekeningTujuan || '',
      namaBankTujuan: item.namaBankTujuan || '',
      atasNamaPenerima: item.atasNamaPenerima || '',
      kodeTokoPeminta: item.kodeTokoPeminta || '',
    });
    setFormOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: CreatePermintaanTransferRequest = {
        tanggal: new Date(values.tanggal).toISOString(),
        nominalRp: values.nominalRp,
        inputBy: values.inputBy,
        noRekeningTujuan: values.noRekeningTujuan,
        namaBankTujuan: values.namaBankTujuan,
        atasNamaPenerima: values.atasNamaPenerima,
        kodeTokoPeminta: values.kodeTokoPeminta,
      };
      if (selected) {
        return permintaanTransferApi.update(selected.id, payload);
      }
      return permintaanTransferApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permintaan-transfer'] });
      toast({
        title: 'Berhasil',
        description: selected ? 'Permintaan transfer diperbarui' : 'Permintaan transfer dibuat',
      });
      setFormOpen(false);
      setSelected(null);
    },
    onError: (err: any) => {
      toast({
        title: 'Gagal',
        description: err?.response?.data?.message || err?.message || 'Terjadi kesalahan',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => permintaanTransferApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permintaan-transfer'] });
      toast({ title: 'Berhasil', description: 'Permintaan transfer dihapus' });
    },
    onError: (err: any) => {
      toast({
        title: 'Gagal',
        description: err?.response?.data?.message || err?.message || 'Gagal menghapus data',
        variant: 'destructive',
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      noRekeningSumber,
    }: {
      id: string;
      status: 'APPROVED' | 'REJECTED';
      noRekeningSumber?: string;
    }) => permintaanTransferApi.changeStatus(id, status, noRekeningSumber),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['permintaan-transfer'] });
      setApproveOpen(false);
      setApproveTarget(null);
      setSelectedSourceRekening('');
      toast({
        title: 'Berhasil',
        description:
          variables.status === 'APPROVED'
            ? 'Permintaan transfer disetujui dan saldo rekening sumber dikurangi'
            : 'Permintaan transfer ditolak',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Gagal',
        description: err?.response?.data?.message || err?.message || 'Gagal mengubah status',
        variant: 'destructive',
      });
    },
  });

  const handleDelete = (item: PermintaanTransfer) => {
    setSelected(item);
    setDeleteOpen(true);
  };

  const handleOpenApprove = (item: PermintaanTransfer) => {
    setApproveTarget(item);
    setSelectedSourceRekening('');
    setApproveOpen(true);
  };

  const handleConfirmApprove = () => {
    if (!approveTarget) return;
    if (!selectedSourceRekening) {
      toast({
        title: 'Validasi',
        description: 'Pilih rekening sumber terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    statusMutation.mutate({
      id: approveTarget.id,
      status: 'APPROVED',
      noRekeningSumber: selectedSourceRekening,
    });
  };

  const handleSearch = () => {
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    if (start.getTime() > end.getTime()) {
      toast({
        title: 'Validasi',
        description: 'Tanggal awal tidak boleh lebih besar dari tanggal akhir',
        variant: 'destructive',
      });
      return;
    }

    setSearchParams({
      startDate: filters.startDate,
      endDate: filters.endDate,
      kodeToko: filters.kodeToko === 'ALL' ? undefined : filters.kodeToko,
      status: filters.status,
    });
  };

  const handleResetFilter = () => {
    const resetValue = {
      startDate: formatDateForApi(today),
      endDate: formatDateForApi(today),
      kodeToko: 'ALL',
      status: 'ALL' as 'ALL' | StatusPermintaanTransfer,
    };
    setFilters(resetValue);
    setSearchParams({
      startDate: resetValue.startDate,
      endDate: resetValue.endDate,
      status: 'ALL',
    });
  };

  const list = Array.isArray(listData) ? listData : [];
  const openList = Array.isArray(openListData) ? openListData : [];
  const tokoList = Array.isArray(tokoData) ? tokoData : [];
  const rekeningList = Array.isArray(rekeningData) ? rekeningData : [];

  const columns: Column<PermintaanTransfer>[] = useMemo(
    () => [
      {
        key: 'tanggal',
        header: 'Tanggal',
        cell: (item) => formatDate(item.tanggal),
      },
      {
        key: 'kodeTokoPeminta',
        header: 'Toko Peminta',
        cell: (item) => {
          const toko = tokoList.find((t: any) => (t.kode_toko || t.kodeToko) === item.kodeTokoPeminta);
          return (
            <div>
              <p className="font-medium">{item.kodeTokoPeminta}</p>
              <p className="text-xs text-muted-foreground">{toko?.nama_toko || toko?.namaToko || '-'}</p>
            </div>
          );
        },
      },
      {
        key: 'rekening',
        header: 'Rekening Tujuan',
        cell: (item) => item.noRekeningTujuan,
      },
      {
        key: 'bankTujuan',
        header: 'Bank Tujuan',
        cell: (item) => item.namaBankTujuan || '-',
      },
      {
        key: 'penerima',
        header: 'Atas Nama',
        cell: (item) => item.atasNamaPenerima || '-',
      },
      {
        key: 'inputBy',
        header: 'Input By',
        cell: (item) => item.inputBy || '-',
      },
      {
        key: 'nominalRp',
        header: 'Nominal',
        className: 'text-right',
        cell: (item) => (
          <span>
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              maximumFractionDigits: 0,
            }).format(item.nominalRp || 0)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (item) => <StatusBadge status={item.status} />,
      },
      {
        key: 'actions',
        header: 'Aksi',
        cell: (item) => {
          const isOpen = item.status === 'OPEN';
          return (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelected(item);
                  setDetailOpen(true);
                }}
              >
                Detail
              </Button>
              <Button variant="outline" size="sm" disabled={!isOpen} onClick={() => openEdit(item)}>
                Edit
              </Button>
              <Button variant="destructive" size="sm" disabled={!isOpen} onClick={() => handleDelete(item)}>
                Delete
              </Button>
              {isOpen && (
                <>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleOpenApprove(item)}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => statusMutation.mutate({ id: item.id, status: 'REJECTED' })}
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [statusMutation, tokoList]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Permintaan Transfer" description="Kelola permintaan transfer antar toko" />

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>Gunakan filter lalu klik tampilkan data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label>Tanggal Awal</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Akhir</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Toko Peminta</Label>
              <Select
                value={filters.kodeToko}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, kodeToko: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua toko" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="ALL">Semua Toko</SelectItem>
                  {tokoList.map((item: any) => (
                    <SelectItem key={item.kode_toko || item.kodeToko} value={item.kode_toko || item.kodeToko}>
                      {(item.kode_toko || item.kodeToko) + ' - ' + (item.nama_toko || item.namaToko)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value: 'ALL' | StatusPermintaanTransfer) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="ALL">Semua</SelectItem>
                  <SelectItem value="OPEN">OPEN</SelectItem>
                  <SelectItem value="APPROVED">APPROVED</SelectItem>
                  <SelectItem value="REJECTED">REJECTED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={handleResetFilter} className="sm:w-32">
              Reset
            </Button>
            <Button onClick={handleSearch} className="sm:w-36">
              <Search className="mr-2 h-4 w-4" />
              Tampilkan
            </Button>
            <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 sm:w-32">
              <Plus className="mr-2 h-4 w-4" />
              Tambah
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permintaan Transfer OPEN</CardTitle>
          <CardDescription>
            Menampilkan antrian permintaan transfer yang masih perlu direview ({openList.length} data)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={openList}
            isLoading={isLoadingOpenList}
            keyExtractor={(item) => item.id}
            emptyMessage="Tidak ada permintaan transfer yang berstatus OPEN"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Permintaan Transfer</CardTitle>
          <CardDescription>Total: {list.length} data</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={list}
            isLoading={isLoading}
            keyExtractor={(item) => item.id}
            emptyMessage="Belum ada data permintaan transfer"
          />
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected ? 'Edit Permintaan Transfer' : 'Tambah Permintaan Transfer'}</DialogTitle>
            <DialogDescription>Lengkapi data permintaan transfer</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))} className="space-y-4">
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Input type="date" {...form.register('tanggal')} />
              {form.formState.errors.tanggal && (
                <p className="text-xs text-destructive">{form.formState.errors.tanggal.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Nominal</Label>
              <Controller
                name="nominalRp"
                control={form.control}
                render={({ field }) => (
                  <RupiahInput
                    value={field.value}
                    onValueChange={(val) => field.onChange(val)}
                    placeholder="0"
                  />
                )}
              />
              {form.formState.errors.nominalRp && (
                <p className="text-xs text-destructive">{form.formState.errors.nominalRp.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Rekening Tujuan</Label>
              <Input {...form.register('noRekeningTujuan')} placeholder="Masukkan rekening tujuan pihak ketiga" />
              {form.formState.errors.noRekeningTujuan && (
                <p className="text-xs text-destructive">{form.formState.errors.noRekeningTujuan.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Input By</Label>
              <Input {...form.register('inputBy')} placeholder="Masukkan nama penginput" />
              {form.formState.errors.inputBy && (
                <p className="text-xs text-destructive">{form.formState.errors.inputBy.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Nama Bank Tujuan</Label>
              <Input {...form.register('namaBankTujuan')} placeholder="Masukkan nama bank tujuan" />
              {form.formState.errors.namaBankTujuan && (
                <p className="text-xs text-destructive">{form.formState.errors.namaBankTujuan.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Atas Nama Penerima</Label>
              <Input {...form.register('atasNamaPenerima')} placeholder="Masukkan nama penerima" />
              {form.formState.errors.atasNamaPenerima && (
                <p className="text-xs text-destructive">{form.formState.errors.atasNamaPenerima.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Toko Peminta</Label>
              <Controller
                name="kodeTokoPeminta"
                control={form.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih toko peminta" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {tokoList.map((item: any) => (
                        <SelectItem key={item.kode_toko || item.kodeToko} value={item.kode_toko || item.kodeToko}>
                          {(item.kode_toko || item.kodeToko) + ' - ' + (item.nama_toko || item.namaToko)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.kodeTokoPeminta && (
                <p className="text-xs text-destructive">{form.formState.errors.kodeTokoPeminta.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setFormOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Permintaan Transfer</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              <p>
                <strong>Tanggal:</strong> {formatDate(selected.tanggal)}
              </p>
              <p>
                <strong>Nominal:</strong>{' '}
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  maximumFractionDigits: 0,
                }).format(selected.nominalRp || 0)}
              </p>
              <p>
                <strong>Rekening Tujuan:</strong> {selected.noRekeningTujuan}
              </p>
              <p>
                <strong>Bank Tujuan:</strong> {selected.namaBankTujuan || '-'}
              </p>
              <p>
                <strong>Atas Nama Penerima:</strong> {selected.atasNamaPenerima || '-'}
              </p>
              <p>
                <strong>Toko Peminta:</strong> {selected.kodeTokoPeminta}
              </p>
              <p>
                <strong>Input By:</strong> {selected.inputBy || '-'}
              </p>
              <p>
                <strong>Status:</strong> <StatusBadge status={selected.status} className="ml-2" />
              </p>
              <p>
                <strong>Dibuat Oleh:</strong> {selected.createdBy || '-'}
              </p>
              <p>
                <strong>Dibuat Pada:</strong> {formatDateTime(selected.createdAt)}
              </p>
              <p>
                <strong>Di-review Oleh:</strong> {selected.reviewedBy || '-'}
              </p>
              <p>
                <strong>Rekening Sumber:</strong> {selected.noRekeningSumber || '-'}
              </p>
              <p>
                <strong>No. Transaksi Mutasi:</strong> {selected.noTrxMutasi || '-'}
              </p>
              <p>
                <strong>Di-review Pada:</strong> {selected.reviewedAt ? formatDateTime(selected.reviewedAt) : '-'}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Permintaan Transfer</DialogTitle>
            <DialogDescription>
              Pilih rekening sumber dari master rekening. Saldo rekening sumber akan dikurangi sesuai nominal permintaan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rekening Sumber</Label>
              <Select value={selectedSourceRekening} onValueChange={setSelectedSourceRekening}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih rekening sumber" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {rekeningList.map((rek: any) => (
                    <SelectItem key={rek.id || rek.noRekening} value={rek.noRekening}>
                      {(rek.kodeBank ? rek.kodeBank + ' - ' : '') + rek.noRekening + ' (' + (rek.namaRekening || '-') + ')'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              Batal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleConfirmApprove}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? 'Memproses...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus Permintaan Transfer"
        description={`Yakin ingin menghapus permintaan transfer ini${selected?.noRekeningTujuan ? ` (${selected.noRekeningTujuan})` : ''}?`}
        confirmText="Hapus"
        cancelText="Batal"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (!selected) return;
          deleteMutation.mutate(selected.id, {
            onSuccess: () => {
              setDeleteOpen(false);
              setSelected(null);
            },
          });
        }}
      />
    </div>
  );
}
