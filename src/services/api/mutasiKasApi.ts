import { apiClient } from './client';

export const mutasiKasApi = {
  async getLastSaldoAkhir({ kodeToko, metode }: { kodeToko: string, metode: string }) {
    const response = await apiClient.get('/transaksi/mutasi/last-saldo-akhir', {
      params: { kodeToko, metode }
    });
    return response.data;
  },
};
