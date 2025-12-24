import { Request, Response, NextFunction } from 'express';
import * as mutasiKasService from '../services/mutasiKasService';
import { AuthRequest } from '../middleware/auth';

export const createMutasi = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = req.body;
    const created_by = req.user.username;
    const mutasi = await mutasiKasService.createMutasiKas({ ...data, created_by });
    res.status(201).json(mutasi);
  } catch (err) {
    next(err);
  }
};

export const getMutasi = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Ambil filter dari query
    const { type = 'DETAIL', startDate, endDate, kodeToko, metode } = req.query;
    const filter: any = {};
    if (startDate && endDate) {
      filter.tanggal = { $gte: new Date(startDate as string), $lte: new Date(endDate as string) };
    }
    if (kodeToko) filter.kode_toko = kodeToko;
    if (metode) filter.metode = metode;

    if (type === 'REKAP') {
      const rekap = await mutasiKasService.getMutasiKasRekap(filter);
      res.json(rekap);
    } else {
      const mutasi = await mutasiKasService.getMutasiKas(filter);
      // Mapping agar sesuai tipe MutasiKas frontend
      const mapped = mutasi.map((m: any) => ({
        id: m._id,
        noTransaksi: m.no_trx,
        tanggal: m.tanggal,
        kodeToko: m.kode_toko,
        namaToko: m.nama_toko || '',
        metode: m.metode,
        noRekening: m.no_rekening,
        namaRekening: m.nama_rekening || '',
        saldoAwal: m.saldo_awal,
        nominalKirim: m.jenis_kas === 'KIRIM' ? m.nominal_rp : 0,
        nominalTerima: m.jenis_kas === 'TERIMA' ? m.nominal_rp : 0,
        saldoAkhir: m.saldo_akhir,
        status: m.status_validasi,
        keterangan: m.keterangan,
        createdAt: m.created_at,
        updatedAt: m.updated_at || m.created_at,
      }));
      res.json(mapped);
    }
  } catch (err) {
    next(err);
  }
};

export const cancelMutasi = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const created_by = req.user.username;
    const mutasi = await mutasiKasService.cancelMutasiKas(id, created_by);
    res.json(mutasi);
  } catch (err) {
    next(err);
  }
};
