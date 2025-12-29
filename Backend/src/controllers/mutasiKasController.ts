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
    const { type = 'DETAIL', startDate, endDate, kodeToko, metode, jenisTransaksi, includeCanceled } = req.query;
    const filter: any = {};
    if (startDate && endDate) {
      // Make date range inclusive: start at 00:00:00 and end at 23:59:59.999
      const sd = new Date(startDate as string);
      sd.setHours(0, 0, 0, 0);
      const ed = new Date(endDate as string);
      ed.setHours(23, 59, 59, 999);
      filter.tanggal = { $gte: sd, $lte: ed };
    }
    if (kodeToko) filter.kode_toko = kodeToko;
    // Treat explicit 'ALL' (from frontend) as no filter for metode
    if (metode && String(metode).toUpperCase() !== 'ALL') filter.metode = String(metode);
    // jenisTransaksi maps to jenis_kas in tt_mutasi_kas
    if (jenisTransaksi && String(jenisTransaksi).toUpperCase() !== 'ALL') filter.jenis_kas = String(jenisTransaksi).toUpperCase();

    // By default exclude cancelled transactions. If caller sets includeCanceled=true, return all statuses.
    const showCanceled = includeCanceled === 'true' || includeCanceled === '1';
    if (!showCanceled) {
      filter.status_validasi = 'OPEN';
    }

    if (type === 'REKAP') {
      const rekap = await mutasiKasService.getMutasiKasRekap(filter);
      res.json(rekap);
    } else {
      // Debug: log filter used for query
      console.log('[getMutasi] filter:', JSON.stringify(filter));
      const mutasi = await mutasiKasService.getMutasiKas(filter);
      console.log('[getMutasi] result count:', Array.isArray(mutasi) ? mutasi.length : 0);
      // Mapping agar sesuai tipe MutasiKas frontend
      const mapped = mutasi.map((m: any) => ({
        id: m._id,
        noTransaksi: m.no_trx,
        tanggal: m.tanggal,
        kodeToko: m.kode_toko,
        namaToko: m.nama_toko || '',
        metode: m.metode,
        noRekening: m.no_rekening,
        gramasi: m.gramasi ?? m.gram ?? 0,
        namaRekening: m.nama_rekening || '',
        saldoAwal: m.saldo_awal,
        nominalKirim: m.jenis_kas === 'KIRIM' ? m.nominal_rp : 0,
        nominalTerima: m.jenis_kas === 'TERIMA' ? m.nominal_rp : 0,
        nominalRp: m.nominal_rp,
        jenisKas: m.jenis_kas,
        saldoAkhir: m.saldo_akhir,
        status: m.status_validasi,
        keterangan: m.keterangan,
        createdAt: m.created_at,
        updatedAt: m.updated_at || m.created_at,
        createdBy: m.created_by,
        validBy: m.valid_by,
      }));
      res.json(mapped);
    }
  } catch (err) {
    next(err);
  }
};

export const getLastSaldoAkhir = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { metode, noRekening } = req.query;
    const TmKas = (await import('../models/TmKas')).default;
    let filter: any = {};
    if (metode) filter.metode = String(metode);
    // For CASH we expect no_rekening = '-'
    if (String(metode) === 'CASH') {
      filter.no_rekening = '-';
    } else if (String(metode) === 'TRANSFER' && noRekening) {
      filter.no_rekening = String(noRekening);
    }
    const tm = await TmKas.findOne(filter).sort({ _id: -1 });
    const saldoAkhir = tm ? tm.saldo_akhir : 0;
    res.json({ saldoAkhir });
  } catch (err) {
    next(err);
  }
};

export const cancelMutasi = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { alasan } = req.body;
    const created_by = req.user.username;
    const mutasi = await mutasiKasService.cancelMutasiKas(id, created_by, alasan);
    res.json(mutasi);
  } catch (err) {
    next(err);
  }
};
