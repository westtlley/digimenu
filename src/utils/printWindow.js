const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizePaperWidth = (value) => {
  const normalized = String(value || '').toLowerCase().trim();
  if (normalized === '58mm') return '58mm';
  return '80mm';
};

function getStoredPrinterConfig() {
  if (typeof window === 'undefined') {
    return {
      paperWidth: '80mm',
      marginTop: 3,
      marginRight: 3,
      marginBottom: 3,
      marginLeft: 3,
      fontSize: 12,
      lineSpacing: 1.35,
      autoClose: true,
    };
  }

  try {
    const raw = localStorage.getItem('printerConfigLocal');
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      paperWidth: normalizePaperWidth(parsed.paper_width),
      marginTop: toNumber(parsed.margin_top, 3),
      marginRight: toNumber(parsed.margin_right, 3),
      marginBottom: toNumber(parsed.margin_bottom, 3),
      marginLeft: toNumber(parsed.margin_left, 3),
      fontSize: toNumber(parsed.font_size, 12),
      lineSpacing: toNumber(parsed.line_spacing, 1.35),
      autoClose: parsed.auto_cut !== false,
    };
  } catch (_) {
    return {
      paperWidth: '80mm',
      marginTop: 3,
      marginRight: 3,
      marginBottom: 3,
      marginLeft: 3,
      fontSize: 12,
      lineSpacing: 1.35,
      autoClose: true,
    };
  }
}

export function openThermalPrintWindow({
  title = 'Impressao',
  htmlContent = '',
  paperWidth,
  marginTop,
  marginRight,
  marginBottom,
  marginLeft,
  fontSize,
  lineSpacing,
  autoClose,
} = {}) {
  const stored = getStoredPrinterConfig();
  const finalPaperWidth = normalizePaperWidth(paperWidth || stored.paperWidth);
  const finalMarginTop = toNumber(marginTop, stored.marginTop);
  const finalMarginRight = toNumber(marginRight, stored.marginRight);
  const finalMarginBottom = toNumber(marginBottom, stored.marginBottom);
  const finalMarginLeft = toNumber(marginLeft, stored.marginLeft);
  const finalFontSize = toNumber(fontSize, stored.fontSize);
  const finalLineSpacing = toNumber(lineSpacing, stored.lineSpacing);
  const shouldAutoClose = autoClose ?? stored.autoClose;

  const popupWidth = finalPaperWidth === '58mm' ? 360 : 420;
  const printWindow = window.open('', '_blank', `width=${popupWidth},height=720`);
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title}</title>
        <style>
          @page {
            size: ${finalPaperWidth} auto;
            margin: ${finalMarginTop}mm ${finalMarginRight}mm ${finalMarginBottom}mm ${finalMarginLeft}mm;
          }

          html, body {
            margin: 0;
            padding: 0;
            width: ${finalPaperWidth};
            max-width: ${finalPaperWidth};
            background: #fff;
          }

          * {
            box-sizing: border-box;
            color: #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body {
            font-family: "Courier New", "Lucida Console", monospace;
            font-size: ${finalFontSize}px;
            line-height: ${finalLineSpacing};
            white-space: normal;
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          .center { text-align: center; }
          .bold { font-weight: 700; }
          .small { font-size: 10px; }
          .line {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .item {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 8px;
            margin: 2px 0;
          }
          .item > div:first-child {
            flex: 1;
            min-width: 0;
          }
          .item .text-right {
            min-width: 74px;
          }
          .item-3col {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 32px 74px;
            gap: 6px;
            margin: 2px 0;
            align-items: flex-start;
          }
          .text-right {
            text-align: right;
            white-space: nowrap;
          }
        </style>
      </head>
      <body>${htmlContent}</body>
    </html>
  `);
  printWindow.document.close();

  let printed = false;
  const firePrint = () => {
    if (printed) return;
    printed = true;
    try {
      printWindow.focus();
      printWindow.print();
    } catch (_) {
      // ignore
    }
  };

  printWindow.onload = firePrint;
  setTimeout(firePrint, 350);

  if (shouldAutoClose) {
    printWindow.onafterprint = () => {
      setTimeout(() => {
        try { printWindow.close(); } catch (_) {}
      }, 120);
    };
  }

  return true;
}

