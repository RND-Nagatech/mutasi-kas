import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, KeyRound, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiTokenApi } from '@/services/api/apiTokenApi';
import { formatDateTimeWIB } from '@/utils/format';
import type { ApiToken } from '@/types';

const schema = z.object({
  nama: z.string().min(1, 'Nama token wajib diisi'),
  kode_toko: z.string().min(1, 'Kode toko wajib diisi'),
});

type FormValues = z.infer<typeof schema>;

export default function ApiTokenManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<ApiToken | null>(null);
  const [generatedToken, setGeneratedToken] = useState('');
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [filterKodeToko, setFilterKodeToko] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nama: '',
      kode_toko: '',
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['api-tokens'],
    queryFn: () => apiTokenApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: FormValues) => apiTokenApi.create(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
      setFormOpen(false);
      form.reset();
      setGeneratedToken(res.token || '');
      setTokenDialogOpen(true);
      toast({ title: 'Berhasil', description: 'API token berhasil dibuat' });
    },
    onError: (err: any) => {
      toast({
        title: 'Gagal',
        description: err?.response?.data?.message || err?.message || 'Gagal membuat token',
        variant: 'destructive',
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiTokenApi.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
      toast({ title: 'Berhasil', description: 'Status token diperbarui' });
    },
    onError: (err: any) => {
      toast({
        title: 'Gagal',
        description: err?.response?.data?.message || err?.message || 'Gagal update status token',
        variant: 'destructive',
      });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: (id: string) => apiTokenApi.regenerate(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
      setGeneratedToken(res.token || '');
      setTokenDialogOpen(true);
      toast({ title: 'Berhasil', description: 'Token berhasil digenerate ulang' });
    },
    onError: (err: any) => {
      toast({
        title: 'Gagal',
        description: err?.response?.data?.message || err?.message || 'Gagal regenerate token',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiTokenApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
      setDeleteOpen(false);
      setSelected(null);
      toast({ title: 'Berhasil', description: 'Token berhasil dihapus' });
    },
    onError: (err: any) => {
      toast({
        title: 'Gagal',
        description: err?.response?.data?.message || err?.message || 'Gagal hapus token',
        variant: 'destructive',
      });
    },
  });

  const rows = Array.isArray(data) ? data : [];
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchKodeToko = !filterKodeToko || row.kode_toko.toLowerCase().includes(filterKodeToko.toLowerCase());
      const matchStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'ACTIVE' && row.is_active) ||
        (filterStatus === 'INACTIVE' && !row.is_active);
      return matchKodeToko && matchStatus;
    });
  }, [rows, filterKodeToko, filterStatus]);

  const columns: Column<ApiToken>[] = useMemo(
    () => [
      {
        key: 'nama',
        header: 'Nama Token',
        cell: (item) => <span className="font-medium">{item.nama}</span>,
      },
      {
        key: 'kode_toko',
        header: 'Kode Toko',
        cell: (item) => <span className="font-mono">{item.kode_toko}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        cell: (item) =>
          item.is_active ? (
            <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
              Active
            </span>
          ) : (
            <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              Inactive
            </span>
          ),
      },
      {
        key: 'token_version',
        header: 'Versi',
        cell: (item) => <span>{item.token_version}</span>,
      },
      {
        key: 'last_used_at',
        header: 'Terakhir Dipakai',
        cell: (item) =>
          item.last_used_at ? (
            <span>{formatDateTimeWIB(item.last_used_at)}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        key: 'actions',
        header: 'Aksi',
        cell: (item) => (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toggleActiveMutation.mutate({
                  id: item.id,
                  is_active: !item.is_active,
                })
              }
            >
              {item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => regenerateMutation.mutate(item.id)}
            >
              <RefreshCcw className="mr-1 h-4 w-4" />
              Regenerate
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setSelected(item);
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Hapus
            </Button>
          </div>
        ),
      },
    ],
    [toggleActiveMutation, regenerateMutation]
  );

  const copyToken = async () => {
    if (!generatedToken) return;
    try {
      await navigator.clipboard.writeText(generatedToken);
      toast({ title: 'Berhasil', description: 'Token disalin ke clipboard' });
    } catch {
      toast({
        title: 'Gagal',
        description: 'Tidak bisa menyalin token. Silakan copy manual.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        title="Manajemen API Token"
        description="Kelola token aktif untuk integrasi OpenAPI"
        actions={
          <Button onClick={() => setFormOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Buat Token
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Daftar Token</CardTitle>
          <CardDescription>
            Menampilkan {filteredRows.length} dari {rows.length} token
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Filter Kode Toko</Label>
              <Input
                placeholder="Contoh: TK001"
                value={filterKodeToko}
                onChange={(e) => setFilterKodeToko(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Filter Status</Label>
              <Select
                value={filterStatus}
                onValueChange={(value: 'ALL' | 'ACTIVE' | 'INACTIVE') => setFilterStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="ALL">Semua</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterKodeToko('');
                  setFilterStatus('ALL');
                }}
              >
                Reset Filter
              </Button>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={filteredRows}
            isLoading={isLoading}
            keyExtractor={(item) => item.id}
            emptyMessage="Belum ada API token"
          />
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buat API Token</DialogTitle>
            <DialogDescription>
              Token akan mengandung konteks kode toko dan dipakai oleh aplikasi eksternal.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
            <div className="space-y-2">
              <Label>Nama Token</Label>
              <Input {...form.register('nama')} placeholder="Contoh: Integrasi Website Cabang A" />
              {form.formState.errors.nama && (
                <p className="text-xs text-destructive">{form.formState.errors.nama.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Kode Toko</Label>
              <Input {...form.register('kode_toko')} placeholder="Contoh: TK001" />
              {form.formState.errors.kode_toko && (
                <p className="text-xs text-destructive">{form.formState.errors.kode_toko.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                <KeyRound className="mr-2 h-4 w-4" />
                {createMutation.isPending ? 'Membuat...' : 'Generate Token'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Token Berhasil Dibuat</DialogTitle>
            <DialogDescription>
              Simpan token ini sekarang. Token hanya ditampilkan sekali setelah create/regenerate.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-slate-50 p-3">
            <p className="break-all font-mono text-xs text-slate-700">{generatedToken || '-'}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={copyToken}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Token
            </Button>
            <Button onClick={() => setTokenDialogOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus API Token"
        description={`Yakin ingin menghapus token "${selected?.nama || ''}"?`}
        confirmText="Hapus"
        cancelText="Batal"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (selected) deleteMutation.mutate(selected.id);
        }}
      />
    </div>
  );
}
