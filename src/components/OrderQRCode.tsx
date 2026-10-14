import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Copy, Check, ExternalLink, QrCode, Sparkles } from 'lucide-react';
import { getPublicAppOrigin } from '../utils/url';
import { generateHighResQRCode, downloadImage } from '../utils/qrExport';

interface OrderQRCodeProps {
  orderId: string;
  size?: number;
  showActions?: boolean;
  lightMode?: boolean;
  label?: string;
  className?: string;
}

export const OrderQRCode: React.FC<OrderQRCodeProps> = ({
  orderId,
  size = 120,
  showActions = false,
  lightMode = false,
  label = 'Scan to Track Order',
  className = '',
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Compute public shareable tracking URL (uses ais-pre- instead of private ais-dev- to prevent 403 on phones)
  const origin = getPublicAppOrigin();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const trackingUrl = `${origin}${pathname}?track=${encodeURIComponent(orderId)}`;

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(trackingUrl, {
      width: size * 2, // 2x for retina sharpness
      margin: 1,
      color: {
        dark: lightMode ? '#171717' : '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) setDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate QR Code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [trackingUrl, size, lightMode]);

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadHighRes = async () => {
    try {
      setIsExporting(true);
      // Generate ultra high-resolution 1800x1800px Level-H QR code with header for production floor scanning
      const highResUrl = await generateHighResQRCode(trackingUrl, {
        resolution: 1800,
        errorCorrectionLevel: 'H',
        includeOrderHeader: true,
        orderId,
      });
      downloadImage(highResUrl, `Order-${orderId}-HighRes-QR.png`);
    } catch (err) {
      console.error('Failed to export high-res QR code:', err);
      // Fallback to standard dataUrl if anything fails
      if (dataUrl) {
        downloadImage(dataUrl, `QRCode-Order-${orderId}.png`);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* QR Code Image Container */}
      <div
        className={`p-2 rounded-lg bg-white border shadow-sm flex items-center justify-center ${
          lightMode ? 'border-neutral-300' : 'border-neutral-700'
        }`}
        style={{ width: size + 16, height: size + 16 }}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR Code for Order ${orderId}`}
            style={{ width: size, height: size }}
            className="block"
          />
        ) : (
          <div
            style={{ width: size, height: size }}
            className="flex items-center justify-center bg-neutral-100 text-neutral-400 text-xs"
          >
            Generating...
          </div>
        )}
      </div>

      {label && (
        <span
          className={`text-[10px] font-mono mt-1 text-center font-medium ${
            lightMode ? 'text-neutral-600' : 'text-neutral-400'
          }`}
        >
          {label}
        </span>
      )}

      {/* Optional action buttons */}
      {showActions && (
        <div className="flex items-center gap-1.5 mt-2 no-print">
          <button
            type="button"
            onClick={handleCopyLink}
            title="Copy Tracking Link"
            className={`p-1.5 rounded transition-colors text-xs flex items-center gap-1 ${
              lightMode
                ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="text-[10px]">Copy Link</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadHighRes}
            disabled={isExporting}
            title="Export High-Resolution PNG for Box & Pallet Sticking"
            className={`p-1.5 rounded transition-colors text-xs flex items-center gap-1 ${
              isExporting ? 'opacity-70 cursor-wait' : ''
            } ${
              lightMode
                ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
            }`}
          >
            {isExporting ? (
              <>
                <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px]">Saving...</span>
              </>
            ) : (
              <>
                <Download className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-semibold">Hi-Res PNG</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
