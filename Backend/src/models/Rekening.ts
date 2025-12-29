import mongoose, { Document, Schema } from 'mongoose';


export interface IRekening extends Document {
  kode_bank: string;
  no_rekening: string;
  nama_rekening: string;
  input_by?: string;
  edited_by?: string;
  deleted_by?: string;
  created_at: Date;
  updated_at: Date;
}

const RekeningSchema = new Schema<IRekening>({
  kode_bank: { type: String, required: true },
  no_rekening: { type: String, required: true, unique: true },
  nama_rekening: { type: String, required: true },
  input_by: { type: String },
  edited_by: { type: String },
  deleted_by: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export default mongoose.model<IRekening>('Rekening', RekeningSchema, 'tm_rekening');