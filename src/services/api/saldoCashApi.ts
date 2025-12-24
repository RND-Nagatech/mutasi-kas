import apiClient from './client';

export const saldoCashApi = {
  input: async (payload: { nominal: number; input_by?: string }) => {
    const res = await apiClient.post('/master/saldo-cash', payload);
    return res.data;
  },
  get: async () => {
    const res = await apiClient.get('/master/saldo-cash');
    return res.data;
  },
};
