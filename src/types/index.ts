// Authentication Types
export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Common API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Master Bank Types
export interface Bank {
  id: string;
  kodeBank: string;
  namaBank: string;
  nomorAkun: string;
  editedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBankRequest {
  kodeBank: string;
  namaBank: string;
  nomorAkun: string;
}

export interface UpdateBankRequest extends Partial<CreateBankRequest> {
  id: string;
}

// Master Rekening Types
export interface Rekening {
  id: string;
  bankId?: string;
  kodeBank?: string;
  namaBank?: string;
  noRekening?: string;
  namaRekening?: string;
  input_by?: string;
  editedBy?: string;
  deleted_by?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRekeningRequest {
  bankId: string;
  noRekening: string;
  namaRekening: string;
}

export interface UpdateRekeningRequest extends Partial<CreateRekeningRequest> {
  id: string;
}

// Master Toko Types
export interface Toko {
  id: string;
  kodeToko: string;
  namaToko: string;
  alamat: string;
  saldo: number;
}

// Transaction Types
export type MetodeTransaksi = 'CASH' | 'TRANSFER';
export type StatusTransaksi = 'OPEN' | 'DONE' | 'CANCEL' | 'REJECT';

export interface MutasiKas {
  id: string;
  noTransaksi: string;
  tanggal: string;
  kodeToko: string;
  namaToko: string;
  metode: MetodeTransaksi;
  noRekening?: string;
  namaRekening?: string;
  saldoAwal: number;
  nominalKirim: number;
  saldoAkhir: number;
  status: StatusTransaksi;
  keterangan?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KirimKasRequest {
  kodeToko: string;
  metode: MetodeTransaksi;
  noRekening?: string;
  nominalKirim: number;
  keterangan?: string;
}

export interface BatalKirimKasRequest {
  id: string;
  alasan: string;
}

// Dashboard Types
export interface DashboardSummary {
  saldoHariIni: number;
  totalKirimKas: number;
  totalTerimaKas: number;
  jumlahTransaksiHariIni: number;
}

// Report Filter Types
export interface LaporanMutasiFilter {
  type?: 'DETAIL' | 'REKAP';
  startDate: string;
  endDate: string;
  kodeToko?: string;
  metode?: MetodeTransaksi;
}

export interface LaporanKirimanFilter {
  startDate: string;
  endDate: string;
  kodeToko?: string;
  jenisTransaksi?: string;
  metode?: MetodeTransaksi;
  rekeningId?: string;
}
