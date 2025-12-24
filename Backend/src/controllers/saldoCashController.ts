import { Request, Response } from 'express';
import SaldoCash from '../models/SaldoCash';

export const inputSaldoCash = async (req: Request, res: Response) => {
  try {
    const { nominal } = req.body;
    const user = (req as any).user;
    const input_by = user?.username || user?.name || 'unknown';
    // Ambil saldo akhir terakhir dari tt_mutasi_kas (CASH)
    const lastMutasi = await (await import('../models/MutasiKas')).default.findOne({ metode: 'CASH' }, {}, { sort: { tanggal: -1 } });
    const saldo_awal = lastMutasi?.saldo_akhir || 0;
    const nominal_rp = nominal;
    const saldo_akhir = saldo_awal + nominal_rp;
    // Buat entry baru di MutasiKas
    await (await import('../models/MutasiKas')).default.create({
      jenis_kas: 'TERIMA',
      kode_toko: '-',
      tanggal: new Date(),
      jam: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      no_trx: 'TRX' + Date.now() + Math.floor(Math.random() * 1000),
      metode: 'CASH',
      saldo_awal,
      nominal_rp,
      saldo_akhir,
      kode_bank: '-',
      no_rekening: '-',
      gramasi: 0,
      keterangan: 'Input saldo cash',
      created_by: input_by,
      created_at: new Date(),
      status_validasi: 'OPEN',
      valid_by: '-',
    });
    // Update/replace tm_kas untuk metode CASH
    const TmKas = (await import('../models/TmKas')).default;
    await TmKas.findOneAndUpdate(
      { metode: 'CASH', no_rekening: '-' },
      { metode: 'CASH', no_rekening: '-', saldo_akhir },
      { upsert: true, new: true }
    );
    // Simpan juga ke SaldoCash, nominal diisi dari input
    const saldo = await SaldoCash.create({ nominal, input_by });
    res.status(201).json({ success: true, data: saldo });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal input saldo cash', error: err });
  }
};

export const getSaldoCash = async (req: Request, res: Response) => {
  try {
    // Ambil semua data saldo cash, urut terbaru di atas
    const saldo = await SaldoCash.find().sort({ tanggal: -1 });
    res.json({ success: true, data: saldo });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal ambil saldo cash', error: err });
  }
};
