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
  }) {
    const response = await apiClient.get('/transaksi/mutasi', { params });
    return response.data;
  },
  async cancelMutasi(id: string) {
    const response = await apiClient.post(`/transaksi/mutasi/${id}/batal`);
    return response.data;
  },
};
