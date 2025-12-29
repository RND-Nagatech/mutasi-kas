import type { ExportReportParams } from './types';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { formatDate, formatNumber } from '@/utils/format';

export function exportMutasiKasExcel<T = any>(params: ExportReportParams<T>) {
  const { title, startDate, endDate, filters, data } = params;
  const isRekap = String(filters?.type || '').toUpperCase() === 'REKAP';
  const rows: any[] = (data || []).map((m: any, idx: number) => {
    const tanggalRaw = m.tanggal || m.createdAt;
    const tanggal = tanggalRaw ? formatDate(tanggalRaw) : '';
    const saldoAwal = Number(m.saldoAwal ?? m.saldo_awal ?? 0) || 0;
    // Support both DETAIL and REKAP shapes
    const terima = Number(m.totalTerima ?? m.total_terima ?? m.nominalTerima ?? m.nominal_terima ?? m.nominal_rp_terima ?? 0) || 0;
    const kirim = Number(m.totalKirim ?? m.total_kirim ?? m.nominal_rp ?? m.nominalRp ?? m.nominalKirim ?? m.nominal_kirim ?? 0) || 0;
    const saldoAkhir = Number(m.saldoAkhir ?? m.saldo_akhir ?? 0) || 0;
    const tipe = terima > 0 ? 'Terima' : (kirim > 0 ? 'Kirim' : (m.metode || '-'));
    const keterangan = m.keterangan || m.keterangan_transaksi || '';
    const noRek = m.metode === 'CASH'
      ? (() => {
          const gramRaw = m.gramasi ?? m.gram ?? m.nominal_gr ?? m.nominalGr ?? m.nominalGrams ?? m.gramasiGr;
          if (typeof gramRaw === 'number' || (typeof gramRaw === 'string' && String(gramRaw).trim() !== '')) {
            const gramNum = typeof gramRaw === 'number' ? gramRaw : parseInt(String(gramRaw).replace(/[^0-9-]/g, ''), 10) || 0;
            if (gramNum > 0) return `${formatNumber(gramNum)} gr`;
          }
          return m.noRekening || m.no_rekening || '';
        })()
      : (m.noRekening || m.no_rekening || '');

    if (isRekap) {
      return [
        idx + 1,
        tanggal,
        saldoAwal,
        terima,
        kirim,
        saldoAkhir,
        keterangan,
        noRek,
      ];
    }

    return [
      idx + 1,
      tanggal,
      saldoAwal,
      terima,
      kirim,
      tipe,
      saldoAkhir,
      keterangan,
      noRek,
    ];
  });

  // Build workbook with metadata + data + totals
  const wb = XLSX.utils.book_new();

  const metaAoa = [
    [title || 'LAPORAN'],
    [`Tanggal : ${formatDate(startDate)} s/d ${formatDate(endDate)}`],
    [`Kode toko : ${filters?.kodeToko || filters?.kode_toko || 'Semua'}`],
    [`Metode transaksi : ${filters?.metode || 'Semua'}`],
    [],
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet(metaAoa);
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Info');

  // Header row
  const header = isRekap
    ? ['No', 'Tanggal', 'Saldo Awal', 'Terima', 'Kirim', 'Saldo Akhir', 'Keterangan', 'No Rekening']
    : ['No', 'Tanggal', 'Saldo Awal', 'Terima', 'Kirim', 'Tipe', 'Saldo Akhir', 'Keterangan', 'No Rekening'];
  const wsData = XLSX.utils.aoa_to_sheet([header, ...rows]);

  // Set column widths to improve wrapping in Excel viewer
  wsData['!cols'] = [
    { wpx: 30 }, // No
    { wpx: 80 }, // Tanggal
    { wpx: 90 }, // Saldo Awal
    { wpx: 90 }, // Terima
    { wpx: 90 }, // Kirim
    { wpx: 80 }, // Tipe
    { wpx: 100 }, // Saldo Akhir
    { wpx: 220 }, // Keterangan
    { wpx: 140 }, // No Rekening
  ];

  // calculate totals
  // Totals depend on whether Tipe column is present (affects indexes)
  const totalSaldoAwal = rows.reduce((s, r) => s + (isRekap ? (r[2] || 0) : (r[2] || 0)), 0);
  const totalTerima = rows.reduce((s, r) => s + (isRekap ? (r[3] || 0) : (r[3] || 0)), 0);
  const totalKirim = rows.reduce((s, r) => s + (isRekap ? (r[4] || 0) : (r[4] || 0)), 0);
  const totalSaldoAkhir = rows.reduce((s, r) => s + (isRekap ? (r[5] || 0) : (r[6] || 0)), 0);

  const totalsRow = isRekap
    ? ['TOTAL', '', totalSaldoAwal, totalTerima, totalKirim, totalSaldoAkhir, '', '']
    : ['TOTAL', '', totalSaldoAwal, totalTerima, totalKirim, '', totalSaldoAkhir, '', ''];
  XLSX.utils.sheet_add_aoa(wsData, [[], totalsRow], { origin: -1 });

  XLSX.utils.book_append_sheet(wb, wsData, 'Data');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const fileName = `${title.replace(/[^a-z0-9]/gi, '_') || 'laporan'}_${formatDate(startDate)}_${formatDate(endDate)}.xlsx`;
  saveAs(blob, fileName);
}

export default exportMutasiKasExcel;
