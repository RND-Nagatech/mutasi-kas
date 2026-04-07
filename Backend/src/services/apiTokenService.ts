import jwt from 'jsonwebtoken';
import ApiToken, { IApiToken } from '../models/ApiToken';
import { API_TOKEN_EXPIRES_IN, API_TOKEN_SECRET } from '../config/apiToken';

type CreateApiTokenInput = {
  nama: string;
  kode_toko: string;
  created_by: string;
};

type UpdateApiTokenInput = {
  nama?: string;
  is_active?: boolean;
};

function signApiToken(token: IApiToken): string {
  return jwt.sign(
    {
      type: 'api_token',
      token_id: String(token._id),
      kode_toko: token.kode_toko,
      token_version: token.token_version,
    },
    API_TOKEN_SECRET,
    { expiresIn: API_TOKEN_EXPIRES_IN as any }
  );
}

export const createApiToken = async (payload: CreateApiTokenInput) => {
  if (!payload.nama) throw { status: 400, message: 'nama is required' };
  if (!payload.kode_toko) throw { status: 400, message: 'kode_toko is required' };

  const token = await ApiToken.create({
    nama: payload.nama,
    kode_toko: payload.kode_toko,
    token_version: 1,
    is_active: true,
    created_by: payload.created_by,
  });

  const plainToken = signApiToken(token);
  return { token, plainToken };
};

export const listApiTokens = async () => {
  return ApiToken.find().sort({ created_at: -1 });
};

export const getApiTokenById = async (id: string) => {
  const token = await ApiToken.findById(id);
  if (!token) throw { status: 404, message: 'API token not found' };
  return token;
};

export const updateApiToken = async (id: string, payload: UpdateApiTokenInput) => {
  const token = await getApiTokenById(id);
  if (payload.nama !== undefined) token.nama = payload.nama;
  if (payload.is_active !== undefined) token.is_active = payload.is_active;
  token.updated_at = new Date();
  await token.save();
  return token;
};

export const deleteApiToken = async (id: string) => {
  await getApiTokenById(id);
  await ApiToken.deleteOne({ _id: id });
};

export const regenerateApiToken = async (id: string) => {
  const token = await getApiTokenById(id);
  token.token_version = Number(token.token_version || 0) + 1;
  token.updated_at = new Date();
  await token.save();
  const plainToken = signApiToken(token);
  return { token, plainToken };
};

export const verifyApiTokenPayload = async (payload: any) => {
  if (!payload || payload.type !== 'api_token' || !payload.token_id) {
    throw { status: 401, message: 'Invalid API token payload' };
  }

  const token = await ApiToken.findById(String(payload.token_id));
  if (!token) throw { status: 401, message: 'API token not found' };
  if (!token.is_active) throw { status: 401, message: 'API token is inactive' };
  if (Number(token.token_version) !== Number(payload.token_version)) {
    throw { status: 401, message: 'API token has been rotated' };
  }
  if (String(token.kode_toko) !== String(payload.kode_toko)) {
    throw { status: 401, message: 'API token store mismatch' };
  }

  token.last_used_at = new Date();
  await token.save();

  return token;
};
