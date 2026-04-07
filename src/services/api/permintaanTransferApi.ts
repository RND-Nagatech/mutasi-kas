import { apiClient } from './client';
import type {
  CreatePermintaanTransferRequest,
  PermintaanTransfer,
  StatusPermintaanTransfer,
  UpdatePermintaanTransferRequest,
} from '@/types';

type ListParams = {
  startDate?: string;
  endDate?: string;
  kodeToko?: string;
  status?: StatusPermintaanTransfer | 'ALL';
};

export const permintaanTransferApi = {
  async list(params?: ListParams): Promise<PermintaanTransfer[]> {
    const response = await apiClient.get('/transaksi/permintaan-transfer', { params });
    return Array.isArray(response.data) ? response.data : [];
  },

  async getById(id: string): Promise<PermintaanTransfer> {
    const response = await apiClient.get(`/transaksi/permintaan-transfer/${id}`);
    return response.data;
  },

  async create(payload: CreatePermintaanTransferRequest): Promise<PermintaanTransfer> {
    const response = await apiClient.post('/transaksi/permintaan-transfer', {
      tanggal: payload.tanggal,
      nominal_rp: payload.nominalRp,
      input_by: payload.inputBy,
      no_rekening_tujuan: payload.noRekeningTujuan,
      nama_bank_tujuan: payload.namaBankTujuan,
      atas_nama_penerima: payload.atasNamaPenerima,
      kode_toko_peminta: payload.kodeTokoPeminta,
    });
    return response.data;
  },

  async update(id: string, payload: UpdatePermintaanTransferRequest): Promise<PermintaanTransfer> {
    const response = await apiClient.put(`/transaksi/permintaan-transfer/${id}`, {
      tanggal: payload.tanggal,
      nominal_rp: payload.nominalRp,
      input_by: payload.inputBy,
      no_rekening_tujuan: payload.noRekeningTujuan,
      nama_bank_tujuan: payload.namaBankTujuan,
      atas_nama_penerima: payload.atasNamaPenerima,
      kode_toko_peminta: payload.kodeTokoPeminta,
    });
    return response.data;
  },

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/transaksi/permintaan-transfer/${id}`);
    return response.data;
  },

  async changeStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    noRekeningSumber?: string
  ): Promise<PermintaanTransfer> {
    const response = await apiClient.patch(`/transaksi/permintaan-transfer/${id}/status`, {
      status,
      no_rekening_sumber: noRekeningSumber,
    });
    return response.data;
  },
};
