import React, { useState, useEffect } from 'react';
import { CorrugatedOrder } from '../types/order';
import {
  X,
  ExternalLink,
  Download,
  Printer,
  Copy,
  Check,
  QrCode,
  Tag,
  Sparkles,
  ShieldCheck,
  Layers,
  ZoomIn,
} from 'lucide-react';
import { formatDateTime } from '../utils/whatsapp';
import {
  generateHighResQRCode,
  generateProductionFloorLabelPNG,
  downloadImage,
  copyImageToClipboard,
  printLabelImage,
  getOrderTrackingUrl,
  QRResolution,
} from '../utils/qrExport';

interface OrderQRModalProps {
  order: CorrugatedOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenTracker: (orderId: string) => void;
}

type ExportMode = 'label' | 'qr-only';

export const OrderQRModal: React.FC<OrderQRModalProps> = ({
  order,
  isOpen,
  onClose,
  onOpenTracker,
}) => {
  const [exportMode, setExportMode] = useState<ExportMode>('label');
  const [resolution, setResolution] = useState<QRResolution>(1200);
  const [includeHeaderInRawQR, setIncludeHeaderInRawQR] = useState(true);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  // Generate public tracking URL
  const trackingUrl = order ? getOrderTrackingUrl(order.id) : '';

  // Render high-res preview whenever order, mode, resolution, or options change
  useEffect(() => {
    if (!isOpen || !order) return;

    let isMounted = true;
    setIsGenerating(true);

    const generatePreview = async () => {
      try {
        if (exportMode === 'label') {
          // Generate full production floor label (2000px wide for crisp 300 DPI print)
          const url = await generateProductionFloorLabelPNG(order, trackingUrl, 2000);
          if (isMounted) setPreviewDataUrl(url);
        } else {
          // Generate standalone high-res QR code
          const url = await generateHighResQRCode(trackingUrl, {
            resolution,
            errorCorrectionLevel: 'H',
            includeOrderHeader: includeHeaderInRawQR,
            orderId: order.id,
            customerName: order.customerCompany,
          });
          if (isMounted) setPreviewDataUrl(url);
        }
      } catch (err) {
        console.error('Failed to generate high-res preview:', err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };

    generatePreview();

    return () => {
      isMounted = false;
    };
  }, [isOpen, order, exportMode, resolution, includeHeaderInRawQR, trackingUrl]);

  if (!isOpen || !order) return null;

  // Handle High-Res PNG Download
  const handleDownloadPNG = async () => {
    if (!previewDataUrl) return;

    const fileSuffix = exportMode === 'label' ? 'Production-Pallet-Label' : `QR-${resolution}px`;
    const filename = `Order-${order.id}-${fileSuffix}.png`;
    downloadImage(previewDataUrl, filename);
  };

  // Handle Copy PNG Image to Clipboard
  const handleCopyImage = async () => {
    if (!previewDataUrl) return;
    const success = await copyImageToClipboard(previewDataUrl);
    if (success) {
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2500);
    } else {
      // Fallback: copy tracking link
      handleCopyLink();
    }
  };

  // Handle Copy Tracking Link
  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(trackingUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Handle Print Label
  const handlePrint = () => {
    if (!previewDataUrl) return;
    const printTitle = `Order #${order.id} - ${order.customerCompany} - Production Label`;
    printLabelImage(previewDataUrl, printTitle);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-amber-400 font-semibold tracking-wide uppercase">
                  High-Resolution Export & Floor Tag
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono">
                  Level-H Error Correction
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5 flex items-center gap-2">
                Order #{order.id}
                <span className="text-xs font-normal text-neutral-400 truncate max-w-[200px] sm:max-w-xs">
                  · {order.customerCompany}
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Export Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
            <button
              type="button"
              onClick={() => setExportMode('label')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                exportMode === 'label'
                  ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Pallet & Carton Tag PNG</span>
              <span className="text-[10px] opacity-75 font-mono hidden sm:inline">(Print-Ready)</span>
            </button>

            <button
              type="button"
              onClick={() => setExportMode('qr-only')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                exportMode === 'qr-only'
                  ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Standalone QR Code PNG</span>
              <span className="text-[10px] opacity-75 font-mono hidden sm:inline">(Ultra Crisp)</span>
            </button>
          </div>

          {/* Secondary Controls (Resolution & Headers) */}
          {exportMode === 'qr-only' ? (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-950/70 border border-neutral-800/80 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400 font-medium">Export Resolution:</span>
                <div className="inline-flex rounded-lg border border-neutral-800 bg-neutral-900 p-0.5">
                  {([600, 1200, 2400] as QRResolution[]).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setResolution(res)}
                      className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition-colors ${
                        resolution === res
                          ? 'bg-amber-400 text-neutral-950 font-bold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {res === 600 ? '600px' : res === 1200 ? '1200px (300 DPI)' : '2400px (4K)'}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                <input
                  type="checkbox"
                  checked={includeHeaderInRawQR}
                  onChange={(e) => setIncludeHeaderInRawQR(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-amber-400 focus:ring-amber-400 w-3.5 h-3.5"
                />
                <span>Include Order # header bar</span>
              </label>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-neutral-950/70 border border-neutral-800/80 rounded-xl text-xs text-neutral-400">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Standard 6x4" / A6 Pallet Dispatch Label Canvas (2000 x 1250 px High-Res)</span>
              </div>
              <span className="text-emerald-400 font-mono font-medium">300 DPI Print Quality</span>
            </div>
          )}

          {/* Live High-Res Image Preview Card */}
          <div className="relative bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[220px] overflow-hidden group">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-2 text-neutral-400 text-xs py-10">
                <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span>Rendering High-Resolution Canvas...</span>
              </div>
            ) : previewDataUrl ? (
              <div className="relative max-w-full flex flex-col items-center">
                <img
                  src={previewDataUrl}
                  alt={`Order #${order.id} QR Code Export`}
                  className="max-h-[260px] w-auto object-contain rounded-lg shadow-lg border border-neutral-800 bg-white"
                />
                <div className="mt-2 text-[11px] text-neutral-500 font-mono flex items-center gap-2">
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>
                    High-Res PNG Ready · {exportMode === 'label' ? '2000x1250 px' : `${resolution}x${resolution} px`}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Quick Specifications Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg">
              <div className="text-[10px] text-neutral-500 uppercase">Customer</div>
              <div className="text-white font-semibold truncate mt-0.5">{order.customerCompany}</div>
            </div>
            <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg">
              <div className="text-[10px] text-neutral-500 uppercase">Box Specs</div>
              <div className="text-white truncate mt-0.5">
                {order.dimensions.lengthMm}x{order.dimensions.widthMm}x{order.dimensions.heightMm} ({order.ply})
              </div>
            </div>
            <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg">
              <div className="text-[10px] text-neutral-500 uppercase">Consignment Qty</div>
              <div className="text-amber-400 font-bold mt-0.5">{order.quantity.toLocaleString()} pcs</div>
            </div>
            <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg">
              <div className="text-[10px] text-neutral-500 uppercase">Dispatch SLA</div>
              <div className="text-neutral-300 font-semibold truncate mt-0.5">
                {formatDateTime(order.expectedDeliveryDate)}
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* High-Res PNG Download Button */}
              <button
                type="button"
                onClick={handleDownloadPNG}
                disabled={isGenerating || !previewDataUrl}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-neutral-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-amber-400/20 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>
                  Save High-Resolution PNG ({exportMode === 'label' ? 'Tag' : `${resolution}px`})
                </span>
              </button>

              {/* Direct Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={isGenerating || !previewDataUrl}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm transition-all border border-neutral-700 disabled:opacity-50"
              >
                <Printer className="w-4 h-4 text-neutral-300" />
                <span>Print Label Directly</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Copy Image to Clipboard Button */}
              <button
                type="button"
                onClick={handleCopyImage}
                disabled={isGenerating || !previewDataUrl}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-300 text-xs transition-colors border border-neutral-800"
              >
                {copiedImage ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">PNG Image Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy PNG Image to Clipboard</span>
                  </>
                )}
              </button>

              {/* Open Live Tracker */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTracker(order.id);
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-300 text-xs transition-colors border border-neutral-800"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>Open Live Customer Tracker</span>
              </button>
            </div>
          </div>

          {/* Floor Scanning Guarantee Note */}
          <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-[11px] text-neutral-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="text-emerald-400 font-semibold">Factory Floor Scannability: </span>
              Exported with high error correction (Level H, 30% error recovery) ensuring barcodes remain 100% scannable even with corrugated dust, pallet shrink-wrap reflections, or minor scuffs.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
