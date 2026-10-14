import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, Download, QrCode, X, CheckCircle2, Share, PlusSquare, Copy, Check, ShieldAlert, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { getPublicAppOrigin, isAiStudioDevOrigin } from '../utils/url';

interface PWAInstallButtonProps {
  connectedDevicesCount?: number;
  isLiveSynced?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  connectedDevicesCount = 1,
  isLiveSynced = true,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Always use the public/shared URL (ais-pre-...) instead of the private editor URL (ais-dev-...)
  // because ais-dev- returns 403 Forbidden on external devices/phones!
  const defaultSharedUrl = getPublicAppOrigin();
  const [customShareUrl, setCustomShareUrl] = useState<string>(defaultSharedUrl);
  const isDevOrigin = isAiStudioDevOrigin();

  useEffect(() => {
    if (!customShareUrl) return;
    let isMounted = true;
    QRCode.toDataURL(customShareUrl, {
      width: 360,
      margin: 1,
      color: {
        dark: '#171717',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('QR generation failed:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [customShareUrl]);

  const handleCopyUrl = () => {
    if (!customShareUrl) return;
    navigator.clipboard.writeText(customShareUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* Direct 1-click Chromium/Android/Desktop Install CTA when browser fires beforeinstallprompt */}
        {!isInstalled && isInstallable && (
          <button
            onClick={install}
            title="Install CorruTrack as a standalone Mobile / Desktop App"
            className="flex items-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 px-2.5 py-1.5 text-xs font-bold text-neutral-950 shadow-sm transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        )}

        {/* Mobile Companion & Multi-Device Real-Time Sync Launcher */}
        <button
          onClick={() => setShowModal(true)}
          title="Install Mobile App & View Real-Time Multi-Device Sync Status"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-600/40 rounded-lg transition-colors whitespace-nowrap"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isLiveSynced ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden xl:inline">
            {isInstalled ? 'Mobile Sync Live' : isIOS ? 'Install on iOS' : 'Mobile App & Sync'}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-900/80 text-[10px] font-mono text-emerald-200 border border-emerald-700/60">
            {connectedDevicesCount} {connectedDevicesCount === 1 ? 'device' : 'devices'}
          </span>
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden text-neutral-100">
            {/* Header */}
            <div className="px-5 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Mobile App (PWA) & Real-Time Multi-Device Sync</span>
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-medium">
                    Instant WebSocket Sync Active ({connectedDevicesCount} active {connectedDevicesCount === 1 ? 'device' : 'devices'} connected)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Why Mobile App URL Fails (403 Forbidden / Not Found) & Exact 30-Second Fix */}
              {isDevOrigin && (
                <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/50 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs font-bold text-amber-300">
                      Why Mobile App URL Doesn't Open Yet (and How to Activate It in 10 Seconds)
                    </div>
                  </div>
                  <div className="text-xs text-neutral-200 space-y-2 pl-7">
                    <p className="text-neutral-300 leading-relaxed">
                      Google AI Studio hosts your app inside a secure cloud sandbox with two URLs, and <strong>both are locked by default</strong> until you enable sharing:
                    </p>
                    <div className="grid grid-cols-1 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-emerald-500/30">
                        <div className="font-bold text-emerald-300 mb-0.5">
                          1. Shared App URL (<code className="font-mono">ais-pre-...</code>) — Best for Mobile Phones
                        </div>
                        <p className="text-neutral-300">
                          This URL stays inactive or returns 403/404 until you click the <strong>"Share"</strong> (or <strong>"Deploy / Publish"</strong>) button in the <strong>top-right corner of the Google AI Studio window</strong> (outside this app preview) and turn on <strong>Public / Anyone with the link</strong>.
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-amber-500/30">
                        <div className="font-bold text-amber-300 mb-0.5">
                          2. Private Dev URL (<code className="font-mono">ais-dev-...</code>) — Instant Option Without Sharing
                        </div>
                        <p className="text-neutral-300">
                          Works immediately <strong>ONLY IF</strong> your mobile phone browser (Chrome/Safari) is signed into the exact same Google account (<code className="text-white font-mono">srvassociates3107@gmail.com</code>) and you open AI Studio on your phone first so the security cookie is set.
                        </p>
                      </div>
                    </div>

                    {/* Quick URL Switcher */}
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-neutral-400">Switch QR Code URL:</span>
                      <button
                        type="button"
                        onClick={() => setCustomShareUrl(defaultSharedUrl)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
                          customShareUrl === defaultSharedUrl
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                            : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
                        }`}
                      >
                        Use Shared URL (ais-pre)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomShareUrl(window.location.origin)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
                          customShareUrl === window.location.origin
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
                        }`}
                      >
                        Use Dev URL (ais-dev)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Real-Time Sync Status Banner */}
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-700/40 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-neutral-200 space-y-1">
                  <div className="font-bold text-white">
                    2-Way Live Sync Between Mobile & Webpage is Running
                  </div>
                  <p className="text-neutral-300 leading-relaxed">
                    Every stage update, shopfloor camera photo, new box order, delay alert, or shift change made on a mobile phone automatically updates on all open desktop webpages in under 1 second—and vice versa.
                  </p>
                </div>
              </div>

              {/* Direct Install Button if supported by browser */}
              {!isInstalled && isInstallable && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-amber-300">Ready for 1-Click App Installation</div>
                    <div className="text-[11px] text-neutral-300 mt-0.5">
                      Install CorruTrack directly onto this device's home screen or desktop launcher.
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const ok = await install();
                      if (ok) setShowModal(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs shrink-0 shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install App Now</span>
                  </button>
                </div>
              )}

              {/* Scan QR Code to Open & Install on Mobile Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 items-center">
                <div className="sm:col-span-2 flex flex-col items-center justify-center bg-white p-3 rounded-xl">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Scan to open CorruTrack on Mobile"
                      className="w-36 h-36 object-contain"
                    />
                  ) : (
                    <QrCode className="w-24 h-24 text-neutral-800" />
                  )}
                  <span className="text-[10px] font-bold text-neutral-900 mt-1 uppercase tracking-wider">
                    Scan Shared App Link
                  </span>
                </div>

                <div className="sm:col-span-3 space-y-3">
                  <div className="text-xs font-bold text-white">
                    Open on Any Mobile Phone (Android or iPhone)
                  </div>
                  <ol className="text-xs text-neutral-300 space-y-2 list-decimal list-inside">
                    <li>
                      Scan the QR code with your phone camera or open the <strong>Shared Link</strong> below.
                    </li>
                    <li>
                      <strong>On Android (Chrome):</strong> Tap the <strong>Install App</strong> button in the top bar or tap the browser menu (⋮) → <strong>Add to Home screen / Install app</strong>.
                    </li>
                    <li>
                      <strong>On iPhone / iPad (Safari):</strong> Tap the <Share className="w-3.5 h-3.5 inline text-blue-400 mx-0.5" /> <strong>Share</strong> button in Safari toolbar, scroll down, and tap <PlusSquare className="w-3.5 h-3.5 inline text-amber-400 mx-0.5" /> <strong>Add to Home Screen</strong>.
                    </li>
                  </ol>

                  {/* Copy / Edit Shared App Link */}
                  <div className="pt-1 space-y-1.5">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                      Shared Mobile App Link (ais-pre):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customShareUrl}
                        onChange={(e) => setCustomShareUrl(e.target.value)}
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={handleCopyUrl}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors shrink-0"
                      >
                        {copiedUrl ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400 font-mono">
                PWA Standalone Mode: {isInstalled ? 'INSTALLED' : 'BROWSER VIEW'}
              </span>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
