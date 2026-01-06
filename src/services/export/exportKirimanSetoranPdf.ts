import { formatDate, formatDateTime, formatRupiah, formatNumber } from '@/utils/format';
import type { ExportReportParams } from './types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function exportKirimanSetoranPdf<T = any>(params: ExportReportParams<T>) {
  const { title, startDate, endDate, filters, data } = params;
  const doc = new jsPDF({ format: 'a4', orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let cursorY = 18;

  const rekeningList = (params as any).rekeningList || [];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text((title || 'Laporan').toUpperCase(), margin, cursorY);
  cursorY += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tanggal : ${formatDate(startDate)} s/d ${formatDate(endDate)}`, margin, cursorY);
  cursorY += 6;
  const kodeTokoLabel = (filters as any)?.kodeToko || (filters as any)?.kode_toko || (filters as any)?.kode || '';
  doc.text(`Kode toko : ${kodeTokoLabel || 'Semua'}`, margin, cursorY);
  cursorY += 6;
  const metodeLabel = (filters as any)?.metode || (filters as any)?.method || 'Semua';
  doc.text(`Metode transaksi : ${metodeLabel || 'Semua'}`, margin, cursorY);
  cursorY += 6;
  // compute selected rekening label from filters + rekeningList
  const rekeningFilter = (filters as any)?.rekeningId || (filters as any)?.rekening_id || (filters as any)?.rekening || '';
  let rekeningLabel = '';
  if (rekeningFilter) {
    const found = rekeningList.find((r: any) => r.id === rekeningFilter || r._id === rekeningFilter || (r.noRekening || r.no_rekening) === rekeningFilter);
    if (found) {
      const kode = found.kodeBank || found.kode_bank || '';
      const no = found.noRekening || found.no_rekening || '';
      rekeningLabel = kode ? `${kode} - ${no}` : no;
    } else {
      rekeningLabel = String(rekeningFilter);
    }
  }
  doc.text(`No Rekening : ${rekeningLabel || 'Semua'}`, margin, cursorY);
  cursorY += 8;

  const headers = ['No', 'Kode Toko', 'Tanggal', 'Jam', 'Kirim', 'Setor', 'Pembuat', 'Penerima', 'Metode', 'No Rekening'];

  let totalKirim = 0;
  let totalSetor = 0;

  

  const body = (data || []).map((m: any, idx: number) => {
    const tanggalRaw = m.tanggal || m.createdAt || m.created_at;
    const tanggal = tanggalRaw ? formatDate(tanggalRaw) : '-';
    const jamRaw = m.createdAt || m.created_at || m.tanggal;
    const jam = jamRaw ? new Date(jamRaw).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
    const kodeToko = m.kodeToko || m.kode_toko || m.tokoKode || '-';
    const pembuat = m.createdBy || m.created_by || m.created_by_name || '-';
    const penerima = m.validBy || m.valid_by || m.validated_by || '-';
    const metode = m.metode || m.method || '-';
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

      // For non-CASH, prefer kode bank + no rekening (if lookup available)
      const noRekFromRow = m.noRekening || m.no_rekening || m.rekening || '';
      const rekId = m.rekeningId || m.rekening_id || m.rekeningId;

      // try to find in provided rekeningList by id or account number
      let found: any = undefined;
      if (rekId) found = rekeningList.find((r: any) => r.id === rekId || r._id === rekId);
      if (!found && noRekFromRow) found = rekeningList.find((r: any) => (r.noRekening || r.no_rekening) === noRekFromRow);

      const kodeBank = found?.kodeBank || found?.kode_bank || m.kodeBank || m.kode_bank || '';
      const account = found?.noRekening || found?.no_rekening || noRekFromRow || '';
      return kodeBank ? `${kodeBank} - ${account}` : account;
    })();

    const jenis = (m.jenisKas || m.jenis_kas || m.jenis || '').toString().toUpperCase();
    const kirim = jenis === 'KIRIM'
      ? Number(m.nominalRp ?? m.nominal_rp ?? m.nominalKirim ?? m.nominal_kirim ?? m.nominal ?? 0) || 0
      : 0;
    const setor = jenis === 'TERIMA'
      ? Number(m.nominalTerima ?? m.nominal_terima ?? m.nominalSetor ?? m.nominal_setor ?? m.nominal ?? 0) || 0
      : 0;
    totalKirim += kirim;
    totalSetor += setor;

    return [
      String(idx + 1),
      kodeToko,
      tanggal,
      jam,
      formatRupiah(kirim),
      formatRupiah(setor),
      pembuat,
      penerima,
      metode,
      noRek,
    ];
  });

  const usableWidth = pageWidth - margin * 2;
  // Adjusted proportions: increase 'Kirim' and 'Setor' columns and widen 'Metode' to prevent wrapping
  // New distribution keeps total = 1.0
  const widths = [0.04, 0.10, 0.10, 0.06, 0.13, 0.13, 0.10, 0.10, 0.12, 0.12].map(p => p * usableWidth);

  // @ts-ignore
  (doc as any).autoTable({
    startY: cursorY,
    head: [headers],
    body,
    foot: [[
      { content: 'TOTAL', colSpan: 4, styles: { halign: 'left', fontStyle: 'bold' } },
      { content: formatRupiah(totalKirim), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatRupiah(totalSetor), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '', styles: {} },
      { content: '', styles: {} },
      { content: '', styles: {} },
    ]],
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
    columnStyles: {
      0: { halign: 'center', cellWidth: widths[0] },
      1: { halign: 'left', cellWidth: widths[1] },
      2: { halign: 'left', cellWidth: widths[2] },
      3: { halign: 'center', cellWidth: widths[3] },
      4: { halign: 'right', cellWidth: widths[4] },
      5: { halign: 'right', cellWidth: widths[5] },
      6: { halign: 'left', cellWidth: widths[6] },
      7: { halign: 'left', cellWidth: widths[7] },
      8: { halign: 'center', cellWidth: widths[8] },
      9: { halign: 'left', cellWidth: widths[9] },
    },
    margin: { left: margin, right: margin },
  });

  const fileName = `${(title || 'laporan').replace(/[^a-z0-9]/gi, '_')}.pdf`;
  doc.save(fileName);
}

export default exportKirimanSetoranPdf;
