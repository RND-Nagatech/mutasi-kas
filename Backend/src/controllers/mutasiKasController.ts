import { Request, Response, NextFunction } from 'express';
import * as mutasiKasService from '../services/mutasiKasService';
import { AuthRequest } from '../middleware/auth';
import { ApiTokenRequest } from '../middleware/apiTokenAuth';
import MutasiKas from '../models/MutasiKas';

function mapMutasiResponse(m: any) {
  return {
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
  };
}

export const createMutasi = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = req.body || {};
    const normalized = { ...data } as any;
    if (!normalized.jenis_kas && normalized.jenisKas) {
      normalized.jenis_kas = normalized.jenisKas;
    }
    const created_by = req.user.username;
    const mutasi = await mutasiKasService.createMutasiKas({ ...normalized, created_by });
    res.status(201).json(mutasi);
  } catch (err) {
    next(err);
  }
};

export const getMutasi = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Ambil filter dari query
    const { type = 'DETAIL', startDate, endDate, kodeToko, metode, jenisTransaksi, includeCanceled, statusValidasi } = req.query;
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

    // If caller sets explicit statusValidasi, use it directly.
    if (statusValidasi && String(statusValidasi).toUpperCase() !== 'ALL') {
      filter.status_validasi = String(statusValidasi).toUpperCase();
    } else {
      // Backward compatibility: default exclude cancelled transactions by returning OPEN only.
      const showCanceled = includeCanceled === 'true' || includeCanceled === '1';
      if (!showCanceled) {
        filter.status_validasi = 'OPEN';
      }
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
      const mapped = mutasi.map((m: any) => mapMutasiResponse(m));
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

export const validateMutasi = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const valid_by = req.user.username;
    const mutasi = await mutasiKasService.validateMutasiKas(id, valid_by);
    res.json(mutasi);
  } catch (err) {
    next(err);
  }
};

export const getMutasiValidasiByApiToken = async (req: ApiTokenRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.apiToken?.kode_toko) throw { status: 401, message: 'Invalid API token store context' };
    const { startDate, endDate, metode } = req.query;
    const filter: any = {
      kode_toko: req.apiToken.kode_toko,
      jenis_kas: 'KIRIM',
      status_validasi: 'OPEN',
    };
    if (startDate && endDate) {
      const sd = new Date(startDate as string);
      sd.setHours(0, 0, 0, 0);
      const ed = new Date(endDate as string);
      ed.setHours(23, 59, 59, 999);
      filter.tanggal = { $gte: sd, $lte: ed };
    }
    if (metode && String(metode).toUpperCase() !== 'ALL') {
      filter.metode = String(metode).toUpperCase();
    }
    const mutasi = await mutasiKasService.getMutasiKas(filter);
    res.json(mutasi.map((m: any) => mapMutasiResponse(m)));
  } catch (err) {
    next(err);
  }
};

export const validateMutasiByApiToken = async (req: ApiTokenRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.apiToken?.kode_toko) throw { status: 401, message: 'Invalid API token store context' };
    const { id } = req.params;
    const existing = await MutasiKas.findById(id);
    if (!existing) throw { status: 404, message: 'Mutasi not found' };
    if (String(existing.kode_toko) !== String(req.apiToken.kode_toko)) {
      throw { status: 403, message: 'Mutasi does not belong to token store' };
    }
    const valid_by = `api-token:${req.apiToken.id}`;
    const mutasi = await mutasiKasService.validateMutasiKas(id, valid_by);
    res.json(mapMutasiResponse(mutasi));
  } catch (err) {
    next(err);
  }
};

export const cancelMutasiByApiToken = async (req: ApiTokenRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.apiToken?.kode_toko) throw { status: 401, message: 'Invalid API token store context' };
    const { id } = req.params;
    const existing = await MutasiKas.findById(id);
    if (!existing) throw { status: 404, message: 'Mutasi not found' };
    if (String(existing.kode_toko) !== String(req.apiToken.kode_toko)) {
      throw { status: 403, message: 'Mutasi does not belong to token store' };
    }
    const { alasan } = req.body || {};
    const created_by = `api-token:${req.apiToken.id}`;
    const mutasi = await mutasiKasService.cancelMutasiKas(id, created_by, alasan);
    res.json(mapMutasiResponse(mutasi));
  } catch (err) {
    next(err);
  }
};

export const createTerimaKasByApiToken = async (req: ApiTokenRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.apiToken?.kode_toko) throw { status: 401, message: 'Invalid API token store context' };
    const body = req.body || {};
    const metode = String(body.metode || 'TRANSFER').toUpperCase();
    const noRekening = metode === 'CASH' ? '-' : String(body.no_rekening || '').trim();
    if (metode === 'TRANSFER' && !noRekening) {
      throw { status: 400, message: 'no_rekening wajib diisi untuk metode TRANSFER' };
    }
    const nominal = Number(body.nominal_rp || 0);
    if (!nominal || nominal <= 0) throw { status: 400, message: 'nominal_rp wajib lebih dari 0' };

    let saldoAwal = Number(body.saldo_awal);
    if (Number.isNaN(saldoAwal)) {
      const TmKas = (await import('../models/TmKas')).default;
      const tm = await TmKas.findOne({ metode, no_rekening: noRekening }).sort({ _id: -1 });
      saldoAwal = tm ? Number(tm.saldo_akhir || 0) : 0;
    }

    const created_by = `api-token:${req.apiToken.id}`;
    const mutasi = await mutasiKasService.createMutasiKas({
      kode_toko: req.apiToken.kode_toko,
      tanggal: body.tanggal ? new Date(body.tanggal) : new Date(),
      jam: body.jam || new Date().toLocaleTimeString('id-ID', { hour12: false }),
      metode,
      saldo_awal: saldoAwal,
      nominal_rp: nominal,
      kode_bank: body.kode_bank || '-',
      no_rekening: noRekening,
      gramasi: Number(body.gramasi || 0),
      keterangan: body.keterangan || 'Terima kas via OpenAPI',
      jenis_kas: 'TERIMA',
      created_by,
    } as any, { syncLedger: false });
    res.status(201).json(mapMutasiResponse(mutasi));
  } catch (err) {
    next(err);
  }
};
