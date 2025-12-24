import { apiClient } from './client';

export const saldoRekeningApi = {
  async input({ noRekening, nominal, input_by }: { noRekening: string; nominal: number; input_by?: string }) {
    const payload = { no_rekening: noRekening, nominal, input_by };
    const response = await apiClient.post('/master/saldo-rekening', payload);
    return response.data;
  },
  async get(noRekening: string) {
    const response = await apiClient.get(`/master/saldo-rekening/${noRekening}`);
    return response.data?.data || null;
  },
  async update(noRekening: string, nominal: number) {
    const payload = { nominal };
    const response = await apiClient.put(`/master/saldo-rekening/${noRekening}`, payload);
    return response.data;
  },

  async getAll() {
    const response = await apiClient.get('/master/saldo-rekening');
    return response.data;
  },
};
