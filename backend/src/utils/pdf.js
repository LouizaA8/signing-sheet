import PDFDocument from 'pdfkit';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dirname, '../assets/logo.png');

// Century Gothic for the entire printed sheet.
const FONT_REGULAR = 'CenturyGothic';
const FONT_BOLD = 'CenturyGothic-Bold';
const FONT_REGULAR_PATH = join(__dirname, '../assets/CenturyGothic-Regular.ttf');
const FONT_BOLD_PATH = join(__dirname, '../assets/CenturyGothic-Bold.ttf');

const HEADER_FILL = '#c8e6c9';
const BORDER_COLOR = '#333333';
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function formatDateShort(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${MONTHS[parseInt(m, 10) - 1]}/${y}`;
}

function ordinalDayLabel(iso) {
  const day = parseInt(iso.split('-')[2], 10);
  const mod10 = day % 10;
  const mod100 = day % 100;
  let suffix = 'TH';
  if (mod10 === 1 && mod100 !== 11) suffix = 'ST';
  else if (mod10 === 2 && mod100 !== 12) suffix = 'ND';
  else if (mod10 === 3 && mod100 !== 13) suffix = 'RD';
  return `${day}${suffix}`;
}

function drawCheckmark(doc, x, y, size = 8) {
  doc.save();
  doc.strokeColor('#1b5e20').lineWidth(1.3);
  doc.moveTo(x, y + size * 0.5).lineTo(x + size * 0.35, y + size * 0.9).lineTo(x + size, y).stroke();
  doc.restore();
}

function drawCross(doc, x, y, size = 8) {
  doc.save();
  doc.strokeColor('#8a1c1c').lineWidth(1.1);
  doc.moveTo(x, y).lineTo(x + size, y + size).stroke();
  doc.moveTo(x + size, y).lineTo(x, y + size).stroke();
  doc.restore();
}

// Column widths for everything except the per-date signature columns.
const COL = {
  sno: 25,
  name: 75,
  dept: 62,
  contacts: 95,
  gender: 32,
  pwd: 32,
  age: 24 // x3 (<35, 35-59, 59>)
};

const FIXED_WIDTH = COL.sno + COL.name + COL.dept + COL.contacts + COL.gender + COL.pwd + COL.age * 3;
const HEADER_ROW1_H = 16;
const HEADER_ROW2_H = 16;
const HEADER_H = HEADER_ROW1_H + HEADER_ROW2_H;
const ROW_HEIGHT = 52;
const MARGIN = 50;

export function generatePDF(sheet, attendances) {
  return new Promise((resolve, reject) => {
    const dates = sheet.dates;

    const usablePortrait = 612 - MARGIN * 2;
    const needLandscape = dates.length > 0 && (usablePortrait - FIXED_WIDTH) / dates.length < 34;

    const doc = new PDFDocument({ margin: MARGIN, size: 'letter', layout: needLandscape ? 'landscape' : 'portrait' });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont(FONT_REGULAR, FONT_REGULAR_PATH);
    doc.registerFont(FONT_BOLD, FONT_BOLD_PATH);

    const usableWidth = doc.page.width - MARGIN * 2;
    const dateColWidth = Math.min(90, Math.max(32, (usableWidth - FIXED_WIDTH) / Math.max(dates.length, 1)));

    // ---- Letterhead ----
    const logoWidth = 70;
    const logoY = doc.y;
    doc.image(LOGO_PATH, doc.page.width / 2 - logoWidth / 2, logoY, { width: logoWidth });
    doc.y = logoY + logoWidth / 2 + 8;

    doc.fillColor('black').fontSize(15).font(FONT_BOLD).text('KENYA SUGAR BOARD', { align: 'center' });
    doc.fontSize(12).text(sheet.title.toUpperCase(), { align: 'center' });

    const dateRangeStr = dates.length > 1
      ? `${formatDateShort(dates[0])} — ${formatDateShort(dates[dates.length - 1])}`
      : (dates[0] ? formatDateShort(dates[0]) : '');
    doc.font(FONT_BOLD).fontSize(10).text(`${sheet.location.toUpperCase()}  FROM  ${dateRangeStr}`, { align: 'center' });

    doc.moveDown(0.4);
    doc.font(FONT_BOLD).fontSize(10).text('ATTENDANCE LIST', { align: 'center' });
    doc.moveDown(0.8);

    // ---- Table column x-positions ----
    const colX = {};
    let cursor = MARGIN;
    colX.sno = cursor; cursor += COL.sno;
    colX.name = cursor; cursor += COL.name;
    colX.dept = cursor; cursor += COL.dept;
    colX.contacts = cursor; cursor += COL.contacts;
    colX.gender = cursor; cursor += COL.gender;
    colX.pwd = cursor; cursor += COL.pwd;
    colX.age1 = cursor; cursor += COL.age;
    colX.age2 = cursor; cursor += COL.age;
    colX.age3 = cursor; cursor += COL.age;
    colX.datesStart = cursor;

    const tableRight = colX.datesStart + dateColWidth * dates.length;
    const columnBoundaries = [
      colX.sno, colX.name, colX.dept, colX.contacts, colX.gender, colX.pwd,
      colX.age1, colX.age2, colX.age3, colX.datesStart,
      ...dates.map((_, i) => colX.datesStart + i * dateColWidth),
      tableRight
    ];

    function drawHeader(top) {
      doc.rect(MARGIN, top, tableRight - MARGIN, HEADER_H).fill(HEADER_FILL);

      doc.strokeColor(BORDER_COLOR).lineWidth(0.75);
      columnBoundaries.forEach(x => doc.moveTo(x, top).lineTo(x, top + HEADER_H).stroke());
      doc.moveTo(MARGIN, top).lineTo(tableRight, top).stroke();
      doc.moveTo(MARGIN, top + HEADER_H).lineTo(tableRight, top + HEADER_H).stroke();
      doc.moveTo(colX.age1, top + HEADER_ROW1_H).lineTo(tableRight, top + HEADER_ROW1_H).stroke();

      doc.fillColor('black').font(FONT_BOLD).fontSize(7);
      doc.text('AGE', colX.age1, top + 4, { width: COL.age * 3, align: 'center' });
      doc.text('DATES', colX.datesStart, top + 4, { width: dateColWidth * dates.length, align: 'center' });

      const midLabelY = top + HEADER_H / 2 - 3;
      doc.text('S.NO.', colX.sno, midLabelY, { width: COL.sno, align: 'center' });
      doc.text('NAME', colX.name, midLabelY, { width: COL.name, align: 'center' });
      doc.text('DEPT/ORG', colX.dept, midLabelY, { width: COL.dept, align: 'center' });
      doc.text('CONTACTS', colX.contacts, midLabelY, { width: COL.contacts, align: 'center' });
      doc.text('GENDER', colX.gender, midLabelY, { width: COL.gender, align: 'center' });
      doc.text('PWD?', colX.pwd, midLabelY, { width: COL.pwd, align: 'center' });

      doc.fontSize(6.5);
      doc.text('< 35', colX.age1, top + HEADER_ROW1_H + 5, { width: COL.age, align: 'center' });
      doc.text('35-59', colX.age2, top + HEADER_ROW1_H + 5, { width: COL.age, align: 'center' });
      doc.text('59 >', colX.age3, top + HEADER_ROW1_H + 5, { width: COL.age, align: 'center' });
      dates.forEach((d, i) => {
        doc.text(ordinalDayLabel(d), colX.datesStart + i * dateColWidth, top + HEADER_ROW1_H + 5, { width: dateColWidth, align: 'center' });
      });

      doc.fillColor('black').font(FONT_REGULAR).fontSize(8);
    }

    const pageBottom = doc.page.height - MARGIN;
    let tableTop = doc.y;
    drawHeader(tableTop);
    let currentY = tableTop + HEADER_H;

    attendances.forEach((att, idx) => {
      if (currentY + ROW_HEIGHT > pageBottom) {
        doc.addPage();
        tableTop = MARGIN;
        drawHeader(tableTop);
        currentY = tableTop + HEADER_H;
      }

      doc.strokeColor(BORDER_COLOR).lineWidth(0.5);
      columnBoundaries.forEach(x => doc.moveTo(x, currentY).lineTo(x, currentY + ROW_HEIGHT).stroke());
      doc.moveTo(MARGIN, currentY + ROW_HEIGHT).lineTo(tableRight, currentY + ROW_HEIGHT).stroke();

      const padY = currentY + 5;
      doc.fillColor('black').font(FONT_REGULAR).fontSize(8);
      doc.text(`${idx + 1}.`, colX.sno + 3, padY, { width: COL.sno - 6 });
      doc.text(att.name || '', colX.name + 3, padY, { width: COL.name - 6 });

      doc.fontSize(7);
      doc.text(att.department || '', colX.dept + 3, padY, { width: COL.dept - 6 });
      doc.text(att.organization || '', colX.dept + 3, padY + 24, { width: COL.dept - 6 });

      doc.text(att.email || '', colX.contacts + 3, padY, { width: COL.contacts - 6 });
      doc.text(att.phone && att.phone !== att.email ? att.phone : '', colX.contacts + 3, padY + 24, { width: COL.contacts - 6 });

      doc.fontSize(8);
      doc.text(att.gender || '', colX.gender, padY + 12, { width: COL.gender, align: 'center' });

      const pwdMarkX = colX.pwd + COL.pwd / 2 - 4;
      if (att.pwd) drawCheckmark(doc, pwdMarkX, padY + 10);
      else drawCross(doc, pwdMarkX, padY + 10);

      const ageColX = att.age_bracket === '<35' ? colX.age1
        : att.age_bracket === '35-59' ? colX.age2
        : att.age_bracket === '59>' ? colX.age3
        : null;
      if (ageColX !== null) {
        drawCheckmark(doc, ageColX + COL.age / 2 - 4, padY + 10);
      }

      dates.forEach((date, dIdx) => {
        const attended = att.dates_attended.includes(date);
        if (attended && att.signature) {
          try {
            const buf = Buffer.from(att.signature.split(',')[1] || att.signature, 'base64');
            const sigW = Math.min(dateColWidth - 6, 45);
            doc.image(buf, colX.datesStart + dIdx * dateColWidth + (dateColWidth - sigW) / 2, currentY + 8, {
              width: sigW,
              height: ROW_HEIGHT - 20
            });
          } catch (err) {
            // Invalid signature data — leave the cell blank
          }
        }
      });

      currentY += ROW_HEIGHT;
    });

    doc.end();
  });
}
