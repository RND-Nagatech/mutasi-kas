import { NextFunction, Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiTokenRequest } from '../middleware/apiTokenAuth';
import {
  changePermintaanTransferStatus,
  createPermintaanTransfer,
  deletePermintaanTransfer,
  getPermintaanTransferById,
  getPermintaanTransferList,
  updatePermintaanTransfer,
} from '../services/permintaanTransferService';
import { PermintaanTransferStatus } from '../models/PermintaanTransfer';

function toResponse(item: any) {
  return {
    id: item._id,
    tanggal: item.tanggal,
    nominalRp: item.nominal_rp,
    inputBy: item.input_by,
    noRekeningTujuan: item.no_rekening_tujuan,
    namaBankTujuan: item.nama_bank_tujuan,
    atasNamaPenerima: item.atas_nama_penerima,
    kodeTokoPeminta: item.kode_toko_peminta,
    status: item.status,
    createdBy: item.created_by,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    noRekeningSumber: item.no_rekening_sumber || '',
    mutasiKasId: item.mutasi_kas_id || '',
    noTrxMutasi: item.no_trx_mutasi || '',
    reviewedBy: item.reviewed_by || '',
    reviewedAt: item.reviewed_at || null,
  };
}

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const createdBy = req.user?.username || 'unknown';
    const created = await createPermintaanTransfer({
      tanggal: req.body.tanggal,
      nominal_rp: Number(req.body.nominal_rp),
      input_by: req.body.input_by,
      no_rekening_tujuan: req.body.no_rekening_tujuan,
      nama_bank_tujuan: req.body.nama_bank_tujuan,
      atas_nama_penerima: req.body.atas_nama_penerima,
      kode_toko_peminta: req.body.kode_toko_peminta,
      created_by: createdBy,
    });
    res.status(201).json(toResponse(created));
  } catch (err) {
    next(err);
  }
};

export const createFromApiToken = async (req: ApiTokenRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.apiToken?.kode_toko) {
      throw { status: 401, message: 'Invalid API token store context' };
    }
    const createdBy = `api-token:${req.apiToken.id}`;
    const created = await createPermintaanTransfer({
      tanggal: req.body.tanggal,
      nominal_rp: Number(req.body.nominal_rp),
      input_by: req.body.input_by,
      no_rekening_tujuan: req.body.no_rekening_tujuan,
      nama_bank_tujuan: req.body.nama_bank_tujuan,
      atas_nama_penerima: req.body.atas_nama_penerima,
      kode_toko_peminta: req.apiToken.kode_toko,
      created_by: createdBy,
    });
    res.status(201).json(toResponse(created));
  } catch (err) {
    next(err);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await getPermintaanTransferList({
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      kodeToko: req.query.kodeToko as string | undefined,
      status: req.query.status as string | undefined,
    });
    res.json(items.map(toResponse));
  } catch (err) {
    next(err);
  }
};

export const detail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await getPermintaanTransferById(req.params.id);
    res.json(toResponse(item));
  } catch (err) {
    next(err);
  }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await updatePermintaanTransfer(req.params.id, {
      tanggal: req.body.tanggal,
      nominal_rp: req.body.nominal_rp !== undefined ? Number(req.body.nominal_rp) : undefined,
      input_by: req.body.input_by,
      no_rekening_tujuan: req.body.no_rekening_tujuan,
      nama_bank_tujuan: req.body.nama_bank_tujuan,
      atas_nama_penerima: req.body.atas_nama_penerima,
      kode_toko_peminta: req.body.kode_toko_peminta,
    });
    res.json(toResponse(item));
  } catch (err) {
    next(err);
  }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await deletePermintaanTransfer(req.params.id);
    res.json({ success: true, message: 'Permintaan transfer deleted' });
  } catch (err) {
    next(err);
  }
};

export const changeStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reviewedBy = req.user?.username || 'unknown';
    const status = String(req.body.status || '').toUpperCase() as PermintaanTransferStatus;
    const item = await changePermintaanTransferStatus(
      req.params.id,
      status,
      reviewedBy,
      req.body.no_rekening_sumber
    );
    res.json(toResponse(item));
  } catch (err) {
    next(err);
  }
};
