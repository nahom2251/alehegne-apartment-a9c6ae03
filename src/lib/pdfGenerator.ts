import jsPDF from 'jspdf';
import { ensureEthiopicFont, ETHIOPIC_FONT } from './pdfFont';

export type PdfLang = 'en' | 'am';

interface BillData {
  tenantName: string;
  unitLabel: string;
  month: string;
  year: number;
  billType: 'Rent' | 'Electricity' | 'Water' | 'Security';
  amount: number;
  isPaid: boolean;
  details?: Record<string, string | number>;
  lang?: PdfLang;
}

const PAYMENT_CONFIG = {
  rent: {
    method: 'Oromia Bank Transfer',
    accountName: 'Alehegne Sewnet',
    accountNumber: '1368234100001',
  },
  utility: {
    method: 'Telebirr',
    accountName: 'Alehegne',
    accountNumber: '0911238816',
  },
};

// --- i18n -------------------------------------------------------------------
const MONTH_AM: Record<string, string> = {
  January: 'ጥር', February: 'የካቲት', March: 'መጋቢት', April: 'ሚያዝያ',
  May: 'ግንቦት', June: 'ሰኔ', July: 'ሐምሌ', August: 'ነሐሴ',
  September: 'መስከረም', October: 'ጥቅምት', November: 'ኅዳር', December: 'ታኅሣሥ',
};

const BILL_TYPE_AM: Record<string, string> = {
  Rent: 'ኪራይ', Electricity: 'መብራት', Water: 'ውሃ', Security: 'ጥበቃ',
};

const STR = {
  en: {
    asApt: 'AS Apt.',
    subtitle: 'Alehegne Sewnet Apartment',
    utilReceipt: 'UTILITIES PAYMENT RECEIPT',
    utilInvoice: 'UTILITIES INVOICE',
    receipt: 'PAYMENT RECEIPT',
    invoice: 'INVOICE',
    revenueReport: 'AS Apt. - Revenue Report',
    tenantReport: 'Tenant Payments Report',
    tenantTitle: 'Tenant Payments',
    generated: 'Generated:',
    tenant: 'Tenant:',
    unit: 'Unit:',
    periodLabel: 'Period:',
    typeCol: 'Type',
    periodCol: 'Period',
    datePaid: 'Date Paid',
    amountCol: 'Amount (Birr)',
    descCol: 'Description',
    statusCol: 'Status',
    tenantUnit: 'Tenant / Unit',
    subtotals: 'Subtotals',
    grandTotal: 'GRAND TOTAL',
    total: 'TOTAL',
    statusPaid: 'STATUS: PAID',
    statusPending: 'STATUS: PENDING PAYMENT',
    payInstr: 'Payment Instructions',
    method: 'Method:',
    accName: 'Account Name:',
    accNum: 'Account Number:',
    thanks: 'Payment successfully received. Thank you!',
    paidStamp: 'PAID',
    collected: 'Collected',
    pending: 'Pending',
    paid: 'Paid',
    records: 'Records',
    category: 'Category',
    totalRev: 'Total Revenue (Collected)',
    powered: 'Powered by NUN Tech',
    pageOf: (i: number, n: number) => `Page ${i} of ${n}`,
    rent: 'Rent', electricity: 'Electricity', water: 'Water', security: 'Security',
    birr: 'Birr',
    filterTenant: 'Tenant', filterType: 'Type', filterStatus: 'Status',
    month: (m: string) => m,
    billType: (t: string) => t,
  },
  am: {
    asApt: 'AS Apt.',
    subtitle: 'አለኸኝ ሰውነት አፓርትመንት',
    utilReceipt: 'የመገልገያዎች ክፍያ ደረሰኝ',
    utilInvoice: 'የመገልገያዎች ሂሳብ',
    receipt: 'የክፍያ ደረሰኝ',
    invoice: 'ሂሳብ',
    revenueReport: 'AS Apt. - የገቢ ሪፖርት',
    tenantReport: 'የተከራዮች ክፍያ ሪፖርት',
    tenantTitle: 'የተከራዮች ክፍያዎች',
    generated: 'የተዘጋጀበት:',
    tenant: 'ተከራይ:',
    unit: 'ክፍል:',
    periodLabel: 'ጊዜ:',
    typeCol: 'ዓይነት',
    periodCol: 'ጊዜ',
    datePaid: 'የተከፈለበት ቀን',
    amountCol: 'መጠን (ብር)',
    descCol: 'መግለጫ',
    statusCol: 'ሁኔታ',
    tenantUnit: 'ተከራይ / ክፍል',
    subtotals: 'ንዑስ ድምሮች',
    grandTotal: 'ጠቅላላ ድምር',
    total: 'ድምር',
    statusPaid: 'ሁኔታ: ተከፍሏል',
    statusPending: 'ሁኔታ: ክፍያ በመጠባበቅ ላይ',
    payInstr: 'የክፍያ መመሪያዎች',
    method: 'ዘዴ:',
    accName: 'የመለያ ስም:',
    accNum: 'የመለያ ቁጥር:',
    thanks: 'ክፍያው በተሳካ ሁኔታ ተቀብሏል። እናመሰግናለን!',
    paidStamp: 'ተከፍሏል',
    collected: 'የተሰበሰበ',
    pending: 'በመጠባበቅ',
    paid: 'ተከፍሏል',
    records: 'መዝገቦች',
    category: 'ምድብ',
    totalRev: 'ጠቅላላ ገቢ (የተሰበሰበ)',
    powered: 'በNUN Tech የተሰራ',
    pageOf: (i: number, n: number) => `ገጽ ${i} ከ ${n}`,
    rent: 'ኪራይ', electricity: 'መብራት', water: 'ውሃ', security: 'ጥበቃ',
    birr: 'ብር',
    filterTenant: 'ተከራይ', filterType: 'ዓይነት', filterStatus: 'ሁኔታ',
    month: (m: string) => MONTH_AM[m] || m,
    billType: (t: string) => BILL_TYPE_AM[t] || t,
  },
} as const;

