import mongoose, { Schema, Document } from 'mongoose';

export interface ITmKas extends Document {
  metode: string;
  no_rekening: string;
  saldo_akhir: number;
}

const TmKasSchema: Schema = new Schema({
  metode: { type: String, required: true },
  no_rekening: { type: String, required: true },
  saldo_akhir: { type: Number, required: true },
});

export default mongoose.model<ITmKas>('tm_kas', TmKasSchema, 'tm_kas');
