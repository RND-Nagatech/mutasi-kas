import MutasiKas from '../models/MutasiKas';
import SaldoCash from '../models/SaldoCash';
import SaldoRekening from '../models/SaldoRekening';

export const getDashboardSummary = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Saldo Hari Ini (Cash + Rekening)
  const lastCash = await SaldoCash.findOne({}, {}, { sort: { tanggal: -1 } });
  const lastRekening = await SaldoRekening.findOne({}, {}, { sort: { tanggal: -1 } });
  const saldoHariIni = (lastCash?.nominal || 0) + (lastRekening?.nominal || 0);

  // Total Kirim Kas Hari Ini
  const totalKirimKas = await MutasiKas.aggregate([
    { $match: { jenis_kas: 'KIRIM', tanggal: { $gte: today, $lt: tomorrow } } },
    { $group: { _id: null, total: { $sum: "$nominal_rp" } } }
  ]);

  // Total Terima Kas Hari Ini
  const totalTerimaKas = await MutasiKas.aggregate([
    { $match: { jenis_kas: 'TERIMA', tanggal: { $gte: today, $lt: tomorrow } } },
    { $group: { _id: null, total: { $sum: "$nominal_rp" } } }
  ]);

  // Jumlah Transaksi Hari Ini
  const jumlahTransaksiHariIni = await MutasiKas.countDocuments({ tanggal: { $gte: today, $lt: tomorrow } });

  return {
    saldoHariIni,
    totalKirimKas: totalKirimKas[0]?.total || 0,
    totalTerimaKas: totalTerimaKas[0]?.total || 0,
    jumlahTransaksiHariIni,
  };
};