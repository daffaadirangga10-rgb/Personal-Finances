import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { LOGO_DATA_URL } from './logoDataUrl'
import { convertAmount, rowCurrency } from './currency'
import { formatRp, formatNative, summarize, sortedRows } from './exportShared'

/** Builds and downloads a polished, print-ready PDF report of all transactions. */
export function exportTransactionsToPDF(transactions, formatAmount = formatRp, displayCurrency = 'IDR') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { pemasukan, pengeluaran, saldo } = summarize(transactions, displayCurrency)
  const hasMixedCurrency = transactions.some((t) => rowCurrency(t) !== displayCurrency)
  const sorted = sortedRows(transactions)
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const today = new Date().toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const periodStart = new Date(sorted[0].occurred_on).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  const periodEnd = new Date(sorted[sorted.length - 1].occurred_on).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  // Header: a restrained executive-report treatment that remains clear when printed.
  doc.setFillColor(20, 48, 39)
  doc.rect(0, 0, pageWidth, 48, 'F')
  doc.setFillColor(211, 171, 57)
  doc.rect(0, 46.5, pageWidth, 1.5, 'F')
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(margin, 9, 28, 28, 3, 3, 'F')
  doc.addImage(LOGO_DATA_URL, 'PNG', margin + 3, 11, 22, 22 * (463 / 500))
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('LAPORAN KEUANGAN', margin + 36, 20)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(221, 230, 225)
  doc.text('Personal Finances  |  Ringkasan arus kas pribadi', margin + 36, 27)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8.5)
  doc.text(`DICETAK ${today.toUpperCase()}`, pageWidth - margin, 18, { align: 'right' })
  doc.setTextColor(221, 230, 225)
  doc.text(`${sorted.length} transaksi tercatat`, pageWidth - margin, 25, { align: 'right' })

  // Metadata makes the exported filter/period self-explanatory outside the app.
  doc.setTextColor(82, 94, 89)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('PERIODE LAPORAN', margin, 59)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(28, 47, 40)
  doc.text(periodStart === periodEnd ? periodStart : `${periodStart} — ${periodEnd}`, margin, 65)
  doc.setFontSize(8.5)
  doc.setTextColor(115, 124, 120)
  doc.text(`Mata uang ringkasan: ${displayCurrency}`, pageWidth - margin, 63, { align: 'right' })

  const cards = [
    { label: 'PEMASUKAN', value: formatAmount(pemasukan), color: [83, 137, 109] },
    { label: 'PENGELUARAN', value: formatAmount(pengeluaran), color: [184, 91, 70] },
    { label: 'SALDO BERSIH', value: formatAmount(saldo), color: [201, 162, 39] },
  ]
  const gap = 4
  const cardWidth = (pageWidth - margin * 2 - gap * 2) / 3
  cards.forEach((card, index) => {
    const x = margin + index * (cardWidth + gap)
    doc.setFillColor(248, 249, 247)
    doc.roundedRect(x, 72, cardWidth, 27, 2.5, 2.5, 'F')
    doc.setFillColor(...card.color)
    doc.roundedRect(x, 72, 3, 27, 2.5, 2.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(112, 123, 118)
    doc.text(card.label, x + 7, 80)
    doc.setFontSize(11)
    doc.setTextColor(28, 47, 40)
    doc.text(card.value, x + 7, 91)
  })
  if (hasMixedCurrency) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(123, 130, 126)
    doc.text(
      `Nominal lintas mata uang dikonversi ke ${displayCurrency} memakai kurs perkiraan. Nilai asli tetap tersedia pada tabel.`,
      margin,
      106
    )
  }

  const head = hasMixedCurrency
    ? [['Tanggal', 'Jenis', 'Kategori', 'Catatan', 'Jumlah Asli', `Setara (${displayCurrency})`]]
    : [['Tanggal', 'Jenis', 'Kategori', 'Catatan', 'Jumlah']]

  const rows = sorted.map((t) => {
    const base = [
      new Date(t.occurred_on).toLocaleDateString('id-ID'),
      t.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
      t.category,
      t.note || '-',
    ]
    if (hasMixedCurrency) {
      return [
        ...base,
        formatNative(t.amount, rowCurrency(t)),
        formatAmount(convertAmount(t.amount, rowCurrency(t), displayCurrency)),
      ]
    }
    return [...base, formatAmount(t.amount)]
  })

  autoTable(doc, {
    startY: hasMixedCurrency ? 112 : 106,
    margin: { left: margin, right: margin, bottom: 16 },
    head,
    body: rows,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 3, textColor: [67, 78, 73], lineColor: [229, 233, 230], lineWidth: 0.2 },
    headStyles: { fillColor: [20, 48, 39], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3.5 },
    alternateRowStyles: { fillColor: [248, 249, 247] },
    columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 26 }, 2: { cellWidth: 29 }, 3: { cellWidth: 'auto' } },
    didDrawPage: () => {
      const pageNumber = doc.getCurrentPageInfo().pageNumber
      doc.setDrawColor(211, 171, 57)
      doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(120, 130, 125)
      doc.text('PERSONAL FINANCES  •  Laporan pribadi dan rahasia', margin, pageHeight - 6)
      doc.text(`HALAMAN ${pageNumber}`, pageWidth - margin, pageHeight - 6, { align: 'right' })
    },
  })

  doc.save(`laporan-keuangan-${new Date().toISOString().slice(0, 10)}.pdf`)
}
