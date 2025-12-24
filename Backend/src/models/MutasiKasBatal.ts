import mongoose, { Document, Schema } from 'mongoose';

export interface IMutasiKasBatal extends Document {
  tanggal: Date;
  jam: string;
  no_trx: string;
  jenis_kas: string;
  metode: string;
  saldo_awal: number;
  nominal_rp: number;
  saldo_akhir: number;
  kode_bank: string;
  no_rekening: string;
  keterangan: string;
  created_by: string;
  created_at: Date;
  status_validasi: string;
  valid_by: string;
}

const MutasiKasBatalSchema = new Schema<IMutasiKasBatal>({
  tanggal: { type: Date, required: true },
  jam: { type: String, required: true },
  no_trx: { type: String, required: true },
  jenis_kas: { type: String, required: true },
  metode: { type: String, required: true },
  saldo_awal: { type: Number, required: true },
  nominal_rp: { type: Number, required: true },
  saldo_akhir: { type: Number, required: true },
  kode_bank: { type: String, required: true },
  no_rekening: { type: String, required: true },
  keterangan: { type: String, required: true },
  created_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  status_validasi: { type: String, required: true },
  valid_by: { type: String, required: true },
});

export default mongoose.model<IMutasiKasBatal>('tt_mutasi_kas_batal', MutasiKasBatalSchema);
