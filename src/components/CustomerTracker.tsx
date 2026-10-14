import React, { useState, useEffect } from 'react';
import { CorrugatedOrder, FactorySettings } from '../types/order';
import { STAGE_CONFIG, ORDER_STAGES, calculateSLA, formatDateTime } from '../utils/whatsapp';
import { sendDirectInAppWhatsApp } from '../utils/whatsappClient';
import { soundManager } from '../utils/audio';
import { OrderQRCode } from './OrderQRCode';
import { Search, CheckCircle2, Clock, Truck, Package, MessageSquare, Phone, MapPin, ShieldCheck, ArrowLeft, Camera, Download, ExternalLink, X } from 'lucide-react';

interface CustomerTrackerProps {
  orders: CorrugatedOrder[];
  settings: FactorySettings;
  initialOrderId?: string;
  isStandalonePublicView?: boolean;
  isPhotoSpotlightMode?: boolean;
  onExitPhotoSpotlight?: () => void;
  onBackToDashboard?: () => void;
}

export const CustomerTracker: React.FC<CustomerTrackerProps> = ({
  orders,
  settings,
  initialOrderId,
  isStandalonePublicView = false,
  isPhotoSpotlightMode = false,
  onExitPhotoSpotlight,
  onBackToDashboard,
}) => {
  const [searchId, setSearchId] = useState(initialOrderId || (orders[0]?.id ?? ''));
  const [lightboxPhotoUrl, setLightboxPhotoUrl] = useState<string | null>(null);
  const [inAppMessageBanner, setInAppMessageBanner] = useState<string | null>(null);

  const handleSendInAppTrackerMessage = async (
    order: CorrugatedOrder,
    recipientRole: string,
    recipientName: string,
    recipientPhone: string,
    message: string
  ) => {
    await sendDirectInAppWhatsApp({
      order,
      settings,
      recipientRole,
      recipientName,
      recipientPhone,
      message,
    });
    if (settings.enableSoundAlerts) {
      soundManager.playStageUpdateSound();
    }
    setInAppMessageBanner(
      `✓ Message sent directly inside this webpage to ${recipientName} (${recipientPhone}) — No external tab opened!`
    );
    setTimeout(() => setInAppMessageBanner(null), 5000);
  };

  useEffect(() => {
    if (initialOrderId) {
      setSearchId(initialOrderId);
    }
  }, [initialOrderId]);

  const currentOrder = orders.find(
    (o) => o.id.toLowerCase() === searchId.trim().toLowerCase()
  ) || orders[0];

  const currentStageIndex = currentOrder ? ORDER_STAGES.indexOf(currentOrder.currentStage) : 0;
  const sla = currentOrder ? calculateSLA(currentOrder) : null;

  // Find latest stage photo proof
  const latestStageWithPhoto = currentOrder?.stageHistory
    ? [...currentOrder.stageHistory].reverse().find((h) => !!h.photoUrl)
    : undefined;
  const latestPhotoUrl = latestStageWithPhoto?.photoUrl || '';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Fullscreen Photo Lightbox Modal */}
      {(lightboxPhotoUrl || (isPhotoSpotlightMode && latestPhotoUrl)) && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4">
          <div className="w-full max-w-4xl flex items-center justify-between bg-neutral-900 border border-neutral-800 px-4 py-3 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                ✓ QA Verified Photo Proof
              </span>
              <span className="text-sm font-bold text-white">
                Order #{currentOrder?.id} • {latestStageWithPhoto ? STAGE_CONFIG[latestStageWithPhoto.stage]?.title : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={lightboxPhotoUrl || latestPhotoUrl}
                download={`Order_${currentOrder?.id}_Photo.jpg`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Photo</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setLightboxPhotoUrl(null);
                  if (onExitPhotoSpotlight) onExitPhotoSpotlight();
                }}
                className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="my-auto max-w-4xl w-full flex items-center justify-center overflow-hidden py-4">
            <img
              src={lightboxPhotoUrl || latestPhotoUrl}
              alt="Stage Production Proof"
              className="max-h-[76vh] w-auto max-w-full object-contain rounded-2xl border border-neutral-800 shadow-2xl"
            />
          </div>

          <div className="w-full max-w-4xl flex items-center justify-between text-xs text-neutral-400 bg-neutral-900/90 border border-neutral-800 px-4 py-3 rounded-xl">
            <span>
              {latestStageWithPhoto?.notes || 'Live factory inspection photo verified by QA'}
            </span>
            <button
              type="button"
              onClick={() => {
                setLightboxPhotoUrl(null);
                if (onExitPhotoSpotlight) onExitPhotoSpotlight();
              }}
              className="text-amber-400 hover:text-amber-300 font-semibold"
            >
              View Full Order Tracker →
            </button>
          </div>
        </div>
      )}

      {/* Top search & lookup bar (Hidden in standalone customer WhatsApp link view so customer goes straight to their order!) */}
      {!isStandalonePublicView && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                Public Customer Tracker
              </div>
              <h2 className="text-xl font-bold text-white mt-0.5">
                Live Corrugated Order Tracking & Transparency Portal
              </h2>
            </div>

            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Production Dashboard</span>
              </button>
            )}
          </div>

          {/* Quick select or search */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Enter Order ID (e.g. CB-8942, CB-8944) or Phone"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Quick select pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              <span className="text-xs text-neutral-500 whitespace-nowrap">Recent:</span>
              {orders.slice(0, 4).map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSearchId(o.id)}
                  className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-colors whitespace-nowrap ${
                    searchId === o.id
                      ? 'bg-amber-400 text-neutral-950 font-bold'
                      : 'bg-neutral-800 text-neutral-300 hover:text-white'
                  }`}
                >
                  {o.id}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!currentOrder ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-400">
          No order found matching <span className="font-mono text-white">"{searchId}"</span>.
        </div>
      ) : (
        <div className="space-y-6">
          {inAppMessageBanner && (
            <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-xs text-emerald-300 font-semibold flex items-center justify-between animate-in fade-in">
              <span>{inAppMessageBanner}</span>
              <button type="button" onClick={() => setInAppMessageBanner(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {/* PROMINENT STAGE PHOTO PROOF HERO BANNER (Shows the uploaded photo right at the top!) */}
          {latestPhotoUrl && (
            <div className="bg-neutral-900 border-2 border-emerald-500/40 rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-5 py-3.5 bg-emerald-950/40 border-b border-emerald-800/40 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    Latest Production Stage Photo Proof
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {latestStageWithPhoto ? STAGE_CONFIG[latestStageWithPhoto.stage]?.title : STAGE_CONFIG[currentOrder.currentStage]?.title}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLightboxPhotoUrl(latestPhotoUrl)}
                    className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-neutral-700 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    <span>View Full Screen</span>
                  </button>
                  <a
                    href={latestPhotoUrl}
                    download={`Order_${currentOrder.id}_Photo.jpg`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Photo</span>
                  </a>
                </div>
              </div>

              <div
                onClick={() => setLightboxPhotoUrl(latestPhotoUrl)}
                className="relative bg-black/80 cursor-pointer group flex items-center justify-center max-h-[420px] overflow-hidden"
              >
                <img
                  src={latestPhotoUrl}
                  alt="Latest Production Verification Proof"
                  className="w-full max-h-[420px] object-contain group-hover:scale-[1.02] transition-transform duration-300"
                />
                <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-sm border border-neutral-700 px-3 py-1.5 rounded-xl text-xs text-white flex items-center gap-1.5">
                  <span>🔍 Click photo to enlarge</span>
                </div>
              </div>

              {latestStageWithPhoto?.notes && (
                <div className="px-5 py-2.5 bg-neutral-950 text-xs text-neutral-300 flex items-center justify-between border-t border-neutral-800">
                  <span>📝 <strong>Floor Note:</strong> {latestStageWithPhoto.notes}</span>
                  <span className="text-[11px] font-mono text-neutral-400">
                    Verified: {formatDateTime(latestStageWithPhoto.timestamp)}
                  </span>
                </div>
              )}
            </div>
          )}
          {/* Main Delivery & Status Hero Card (Amazon Style) */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
                  <span className="text-amber-400 font-bold text-sm">{currentOrder.id}</span>
                  <span>·</span>
                  <span>Booked {formatDateTime(currentOrder.orderDate)}</span>
                </div>
                <h1 className="text-2xl font-bold text-white mt-1">
                  {currentOrder.customerCompany}
                </h1>
                <div className="text-xs text-neutral-400 mt-1 flex items-center gap-2">
                  <span>Contact: {currentOrder.customerName}</span>
                  <span>·</span>
                  <span>{currentOrder.customerPhone}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Delivery ETA Pill */}
                <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-right sm:min-w-[200px]">
                  <div className="text-xs text-neutral-400 flex items-center justify-end gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Expected Delivery</span>
                  </div>
                  <div className="text-base font-bold font-mono text-white mt-1">
                    {formatDateTime(currentOrder.expectedDeliveryDate)}
                  </div>
                  {sla && (
                    <div className={`text-xs font-mono font-medium mt-0.5 ${sla.badgeColor}`}>
                      {sla.label}
                    </div>
                  )}
                </div>

                {/* Scannable Order QR Code */}
                <div className="hidden sm:block p-2 bg-neutral-950 border border-neutral-800 rounded-xl">
                  <OrderQRCode
                    orderId={currentOrder.id}
                    size={68}
                    showActions={false}
                    lightMode={false}
                    label="Order QR"
                  />
                </div>
              </div>
            </div>

            {/* Amazon-Style Visual Step Tracker */}
            <div className="py-8">
              <div className="relative">
                {/* Background Line */}
                <div className="absolute top-5 left-4 right-4 h-0.5 bg-neutral-800 hidden md:block" />
                {/* Active Progress Line */}
                <div
                  className="absolute top-5 left-4 h-0.5 bg-amber-400 transition-all duration-500 hidden md:block"
                  style={{
                    width: `${Math.min(100, (currentStageIndex / (ORDER_STAGES.length - 1)) * 100)}%`,
                  }}
                />

                {/* Steps */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 relative z-10">
                  {ORDER_STAGES.map((st, idx) => {
                    const conf = STAGE_CONFIG[st];
                    const isCompleted = idx < currentStageIndex;
                    const isCurrent = idx === currentStageIndex;
                    const isUpcoming = idx > currentStageIndex;

                    return (
                      <div key={st} className="flex md:flex-col items-center md:text-center gap-3 md:gap-2">
                        {/* Circle Indicator */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all shrink-0 ${
                            isCompleted
                              ? 'bg-amber-400 text-neutral-950 shadow-md shadow-amber-400/20'
                              : isCurrent
                              ? 'bg-amber-400 text-neutral-950 ring-4 ring-amber-400/20 animate-pulse'
                              : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : `0${idx + 1}`}
                        </div>

                        {/* Title & Description */}
                        <div>
                          <div
                            className={`text-xs font-bold leading-tight ${
                              isCurrent ? 'text-amber-400' : isCompleted ? 'text-white' : 'text-neutral-500'
                            }`}
                          >
                            {conf.title}
                          </div>
                          <div className="text-[10px] text-neutral-400 hidden md:block mt-1 leading-normal line-clamp-2">
                            {conf.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Out for Delivery Active Banner if in transit */}
            {currentOrder.currentStage === 'OUT_FOR_DELIVERY' && currentOrder.logistics && (
              <div className="mt-4 p-4 bg-amber-950/20 border border-amber-900/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                    <Truck className="w-4 h-4" />
                    <span>Freight Carrier In Transit</span>
                  </div>
                  <div className="text-sm font-semibold text-white">
                    Driver: {currentOrder.logistics.driverName} · Vehicle: {currentOrder.logistics.vehicleNumber}
                  </div>
                  <div className="text-xs text-neutral-400">
                    Dispatch Challan No: {currentOrder.logistics.dispatchChallanNo}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${currentOrder.logistics.driverPhone}`}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Driver</span>
                  </a>

                  <button
                    type="button"
                    onClick={() =>
                      handleSendInAppTrackerMessage(
                        currentOrder,
                        'Dispatch Driver',
                        currentOrder.logistics?.driverName || 'Driver',
                        currentOrder.logistics?.driverPhone || '',
                        `Hello ${currentOrder.logistics?.driverName}, I am following up on Order #${currentOrder.id} for ${currentOrder.customerCompany}.`
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Driver WhatsApp (In-App)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Delivery destination */}
            <div className="mt-4 pt-4 border-t border-neutral-800 flex items-start gap-2 text-xs text-neutral-400">
              <MapPin className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-white font-medium">Destination: </span>
                {currentOrder.deliveryAddress}
              </div>
            </div>
          </div>

          {/* Technical Box Specs & Production Proof Gallery */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  <Package className="w-4 h-4 text-amber-400" />
                  <span>Box Technical Specifications</span>
                </div>
                {currentOrder.lamination && currentOrder.lamination !== 'None' && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20 font-medium">
                    ✨ {currentOrder.lamination}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800">
                  <div className="text-neutral-500">Box Style</div>
                  <div className="font-semibold text-white mt-0.5">{currentOrder.boxStyle}</div>
                </div>

                <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800">
                  <div className="text-neutral-500">Dimensions (L x W x H)</div>
                  <div className="font-semibold text-white font-mono mt-0.5">
                    {currentOrder.dimensions.lengthMm} x {currentOrder.dimensions.widthMm} x {currentOrder.dimensions.heightMm} mm
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono">
                    ({(currentOrder.dimensions.lengthMm / 25.4).toFixed(1)}" x {(currentOrder.dimensions.widthMm / 25.4).toFixed(1)}" x {(currentOrder.dimensions.heightMm / 25.4).toFixed(1)}")
                  </div>
                </div>

                <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800">
                  <div className="text-neutral-500">Board Structure</div>
                  <div className="font-semibold text-white mt-0.5">
                    {currentOrder.ply} · {currentOrder.flute}
                  </div>
                  <div className="text-[10px] text-amber-400">
                    Joint: {currentOrder.jointType}
                  </div>
                </div>

                <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800">
                  <div className="text-neutral-500">Paper Recipe (Top/Flute/Bot)</div>
                  <div className="font-semibold text-white font-mono mt-0.5">
                    {currentOrder.paperSpecs.topLinerGsm} / {currentOrder.paperSpecs.flutingMediumGsm} / {currentOrder.paperSpecs.bottomLinerGsm} GSM
                  </div>
                  <div className="text-[10px] text-emerald-400">
                    Burst Factor: {currentOrder.paperSpecs.burstingFactor} BF
                  </div>
                </div>

                <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 col-span-2">
                  <div className="flex justify-between items-center text-neutral-500">
                    <span>Printing, Finishing & Branding</span>
                    <span className="text-neutral-400 font-medium">{currentOrder.colorType || 'Standard'}</span>
                  </div>
                  <div className="font-semibold text-white mt-0.5">{currentOrder.printingDetails}</div>
                  {currentOrder.logoDetails?.hasLogo && (
                    <div className="text-[11px] text-pink-400 mt-1 flex items-center gap-1.5">
                      <span>🏷️ Brand Artwork: {currentOrder.logoDetails.brandName || currentOrder.customerCompany}</span>
                      <span>({currentOrder.logoDetails.artworkStatus || 'Approved'})</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dedicated Sales Executive Card */}
              {currentOrder.salesPersonName && (
                <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold text-xs">
                      {currentOrder.salesPersonName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">
                        Your Dedicated Account Manager: {currentOrder.salesPersonName}
                      </div>
                      <div className="text-[11px] text-purple-300 font-mono">
                        {currentOrder.salesPersonPhone || settings.contactNumber}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleSendInAppTrackerMessage(
                        currentOrder,
                        'Sales Executive',
                        currentOrder.salesPersonName || 'Account Manager',
                        currentOrder.salesPersonPhone || settings.contactNumber,
                        `Hello ${currentOrder.salesPersonName}, I am inquiring regarding my Corrugated Order #${currentOrder.id}.`
                      )
                    }
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>WhatsApp Rep (In-App)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Stage Event History & Machine Proof Photos */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Production Milestones & Photo Proof</span>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  Verified Inspection
                </span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {currentOrder.stageHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between text-neutral-400">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{STAGE_CONFIG[item.stage].title}</span>
                      </span>
                      <span className="font-mono text-[11px]">
                        {formatDateTime(item.timestamp)}
                      </span>
                    </div>

                    {item.notes && (
                      <p className="text-neutral-300 text-[11px] leading-relaxed pl-5">
                        {item.notes}
                      </p>
                    )}

                    {/* Stage Proof Photo */}
                    {item.photoUrl && (
                      <div className="pl-5 pt-1">
                        <div
                          onClick={() => setLightboxPhotoUrl(item.photoUrl || null)}
                          className="relative rounded-lg overflow-hidden border border-neutral-800 aspect-video max-h-40 bg-neutral-900 cursor-pointer group"
                        >
                          <img
                            src={item.photoUrl}
                            alt="Production verification snapshot"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute bottom-0 inset-x-0 bg-black/70 px-2 py-1 text-[10px] text-neutral-300 flex items-center justify-between">
                            <span>📷 Click to View Full Stage Photo</span>
                            <span className="text-emerald-400 font-mono">QA Verified</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-neutral-500 font-mono pl-5">
                      Logged by: {item.updatedBy}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Help WhatsApp with Factory */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="text-neutral-300">
              Have questions regarding this consignment? Contact our manufacturing dispatch desk directly inside this page.
            </div>

            <button
              type="button"
              onClick={() =>
                handleSendInAppTrackerMessage(
                  currentOrder,
                  'Factory Dispatch Desk',
                  settings.companyName,
                  settings.contactNumber,
                  `Hello ${settings.companyName}, I am inquiring about Order #${currentOrder.id} for ${currentOrder.customerCompany}.`
                )
              }
              className="flex items-center gap-2 px-4 py-2 font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Inquire via WhatsApp Desk (In-App)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
