import type { ExportReportParams } from './types';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { formatDate, formatNumber } from '@/utils/format';

export function exportKirimanSetoranExcel<T = any>(params: ExportReportParams<T>) {
  const { title, startDate, endDate, filters, data } = params;
  const rekeningList = (params as any).rekeningList || [];

  const rows: any[] = (data || []).map((m: any, idx: number) => {
    const tanggalRaw = m.tanggal || m.createdAt || m.created_at;
    const tanggal = tanggalRaw ? formatDate(tanggalRaw) : '';
    const jamRaw = m.createdAt || m.created_at || m.tanggal;
    const jam = jamRaw ? new Date(jamRaw).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const kodeToko = m.kodeToko || m.kode_toko || m.tokoKode || '';
    const pembuat = m.createdBy || m.created_by || m.created_by_name || '';
    const penerima = m.validBy || m.valid_by || m.validated_by || '';
    const metode = m.metode || m.method || '';
    const noRek = (() => {
      const methodUp = (metode || '').toString().toUpperCase();
      if (methodUp === 'CASH') {
        const gramRaw = m.gramasi ?? m.gram ?? m.nominal_gr ?? m.nominalGr ?? m.nominalGrams ?? m.gramasiGr;
        if (typeof gramRaw === 'number' || (typeof gramRaw === 'string' && String(gramRaw).trim() !== '')) {
          const gramNum = typeof gramRaw === 'number' ? gramRaw : parseInt(String(gramRaw).replace(/[^0-9-]/g, ''), 10) || 0;
          if (gramNum > 0) return `${formatNumber(gramNum)} gr`;
        }
        return m.noRekening || m.no_rekening || '';
      }

      const noRekFromRow = m.noRekening || m.no_rekening || m.rekening || '';
      const rekId = m.rekeningId || m.rekening_id || m.rekeningId;
      let found: any = undefined;
      if (rekId) found = rekeningList.find((r: any) => r.id === rekId || r._id === rekId);
      if (!found && noRekFromRow) found = rekeningList.find((r: any) => (r.noRekening || r.no_rekening) === noRekFromRow);
      const kodeBank = found?.kodeBank || found?.kode_bank || m.kodeBank || m.kode_bank || '';
      const account = found?.noRekening || found?.no_rekening || noRekFromRow || '';
      return kodeBank ? `${kodeBank} - ${account}` : account;
    })();

    const jenis = (m.jenisKas || m.jenis_kas || m.jenis || '').toString().toUpperCase();
    const kirim = jenis === 'KIRIM'
      ? Number(m.nominalRp ?? m.nominal_rp ?? m.nominalKirim ?? m.nominal_kirim ?? m.nominal ?? m.amount ?? 0) || 0
      : 0;
    const setor = jenis === 'TERIMA'
      ? Number(m.nominalTerima ?? m.nominal_terima ?? m.nominalSetor ?? m.nominal_setor ?? 0) || 0
      : 0;

    return [
      idx + 1,
      kodeToko,
      tanggal,
      jam,
      kirim,
      setor,
      pembuat,
      penerima,
      metode,
      noRek,
    ];
  });

  const wb = XLSX.utils.book_new();

  const metaAoa = [
    [title || 'LAPORAN'],
    [`Tanggal : ${formatDate(startDate)} s/d ${formatDate(endDate)}`],
    [`Kode toko : ${filters?.kodeToko || filters?.kode_toko || 'Semua'}`],
    [`Metode transaksi : ${filters?.metode || 'Semua'}`],
    // Add selected rekening from filters (show full kode - no if available)
    (() => {
      const rf = filters?.rekeningId || filters?.rekening_id || filters?.rekening || '';
      if (!rf) return ['No Rekening : Semua'];
      const found = rekeningList.find((r: any) => r.id === rf || r._id === rf || (r.noRekening || r.no_rekening) === rf);
      if (found) {
        const kode = found.kodeBank || found.kode_bank || '';
        const no = found.noRekening || found.no_rekening || '';
        return [`No Rekening : ${kode ? kode + ' - ' + no : no}`];
      }
      return [`No Rekening : ${rf}`];
    })(),
    [],
  ];

  const header = ['No', 'Kode Toko', 'Tanggal', 'Jam', 'Kirim', 'Setor', 'Pembuat', 'Penerima', 'Metode', 'No Rekening'];

  // Single sheet: meta rows on top, then header + data, then totals
  const aoa = [
    ...metaAoa,
    header,
    ...rows,
    [],
  ];

  const totalKirim = rows.reduce((s, r) => s + (Number(r[4]) || 0), 0);
  const totalSetor = rows.reduce((s, r) => s + (Number(r[5]) || 0), 0);
  const totalsRow = ['TOTAL', '', '', '', totalKirim, totalSetor, '', '', '', ''];
  aoa.push(totalsRow);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merge first 4 columns for TOTAL label (A..D) if header has at least 4 columns
  try {
    if (header.length >= 4) {
      const totalRowIndex = aoa.length - 1; // 0-based
      ws['!merges'] = ws['!merges'] || [];
      ws['!merges'].push({ s: { r: totalRowIndex, c: 0 }, e: { r: totalRowIndex, c: 3 } });
      // ensure merged cell contains 'TOTAL'
      const totalCellAddr = XLSX.utils.encode_cell({ r: totalRowIndex, c: 0 });
      ws[totalCellAddr] = { v: 'TOTAL', t: 's' };
    }
  } catch (e) {
    // ignore merge errors
  }

  ws['!cols'] = [
    { wpx: 30 }, // No
    { wpx: 100 }, // Kode Toko
    { wpx: 80 }, // Tanggal
    { wpx: 60 }, // Jam
    { wpx: 120 }, // Kirim
    { wpx: 120 }, // Setor
    { wpx: 120 }, // Pembuat
    { wpx: 120 }, // Penerima
    { wpx: 100 }, // Metode
    { wpx: 160 }, // No Rekening
  ];

  // Apply table styles: header bold/centered with gray fill; full grid with thin inner borders and thick outer border; TOTAL row bold with darker gray
  try {
    const metaRows = metaAoa.length; // number of meta rows above header
    const headerRow = metaRows + 1; // 1-based
    const totalRows = aoa.length; // includes totals as last row
    const lastCol = header.length; // number of columns

    const thin = { style: 'thin', color: { rgb: 'FF000000' } };
    const thick = { style: 'medium', color: { rgb: 'FF000000' } };

    const currencyCols = [4, 5]; // zero-based index for Kirim and Setor

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

        // Header styling
        if (r === headerRow) {
          cell.s.font = { bold: true };
          cell.s.alignment = { horizontal: 'center', vertical: 'center' };
          cell.s.fill = { fgColor: { rgb: 'FFE6E6E6' } };
        } else if (r === totalRows) {
          // TOTAL row styling
          cell.s.font = { bold: true };
          cell.s.alignment = { horizontal: currencyCols.includes(c) ? 'right' : 'center', vertical: 'center' };
          cell.s.fill = { fgColor: { rgb: 'FFF5F5F5' } };
          // Ensure currency TOTAL cells are numeric and formatted as Rupiah
          if (currencyCols.includes(c)) {
            if (cell && (cell.v === undefined || cell.v === null)) {
              cell.v = 0;
              cell.t = 'n';
            } else if (typeof cell.v === 'string') {
              const num = Number(String(cell.v).replace(/[^0-9.-]/g, '')) || 0;
              cell.v = num;
              cell.t = 'n';
            } else if (typeof cell.v === 'number') {
              cell.t = 'n';
            }
            const rupiahFmt = '"Rp" #,##0';
            cell.s.numFmt = rupiahFmt;
            cell.z = rupiahFmt;
          }
        } else {
          // data rows alignment and number format for currency
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
  const fileName = `${(title || 'laporan').replace(/[^a-z0-9]/gi, '_')}_${formatDate(startDate)}_${formatDate(endDate)}.xlsx`;
  saveAs(blob, fileName);
}

export default exportKirimanSetoranExcel;
