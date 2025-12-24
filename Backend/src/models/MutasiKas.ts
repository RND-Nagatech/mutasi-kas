import mongoose, { Document, Schema } from 'mongoose';

export interface IMutasiKas extends Document {
  jenis_kas: string;
  kode_toko: string;
  tanggal: Date;
  jam: string;
  no_trx: string;
  metode: string;
  saldo_awal: number;
  nominal_rp: number;
  saldo_akhir: number;
  kode_bank: string;
  no_rekening: string;
  gramasi?: number;
  keterangan: string;
  created_by: string;
  created_at: Date;
  status_validasi: string;
  valid_by: string;
}

const MutasiKasSchema = new Schema<IMutasiKas>({
  jenis_kas: { type: String, default: 'KIRIM', enum: ['KIRIM', 'TERIMA'] },
  kode_toko: { type: String, required: true },
  tanggal: { type: Date, required: true },
  jam: { type: String, required: true },
  no_trx: { type: String, required: true, unique: true },
  metode: { type: String, required: true, enum: ['CASH', 'TRANSFER'] },
  saldo_awal: { type: Number, required: true },
  nominal_rp: { type: Number, required: true },
  saldo_akhir: { type: Number, required: true },
  kode_bank: { type: String, required: true },
  no_rekening: { type: String, required: true },
  gramasi: { type: Number, default: 0 },
  keterangan: { type: String, required: true },
  created_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  status_validasi: { type: String, default: 'OPEN', enum: ['OPEN', 'CANCEL', 'DONE', 'REJECT'] },
  valid_by: { type: String, default: '-' },
});

export default mongoose.model<IMutasiKas>('tt_mutasi_kas', MutasiKasSchema);
