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
   <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Master Toko</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">Daftar seluruh toko/cabang</p>
            </div>
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
              Total: <span className="font-semibold text-slate-900 dark:text-slate-100">{totalData}</span> toko
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-slate-600 dark:text-slate-400">Memuat data...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-red-600 dark:text-red-400">
                Gagal memuat data toko
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-visible bg-white dark:bg-slate-800/50">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 hover:from-slate-100 hover:to-slate-50 dark:hover:from-slate-700 dark:hover:to-slate-800 border-b border-slate-200 dark:border-slate-700">
                      <TableHead className="font-semibold text-foreground py-4 px-6">Kode Toko</TableHead>
                      <TableHead className="font-semibold text-foreground py-4 px-6">Nama Toko</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedToko.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="h-32 text-center text-slate-500 dark:text-slate-400">
                          Belum ada data toko
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedToko.map((toko: { kode_toko: string; nama_toko: string }, index: number) => (
                        <TableRow 
                          key={toko.kode_toko}
                          className={`transition-all duration-200 border-b border-slate-100 dark:border-slate-700/50 ${
                            index % 2 === 0 
                              ? 'bg-white/30 dark:bg-slate-800/30' 
                              : 'bg-slate-50/30 dark:bg-slate-700/30'
                          } hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:scale-[1.002] hover:z-10 relative`}
                        >
                          <TableCell className="py-4 px-6">
                            <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{toko.kode_toko}</span>
                          </TableCell>
                          <TableCell className="py-4 px-6">
                            <span className="font-medium text-slate-900 dark:text-slate-100">{toko.nama_toko}</span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Menampilkan {Math.min((page - 1) * pageSize + 1, totalData)} - {Math.min(page * pageSize, totalData)} dari {totalData} toko
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={page === 1}
                      onClick={() => handlePageChange(page - 1)}
                    >
                      Sebelumnya
                    </button>
                    
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

                    <button
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={page === totalPages}
                      onClick={() => handlePageChange(page + 1)}
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
  );
}
