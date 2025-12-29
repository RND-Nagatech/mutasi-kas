import { apiClient } from './client';

export const bankApi = {
  async getAll() {
    const response = await apiClient.get('/master/bank');
    // Map snake_case to camelCase and include edited_by
    if (!Array.isArray(response.data.data)) return response.data;
    return {
      ...response.data,
      data: response.data.data.map((item: any) => ({
        ...item,
        id: item._id,
        kode_bank: item.kode_bank,
        nama_bank: item.nama_bank,
        nomor_akun: item.nomor_akun,
        created_at: item.created_at,
        updated_at: item.updated_at,
        edited_by: item.edited_by,
      })),
    };
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
