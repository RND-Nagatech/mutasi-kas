import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { API_TOKEN_SECRET } from '../config/apiToken';
import { verifyApiTokenPayload } from '../services/apiTokenService';

export interface ApiTokenRequest extends Request {
  apiToken?: {
    id: string;
    nama: string;
    kode_toko: string;
  };
}

export const apiTokenAuthMiddleware = async (
  req: ApiTokenRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No API token provided' });

    const payload = jwt.verify(token, API_TOKEN_SECRET);
    const apiToken = await verifyApiTokenPayload(payload);

    req.apiToken = {
      id: String(apiToken._id),
      nama: apiToken.nama,
      kode_toko: apiToken.kode_toko,
    };

    next();
  } catch (err: any) {
    return res.status(401).json({ message: err?.message || 'Invalid API token' });
  }
};
