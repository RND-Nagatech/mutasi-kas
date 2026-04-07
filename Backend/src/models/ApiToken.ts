import mongoose, { Document, Schema } from 'mongoose';

export interface IApiToken extends Document {
  nama: string;
  kode_toko: string;
  token_version: number;
  is_active: boolean;
  last_used_at?: Date;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

const ApiTokenSchema = new Schema<IApiToken>({
  nama: { type: String, required: true },
  kode_toko: { type: String, required: true, index: true },
  token_version: { type: Number, required: true, default: 1 },
  is_active: { type: Boolean, required: true, default: true },
  last_used_at: { type: Date, default: undefined },
  created_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

ApiTokenSchema.pre('save', function updateTimestamp(next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.model<IApiToken>('tm_api_token', ApiTokenSchema, 'tm_api_token');
