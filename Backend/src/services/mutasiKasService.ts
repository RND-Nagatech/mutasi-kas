import MutasiKas, { IMutasiKas } from '../models/MutasiKas';
import MutasiKasBatal from '../models/MutasiKasBatal';
import SaldoCash from '../models/SaldoCash';
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

  // Jika metode CASH, update saldo cash
  if (data.metode === 'CASH') {
    // Ambil saldo terakhir dari SaldoCash (historic) dan buat entry baru
    const lastSaldo = await SaldoCash.findOne({}, {}, { sort: { tanggal: -1 } });
    const saldoSebelum = lastSaldo ? lastSaldo.nominal : 0;
    const saldoBaru = saldoSebelum - data.nominal_rp;
    await SaldoCash.create({ nominal: saldoBaru, input_by: data.created_by });
    // Update tm_kas for CASH (use '-' as no_rekening) - only overwrite existing, do not create
    const TmKas = (await import('../models/TmKas')).default;
    const existingCash = await TmKas.findOne({ metode: 'CASH', no_rekening: '-' });
    if (existingCash) {
      // Use the saldo computed/stored on the saved mutasi to keep tt_mutasi_kas and tm_kas in sync
      await TmKas.findOneAndUpdate(
        { _id: existingCash._id },
        { metode: 'CASH', no_rekening: '-', saldo_akhir: mutasi.saldo_akhir },
        { upsert: false, new: true }
      );
    }
  }

  // Jika metode TRANSFER, update tm_kas untuk rekening terkait
  if (data.metode === 'TRANSFER') {
    const TmKas = (await import('../models/TmKas')).default;
    // Ambil tm_kas untuk rekening ini (do not create new)
    const existing = await TmKas.findOne({ metode: 'TRANSFER', no_rekening: data.no_rekening });
    if (existing) {
      // Keep tm_kas in sync with the saved mutasi's saldo_akhir
      await TmKas.findOneAndUpdate(
        { _id: existing._id },
        { metode: 'TRANSFER', no_rekening: data.no_rekening, saldo_akhir: mutasi.saldo_akhir },
        { upsert: false, new: true }
      );
    }
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

  // Revert saldo changes depending on metode
  if (mutasi.metode === 'CASH') {
    // Add back nominal to SaldoCash (create compensating entry)
    const lastSaldo = await SaldoCash.findOne({}, {}, { sort: { tanggal: -1 } });
    const saldoSebelum = lastSaldo ? lastSaldo.nominal : 0;
    const saldoBaru = saldoSebelum + mutasi.nominal_rp;
    await SaldoCash.create({ nominal: saldoBaru, input_by: created_by });

    // Update tm_kas for CASH (no_rekening = '-')
    const TmKas = (await import('../models/TmKas')).default;
    const existingCash = await TmKas.findOne({ metode: 'CASH', no_rekening: '-' });
    if (existingCash) {
      await TmKas.findOneAndUpdate(
        { _id: existingCash._id },
        { saldo_akhir: (existingCash.saldo_akhir || 0) + mutasi.nominal_rp },
        { upsert: false, new: true }
      );
    }
  }

  if (mutasi.metode === 'TRANSFER') {
    const TmKas = (await import('../models/TmKas')).default;
    const existing = await TmKas.findOne({ metode: 'TRANSFER', no_rekening: mutasi.no_rekening });
    if (existing) {
      await TmKas.findOneAndUpdate(
        { _id: existing._id },
        { saldo_akhir: (existing.saldo_akhir || 0) + mutasi.nominal_rp },
        { upsert: false, new: true }
      );
    }
  }

  // Mark mutasi as cancelled
  mutasi.status_validasi = 'CANCEL';
  await mutasi.save();

  // Record cancellation
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