// Font switching: jsPDF's helvetica cannot render Ethiopic glyphs. When the
// caller asks for Amharic we register Noto Sans Ethiopic and use it for every
// text() call. We only have the Regular weight, so 'bold' falls back to it.
const setF = (
  doc: jsPDF,
  lang: PdfLang,
  weight: 'normal' | 'bold' = 'normal',
) => {
  if (lang === 'am') doc.setFont(ETHIOPIC_FONT, 'normal');
  else doc.setFont('helvetica', weight);
};

// --- Combined utilities receipt --------------------------------------------

interface CombinedReceiptItem {
  billType: 'Rent' | 'Electricity' | 'Water' | 'Security';
  month: string;
  year: number;
  amount: number;
  paidAt?: string;
}

interface CombinedReceiptData {
  tenantName: string;
  unitLabel: string;
  items: CombinedReceiptItem[];
  isPaid?: boolean;
  lang?: PdfLang;
}

export const generateCombinedReceiptPdf = async (data: CombinedReceiptData) => {
  const lang: PdfLang = data.lang ?? 'en';
  const L = STR[lang];
  const doc = new jsPDF();
  if (lang === 'am') await ensureEthiopicFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const marginX = 15;
  const innerLeft = marginX + 5;
  const innerRight = pageWidth - marginX - 5;
  const colType = innerLeft;
  const colPeriod = innerLeft + 40;
  const colDate = innerLeft + 90;
  const colAmountRight = innerRight;

  // Header
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  setF(doc, lang, 'bold');
  doc.text(L.asApt, pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(10);
  setF(doc, lang, 'normal');
  doc.text(L.subtitle, pageWidth / 2, 28, { align: 'center' });

  // Title
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(16);
  setF(doc, lang, 'bold');
  doc.text(data.isPaid ? L.utilReceipt : L.utilInvoice, pageWidth / 2, 55, { align: 'center' });

  doc.setFontSize(9);
  setF(doc, lang, 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(`${L.generated} ${new Date().toLocaleDateString()}`, innerRight, 64, { align: 'right' });

  // Tenant info box
  let y = 72;
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.roundedRect(marginX, y - 5, pageWidth - marginX * 2, 24, 3, 3);
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  setF(doc, lang, 'bold');
  doc.text(L.tenant, innerLeft, y + 4);
  doc.text(L.unit, innerLeft, y + 13);
  setF(doc, lang, 'normal');
  doc.text(data.tenantName, innerLeft + 25, y + 4);
  doc.text(data.unitLabel, innerLeft + 25, y + 13);

  // Table header
  y = 108;
  doc.setFillColor(245, 245, 245);
  doc.rect(marginX, y, pageWidth - marginX * 2, 10, 'F');
  setF(doc, lang, 'bold');
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(10);
  doc.text(L.typeCol, colType, y + 7);
  doc.text(L.periodCol, colPeriod, y + 7);
  doc.text(L.datePaid, colDate, y + 7);
  doc.text(L.amountCol, colAmountRight, y + 7, { align: 'right' });

  const order: CombinedReceiptItem['billType'][] = ['Rent', 'Electricity', 'Water', 'Security'];
  let total = 0;
  const subtotals: Record<string, number> = { Rent: 0, Electricity: 0, Water: 0, Security: 0 };

  setF(doc, lang, 'normal');
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(9);

  y += 10;
  order.forEach((type) => {
    const items = data.items.filter((i) => i.billType === type);
    if (items.length === 0) return;
    items.forEach((item) => {
      y += 8;
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 30;
      }
      doc.text(L.billType(item.billType), colType, y);
      doc.text(`${L.month(item.month)} ${item.year}`, colPeriod, y);
      doc.text(item.paidAt ? new Date(item.paidAt).toLocaleDateString() : '-', colDate, y);
      doc.text(item.amount.toLocaleString(), colAmountRight, y, { align: 'right' });
      subtotals[type] += item.amount;
      total += item.amount;
    });
  });

  // Subtotals
  y += 8;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 8;
  setF(doc, lang, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(L.subtotals, colType, y);
  order.forEach((type) => {
    if (subtotals[type] > 0) {
      y += 6;
      setF(doc, lang, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(L.billType(type), colType + 5, y);
      doc.text(`${subtotals[type].toLocaleString()} ${L.birr}`, colAmountRight, y, { align: 'right' });
    }
  });

  // Grand total
  y += 10;
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 9;
  setF(doc, lang, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(50, 50, 50);
  doc.text(L.grandTotal, colType, y);
  doc.text(`${total.toLocaleString()} ${L.birr}`, colAmountRight, y, { align: 'right' });

  // Status
  y += 16;
  if (data.isPaid) {
    doc.setTextColor(34, 139, 34);
    doc.setFontSize(13);
    setF(doc, lang, 'bold');
    doc.text(L.statusPaid, pageWidth / 2, y, { align: 'center' });
    // Watermark
    doc.saveGraphicsState();
    doc.setTextColor(34, 139, 34);
    doc.setFontSize(60);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gState = (doc as any).GState({ opacity: 0.12 });
    doc.setGState(gState);
    doc.text(L.paidStamp, pageWidth / 2, pageHeight / 2, { align: 'center', angle: 30 });
    doc.restoreGraphicsState();
  } else {
    doc.setTextColor(200, 50, 50);
    doc.setFontSize(13);
    setF(doc, lang, 'bold');
    doc.text(L.statusPending, pageWidth / 2, y, { align: 'center' });
    y += 10;
    const info = PAYMENT_CONFIG.utility;
    doc.setFillColor(255, 249, 235);
    doc.roundedRect(15, y - 5, pageWidth - 30, 36, 3, 3, 'F');
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    setF(doc, lang, 'bold');
    doc.text(L.payInstr, 20, y + 4);
    setF(doc, lang, 'normal');
    doc.text(`${L.method} ${info.method}`, 20, y + 13);
    doc.text(`${L.accName} ${info.accountName}`, 20, y + 21);
    doc.text(`${L.accNum} ${info.accountNumber}`, 20, y + 29);
  }

  // Footer
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(marginX, pageHeight - 20, pageWidth - marginX, pageHeight - 20);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  setF(doc, lang, 'normal');
  doc.text(L.powered, pageWidth / 2, pageHeight - 12, { align: 'center' });

  const fname = data.isPaid ? 'Receipt' : 'Invoice';
  doc.save(`Utilities_${fname}_${data.unitLabel}_${new Date().toISOString().slice(0, 10)}_${lang}.pdf`);
};

// --- Single bill receipt/invoice -------------------------------------------

export const generateBillPdf = async (bill: BillData) => {
  const lang: PdfLang = bill.lang ?? 'en';
  const L = STR[lang];
  const doc = new jsPDF();
  if (lang === 'am') await ensureEthiopicFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  setF(doc, lang, 'bold');
  doc.text(L.asApt, pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(10);
  setF(doc, lang, 'normal');
  doc.text(L.subtitle, pageWidth / 2, 28, { align: 'center' });

  // Title
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(16);
  setF(doc, lang, 'bold');
  const title = bill.isPaid ? L.receipt : L.invoice;
  doc.text(title, pageWidth / 2, 55, { align: 'center' });

  // Date
  doc.setFontSize(9);
  setF(doc, lang, 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(`${L.generated} ${new Date().toLocaleDateString()}`, pageWidth - 20, 55, { align: 'right' });

  // Tenant info box
  let y = 68;
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, y - 5, pageWidth - 30, 30, 3, 3);

  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  setF(doc, lang, 'bold');
  doc.text(L.tenant, 20, y + 5);
  doc.text(L.unit, 20, y + 15);
  setF(doc, lang, 'normal');
  doc.text(bill.tenantName, 55, y + 5);
  doc.text(bill.unitLabel, 55, y + 15);
  doc.text(`${L.periodLabel} ${L.month(bill.month)} ${bill.year}`, pageWidth / 2 + 10, y + 5);

  // Bill details table
  y = 108;
  doc.setFillColor(245, 245, 245);
  doc.rect(15, y, pageWidth - 30, 10, 'F');
  setF(doc, lang, 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text(L.descCol, 20, y + 7);
  doc.text(L.amountCol, pageWidth - 20, y + 7, { align: 'right' });

  y += 15;
  setF(doc, lang, 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`${L.billType(bill.billType)} - ${L.month(bill.month)} ${bill.year}`, 20, y);
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
  setF(doc, lang, 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text(L.total, 20, y);
  doc.text(`${bill.amount.toLocaleString()} ${L.birr}`, pageWidth - 20, y, { align: 'right' });

  // Status
  y += 18;
  if (bill.isPaid) {
    doc.setTextColor(34, 139, 34);
    doc.setFontSize(14);
    setF(doc, lang, 'bold');
    doc.text(L.statusPaid, pageWidth / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(10);
    setF(doc, lang, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(L.thanks, pageWidth / 2, y, { align: 'center' });

    // Diagonal PAID stamp
    doc.saveGraphicsState();
    doc.setTextColor(34, 139, 34);
    doc.setFontSize(60);
    setF(doc, lang, 'bold');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gState = (doc as any).GState({ opacity: 0.15 });
    doc.setGState(gState);
    const cx = pageWidth / 2;
    const cy = 160;
    doc.text(L.paidStamp, cx, cy, { align: 'center', angle: 30 });
    doc.restoreGraphicsState();
  } else {
    doc.setTextColor(200, 50, 50);
    doc.setFontSize(14);
    setF(doc, lang, 'bold');
    doc.text(L.statusPending, pageWidth / 2, y, { align: 'center' });

    // Payment instructions
    y += 15;
    const paymentInfo = bill.billType === 'Rent' ? PAYMENT_CONFIG.rent : PAYMENT_CONFIG.utility;
    doc.setFillColor(255, 249, 235);
    doc.roundedRect(15, y - 5, pageWidth - 30, 40, 3, 3, 'F');
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    setF(doc, lang, 'bold');
    doc.text(L.payInstr, 20, y + 5);
    doc.setFontSize(10);
    setF(doc, lang, 'normal');
    doc.text(`${L.method} ${paymentInfo.method}`, 20, y + 14);
    doc.text(`${L.accName} ${paymentInfo.accountName}`, 20, y + 22);
    doc.text(`${L.accNum} ${paymentInfo.accountNumber}`, 20, y + 30);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  setF(doc, lang, 'normal');
  doc.text(L.powered, pageWidth / 2, pageHeight - 12, { align: 'center' });

  const status = bill.isPaid ? 'Receipt' : 'Invoice';
  doc.save(`${bill.billType}_${status}_${bill.unitLabel}_${bill.month}${bill.year}_${lang}.pdf`);
};

// --- Revenue report --------------------------------------------------------

interface RevenueData {
  rentPaid: number;
  rentPending: number;
  elecPaid: number;
  elecPending: number;
  waterPaid: number;
  waterPending: number;
  lang?: PdfLang;
}

export const generateRevenuePdf = async (data: RevenueData) => {
  const lang: PdfLang = data.lang ?? 'en';
  const L = STR[lang];
  const doc = new jsPDF();
  if (lang === 'am') await ensureEthiopicFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  setF(doc, lang, 'bold');
  doc.text(L.revenueReport, pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(10);
  setF(doc, lang, 'normal');
  doc.text(`${L.generated} ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });

  let y = 60;
  const totalPaid = data.rentPaid + data.elecPaid + data.waterPaid;
  const totalPending = data.rentPending + data.elecPending + data.waterPending;

  // Total
  doc.setFillColor(255, 249, 235);
  doc.roundedRect(15, y - 5, pageWidth - 30, 22, 3, 3, 'F');
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(14);
  setF(doc, lang, 'bold');
  doc.text(L.totalRev, 20, y + 7);
  doc.text(`${totalPaid.toLocaleString()} ${L.birr}`, pageWidth - 20, y + 7, { align: 'right' });
  y += 15;
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  setF(doc, lang, 'normal');
  doc.text(`${L.pending}: ${totalPending.toLocaleString()} ${L.birr}`, pageWidth - 20, y + 3, { align: 'right' });

  // Table
  y += 25;
  doc.setFillColor(245, 245, 245);
  doc.rect(15, y, pageWidth - 30, 10, 'F');
  setF(doc, lang, 'bold');
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(10);
  doc.text(L.category, 20, y + 7);
  doc.text(L.collected, 110, y + 7);
  doc.text(L.pending, pageWidth - 20, y + 7, { align: 'right' });

  const rows = [
    { label: L.rent, paid: data.rentPaid, pending: data.rentPending },
    { label: L.electricity, paid: data.elecPaid, pending: data.elecPending },
    { label: L.water, paid: data.waterPaid, pending: data.waterPending },
  ];

  setF(doc, lang, 'normal');
  doc.setTextColor(50, 50, 50);
  rows.forEach((row) => {
    y += 12;
    doc.text(row.label, 20, y + 7);
    doc.text(`${row.paid.toLocaleString()} ${L.birr}`, 110, y + 7);
    doc.text(`${row.pending.toLocaleString()} ${L.birr}`, pageWidth - 20, y + 7, { align: 'right' });
  });

  // Total row
  y += 15;
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1);
  doc.line(15, y, pageWidth - 15, y);
  y += 10;
  setF(doc, lang, 'bold');
  doc.text(L.total, 20, y);
  doc.text(`${totalPaid.toLocaleString()} ${L.birr}`, 110, y);
  doc.text(`${totalPending.toLocaleString()} ${L.birr}`, pageWidth - 20, y, { align: 'right' });

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  setF(doc, lang, 'normal');
  doc.text(L.powered, pageWidth / 2, pageHeight - 12, { align: 'center' });

  doc.save(`Revenue_Report_${new Date().toISOString().slice(0, 10)}_${lang}.pdf`);
};

// --- Tenant payments report ------------------------------------------------

interface TenantPaymentRow {
  apartmentLabel: string;
  tenantName: string;
  type: 'Rent' | 'Electricity' | 'Water' | 'Security';
  month: string;
  year: number;
  amount: number;
  isPaid: boolean;
  paidAt?: string | null;
}

interface TenantPaymentsReportData {
  rows: TenantPaymentRow[];
  filters?: { tenant?: string; type?: string; status?: string };
  totals?: { paid: number; pending: number; count: number };
  lang?: PdfLang;
}

export const generateTenantPaymentsPdf = async (data: TenantPaymentsReportData) => {
  const lang: PdfLang = data.lang ?? 'en';
  const L = STR[lang];
  const doc = new jsPDF();
  if (lang === 'am') await ensureEthiopicFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 15;
  const innerLeft = marginX + 5;
  const innerRight = pageWidth - marginX - 5;

  const colTenant = innerLeft;
  const colType = innerLeft + 60;
  const colPeriod = innerLeft + 95;
  const colStatus = innerLeft + 130;
  const colAmountRight = innerRight;

  // Header
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  setF(doc, lang, 'bold');
  doc.text(L.asApt, pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(10);
  setF(doc, lang, 'normal');
  doc.text(L.tenantReport, pageWidth / 2, 28, { align: 'center' });

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(14);
  setF(doc, lang, 'bold');
  doc.text(L.tenantTitle, marginX, 52);

  doc.setFontSize(9);
  setF(doc, lang, 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(`${L.generated} ${new Date().toLocaleDateString()}`, innerRight, 52, { align: 'right' });

  let y = 60;
  if (data.filters) {
    const parts: string[] = [];
    if (data.filters.tenant && data.filters.tenant !== 'all') parts.push(`${L.filterTenant}: ${data.filters.tenant}`);
    if (data.filters.type && data.filters.type !== 'all') parts.push(`${L.filterType}: ${data.filters.type}`);
    if (data.filters.status && data.filters.status !== 'all') parts.push(`${L.filterStatus}: ${data.filters.status}`);
    if (parts.length) {
      doc.text(parts.join('   |   '), marginX, y);
      y += 6;
    }
  }

  // Totals
  const paidTotal = Math.round(
    data.totals?.paid ?? data.rows.filter(r => r.isPaid).reduce((s, r) => s + r.amount, 0),
  );
  const pendingTotal = Math.round(
    data.totals?.pending ?? data.rows.filter(r => !r.isPaid).reduce((s, r) => s + r.amount, 0),
  );
  const recordsTotal = data.totals?.count ?? data.rows.length;

  y += 4;
  doc.setFillColor(255, 249, 235);
  doc.roundedRect(marginX, y, pageWidth - marginX * 2, 18, 3, 3, 'F');
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);
  setF(doc, lang, 'bold');
  doc.text(`${L.collected}: ${paidTotal.toLocaleString()} ${L.birr}`, innerLeft, y + 11);
  doc.text(`${L.pending}: ${pendingTotal.toLocaleString()} ${L.birr}`, innerLeft + 70, y + 11);
  doc.text(`${L.records}: ${recordsTotal}`, innerRight, y + 11, { align: 'right' });
  y += 24;

  // Table header
  const drawHeader = () => {
    doc.setFillColor(245, 245, 245);
    doc.rect(marginX, y, pageWidth - marginX * 2, 9, 'F');
    setF(doc, lang, 'bold');
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.text(L.tenantUnit, colTenant, y + 6);
    doc.text(L.typeCol, colType, y + 6);
    doc.text(L.periodCol, colPeriod, y + 6);
    doc.text(L.statusCol, colStatus, y + 6);
    doc.text(L.amountCol, colAmountRight, y + 6, { align: 'right' });
    y += 11;
  };
  drawHeader();

  setF(doc, lang, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);

  data.rows.forEach((r) => {
    if (y > pageHeight - 25) {
      doc.addPage();
      y = 20;
      drawHeader();
      setF(doc, lang, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
    }
    const tenantLine = r.tenantName ? `${r.apartmentLabel} — ${r.tenantName}` : r.apartmentLabel;
    const tenantTxt = doc.splitTextToSize(tenantLine, colType - colTenant - 2)[0];
    doc.text(tenantTxt, colTenant, y);
    doc.text(L.billType(r.type), colType, y);
    doc.text(`${L.month(r.month)} ${r.year}`, colPeriod, y);
    if (r.isPaid) doc.setTextColor(34, 139, 34); else doc.setTextColor(200, 50, 50);
    doc.text(r.isPaid ? L.paid : L.pending, colStatus, y);
    doc.setTextColor(50, 50, 50);
    doc.text(Math.round(r.amount).toLocaleString(), colAmountRight, y, { align: 'right' });
    y += 7;
  });

  // Footer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(marginX, pageHeight - 20, pageWidth - marginX, pageHeight - 20);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    setF(doc, lang, 'normal');
    doc.text(L.powered, pageWidth / 2, pageHeight - 12, { align: 'center' });
    doc.text(L.pageOf(i, pageCount), pageWidth - marginX, pageHeight - 12, { align: 'right' });
  }

  doc.save(`Tenant_Payments_${new Date().toISOString().slice(0, 10)}_${lang}.pdf`);
};