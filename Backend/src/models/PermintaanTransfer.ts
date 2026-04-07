import mongoose, { Document, Schema } from 'mongoose';

export type PermintaanTransferStatus = 'OPEN' | 'APPROVED' | 'REJECTED';

export interface IPermintaanTransfer extends Document {
  tanggal: Date;
  nominal_rp: number;
  input_by: string;
  no_rekening_tujuan: string;
  nama_bank_tujuan: string;
  atas_nama_penerima: string;
  kode_toko_peminta: string;
  status: PermintaanTransferStatus;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  no_rekening_sumber?: string;
  mutasi_kas_id?: string;
  no_trx_mutasi?: string;
  reviewed_by?: string;
  reviewed_at?: Date;
}

const PermintaanTransferSchema = new Schema<IPermintaanTransfer>({
  tanggal: { type: Date, required: true },
  nominal_rp: { type: Number, required: true, min: 1 },
  input_by: { type: String, required: true },
  no_rekening_tujuan: { type: String, required: true },
  nama_bank_tujuan: { type: String, required: true },
  atas_nama_penerima: { type: String, required: true },
  kode_toko_peminta: { type: String, required: true },
  status: { type: String, enum: ['OPEN', 'APPROVED', 'REJECTED'], default: 'OPEN' },
  created_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  no_rekening_sumber: { type: String, default: undefined },
  mutasi_kas_id: { type: String, default: undefined },
  no_trx_mutasi: { type: String, default: undefined },
  reviewed_by: { type: String, default: undefined },
  reviewed_at: { type: Date, default: undefined },
});

PermintaanTransferSchema.pre('save', function updateTimestamp(next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.model<IPermintaanTransfer>(
  'tt_permintaan_transfer',
  PermintaanTransferSchema,
  'tt_permintaan_transfer'
);
