import QRCode from 'qrcode';
import { CorrugatedOrder } from '../types/order';
import { getPublicAppOrigin } from './url';
import { formatDateTime } from './whatsapp';

export type QRResolution = 600 | 1200 | 1800 | 2400 | number;

export interface HighResQROptions {
  resolution?: QRResolution;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  includeOrderHeader?: boolean;
  orderId?: string;
  customerName?: string;
}

/**
 * Builds the official public tracking URL for an order
 */
export function getOrderTrackingUrl(orderId: string): string {
  const origin = getPublicAppOrigin();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  return `${origin}${pathname}?track=${encodeURIComponent(orderId)}`;
}

/**
 * Generates an ultra high-resolution QR code PNG data URL.
 * Uses Error Correction Level 'H' (allows up to 30% damage recovery on factory floor).
 */
export async function generateHighResQRCode(
  trackingUrl: string,
  options: HighResQROptions = {}
): Promise<string> {
  const {
    resolution = 1800,
    errorCorrectionLevel = 'H',
    includeOrderHeader = false,
    orderId = '',
    customerName = '',
  } = options;

  // Generate pure high-res QR code
  const rawQrDataUrl = await QRCode.toDataURL(trackingUrl, {
    width: resolution,
    margin: 2,
    errorCorrectionLevel,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  if (!includeOrderHeader || !orderId) {
    return rawQrDataUrl;
  }

  // Draw framed high-resolution QR code with clean readable metadata on top & bottom
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const headerHeight = Math.round(resolution * 0.16);
      const footerHeight = Math.round(resolution * 0.12);
      canvas.width = resolution;
      canvas.height = resolution + headerHeight + footerHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawQrDataUrl);
        return;
      }

      // Pure crisp white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Top Industrial Header Banner
      ctx.fillStyle = '#0f172a'; // Deep slate
      ctx.fillRect(0, 0, canvas.width, headerHeight);

      // Accent border
      ctx.fillStyle = '#f59e0b'; // Amber gold
      ctx.fillRect(0, headerHeight - 8, canvas.width, 8);

      // Header Text: Order ID
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(headerHeight * 0.38)}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`ORDER #${orderId}`, canvas.width / 2, headerHeight * 0.38);

      // Header Subtitle: Customer Name
      if (customerName) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = `bold ${Math.round(headerHeight * 0.22)}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillText(customerName.toUpperCase(), canvas.width / 2, headerHeight * 0.72);
      }

      // Draw QR Code
      ctx.drawImage(img, 0, headerHeight, resolution, resolution);

      // Bottom Footer Bar
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, headerHeight + resolution, canvas.width, footerHeight);

      // Outer bounding line
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

      // Footer Text
      ctx.fillStyle = '#334155';
      ctx.font = `bold ${Math.round(footerHeight * 0.32)}px "Courier New", monospace`;
      ctx.fillText('SCAN TO TRACK · CORRUTRACK DISPATCH SYSTEM', canvas.width / 2, headerHeight + resolution + footerHeight * 0.42);

      ctx.fillStyle = '#64748b';
      ctx.font = `${Math.round(footerHeight * 0.22)}px sans-serif`;
      ctx.fillText('Compatible with all smartphones & Zebra / Honeywell 2D scanners', canvas.width / 2, headerHeight + resolution + footerHeight * 0.76);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => reject(err);
    img.src = rawQrDataUrl;
  });
}

/**
 * Generates a complete, ready-to-stick Production Floor Pallet & Carton Tag PNG.
 * Perfect for 4x6" thermal label printers or laser printing on corrugated pallets.
 */
export async function generateProductionFloorLabelPNG(
  order: CorrugatedOrder,
  trackingUrl: string,
  width: number = 2000
): Promise<string> {
  const height = Math.round(width * 0.625); // Standard 16:10 / 6x4" aspect ratio (2000 x 1250)
  const qrSize = Math.round(height * 0.62); // ~775px

  // Generate QR code at high resolution for embedding
  const qrDataUrl = await QRCode.toDataURL(trackingUrl, {
    width: qrSize,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  return new Promise((resolve, reject) => {
    const qrImg = new Image();
    qrImg.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2D canvas context'));
        return;
      }

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Outer heavy border for physical label cutting / alignment
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      // Inner margin line
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      // Top Industrial Header Banner
      const topBarHeight = Math.round(height * 0.13);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(20, 20, width - 40, topBarHeight);

      // Header Titles
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.round(topBarHeight * 0.42)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('CORRUTRACK MANUFACTURING & PALLET DISPATCH TAG', 45, 20 + topBarHeight * 0.38);

      ctx.fillStyle = '#fbbf24';
      ctx.font = `bold ${Math.round(topBarHeight * 0.24)}px "Courier New", monospace`;
      ctx.fillText('HEAVY DUTY CORRUGATED PACKAGING TRACEABILITY SYSTEM', 45, 20 + topBarHeight * 0.74);

      // Top right timestamp on banner
      ctx.fillStyle = '#cbd5e1';
      ctx.font = `${Math.round(topBarHeight * 0.22)}px "Courier New", monospace`;
      ctx.textAlign = 'right';
      ctx.fillText(`PRINTED: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, width - 45, 20 + topBarHeight * 0.55);

      // Divide label into Left Specification Column and Right QR Code Column
      const leftColWidth = width * 0.58;
      const contentTop = 20 + topBarHeight + 25;
      const contentBottom = height - 45;

      // Divider line between specs and QR
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(leftColWidth, contentTop - 15);
      ctx.lineTo(leftColWidth, contentBottom);
      ctx.stroke();

      // LEFT COLUMN: ORDER SPECIFICATIONS
      let y = contentTop;

      // 1. Order ID Callout
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.font = 'bold 22px "Courier New", monospace';
      ctx.fillText('WORK ORDER NUMBER', 45, y);
      y += 50;

      ctx.fillStyle = '#000000';
      ctx.font = '900 68px "Courier New", monospace';
      ctx.fillText(`#${order.id}`, 45, y);
      y += 35;

      // Thin separator
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(45, y);
      ctx.lineTo(leftColWidth - 40, y);
      ctx.stroke();
      y += 35;

      // 2. Customer Name (Large for visibility)
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 20px -apple-system, sans-serif';
      ctx.fillText('CLIENT / CONSIGNMENT TO:', 45, y);
      y += 42;

      ctx.fillStyle = '#0f172a';
      ctx.font = '900 48px -apple-system, sans-serif';
      const maxCustomerWidth = leftColWidth - 90;
      let customerNameText = order.customerCompany;
      if (ctx.measureText(customerNameText).width > maxCustomerWidth) {
        ctx.font = '900 38px -apple-system, sans-serif';
      }
      ctx.fillText(customerNameText, 45, y);
      y += 50;

      // 3. Grid of Specifications
      const boxStartY = y;
      const boxW = leftColWidth - 90;
      const rowH = 72;

      // Box styling
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(45, boxStartY, boxW, rowH * 3);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(45, boxStartY, boxW, rowH * 3);

      // Row 1: Dimensions & Quantity
      // Horizontal line 1
      ctx.beginPath();
      ctx.moveTo(45, boxStartY + rowH);
      ctx.lineTo(45 + boxW, boxStartY + rowH);
      ctx.stroke();

      // Horizontal line 2
      ctx.beginPath();
      ctx.moveTo(45, boxStartY + rowH * 2);
      ctx.lineTo(45 + boxW, boxStartY + rowH * 2);
      ctx.stroke();

      // Vertical mid divider
      const midX = 45 + boxW * 0.58;
      ctx.beginPath();
      ctx.moveTo(midX, boxStartY);
      ctx.lineTo(midX, boxStartY + rowH * 3);
      ctx.stroke();

      // Field 1: Dimensions
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillText('BOX SIZE (L x W x H mm)', 60, boxStartY + 26);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 30px "Courier New", monospace';
      ctx.fillText(`${order.dimensions.lengthMm} x ${order.dimensions.widthMm} x ${order.dimensions.heightMm}`, 60, boxStartY + 56);

      // Field 2: Total Quantity (Highlighted)
      ctx.fillStyle = '#92400e';
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillText('CONSIGNMENT QTY', midX + 20, boxStartY + 26);
      ctx.fillStyle = '#b45309';
      ctx.font = '900 34px "Courier New", monospace';
      ctx.fillText(`${order.quantity.toLocaleString()} PCS`, midX + 20, boxStartY + 58);

      // Field 3: Board Spec (Ply & Flute)
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillText('BOARD STRUCTURE', 60, boxStartY + rowH + 26);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 28px -apple-system, sans-serif';
      ctx.fillText(`${order.ply} · ${order.flute}`, 60, boxStartY + rowH + 56);

      // Field 4: Box Style
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillText('BOX STYLE & JOINT', midX + 20, boxStartY + rowH + 26);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px -apple-system, sans-serif';
      ctx.fillText(`${order.boxStyle.split(' ')[0]} (${order.jointType})`, midX + 20, boxStartY + rowH + 56);

      // Field 5: Target Dispatch SLA
      ctx.fillStyle = '#991b1b';
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillText('DISPATCH COMMITMENT SLA', 60, boxStartY + rowH * 2 + 26);
      ctx.fillStyle = '#b91c1c';
      ctx.font = '900 28px "Courier New", monospace';
      ctx.fillText(formatDateTime(order.expectedDeliveryDate), 60, boxStartY + rowH * 2 + 56);

      // Field 6: Bursting Factor or GSM
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillText('PAPER SPECS', midX + 20, boxStartY + rowH * 2 + 26);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px "Courier New", monospace';
      ctx.fillText(`${order.paperSpecs?.topLinerGsm || 150}/${order.paperSpecs?.flutingMediumGsm || 120}/${order.paperSpecs?.bottomLinerGsm || 150} GSM`, midX + 20, boxStartY + rowH * 2 + 56);

      // Production note at bottom left
      ctx.fillStyle = '#475569';
      ctx.font = 'italic 20px -apple-system, sans-serif';
      ctx.fillText('Stick on pallet stretch wrap or prominent box face for scanning.', 45, height - 60);

      // RIGHT COLUMN: ULTRA-SHARP QR CODE
      const rightColCenterX = leftColWidth + (width - leftColWidth) / 2;

      // QR Code Box Container
      const qrBoxSize = qrSize + 40;
      const qrBoxX = rightColCenterX - qrBoxSize / 2;
      const qrBoxY = contentTop + 10;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);

      // Draw QR image
      ctx.drawImage(qrImg, qrBoxX + 20, qrBoxY + 20, qrSize, qrSize);

      // QR Code Instructions
      let qrTextY = qrBoxY + qrBoxSize + 45;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000000';
      ctx.font = '900 28px -apple-system, sans-serif';
      ctx.fillText('SCAN WITH ANY SMARTPHONE CAMERA', rightColCenterX, qrTextY);
      qrTextY += 34;

      ctx.fillStyle = '#047857'; // Emerald
      ctx.font = 'bold 24px "Courier New", monospace';
      ctx.fillText('LIVE ORDER TRACKING & STAGE HANDOVER', rightColCenterX, qrTextY);
      qrTextY += 34;

      ctx.fillStyle = '#64748b';
      ctx.font = '20px "Courier New", monospace';
      ctx.fillText(`TRACKING ID: ORD-${order.id}`, rightColCenterX, qrTextY);

      resolve(canvas.toDataURL('image/png'));
    };

    qrImg.onerror = (err) => reject(err);
    qrImg.src = qrDataUrl;
  });
}

/**
 * Triggers a direct browser download of the image Data URL
 */
export function downloadImage(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Copies a PNG data URL image directly to the system clipboard
 */
export async function copyImageToClipboard(dataUrl: string): Promise<boolean> {
  try {
    if (!navigator.clipboard || !window.ClipboardItem) {
      return false;
    }
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ]);
    return true;
  } catch (err) {
    console.warn('Failed to copy image to clipboard:', err);
    return false;
  }
}

/**
 * Opens a print dialog specifically for the high-resolution label
 */
export function printLabelImage(dataUrl: string, title: string = 'Order QR Code Label'): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          @page {
            size: auto;
            margin: 8mm;
          }
          body {
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          img {
            max-width: 100%;
            height: auto;
            display: block;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
          }
          @media print {
            body {
              min-height: auto;
            }
          }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" alt="${title}" />
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
