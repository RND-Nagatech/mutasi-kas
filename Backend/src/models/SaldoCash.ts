import mongoose, { Schema, Document } from 'mongoose';

export interface ISaldoCash extends Document {
  nominal: number;
  tanggal: Date;
  input_by: string;
}

const SaldoCashSchema: Schema = new Schema({
  nominal: { type: Number, required: true },
  tanggal: { type: Date, default: Date.now },
  input_by: { type: String, required: true },
});

export default mongoose.model<ISaldoCash>('saldo_cash', SaldoCashSchema,'tt_saldo_cash');
