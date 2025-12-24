import { Request, Response } from 'express';
import SaldoRekening from '../models/SaldoRekening';

// Input saldo rekening (create or update latest)
export const inputSaldoRekening = async (req: Request, res: Response) => {
  try {
    const { no_rekening, nominal, input_by } = req.body;
    if (!no_rekening || typeof nominal !== 'number') {
      return res.status(400).json({ success: false, message: 'no_rekening dan nominal wajib diisi' });
    }
    // Ambil saldo terakhir
    const lastSaldo = await SaldoRekening.findOne({ no_rekening }, {}, { sort: { tanggal: -1 } });
    const totalNominal = (lastSaldo?.nominal || 0) + nominal;
    // Create dokumen baru (history) dengan saldo terakumulasi
    const saldo = await SaldoRekening.create({ no_rekening, nominal: totalNominal, input_by });
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
