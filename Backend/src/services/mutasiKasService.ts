import MutasiKas, { IMutasiKas } from '../models/MutasiKas';
import MutasiKasBatal from '../models/MutasiKasBatal';
import SaldoCash from '../models/SaldoCash';
import TmKas from '../models/TmKas';
import { Types } from 'mongoose';

function generateNoTrx(): string {
  return 'TRX' + Date.now() + Math.floor(Math.random() * 1000);
}

export const createMutasiKas = async (data: Omit<IMutasiKas, 'no_trx' | 'saldo_akhir' | 'status_validasi' | 'valid_by'> & { created_by: string }) => {
  if (data.nominal_rp > data.saldo_awal) throw { status: 400, message: 'nominal_rp cannot be greater than saldo_awal' };
  const saldo_akhir = data.saldo_awal - data.nominal_rp;
  const no_trx = generateNoTrx();
  const mutasi = new MutasiKas({
    ...data,
    saldo_akhir,
    no_trx,
    status_validasi: 'OPEN',
    valid_by: '-',
  });
  await mutasi.save();
  // Sync the tm_kas record's saldo_akhir to match the created mutasi's saldo_akhir.
  // We still avoid touching `SaldoCash` historic log entries here; tm_kas is
  // kept as the current ledger for each metode/no_rekening.
  try {
    const noRek = mutasi.no_rekening || (mutasi.metode === 'CASH' ? '-' : '');
    await TmKas.findOneAndUpdate(
      { metode: mutasi.metode, no_rekening: noRek },
      { $set: { saldo_akhir: mutasi.saldo_akhir, metode: mutasi.metode, no_rekening: noRek } },
      { upsert: true, new: true }
    );
  } catch (err) {
    // Log but do not fail the mutasi creation if tm_kas update fails
    console.error('Failed to sync tm_kas saldo_akhir:', err);
  }

  return mutasi;
};

export const getMutasiKas = async (filter: any = {}) => {
  return MutasiKas.find(filter).sort({ tanggal: 1, created_at: 1 });
};

// Aggregasi untuk laporan REKAP
export const getMutasiKasRekap = async (filter: any = {}) => {
  // Ambil semua data sesuai filter, urutkan per tanggal
  const data = await MutasiKas.find(filter).sort({ tanggal: 1, created_at: 1 });
  // Group by tanggal
  const group: Record<string, any[]> = {};
  data.forEach((item) => {
    const tgl = item.tanggal.toISOString().slice(0, 10);
    if (!group[tgl]) group[tgl] = [];
    group[tgl].push(item);
  });
  // Proses agregasi per tanggal
  // Pastikan tanggal diproses berurutan agar kita bisa menggunakan saldo akhir hari sebelumnya
  const sortedDates = Object.keys(group).sort();
  const result: any[] = [];
  let prevSaldoAkhir: number | null = null;
  for (const tanggal of sortedDates) {
    const items = group[tanggal];
    // Saldo awal = saldo_awal dari transaksi pertama hari itu, atau jika tidak tersedia, gunakan saldo akhir hari sebelumnya
    let saldoAwal = items[0].saldo_awal;
    // Treat missing or zero saldo_awal as absent when a previous day's saldo exists
    if (saldoAwal === undefined || saldoAwal === null || (saldoAwal === 0 && prevSaldoAkhir !== null)) {
      saldoAwal = prevSaldoAkhir !== null ? prevSaldoAkhir : 0;
    }
    // Total terima = sum nominal_rp jenis_kas TERIMA
    const totalTerima = items.filter(i => i.jenis_kas === 'TERIMA').reduce((sum, i) => sum + i.nominal_rp, 0);
    // Total kirim = sum nominal_rp jenis_kas KIRIM
    const totalKirim = items.filter(i => i.jenis_kas === 'KIRIM').reduce((sum, i) => sum + i.nominal_rp, 0);
    // Saldo akhir = saldo_akhir dari transaksi terakhir hari itu
    const saldoAkhir = items[items.length - 1].saldo_akhir;
    result.push({ tanggal, saldoAwal, totalTerima, totalKirim, saldoAkhir });
    prevSaldoAkhir = saldoAkhir;
  }
  return result;
};

export const cancelMutasiKas = async (id: string, created_by: string, alasan?: string) => {
  const mutasi = await MutasiKas.findById(id);
  if (!mutasi) throw { status: 404, message: 'Mutasi not found' };
  if (mutasi.status_validasi !== 'OPEN') throw { status: 400, message: 'Only OPEN mutasi can be cancelled' };
  // NOTE: We mark the mutasi as cancelled and record the cancellation details,
  // but we DO NOT modify historic `SaldoCash` or `tm_kas` here. Manual saldo
  // adjustments should be performed via the dedicated endpoints when needed.
  mutasi.status_validasi = 'CANCEL';
  await mutasi.save();

  // Record cancellation (persist alasan and other fields)
  await MutasiKasBatal.create({
    tanggal: mutasi.tanggal,
    jam: mutasi.jam,
    no_trx: mutasi.no_trx,
    jenis_kas: mutasi.jenis_kas,
    metode: mutasi.metode,
    saldo_awal: mutasi.saldo_awal,
    nominal_rp: mutasi.nominal_rp,
    saldo_akhir: mutasi.saldo_akhir,
    kode_bank: mutasi.kode_bank,
    no_rekening: mutasi.no_rekening,
    keterangan: mutasi.keterangan,
    alasan: alasan || '',
    created_by,
    created_at: new Date(),
    status_validasi: mutasi.status_validasi,
    valid_by: mutasi.valid_by,
  });

  return mutasi;
};
