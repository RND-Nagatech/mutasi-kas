import mongoose, { Schema, Document } from 'mongoose';

export interface ISaldoRekening extends Document {
  no_rekening: string;
  nominal: number;
  tanggal: Date;
  input_by: string;
}

const SaldoRekeningSchema: Schema = new Schema({
  no_rekening: { type: String, required: true },
  nominal: { type: Number, required: true },
  tanggal: { type: Date, default: Date.now },
  input_by: { type: String, required: true },
});

export default mongoose.model<ISaldoRekening>('saldo_rekening', SaldoRekeningSchema,'tt_saldo_rekening');
