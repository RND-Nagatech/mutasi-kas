import { apiClient } from './client';

export const rekeningApi = {
  async getAll() {
    const response = await apiClient.get('/master/rekening');
    // Map snake_case to camelCase for frontend
    if (!Array.isArray(response.data.data)) return [];
    return response.data.data.map((item: any) => ({
      id: item._id,
      kodeBank: item.kode_bank,
      noRekening: item.no_rekening,
      namaRekening: item.nama_rekening,
      input_by: item.input_by,
      editedBy: item.edited_by,
      deleted_by: item.deleted_by,
      createdAt: item.created_at || item.createdAt || '',
      updatedAt: item.updated_at || item.updatedAt || '',
    }));
  },
  async create(data: { bankId: string; noRekening: string; namaRekening: string }) {
    // Map camelCase to snake_case for backend
    const payload = {
      kode_bank: data.bankId,
      no_rekening: data.noRekening,
      nama_rekening: data.namaRekening,
    };
    const response = await apiClient.post('/master/rekening', payload);
    return response.data;
  },
  async update(data: { id: string; bankId: string; noRekening: string; namaRekening: string }) {
    // Map camelCase to snake_case for backend
    const payload = {
      kode_bank: data.bankId,
      no_rekening: data.noRekening,
      nama_rekening: data.namaRekening,
    };
    const response = await apiClient.put(`/master/rekening/${data.id}`, payload);
    return response.data;
  },
  async delete(id: string) {
    const response = await apiClient.delete(`/master/rekening/${id}`);
    return response.data;
  },
};
