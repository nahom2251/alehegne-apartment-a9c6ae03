import jsPDF from 'jspdf';

interface BillData {
  tenantName: string;
  unitLabel: string;
  month: string;
  year: number;
  billType: 'Rent' | 'Electricity' | 'Water';
  amount: number;
  isPaid: boolean;
  details?: Record<string, string | number>;
}

const PAYMENT_CONFIG = {
  rent: {
    method: 'CBE Bank Transfer',
    accountName: 'Bayush Kassa',
    accountNumber: '1000499143072',
  },
  utility: {
    method: 'Telebirr',
    accountName: 'Alehegne',
    accountNumber: '0911238816',
  },
};

export const generateBillPdf = (bill: BillData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('AS Apt.', pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Alehegne Sewnet Apartment', pageWidth / 2, 28, { align: 'center' });

  // Title
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const title = bill.isPaid ? 'PAYMENT RECEIPT' : 'INVOICE';
  doc.text(title, pageWidth / 2, 55, { align: 'center' });

  // Date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 20, 55, { align: 'right' });

  // Tenant info box
  let y = 68;
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, y - 5, pageWidth - 30, 30, 3, 3);

  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'bold');
  doc.text('Tenant:', 20, y + 5);
  doc.text('Unit:', 20, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(bill.tenantName, 55, y + 5);
  doc.text(bill.unitLabel, 55, y + 15);
  doc.text(`Period: ${bill.month} ${bill.year}`, pageWidth / 2 + 10, y + 5);

  // Bill details table
  y = 108;
  doc.setFillColor(245, 245, 245);
  doc.rect(15, y, pageWidth - 30, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('Description', 20, y + 7);
  doc.text('Amount (Birr)', pageWidth - 20, y + 7, { align: 'right' });

  y += 15;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`${bill.billType} - ${bill.month} ${bill.year}`, 20, y);
  doc.text(bill.amount.toLocaleString(), pageWidth - 20, y, { align: 'right' });

  if (bill.details) {
    for (const [key, val] of Object.entries(bill.details)) {
      y += 9;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text(`  ${key}`, 25, y);
      doc.text(String(val), pageWidth - 20, y, { align: 'right' });
    }
  }

  // Total line
  y += 14;
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text('TOTAL', 20, y);
  doc.text(`${bill.amount.toLocaleString()} Birr`, pageWidth - 20, y, { align: 'right' });

  // Status
  y += 18;
  if (bill.isPaid) {
    doc.setTextColor(34, 139, 34);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('STATUS: PAID', pageWidth / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Payment successfully received. Thank you!', pageWidth / 2, y, { align: 'center' });

    // Diagonal PAID stamp
    doc.saveGraphicsState();
    doc.setTextColor(34, 139, 34);
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    const gState = (doc as any).GState({ opacity: 0.15 });
    doc.setGState(gState);
    const cx = pageWidth / 2;
    const cy = 160;
    doc.text('PAID', cx, cy, { align: 'center', angle: 30 });
    doc.restoreGraphicsState();
  } else {
    doc.setTextColor(200, 50, 50);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('STATUS: PENDING PAYMENT', pageWidth / 2, y, { align: 'center' });

    // Payment instructions
    y += 15;
    const paymentInfo = bill.billType === 'Rent' ? PAYMENT_CONFIG.rent : PAYMENT_CONFIG.utility;
    doc.setFillColor(255, 249, 235);
    doc.roundedRect(15, y - 5, pageWidth - 30, 40, 3, 3, 'F');
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Instructions', 20, y + 5);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Method: ${paymentInfo.method}`, 20, y + 14);
    doc.text(`Account Name: ${paymentInfo.accountName}`, 20, y + 22);
    doc.text(`Account Number: ${paymentInfo.accountNumber}`, 20, y + 30);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  doc.text('Powered by NUN Tech', pageWidth / 2, pageHeight - 12, { align: 'center' });

  const status = bill.isPaid ? 'Receipt' : 'Invoice';
  doc.save(`${bill.billType}_${status}_${bill.unitLabel}_${bill.month}${bill.year}.pdf`);
};

interface RevenueData {
  rentPaid: number;
  rentPending: number;
  elecPaid: number;
  elecPending: number;
  waterPaid: number;
  waterPending: number;
}

export const generateRevenuePdf = (data: RevenueData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('AS Apt. - Revenue Report', pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });

  let y = 60;
  const totalPaid = data.rentPaid + data.elecPaid + data.waterPaid;
  const totalPending = data.rentPending + data.elecPending + data.waterPending;

  // Total
  doc.setFillColor(255, 249, 235);
  doc.roundedRect(15, y - 5, pageWidth - 30, 22, 3, 3, 'F');
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Revenue (Collected)', 20, y + 7);
  doc.text(`${totalPaid.toLocaleString()} Birr`, pageWidth - 20, y + 7, { align: 'right' });
  y += 15;
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`Pending: ${totalPending.toLocaleString()} Birr`, pageWidth - 20, y + 3, { align: 'right' });

  // Table
  y += 25;
  doc.setFillColor(245, 245, 245);
  doc.rect(15, y, pageWidth - 30, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(10);
  doc.text('Category', 20, y + 7);
  doc.text('Collected', 110, y + 7);
  doc.text('Pending', pageWidth - 20, y + 7, { align: 'right' });

  const rows = [
    { label: 'Rent', paid: data.rentPaid, pending: data.rentPending },
    { label: 'Electricity', paid: data.elecPaid, pending: data.elecPending },
    { label: 'Water', paid: data.waterPaid, pending: data.waterPending },
  ];

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  rows.forEach((row) => {
    y += 12;
    doc.text(row.label, 20, y + 7);
    doc.text(`${row.paid.toLocaleString()} Birr`, 110, y + 7);
    doc.text(`${row.pending.toLocaleString()} Birr`, pageWidth - 20, y + 7, { align: 'right' });
  });

  // Total row
  y += 15;
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1);
  doc.line(15, y, pageWidth - 15, y);
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', 20, y);
  doc.text(`${totalPaid.toLocaleString()} Birr`, 110, y);
  doc.text(`${totalPending.toLocaleString()} Birr`, pageWidth - 20, y, { align: 'right' });

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  doc.text('Powered by NUN Tech', pageWidth / 2, pageHeight - 12, { align: 'center' });

  doc.save(`Revenue_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
};
