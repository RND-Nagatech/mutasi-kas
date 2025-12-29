import { apiClient } from './client';

export const mutasiKasApi = {
  async getLastSaldoAkhir({ kodeToko, metode, noRekening }: { kodeToko: string, metode: string, noRekening?: string }) {
    const params: any = { kodeToko, metode };
    if (noRekening) params.noRekening = noRekening;
    const response = await apiClient.get('/transaksi/mutasi/last-saldo-akhir', { params });
    return response.data;
  },
};
