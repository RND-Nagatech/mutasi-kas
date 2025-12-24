import mongoose, { Document, Schema } from 'mongoose';

export interface IBank extends Document {
  kode_bank: string;
  nama_bank: string;
  nomor_akun: string;
  input_by?: string;
  edited_by?: string;
  deleted_by?: string;
  created_at: Date;
  updated_at: Date;
}

const BankSchema = new Schema<IBank>({
  kode_bank: { type: String, required: true, unique: true },
  nama_bank: { type: String, required: true },
  nomor_akun: { type: String, required: true },
  input_by: { type: String },
  edited_by: { type: String },
  deleted_by: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export default mongoose.model<IBank>('Bank', BankSchema, 'tm_bank');