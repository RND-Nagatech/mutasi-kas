import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  createApiToken,
  deleteApiToken,
  getApiTokenById,
  listApiTokens,
  regenerateApiToken,
  updateApiToken,
} from '../services/apiTokenService';

function toResponse(item: any) {
  return {
    id: item._id,
    nama: item.nama,
    kode_toko: item.kode_toko,
    token_version: item.token_version,
    is_active: item.is_active,
    last_used_at: item.last_used_at || null,
    created_by: item.created_by,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const createdBy = req.user?.username || 'unknown';
    const result = await createApiToken({
      nama: req.body.nama,
      kode_toko: req.body.kode_toko,
      created_by: createdBy,
    });
    res.status(201).json({
      ...toResponse(result.token),
      token: result.plainToken,
    });
  } catch (err) {
    next(err);
  }
};

export const list = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const items = await listApiTokens();
    res.json(items.map(toResponse));
  } catch (err) {
    next(err);
  }
};

export const detail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await getApiTokenById(req.params.id);
    res.json(toResponse(item));
  } catch (err) {
    next(err);
  }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await updateApiToken(req.params.id, {
      nama: req.body.nama,
      is_active: req.body.is_active,
    });
    res.json(toResponse(item));
  } catch (err) {
    next(err);
  }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await deleteApiToken(req.params.id);
    res.json({ success: true, message: 'API token deleted' });
  } catch (err) {
    next(err);
  }
};

export const regenerate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await regenerateApiToken(req.params.id);
    res.json({
      ...toResponse(result.token),
      token: result.plainToken,
    });
  } catch (err) {
    next(err);
  }
};
