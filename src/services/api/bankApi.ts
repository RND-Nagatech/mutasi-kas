import { apiClient } from './client';

export const bankApi = {
  async getAll() {
    const response = await apiClient.get('/master/bank');
    return response.data;
  },
  async create(data: { kodeBank: string; namaBank: string; nomorAkun: string }) {
    // Map camelCase to snake_case for backend
    const payload = {
      kode_bank: data.kodeBank,
      nama_bank: data.namaBank,
      nomor_akun: data.nomorAkun,
    };
    const response = await apiClient.post('/master/bank', payload);
    return response.data;
  },
  async update(data: { id: string; kodeBank: string; namaBank: string; nomorAkun: string }) {
    // Map camelCase to snake_case for backend
    const payload = {
      kode_bank: data.kodeBank,
      nama_bank: data.namaBank,
      nomor_akun: data.nomorAkun,
    };
    const response = await apiClient.put(`/master/bank/${data.id}`, payload);
    return response.data;
  },
  async delete(id: string) {
    const response = await apiClient.delete(`/master/bank/${id}`);
    return response.data;
  },
};
