import mongoose, { Schema, Document } from 'mongoose';

export interface IToko extends Document {
  kode_toko: string;
  nama_toko: string;
}

const TokoSchema: Schema = new Schema({
  kode_toko: { type: String, required: true, unique: true },
  nama_toko: { type: String, required: true },
});

export default mongoose.model<IToko>('tm_cabang', TokoSchema);
