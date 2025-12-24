import { Request, Response } from 'express';
import Toko from '../models/TmCabang';

export const getAllToko = async (req: Request, res: Response) => {
  try {
    const tokoList = await Toko.find({}, { _id: 0, kode_toko: 1, nama_toko: 1 }).sort({ kode_toko: 1 });
    res.json(tokoList);
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data toko', error: err });
  }
};
