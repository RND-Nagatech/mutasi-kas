import MutasiKas, { IMutasiKas } from '../models/MutasiKas';
import MutasiKasBatal from '../models/MutasiKasBatal';
import SaldoCash from '../models/SaldoCash';
import TmKas from '../models/TmKas';
import { Types } from 'mongoose';

function generateNoTrx(): string {
  return 'TRX' + Date.now() + Math.floor(Math.random() * 1000);
}

async function syncTransferMasterSaldo(noRekening: string, nominal: number, inputBy: string) {
  if (!noRekening || noRekening === '-') return;
  try {
    const SaldoRekening = (await import('../models/SaldoRekening')).default;
    await SaldoRekening.create({
      no_rekening: noRekening,
      nominal,
      input_by: inputBy || 'system',
      tanggal: new Date(),
    });
  } catch (err) {
    console.error('Failed to sync tt_saldo_rekening:', err);
  }
}

export const createMutasiKas = async (
  data: Omit<IMutasiKas, 'no_trx' | 'saldo_akhir' | 'status_validasi' | 'valid_by'> & { created_by: string },
  options?: { syncLedger?: boolean }
) => {
  const jenisKas = ((data as any).jenis_kas || 'KIRIM').toString().toUpperCase();
  if (jenisKas === 'KIRIM' && data.nominal_rp > data.saldo_awal) {
    throw { status: 400, message: 'nominal_rp cannot be greater than saldo_awal for KIRIM' };
  }
  const saldo_akhir = jenisKas === 'TERIMA'
    ? data.saldo_awal + data.nominal_rp
    : data.saldo_awal - data.nominal_rp;
  const no_trx = generateNoTrx();
  const mutasi = new MutasiKas({
    ...data,
    jenis_kas: jenisKas,
    saldo_akhir,
    no_trx,
    status_validasi: 'OPEN',
    valid_by: '-',
  });
  await mutasi.save();
  const shouldSyncLedger = options?.syncLedger !== false;
  if (shouldSyncLedger) {
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
      if ((mutasi.metode || '').toString().toUpperCase() === 'TRANSFER') {
        await syncTransferMasterSaldo(noRek, Number(mutasi.saldo_akhir || 0), String(mutasi.created_by || 'system'));
      }
    } catch (err) {
      // Log but do not fail the mutasi creation if tm_kas update fails
      console.error('Failed to sync tm_kas saldo_akhir:', err);
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

  // Reverse the effect on current balances (tm_kas) and record cash input if needed.
  try {
    const noRek = mutasi.no_rekening || (mutasi.metode === 'CASH' ? '-' : '');
    const tm = await TmKas.findOne({ metode: mutasi.metode, no_rekening: noRek });
    const nominal = Number(mutasi.nominal_rp || 0);

    if (tm) {
      // If the original mutasi was a KIRIM, it decreased the balance -> restore by adding nominal
      // TERIMA in current flow is applied on validation, not on creation; cancel on OPEN should not reverse TERIMA.
      if ((mutasi.jenis_kas || '').toString().toUpperCase() === 'KIRIM') {
        tm.saldo_akhir = Number(tm.saldo_akhir || 0) + nominal;
      }
      await tm.save();
      if ((mutasi.metode || '').toString().toUpperCase() === 'TRANSFER') {
        await syncTransferMasterSaldo(noRek, Number(tm.saldo_akhir || 0), created_by || 'system');
      }
    } else {
      // If no tm_kas exists for this metode/no_rekening, create one representing the restored balance
      let saldo = mutasi.saldo_akhir || 0;
      if ((mutasi.jenis_kas || '').toString().toUpperCase() === 'KIRIM') {
        saldo = Number(saldo) + nominal;
      }
      await TmKas.create({ metode: mutasi.metode, no_rekening: noRek, saldo_akhir: saldo });
      if ((mutasi.metode || '').toString().toUpperCase() === 'TRANSFER') {
        await syncTransferMasterSaldo(noRek, Number(saldo || 0), created_by || 'system');
      }
    }

    // For CASH methode, also create a SaldoCash record to reflect returned cash
    if ((mutasi.metode || '').toString().toUpperCase() === 'CASH') {
      try {
        await SaldoCash.create({ nominal, input_by: created_by, tanggal: new Date() });
      } catch (e) {
        console.error('Failed to create SaldoCash record on cancel:', e);
      }
    }
  } catch (err) {
    // Log but do not fail the cancel operation
    console.error('Failed to reverse tm_kas on cancelMutasiKas:', err);
  }

  return mutasi;
};

export const validateMutasiKas = async (id: string, valid_by: string) => {
  const mutasi = await MutasiKas.findById(id);
  if (!mutasi) throw { status: 404, message: 'Mutasi not found' };
  if (mutasi.status_validasi !== 'OPEN') {
    throw { status: 400, message: 'Only OPEN mutasi can be validated' };
  }

  // For TERIMA flow, saldo should be added at validation time.
  if ((mutasi.jenis_kas || '').toString().toUpperCase() === 'TERIMA') {
    const noRek = mutasi.no_rekening || (mutasi.metode === 'CASH' ? '-' : '');
    const tm = await TmKas.findOne({ metode: mutasi.metode, no_rekening: noRek });
    const currentSaldo = tm ? Number(tm.saldo_akhir || 0) : 0;
    const nominal = Number(mutasi.nominal_rp || 0);
    const nextSaldo = currentSaldo + nominal;

    mutasi.saldo_awal = currentSaldo;
    mutasi.saldo_akhir = nextSaldo;

    await TmKas.findOneAndUpdate(
      { metode: mutasi.metode, no_rekening: noRek },
      { $set: { saldo_akhir: nextSaldo, metode: mutasi.metode, no_rekening: noRek } },
      { upsert: true, new: true }
    );
    if ((mutasi.metode || '').toString().toUpperCase() === 'TRANSFER') {
      await syncTransferMasterSaldo(noRek, Number(nextSaldo || 0), valid_by || 'system');
    }
  }

  mutasi.status_validasi = 'DONE';
  mutasi.valid_by = valid_by;
  await mutasi.save();
  return mutasi;
};
