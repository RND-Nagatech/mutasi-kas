import { Request, Response } from 'express';
import SaldoRekening from '../models/SaldoRekening';

// Input saldo rekening (create or update latest)
export const inputSaldoRekening = async (req: Request, res: Response) => {
  try {
    const { no_rekening, nominal, input_by } = req.body;
    if (!no_rekening || typeof nominal !== 'number') {
      return res.status(400).json({ success: false, message: 'no_rekening dan nominal wajib diisi' });
    }
    // Ambil saldo akhir terakhir dari tt_mutasi_kas (TRANSFER, rekening sesuai)
    const MutasiKas = (await import('../models/MutasiKas')).default;
    const lastMutasi = await MutasiKas.findOne({ metode: 'TRANSFER', no_rekening }, {}, { sort: { tanggal: -1 } });
    const saldo_awal = lastMutasi?.saldo_akhir || 0;
    const nominal_rp = nominal;
    const saldo_akhir = saldo_awal + nominal_rp;
    // Buat entry baru di MutasiKas
    await MutasiKas.create({
      jenis_kas: 'TERIMA',
      kode_toko: '-',
      tanggal: new Date(),
      jam: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      no_trx: 'TRX' + Date.now() + Math.floor(Math.random() * 1000),
      metode: 'TRANSFER',
      saldo_awal,
      nominal_rp,
      saldo_akhir,
      kode_bank: '-',
      no_rekening,
      gramasi: 0,
      keterangan: 'Input saldo rekening',
      created_by: input_by,
      created_at: new Date(),
      status_validasi: 'OPEN',
      valid_by: '-',
    });
    // Update/replace tm_kas untuk metode TRANSFER dan no_rekening terkait
    const TmKas = (await import('../models/TmKas')).default;
    await TmKas.findOneAndUpdate(
      { metode: 'TRANSFER', no_rekening },
      { metode: 'TRANSFER', no_rekening, saldo_akhir },
      { upsert: true, new: true }
    );
    // Simpan juga ke SaldoRekening, nominal diisi dari input
    const saldo = await SaldoRekening.create({ no_rekening, nominal, input_by });
    res.status(201).json({ success: true, data: saldo });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal input saldo rekening', error: err });
  }
};

// Get saldo rekening by no_rekening
export const getSaldoRekening = async (req: Request, res: Response) => {
  try {
    const { no_rekening } = req.params;
    if (!no_rekening) {
      return res.status(400).json({ success: false, message: 'no_rekening wajib diisi' });
    }
    const saldo = await SaldoRekening.findOne({ no_rekening }, {}, { sort: { tanggal: -1 } });
    res.json({ success: true, data: saldo });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal ambil saldo rekening', error: err });
  }
};

// Update saldo rekening (misal setelah transfer)
export const updateSaldoRekening = async (req: Request, res: Response) => {
  try {
    const { no_rekening } = req.params;
    const { nominal } = req.body;
    if (!no_rekening || typeof nominal !== 'number') {
      return res.status(400).json({ success: false, message: 'no_rekening dan nominal wajib diisi' });
    }
    let saldo = await SaldoRekening.findOne({ no_rekening }, {}, { sort: { tanggal: -1 } });
    if (!saldo) {
      return res.status(404).json({ success: false, message: 'Saldo rekening tidak ditemukan' });
    }
    saldo.nominal = nominal;
    saldo.tanggal = new Date();
    await saldo.save();
    res.json({ success: true, data: saldo });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal update saldo rekening', error: err });
  }
};
