import { formatDate, formatDateTime, formatRupiah, formatNumber } from '@/utils/format';
import type { ExportReportParams } from './types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function exportMutasiKasPdf<T = any>(params: ExportReportParams<T>) {
  const { title, startDate, endDate, filters, data } = params;
  // A4 landscape
  const doc = new jsPDF({ format: 'a4', orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let cursorY = 20;

  // Header: Title and metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text((title || 'Laporan').toUpperCase(), margin, cursorY);
  cursorY += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tanggal : ${formatDate(startDate)} s/d ${formatDate(endDate)}`, margin, cursorY);
  cursorY += 6;
  const kodeTokoLabel = filters?.kodeToko || filters?.kode_toko || filters?.kode || '';
  doc.text(`Kode toko : ${kodeTokoLabel || 'Semua'}`, margin, cursorY);
  cursorY += 6;
  const metodeLabel = filters?.metode || filters?.method || 'Semua';
  doc.text(`Metode transaksi : ${metodeLabel || 'Semua'}`, margin, cursorY);
  cursorY += 10;

  // Prepare table data
  const isRekap = String(filters?.type || '').toUpperCase() === 'REKAP';
  const headers = isRekap
    ? ['No', 'Tanggal', 'Saldo Awal', 'Terima', 'Kirim', 'Saldo Akhir']
    : ['No', 'Tanggal', 'Saldo Awal', 'Terima', 'Kirim', 'Tipe', 'Saldo Akhir', 'Keterangan', 'No Rekening'];

  // compute totals and body rows
  let totalSaldoAwal = 0;
  let totalTerima = 0;
  let totalKirim = 0;
  let totalSaldoAkhir = 0;

  const body = (data || []).map((m: any, idx: number) => {
    const tanggalRaw = m.tanggal || m.createdAt;
    const tanggal = tanggalRaw ? formatDate(tanggalRaw) : '-';
    const saldoAwal = Number(m.saldoAwal ?? m.saldo_awal ?? 0) || 0;
    // Support both DETAIL (nominal fields) and REKAP (totalTerima/totalKirim)
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

    totalSaldoAwal += saldoAwal;
    totalTerima += terima;
    totalKirim += kirim;
    totalSaldoAkhir += saldoAkhir;

    if (isRekap) {
      return [
        String(idx + 1),
        tanggal,
        formatRupiah(saldoAwal),
        formatRupiah(terima),
        formatRupiah(kirim),
        formatRupiah(saldoAkhir),
      ];
    }

    return [
      String(idx + 1),
      tanggal,
      formatRupiah(saldoAwal),
      formatRupiah(terima),
      formatRupiah(kirim),
      tipe,
      formatRupiah(saldoAkhir),
      keterangan,
      noRek,
    ];
  });

  // Column widths (explicit) — distribute across printable width
  const usableWidth = pageWidth - margin * 2;
  // define widths in points by proportion (sum should be 1)
  const widths = isRekap
    ? [0.05, 0.18, 0.14, 0.14, 0.14, 0.35].map(p => p * usableWidth)
    : [0.04, 0.12, 0.11, 0.11, 0.11, 0.09, 0.11, 0.22, 0.09].map(p => p * usableWidth);

  // Build autoTable
  // @ts-ignore doc.autoTable exists after importing jspdf-autotable
  (doc as any).autoTable({
    startY: cursorY,
    head: [headers],
    body,
    foot: [
      isRekap
        ? [
            { content: 'TOTAL', colSpan: 2, styles: { halign: 'left', fontStyle: 'bold' } },
            { content: formatRupiah(totalSaldoAwal), styles: { halign: 'right', fontStyle: 'bold' } },
            { content: formatRupiah(totalTerima), styles: { halign: 'right', fontStyle: 'bold' } },
            { content: formatRupiah(totalKirim), styles: { halign: 'right', fontStyle: 'bold' } },
            { content: formatRupiah(totalSaldoAkhir), styles: { halign: 'right', fontStyle: 'bold' } },
          ]
        : [
            { content: 'TOTAL', colSpan: 2, styles: { halign: 'left', fontStyle: 'bold' } },
            // remove Saldo Awal total (empty cell)
            { content: '', styles: {} },
            { content: formatRupiah(totalTerima), styles: { halign: 'right', fontStyle: 'bold' } },
            { content: formatRupiah(totalKirim), styles: { halign: 'right', fontStyle: 'bold' } },
            // Tipe column (empty)
            { content: '', styles: {} },
            // remove Saldo Akhir total (empty cell)
            { content: '', styles: {} },
            // Keterangan / No Rekening (empty)
            { content: '', styles: {} },
          ],
    ],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: 0,
      fontStyle: 'bold',
    },
    bodyStyles: {
      textColor: 0,
      fontStyle: 'normal',
    },
    footStyles: {
      fillColor: [245, 245, 245],
      textColor: 0,
      fontStyle: 'bold',
    },
    columnStyles: isRekap
      ? {
          0: { halign: 'center', cellWidth: widths[0] },
          1: { halign: 'left', cellWidth: widths[1] },
          2: { halign: 'right', cellWidth: widths[2] },
          3: { halign: 'right', cellWidth: widths[3] },
          4: { halign: 'right', cellWidth: widths[4] },
          5: { halign: 'right', cellWidth: widths[5] },
          6: { halign: 'left', cellWidth: widths[6] },
          7: { halign: 'left', cellWidth: widths[7] },
        }
      : {
          0: { halign: 'center', cellWidth: widths[0] },
          1: { halign: 'left', cellWidth: widths[1] },
          2: { halign: 'right', cellWidth: widths[2] },
          3: { halign: 'right', cellWidth: widths[3] },
          4: { halign: 'right', cellWidth: widths[4] },
          5: { halign: 'center', cellWidth: widths[5] },
          6: { halign: 'right', cellWidth: widths[6] },
          7: { halign: 'left', cellWidth: widths[7] },
          8: { halign: 'left', cellWidth: widths[8] },
        },
    margin: { left: margin, right: margin },
    didDrawPage: (dataArg: any) => {
      // nothing extra for now
    },
  });

  const fileName = `${(title || 'laporan').replace(/[^a-z0-9]/gi, '_')}.pdf`;
  doc.save(fileName);
}

export default exportMutasiKasPdf;
