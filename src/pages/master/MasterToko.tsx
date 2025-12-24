import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { masterTokoApi } from '@/services/api/masterTokoApi';

export default function MasterToko() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['master-toko'],
    queryFn: masterTokoApi.getAll,
  });

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const tokoList = Array.isArray(data) ? data : [];
  const totalData = tokoList.length;
  const totalPages = Math.ceil(totalData / pageSize);
  const paginatedToko = tokoList.slice((page - 1) * pageSize, page * pageSize);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Master Toko" description="Daftar seluruh toko/cabang" />
      <Card>
        <CardHeader>
          <CardTitle>Daftar Toko</CardTitle>
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
          ) : error ? (
            <div className="text-destructive">Gagal memuat data</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode Toko</TableHead>
                  <TableHead>Nama Toko</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedToko.map((toko: { kode_toko: string; nama_toko: string }) => (
                  <TableRow key={toko.kode_toko}>
                    <TableCell>{toko.kode_toko}</TableCell>
                    <TableCell>{toko.nama_toko}</TableCell>
                  </TableRow>
                ))}
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
