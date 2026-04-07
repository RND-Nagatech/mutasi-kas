import MutasiKas from '../models/MutasiKas';
import TmKas from '../models/TmKas';

export const getDashboardSummary = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Saldo Hari Ini = total saldo berjalan dari master ledger (tm_kas):
  // CASH (no_rekening '-') + semua rekening TRANSFER.
  const saldoAggregate = await TmKas.aggregate([
    { $match: { metode: { $in: ['CASH', 'TRANSFER'] } } },
    { $group: { _id: null, total: { $sum: '$saldo_akhir' } } },
  ]);
  const saldoHariIni = Number(saldoAggregate[0]?.total || 0);

  // Total Kirim Kas Hari Ini (exclude cancelled)
  const totalKirimKas = await MutasiKas.aggregate([
    { $match: { jenis_kas: 'KIRIM', tanggal: { $gte: today, $lt: tomorrow }, status_validasi: { $ne: 'CANCEL' } } },
    { $group: { _id: null, total: { $sum: "$nominal_rp" } } }
  ]);

  // Total Terima Kas Hari Ini (exclude cancelled)
  const totalTerimaKas = await MutasiKas.aggregate([
    { $match: { jenis_kas: 'TERIMA', tanggal: { $gte: today, $lt: tomorrow }, status_validasi: { $ne: 'CANCEL' } } },
    { $group: { _id: null, total: { $sum: "$nominal_rp" } } }
  ]);

  // Jumlah Transaksi Hari Ini (exclude cancelled)
  const jumlahTransaksiHariIni = await MutasiKas.countDocuments({ tanggal: { $gte: today, $lt: tomorrow }, status_validasi: { $ne: 'CANCEL' } });

  return {
    saldoHariIni,
    totalKirimKas: totalKirimKas[0]?.total || 0,
    totalTerimaKas: totalTerimaKas[0]?.total || 0,
    jumlahTransaksiHariIni,
  };
};
