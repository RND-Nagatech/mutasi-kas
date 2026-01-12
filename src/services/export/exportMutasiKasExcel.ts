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
    let terima = 0;
    let kirim = 0;
    if (isRekap) {
      terima = Number(m.totalTerima ?? m.total_terima ?? m.nominalTerima ?? m.nominal_terima ?? m.nominal_rp_terima ?? 0) || 0;
      kirim = Number(m.totalKirim ?? m.total_kirim ?? m.nominal_rp ?? m.nominalRp ?? m.nominalKirim ?? m.nominal_kirim ?? 0) || 0;
    } else {
      const jenis = (m.jenisKas || m.jenis_kas || m.jenis || '').toString().toUpperCase();
      terima = jenis === 'TERIMA'
        ? Number(m.nominalTerima ?? m.nominal_terima ?? m.nominal_rp_terima ?? m.nominalRp ?? m.nominal_rp ?? 0) || 0
        : 0;
      kirim = jenis === 'KIRIM'
        ? Number(m.nominalKirim ?? m.nominal_kirim ?? m.nominal_rp ?? m.nominalRp ?? 0) || 0
        : 0;
    }
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

  // Build workbook with metadata + data + totals in a single sheet
  const wb = XLSX.utils.book_new();

  const metaAoa = [
    [title || 'LAPORAN'],
    [`Tanggal : ${formatDate(startDate)} s/d ${formatDate(endDate)}`],
    [`Kode toko : ${filters?.kodeToko || filters?.kode_toko || 'Semua'}`],
    [`Metode transaksi : ${filters?.metode || 'Semua'}`],
    [],
  ];

  // Header row
  const header = isRekap
    ? ['No', 'Tanggal', 'Saldo Awal', 'Terima', 'Kirim', 'Saldo Akhir']
    : ['No', 'Tanggal', 'Saldo Awal', 'Terima', 'Kirim', 'Tipe', 'Saldo Akhir', 'Keterangan', 'No Rekening'];

  const aoa: any[] = [];
  aoa.push(...metaAoa);
  aoa.push(header);
  aoa.push(...rows);
  aoa.push([]);

  // calculate totals
  const totalSaldoAwal = rows.reduce((s, r) => s + (isRekap ? (r[2] || 0) : (r[2] || 0)), 0);
  const totalTerima = rows.reduce((s, r) => s + (isRekap ? (r[3] || 0) : (r[3] || 0)), 0);
  const totalKirim = rows.reduce((s, r) => s + (isRekap ? (r[4] || 0) : (r[4] || 0)), 0);
  // const totalSaldoAkhir = rows.reduce((s, r) => s + (isRekap ? (r[5] || 0) : (r[6] || 0)), 0);

  // Hide total for 'Saldo Akhir' column, but keep total for 'Terima'
  // Place totalTerima in the correct column for both Rekap and Detail, and leave Saldo Akhir blank
  let totalsRow;
  if (isRekap) {
    // ['No', 'Tanggal', 'Saldo Awal', 'Terima', 'Kirim', 'Saldo Akhir']
    totalsRow = ['TOTAL', '', '', totalTerima, totalKirim, ''];
  } else {
    // ['No', 'Tanggal', 'Saldo Awal', 'Terima', 'Kirim', 'Tipe', 'Saldo Akhir', 'Keterangan', 'No Rekening']
    totalsRow = ['TOTAL', '', '', totalTerima, totalKirim, '', '', '', ''];
  }
  aoa.push(totalsRow);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merge first 4 columns for TOTAL label (A..D) when header has >=4 columns
  try {
    if (header.length >= 4) {
      const totalRowIndex = aoa.length - 1; // 0-based
      ws['!merges'] = ws['!merges'] || [];
      // Merge first two columns for TOTAL label (A and B)
      ws['!merges'].push({ s: { r: totalRowIndex, c: 0 }, e: { r: totalRowIndex, c: 1 } });
      const totalCellAddr = XLSX.utils.encode_cell({ r: totalRowIndex, c: 0 });
      ws[totalCellAddr] = { v: 'TOTAL', t: 's' };
    }
  } catch (e) {
    // ignore
  }

  if (isRekap) {
    ws['!cols'] = [
      { wpx: 30 }, // No
      { wpx: 80 }, // Tanggal
      { wpx: 100 }, // Saldo Awal
      { wpx: 100 }, // Terima
      { wpx: 100 }, // Kirim
      { wpx: 120 }, // Saldo Akhir
    ];
  } else {
    ws['!cols'] = [
      { wpx: 30 }, // No
      { wpx: 100 }, // Kode Toko / Tanggal
      { wpx: 90 }, // Saldo Awal
      { wpx: 90 }, // Terima
      { wpx: 90 }, // Kirim
      { wpx: 80 }, // Tipe
      { wpx: 100 }, // Saldo Akhir
      { wpx: 220 }, // Keterangan
      { wpx: 140 }, // No Rekening
    ];
  }

  // Apply table styles: header bold/centered with gray fill; full grid with thin inner borders and thick outer border; TOTAL row bold with darker gray
  try {
    const metaRows = metaAoa.length; // number of meta rows above header
    const headerRow = metaRows + 1; // 1-based
    const totalRows = aoa.length; // includes totals as last row
    const lastCol = header.length; // number of columns

    const thin = { style: 'thin', color: { rgb: 'FF000000' } };
    const thick = { style: 'medium', color: { rgb: 'FF000000' } };

    // Determine currency columns based on mode
    const currencyCols = isRekap ? [2, 3, 4, 5] : [2, 3, 4, 6];

    const topRowIndex = headerRow - 1;
    const bottomRowIndex = totalRows - 1;

    for (let r = headerRow; r <= totalRows; r++) {
      for (let c = 0; c < lastCol; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r: r - 1, c });
        const cell = ws[cellAddress];
        if (!cell) continue;
        cell.s = cell.s || {};

        // default border: thin on all sides
        const border: any = { top: thin, bottom: thin, left: thin, right: thin };

        // outer borders: make them thick
        if ((r - 1) === topRowIndex) border.top = thick;
        if ((r - 1) === bottomRowIndex) border.bottom = thick;
        if (c === 0) border.left = thick;
        if (c === lastCol - 1) border.right = thick;

        // ensure TOTAL row has thick top & bottom
        if ((r - 1) === bottomRowIndex) {
          border.top = thick;
          border.bottom = thick;
        }

        cell.s.border = border;

        if (r === headerRow) {
          cell.s.font = { bold: true };
          cell.s.alignment = { horizontal: 'center', vertical: 'center' };
          cell.s.fill = { fgColor: { rgb: 'FFE6E6E6' } };
        } else if (r === totalRows) {
          cell.s.font = { bold: true };
          cell.s.alignment = { horizontal: currencyCols.includes(c) ? 'right' : 'center', vertical: 'center' };
          cell.s.fill = { fgColor: { rgb: 'FFF5F5F5' } };
          // Only format and set value if not empty
          if (currencyCols.includes(c)) {
            if (cell && (cell.v === undefined || cell.v === null || cell.v === '')) {
              // leave as is (empty cell)
            } else if (typeof cell.v === 'string') {
              const num = Number(String(cell.v).replace(/[^0-9.-]/g, '')) || 0;
              cell.v = num;
              cell.t = 'n';
              const rupiahFmt = '"Rp" #,##0';
              cell.s.numFmt = rupiahFmt;
              cell.z = rupiahFmt;
            } else if (typeof cell.v === 'number') {
              cell.t = 'n';
              const rupiahFmt = '"Rp" #,##0';
              cell.s.numFmt = rupiahFmt;
              cell.z = rupiahFmt;
            }
          }
        } else {
          // data rows
          if (currencyCols.includes(c)) {
            if (cell && (cell.v === undefined || cell.v === null)) {
              // leave as is
            } else if (typeof cell.v === 'string') {
              const num = Number(String(cell.v).replace(/[^0-9.-]/g, '')) || 0;
              cell.v = num;
              cell.t = 'n';
            } else {
              cell.t = 'n';
            }
            const rupiahFmt = '"Rp" #,##0';
            cell.s.numFmt = rupiahFmt;
            cell.z = rupiahFmt;
            cell.s.alignment = { horizontal: 'right', vertical: 'center' };
          } else if (c === 0) {
            cell.s.alignment = { horizontal: 'center', vertical: 'center' };
          } else {
            cell.s.alignment = { horizontal: 'left', vertical: 'center' };
          }
        }
      }
    }
  } catch (e) {
    console.warn('Excel styling skipped', e);
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Laporan');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const fileName = `${title.replace(/[^a-z0-9]/gi, '_') || 'laporan'}_${formatDate(startDate)}_${formatDate(endDate)}.xlsx`;
  saveAs(blob, fileName);
}

export default exportMutasiKasExcel;
