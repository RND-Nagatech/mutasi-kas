import { Request, Response } from 'express';
import SaldoCash from '../models/SaldoCash';

export const inputSaldoCash = async (req: Request, res: Response) => {
  try {
    const { nominal } = req.body;
    const user = (req as any).user;
    const input_by = user?.username || user?.name || 'unknown';
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
