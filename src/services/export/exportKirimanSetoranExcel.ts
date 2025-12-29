import type { ExportReportParams } from './types';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { formatDate, formatNumber } from '@/utils/format';

export function exportKirimanSetoranExcel<T = any>(params: ExportReportParams<T>) {
  const { title, startDate, endDate, filters, data } = params;

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
      if ((metode || '').toString().toUpperCase() === 'CASH') {
        const gramRaw = m.gramasi ?? m.gram ?? m.nominal_gr ?? m.nominalGr ?? m.nominalGrams ?? m.gramasiGr;
        if (typeof gramRaw === 'number' || (typeof gramRaw === 'string' && String(gramRaw).trim() !== '')) {
          const gramNum = typeof gramRaw === 'number' ? gramRaw : parseInt(String(gramRaw).replace(/[^0-9-]/g, ''), 10) || 0;
          if (gramNum > 0) return `${formatNumber(gramNum)} gr`;
        }
        return m.noRekening || m.no_rekening || '';
      }
      return m.noRekening || m.no_rekening || '';
    })();

    const kirim = Number(m.nominalRp ?? m.nominal_rp ?? m.nominalKirim ?? m.nominal_kirim ?? m.nominal ?? m.amount ?? 0) || 0;
    const setor = Number(m.nominalTerima ?? m.nominal_terima ?? m.nominalSetor ?? m.nominal_setor ?? 0) || 0;

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
    [],
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet(metaAoa);
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Info');

  const header = ['No', 'Kode Toko', 'Tanggal', 'Jam', 'Kirim', 'Setor', 'Pembuat', 'Penerima', 'Metode', 'No Rekening'];
  const wsData = XLSX.utils.aoa_to_sheet([header, ...rows]);

  wsData['!cols'] = [
    { wpx: 30 }, // No
    { wpx: 100 }, // Kode Toko
    { wpx: 80 }, // Tanggal
    { wpx: 60 }, // Jam
    { wpx: 100 }, // Kirim
    { wpx: 100 }, // Setor
    { wpx: 120 }, // Pembuat
    { wpx: 120 }, // Penerima
    { wpx: 100 }, // Metode
    { wpx: 160 }, // No Rekening
  ];

  const totalKirim = rows.reduce((s, r) => s + (Number(r[4]) || 0), 0);
  const totalSetor = rows.reduce((s, r) => s + (Number(r[5]) || 0), 0);
  const totalsRow = ['TOTAL', '', '', '', totalKirim, totalSetor, '', '', '', ''];
  XLSX.utils.sheet_add_aoa(wsData, [[], totalsRow], { origin: -1 });

  XLSX.utils.book_append_sheet(wb, wsData, 'Data');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const fileName = `${(title || 'laporan').replace(/[^a-z0-9]/gi, '_')}_${formatDate(startDate)}_${formatDate(endDate)}.xlsx`;
  saveAs(blob, fileName);
}

export default exportKirimanSetoranExcel;
