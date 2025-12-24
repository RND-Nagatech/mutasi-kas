import apiClient from './client';

export const masterTokoApi = {
  getAll: async () => {
    const res = await apiClient.get('/master/toko');
    return res.data;
  },
};
