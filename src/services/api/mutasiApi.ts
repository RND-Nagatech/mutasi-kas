import { apiClient } from './client';

export const mutasiApi = {
  async createMutasi(data: any) {
    const response = await apiClient.post('/transaksi/mutasi', data);
    return response.data;
  },
  async getMutasi(params?: {
    type?: 'DETAIL' | 'REKAP';
    startDate?: string;
    endDate?: string;
    kodeToko?: string;
    metode?: string;
    jenisTransaksi?: string;
  }) {
    const response = await apiClient.get('/transaksi/mutasi', { params });
    return response.data;
  },
  async cancelMutasi(id: string, alasan?: string) {
    const body: any = {};
    if (alasan !== undefined) body.alasan = alasan;
    const response = await apiClient.post(`/transaksi/mutasi/${id}/batal`, body);
    return response.data;
  },
};
