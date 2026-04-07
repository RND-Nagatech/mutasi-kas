import PermintaanTransfer, {
  IPermintaanTransfer,
  PermintaanTransferStatus,
} from '../models/PermintaanTransfer';
import Rekening from '../models/Rekening';
import TmKas from '../models/TmKas';
import { createMutasiKas, validateMutasiKas } from './mutasiKasService';

type CreatePermintaanTransferInput = {
  tanggal: string | Date;
  nominal_rp: number;
  input_by: string;
  no_rekening_tujuan: string;
  nama_bank_tujuan: string;
  atas_nama_penerima: string;
  kode_toko_peminta: string;
  created_by: string;
};

type UpdatePermintaanTransferInput = {
  tanggal?: string | Date;
  nominal_rp?: number;
  input_by?: string;
  no_rekening_tujuan?: string;
  nama_bank_tujuan?: string;
  atas_nama_penerima?: string;
  kode_toko_peminta?: string;
};

export const createPermintaanTransfer = async (
  payload: CreatePermintaanTransferInput
): Promise<IPermintaanTransfer> => {
  if (!payload.tanggal) throw { status: 400, message: 'tanggal is required' };
  if (!payload.input_by) throw { status: 400, message: 'input_by is required' };
  if (!payload.no_rekening_tujuan) throw { status: 400, message: 'no_rekening_tujuan is required' };
  if (!payload.nama_bank_tujuan) throw { status: 400, message: 'nama_bank_tujuan is required' };
  if (!payload.atas_nama_penerima) throw { status: 400, message: 'atas_nama_penerima is required' };
  if (!payload.kode_toko_peminta) throw { status: 400, message: 'kode_toko_peminta is required' };
  if (!payload.nominal_rp || payload.nominal_rp <= 0) {
    throw { status: 400, message: 'nominal_rp must be greater than zero' };
  }

  const created = await PermintaanTransfer.create({
    tanggal: new Date(payload.tanggal),
    nominal_rp: payload.nominal_rp,
    input_by: payload.input_by,
    no_rekening_tujuan: payload.no_rekening_tujuan,
    nama_bank_tujuan: payload.nama_bank_tujuan,
    atas_nama_penerima: payload.atas_nama_penerima,
    kode_toko_peminta: payload.kode_toko_peminta,
    status: 'OPEN',
    created_by: payload.created_by,
  });

  return created;
};

export const getPermintaanTransferList = async (filter: {
  startDate?: string;
  endDate?: string;
  kodeToko?: string;
  status?: string;
}): Promise<IPermintaanTransfer[]> => {
  const query: Record<string, unknown> = {};

  if (filter.startDate && filter.endDate) {
    const start = new Date(filter.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filter.endDate);
    end.setHours(23, 59, 59, 999);
    query.tanggal = { $gte: start, $lte: end };
  }

  if (filter.kodeToko) query.kode_toko_peminta = filter.kodeToko;
  if (filter.status && filter.status !== 'ALL') query.status = String(filter.status).toUpperCase();

  return PermintaanTransfer.find(query).sort({ created_at: -1 });
};

export const getPermintaanTransferById = async (id: string): Promise<IPermintaanTransfer> => {
  const item = await PermintaanTransfer.findById(id);
  if (!item) throw { status: 404, message: 'Permintaan transfer not found' };
  return item;
};

export const updatePermintaanTransfer = async (
  id: string,
  payload: UpdatePermintaanTransferInput
): Promise<IPermintaanTransfer> => {
  const item = await getPermintaanTransferById(id);
  if (item.status !== 'OPEN') {
    throw { status: 400, message: 'Only OPEN permintaan transfer can be updated' };
  }

  if (payload.nominal_rp !== undefined && payload.nominal_rp <= 0) {
    throw { status: 400, message: 'nominal_rp must be greater than zero' };
  }

  if (payload.tanggal !== undefined) item.tanggal = new Date(payload.tanggal);
  if (payload.nominal_rp !== undefined) item.nominal_rp = payload.nominal_rp;
  if (payload.input_by !== undefined) item.input_by = payload.input_by;
  if (payload.no_rekening_tujuan !== undefined) item.no_rekening_tujuan = payload.no_rekening_tujuan;
  if (payload.nama_bank_tujuan !== undefined) item.nama_bank_tujuan = payload.nama_bank_tujuan;
  if (payload.atas_nama_penerima !== undefined) item.atas_nama_penerima = payload.atas_nama_penerima;
  if (payload.kode_toko_peminta !== undefined) item.kode_toko_peminta = payload.kode_toko_peminta;
  item.updated_at = new Date();

  await item.save();
  return item;
};

export const deletePermintaanTransfer = async (id: string): Promise<void> => {
  const item = await getPermintaanTransferById(id);
  if (item.status !== 'OPEN') {
    throw { status: 400, message: 'Only OPEN permintaan transfer can be deleted' };
  }
  await PermintaanTransfer.deleteOne({ _id: item._id });
};

export const changePermintaanTransferStatus = async (
  id: string,
  status: PermintaanTransferStatus,
  reviewedBy: string,
  noRekeningSumber?: string
): Promise<IPermintaanTransfer> => {
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw { status: 400, message: 'status must be APPROVED or REJECTED' };
  }

  const item = await getPermintaanTransferById(id);
  if (item.status !== 'OPEN') {
    throw { status: 400, message: 'Only OPEN permintaan transfer can change status' };
  }

  if (status === 'APPROVED') {
    if (!noRekeningSumber) {
      throw { status: 400, message: 'no_rekening_sumber is required for APPROVED status' };
    }

    const rekeningSumber = await Rekening.findOne({ no_rekening: noRekeningSumber });
    if (!rekeningSumber) {
      throw { status: 400, message: 'Rekening sumber tidak ditemukan di master rekening' };
    }

    const tmKas = await TmKas.findOne({ metode: 'TRANSFER', no_rekening: noRekeningSumber });
    if (!tmKas) {
      throw { status: 400, message: 'Saldo rekening sumber tidak ditemukan' };
    }

    const currentSaldo = Number(tmKas.saldo_akhir || 0);
    const nominalPermintaan = Number(item.nominal_rp || 0);
    if (currentSaldo < nominalPermintaan) {
      throw { status: 400, message: 'Saldo rekening sumber tidak mencukupi' };
    }

    const now = new Date();
    const jam = now.toLocaleTimeString('id-ID', { hour12: false });
    const mutasi = await createMutasiKas({
      jenis_kas: 'KIRIM',
      kode_toko: item.kode_toko_peminta,
      tanggal: now,
      jam,
      metode: 'TRANSFER',
      saldo_awal: currentSaldo,
      nominal_rp: nominalPermintaan,
      kode_bank: rekeningSumber.kode_bank || '-',
      no_rekening: noRekeningSumber,
      gramasi: 0,
      keterangan: `PERMINTAAN_TRANSFER: ke ${item.nama_bank_tujuan} a.n ${item.atas_nama_penerima} (${item.no_rekening_tujuan})`,
      created_at: now,
      created_by: reviewedBy,
    } as any);
    // Permintaan transfer yang di-approve harus langsung final dan tercatat di laporan.
    const mutasiDone = await validateMutasiKas(String(mutasi._id), reviewedBy);

    item.no_rekening_sumber = noRekeningSumber;
    item.mutasi_kas_id = String(mutasiDone._id || mutasi._id || '');
    item.no_trx_mutasi = mutasiDone.no_trx || mutasi.no_trx || '';
  }

  item.status = status;
  item.reviewed_by = reviewedBy;
  item.reviewed_at = new Date();
  item.updated_at = new Date();

  await item.save();
  return item;
};
