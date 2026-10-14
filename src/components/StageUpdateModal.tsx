import React, { useState } from 'react';
import { CorrugatedOrder, OrderStage, FactorySettings, StageDelayLog } from '../types/order';
import { 
  STAGE_CONFIG, 
  ORDER_STAGES, 
  buildWhatsappLink, 
  buildWhatsappWebLink,
  formatDateTime 
} from '../utils/whatsapp';
import { 
  renderCustomWhatsAppMessage, 
  getActiveTemplateText 
} from '../utils/whatsappTemplates';
import { STAGE_PRESET_PHOTOS } from '../utils/storage';
import { soundManager } from '../utils/audio';
import {
  uploadStagePhotoToServer,
  copyImageToClipboard,
  syncOrderSnapshotToServer
} from '../utils/photoUpload';
import { sendDirectInAppWhatsApp } from '../utils/whatsappClient';
import { 
  X, 
  Check, 
  Send, 
  MessageSquare, 
  Truck, 
  Clock, 
  AlertTriangle, 
  User, 
  Layers, 
  Building, 
  ExternalLink,
  Camera,
  Image as ImageIcon,
  Briefcase,
  Factory,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  Flame,
  HelpCircle,
  Copy
} from 'lucide-react';

interface StageUpdateModalProps {
  order: CorrugatedOrder;
  settings: FactorySettings;
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'advance' | 'delay';
  onSaveStageUpdate: (
    orderId: string,
    newStage: OrderStage,
    operatorNotes: string,
    operatorName: string,
    updatedDeliveryDate?: string,
    logisticsData?: CorrugatedOrder['logistics'],
    sentChannels?: {
      customer: boolean;
      sales?: boolean;
      owner: boolean;
      team: boolean;
      webhook: boolean;
    },
    updatedCustomerPhone?: string,
    photoUrl?: string
  ) => void;
  onSaveStageDelay: (
    orderId: string,
    delayReason: string,
    delayHours: number,
    revisedDeliveryDate: string,
    operatorName: string,
    operatorNotes: string,
    notifySales: boolean,
    notifyCustomer: boolean,
    notifyOwner: boolean,
    notifySupervisor: boolean,
    customMessageSnippet?: string
  ) => void;
}

export const STAGE_DELAY_REASONS = [
  'Kraft paper roll reel stock delay from paper mill',
  'Flexo printing plate (stereo) remaking & alignment defect',
  'Color ink Pantone shade approval pending from client',
  'Corrugator heating boiler pressure drop / steam line maintenance',
  'Rotary die-cutter anvil blade sharpening & rule re-setting',
  'Lamination adhesive glue curing & drying wait time',
  'Flute caliper / bursting strength (BF) laboratory test rework',
  'Power grid fluctuation & factory backup generator switch',
  'Client requested batch quantity or carton artwork revision',
  'Logistics freight truck breakdown / transport dock congestion',
  'Shift operator handover / emergency machine recalibration',
];

export const StageUpdateModal: React.FC<StageUpdateModalProps> = ({
  order,
  settings,
  isOpen,
  onClose,
  initialMode = 'advance',
  onSaveStageUpdate,
  onSaveStageDelay,
}) => {
  if (!isOpen) return null;

  const [activeMode, setActiveMode] = useState<'advance' | 'delay'>(
    order.isStageDelayed && initialMode !== 'advance' ? 'delay' : initialMode
  );

  // Advance Mode State
  const currentIndex = ORDER_STAGES.indexOf(order.currentStage);
  const nextDefaultStage = currentIndex < ORDER_STAGES.length - 1 ? ORDER_STAGES[currentIndex + 1] : order.currentStage;
  const [selectedStage, setSelectedStage] = useState<OrderStage>(nextDefaultStage);
  const [operatorName, setOperatorName] = useState(order.operatorInCharge || 'Mahesh Patil (Plant Console)');
  const [operatorNotes, setOperatorNotes] = useState('');
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone);
  const [expectedDelivery, setExpectedDelivery] = useState(
    order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toISOString().slice(0, 16) : ''
  );

  // Stage Photo Picker State
  const defaultPhotoForStage = STAGE_PRESET_PHOTOS[selectedStage]?.[0]?.url || '';
  const [stagePhotoUrl, setStagePhotoUrl] = useState<string>(defaultPhotoForStage);
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);

  // Logistics state for Out for Delivery
  const [driverName, setDriverName] = useState(order.logistics?.driverName || 'Balwinder Singh');
  const [driverPhone, setDriverPhone] = useState(order.logistics?.driverPhone || '+91 98199 77889');
  const [vehicleNumber, setVehicleNumber] = useState(order.logistics?.vehicleNumber || 'MH-04-GP-8834');
  const [dispatchChallanNo, setDispatchChallanNo] = useState(
    order.logistics?.dispatchChallanNo || `DC-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [receiverName, setReceiverName] = useState(order.logistics?.receiverName || '');

  // Advance Notification checkboxes
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [notifySalesPerson, setNotifySalesPerson] = useState(true);
  const [notifyOwner, setNotifyOwner] = useState(true);
  const [notifyTeam, setNotifyTeam] = useState(true);
  const [triggerWebhook, setTriggerWebhook] = useState(!!settings.webhookUrl);
  const [activePreviewTab, setActivePreviewTab] = useState<'customer' | 'sales' | 'owner' | 'team'>('customer');

  // =========================================================================
  // DELAY MODE STATE
  // =========================================================================
  const [delayReason, setDelayReason] = useState<string>(
    order.currentDelayReason || STAGE_DELAY_REASONS[0]
  );
  const [customDelayReason, setCustomDelayReason] = useState('');
  const [delayHours, setDelayHours] = useState<number>(order.currentDelayHours || 4);
  const [delayNotes, setDelayNotes] = useState('');
  const [notifySalesOnDelay, setNotifySalesOnDelay] = useState(true);
  const [notifyCustomerOnDelay, setNotifyCustomerOnDelay] = useState(true);
  const [notifyOwnerOnDelay, setNotifyOwnerOnDelay] = useState(true);
  const [notifySupervisorOnDelay, setNotifySupervisorOnDelay] = useState(true);
  const [delayPreviewRole, setDelayPreviewRole] = useState<'sales' | 'customer' | 'owner'>('sales');
  const [copiedDelayMsg, setCopiedDelayMsg] = useState(false);

  // Calculate new delivery date with delayHours added
  const calculateNewDeliveryDate = (baseIso: string, hoursToAdd: number): string => {
    try {
      const baseMs = new Date(baseIso).getTime();
      const updatedMs = baseMs + hoursToAdd * 60 * 60 * 1000;
      return new Date(updatedMs).toISOString();
    } catch {
      return baseIso;
    }
  };

  const calculatedRevisedDeliveryDate = calculateNewDeliveryDate(
    order.expectedDeliveryDate,
    delayHours
  );

  const finalDelayReasonText = delayReason === 'Custom Floor Note' && customDelayReason.trim()
    ? customDelayReason.trim()
    : delayReason;

  // Advance message generators using custom template system
  const customerMsg = renderCustomWhatsAppMessage(
    selectedStage === 'ORDER_PLACED' 
      ? 'CUSTOMER_ORDER_PLACED'
      : selectedStage === 'OUT_FOR_DELIVERY'
      ? 'CUSTOMER_OUT_FOR_DELIVERY'
      : selectedStage === 'DELIVERED'
      ? 'CUSTOMER_DELIVERED'
      : 'CUSTOMER_STAGE_UPDATE',
    {
      ...order,
      customerPhone,
      currentStage: selectedStage,
      expectedDeliveryDate: expectedDelivery ? new Date(expectedDelivery).toISOString() : order.expectedDeliveryDate,
      logistics: {
        ...order.logistics,
        driverName,
        driverPhone,
        vehicleNumber,
        dispatchChallanNo,
      },
    },
    settings,
    {
      photoUrl: stagePhotoUrl,
      stageOverride: selectedStage,
    }
  );

  const salesMsg = renderCustomWhatsAppMessage(
    'SALES_STAGE_COMPLETED',
    {
      ...order,
      currentStage: selectedStage,
      expectedDeliveryDate: expectedDelivery ? new Date(expectedDelivery).toISOString() : order.expectedDeliveryDate,
    },
    settings,
    { stageOverride: selectedStage }
  );

  const ownerMsg = renderCustomWhatsAppMessage(
    'OWNER_SUMMARY',
    {
      ...order,
      currentStage: selectedStage,
    },
    settings,
    { stageOverride: selectedStage }
  );

  const teamMsg = renderCustomWhatsAppMessage(
    'PRODUCTION_JOB_CARD',
    {
      ...order,
      currentStage: selectedStage,
    },
    settings,
    { stageOverride: selectedStage }
  );

  // Delay message previews
  const delaySalesMsg = renderCustomWhatsAppMessage(
    'SALES_STAGE_DELAY',
    {
      ...order,
      expectedDeliveryDate: calculatedRevisedDeliveryDate,
      currentDelayReason: finalDelayReasonText,
      currentDelayHours: delayHours,
    },
    settings,
    {
      delayReason: finalDelayReasonText,
      delayHours,
      previousDelivery: order.expectedDeliveryDate,
    }
  );

  const delayCustomerMsg = renderCustomWhatsAppMessage(
    'CUSTOMER_STAGE_DELAY',
    {
      ...order,
      expectedDeliveryDate: calculatedRevisedDeliveryDate,
      currentDelayReason: finalDelayReasonText,
      currentDelayHours: delayHours,
    },
    settings,
    {
      delayReason: finalDelayReasonText,
      delayHours,
    }
  );

  const delayOwnerMsg = renderCustomWhatsAppMessage(
    'OWNER_STAGE_DELAY',
    {
      ...order,
      expectedDeliveryDate: calculatedRevisedDeliveryDate,
      currentDelayReason: finalDelayReasonText,
      currentDelayHours: delayHours,
    },
    settings,
    {
      delayReason: finalDelayReasonText,
      delayHours,
    }
  );

  const handleStageChange = (newSt: OrderStage) => {
    setSelectedStage(newSt);
    setStagePhotoUrl(STAGE_PRESET_PHOTOS[newSt]?.[0]?.url || '');
  };

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingPhoto(true);
      try {
        const uploaded = await uploadStagePhotoToServer(
          file,
          { ...order, currentStage: selectedStage },
          settings,
          STAGE_CONFIG[selectedStage]?.title
        );
        setStagePhotoUrl(uploaded.rawPhotoUrl);
        copyImageToClipboard(uploaded.rawPhotoUrl);
      } finally {
        setIsUploadingPhoto(false);
        setIsPhotoPickerOpen(false);
      }
    }
  };

  const handleApplyAdvance = () => {
    if (selectedStage === 'DELIVERED') {
      soundManager.playDeliveredSound();
    } else {
      soundManager.playStageUpdateSound();
    }

    const logistics = (selectedStage === 'OUT_FOR_DELIVERY' || selectedStage === 'DELIVERED') ? {
      driverName,
      driverPhone,
      vehicleNumber,
      dispatchChallanNo,
      dispatchedAt: order.logistics?.dispatchedAt || new Date().toISOString(),
      deliveredAt: selectedStage === 'DELIVERED' ? new Date().toISOString() : undefined,
      receiverName: receiverName || undefined,
    } : order.logistics;

    syncOrderSnapshotToServer(
      {
        ...order,
        currentStage: selectedStage,
        logistics,
      },
      settings,
      stagePhotoUrl || undefined
    );

    if (stagePhotoUrl) {
      copyImageToClipboard(stagePhotoUrl);
    }

    onSaveStageUpdate(
      order.id,
      selectedStage,
      operatorNotes || `Advanced to ${STAGE_CONFIG[selectedStage].title} by ${operatorName}`,
      operatorName,
      expectedDelivery ? new Date(expectedDelivery).toISOString() : undefined,
      logistics,
      {
        customer: notifyCustomer,
        sales: notifySalesPerson,
        owner: notifyOwner,
        team: notifyTeam,
        webhook: triggerWebhook,
      },
      customerPhone,
      stagePhotoUrl || undefined
    );

    if (notifyCustomer) {
      sendDirectInAppWhatsApp({
        order: { ...order, currentStage: selectedStage, logistics },
        settings,
        recipientRole: 'Customer',
        recipientName: `${order.customerName} (${order.customerCompany})`,
        recipientPhone: customerPhone,
        message: customerMsg,
        photoUrl: stagePhotoUrl || undefined,
      });
    }

    if (notifySalesPerson) {
      sendDirectInAppWhatsApp({
        order: { ...order, currentStage: selectedStage, logistics },
        settings,
        recipientRole: 'Sales Executive',
        recipientName: order.salesPersonName || 'Sales Executive',
        recipientPhone: order.salesPersonPhone || settings.salesTeam?.[0]?.phone || settings.contactNumber,
        message: salesMsg,
        photoUrl: stagePhotoUrl || undefined,
      });
    }

    if (notifyOwner) {
      const targetOwner = settings.owners?.find((o) => o.isPrimary) || settings.owners?.[0];
      sendDirectInAppWhatsApp({
        order: { ...order, currentStage: selectedStage, logistics },
        settings,
        recipientRole: 'Plant Owner',
        recipientName: targetOwner ? `${targetOwner.name} (${targetOwner.designation})` : settings.ownerName,
        recipientPhone: targetOwner?.phone || settings.ownerPhone || settings.contactNumber,
        message: ownerMsg,
        photoUrl: stagePhotoUrl || undefined,
      });
    }

    if (notifyTeam) {
      const targetHead = settings.productionHeads?.find((p) => p.isPrimary) || settings.productionHeads?.[0];
      sendDirectInAppWhatsApp({
        order: { ...order, currentStage: selectedStage, logistics },
        settings,
        recipientRole: 'Production Head',
        recipientName: targetHead ? `${targetHead.name} (${targetHead.designation})` : settings.productionSupervisorName,
        recipientPhone: targetHead?.phone || settings.productionSupervisorPhone || settings.contactNumber,
        message: teamMsg,
        photoUrl: stagePhotoUrl || undefined,
      });
    }

    onClose();
  };

  const handleApplyDelay = () => {
    soundManager.playDelayWarningSound();

    onSaveStageDelay(
      order.id,
      finalDelayReasonText,
      delayHours,
      calculatedRevisedDeliveryDate,
      operatorName,
      delayNotes,
      notifySalesOnDelay,
      notifyCustomerOnDelay,
      notifyOwnerOnDelay,
      notifySupervisorOnDelay,
      delaySalesMsg
    );

    if (notifySalesOnDelay) {
      const repPhone = order.salesPersonPhone || settings.salesTeam?.[0]?.phone || settings.contactNumber;
      sendDirectInAppWhatsApp({
        order,
        settings,
        recipientRole: 'Sales Executive (Delay Alert)',
        recipientName: order.salesPersonName || 'Sales Executive',
        recipientPhone: repPhone,
        message: delaySalesMsg,
      });
    }

    if (notifyCustomerOnDelay) {
      sendDirectInAppWhatsApp({
        order,
        settings,
        recipientRole: 'Customer (Delay Alert)',
        recipientName: order.customerName,
        recipientPhone: order.customerPhone,
        message: delayCustomerMsg,
      });
    }

    if (notifyOwnerOnDelay) {
      const targetOwner = settings.owners?.find((o) => o.isPrimary) || settings.owners?.[0];
      sendDirectInAppWhatsApp({
        order,
        settings,
        recipientRole: 'Plant Owner (Delay Alert)',
        recipientName: targetOwner?.name || settings.ownerName,
        recipientPhone: targetOwner?.phone || settings.ownerPhone || settings.contactNumber,
        message: delayOwnerMsg,
      });
    }

    if (notifySupervisorOnDelay) {
      const targetHead = settings.productionHeads?.find((p) => p.isPrimary) || settings.productionHeads?.[0];
      sendDirectInAppWhatsApp({
        order,
        settings,
        recipientRole: 'Production Head (Delay Alert)',
        recipientName: targetHead?.name || settings.productionSupervisorName,
        recipientPhone: targetHead?.phone || settings.productionSupervisorPhone || settings.contactNumber,
        message: delaySalesMsg,
      });
    }

    onClose();
  };

  const presetPhotosForStage = STAGE_PRESET_PHOTOS[selectedStage] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span className="font-mono text-amber-400 font-bold">{order.id}</span>
                <span>·</span>
                <span className="text-white font-medium">{order.customerCompany}</span>
                <span>·</span>
                <span>{order.quantity.toLocaleString()} boxes ({order.ply})</span>
                <span>·</span>
                <span className="text-purple-400">Sales Rep: {order.salesPersonName || 'Direct'}</span>
                {order.isStageDelayed && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/60 font-mono text-[10px]">
                    Currently Delayed (+{order.currentDelayHours || 4}h)
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">
                Plant Floor Stage Control & WhatsApp Dispatch
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-neutral-800/80">
            <button
              type="button"
              onClick={() => setActiveMode('advance')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeMode === 'advance'
                  ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Advance to Next Stage</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('delay')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeMode === 'delay'
                  ? 'bg-rose-500 text-white shadow-md font-bold'
                  : 'bg-neutral-900 text-rose-400 hover:text-rose-300 hover:bg-neutral-800 border border-rose-900/40'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-rose-300" />
              <span>Report Stage Delay / Bottleneck</span>
              {order.isStageDelayed && (
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {activeMode === 'advance' ? (
          /* ===============================================================
             MODE 1: ADVANCE STAGE
             =============================================================== */
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Stage Progression Selector */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                Select New Production Stage
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ORDER_STAGES.map((st, idx) => {
                  const conf = STAGE_CONFIG[st];
                  const isSelected = selectedStage === st;
                  const isCurrent = order.currentStage === st;

                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStageChange(st)}
                      className={`p-3 rounded-xl border text-left transition-all relative ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400/10 text-white shadow-md'
                          : isCurrent
                          ? 'border-neutral-700 bg-neutral-800/60 text-neutral-200'
                          : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700 text-neutral-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-medium text-neutral-400">
                          Step {idx + 1}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] bg-neutral-800 text-amber-400 px-1.5 py-0.5 rounded font-mono">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-xs text-white leading-tight">
                        {conf.title}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Photo Proof Upload */}
            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-xs font-semibold text-white flex items-center gap-2">
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>Stage Proof Photo Attachment</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Upload your real stage photo — generates a direct image link (never opens your dashboard) & copies to clipboard
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors">
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsPhotoPickerOpen(!isPhotoPickerOpen)}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-lg flex items-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>Presets</span>
                  </button>
                </div>
              </div>

              {stagePhotoUrl && (
                <div className="flex items-center gap-3 p-2 bg-neutral-900 rounded-lg border border-neutral-800">
                  <img
                    src={stagePhotoUrl}
                    alt="Proof"
                    className="w-16 h-12 object-cover rounded-md border border-neutral-700"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-neutral-200 font-medium truncate">
                      {stagePhotoUrl}
                    </div>
                    <div className="text-[10px] text-emerald-400">
                      ✓ Direct Image Link Ready (Opens ONLY the photo, not your dashboard) • Auto-copied for Ctrl+V in WhatsApp
                    </div>
                  </div>
                  <a
                    href={stagePhotoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs text-amber-300 rounded border border-neutral-700 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View Photo</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setStagePhotoUrl('')}
                    className="text-xs text-neutral-500 hover:text-rose-400 px-1"
                  >
                    Remove
                  </button>
                </div>
              )}

              {isPhotoPickerOpen && (
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2">
                  <div className="text-xs font-semibold text-neutral-300">Preset Photos for {STAGE_CONFIG[selectedStage].title}:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {presetPhotosForStage.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setStagePhotoUrl(p.url);
                          setIsPhotoPickerOpen(false);
                        }}
                        className="flex items-center gap-2 p-2 bg-neutral-950 hover:bg-neutral-800 rounded-lg border border-neutral-800 text-left transition-colors"
                      >
                        <img src={p.url} alt={p.label} className="w-12 h-10 object-cover rounded" />
                        <span className="text-[11px] text-neutral-300 leading-tight">{p.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                    <label className="text-xs text-neutral-400 cursor-pointer hover:text-white flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>Upload from Device / Camera</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Operator Notes & SLA Target */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Operator Notes / Caliper Check</label>
                <input
                  type="text"
                  placeholder="e.g. Flute pasting checked at 22 BF, ready for rotary slotter"
                  value={operatorNotes}
                  onChange={(e) => setOperatorNotes(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Operator / Shift In-Charge</label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Logistics Info (if Out for delivery) */}
            {selectedStage === 'OUT_FOR_DELIVERY' && (
              <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  <span>Dispatch Vehicle & Driver Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-neutral-400 text-[11px] mb-1">Vehicle Number</label>
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 text-[11px] mb-1">Driver Name</label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 text-[11px] mb-1">Driver WhatsApp Phone</label>
                    <input
                      type="text"
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notification Checkboxes */}
            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
              <div className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                Automated Multi-Party Notifications
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifySalesPerson}
                    onChange={(e) => setNotifySalesPerson(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-0"
                  />
                  <span>
                    WhatsApp Milestone Alert to Sales Executive ({order.salesPersonName || 'Rajesh Sharma'})
                  </span>
                </label>

                <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyCustomer}
                    onChange={(e) => setNotifyCustomer(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-0"
                  />
                  <span>WhatsApp Progress Update to Customer ({order.customerName})</span>
                </label>

                <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyOwner}
                    onChange={(e) => setNotifyOwner(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-0"
                  />
                  <span>
                    WhatsApp Summary to Plant Owners ({settings.owners?.length || 1} Registered: {settings.owners?.map(o => o.name).join(', ') || settings.ownerName})
                  </span>
                </label>

                <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyTeam}
                    onChange={(e) => setNotifyTeam(e.target.checked)}
                    className="rounded text-blue-500 focus:ring-0"
                  />
                  <span>
                    WhatsApp Job Card to Production Heads ({settings.productionHeads?.length || 1} Active: {settings.productionHeads?.map(p => p.name).join(', ') || settings.productionSupervisorName})
                  </span>
                </label>
              </div>
            </div>

            {/* WhatsApp Preview Tabs */}
            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Live Dispatch Message Preview
                </span>
                <div className="flex gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800 text-[11px]">
                  {(['customer', 'sales', 'owner', 'team'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setActivePreviewTab(r)}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        activePreviewTab === r
                          ? r === 'sales'
                            ? 'bg-purple-600 text-white font-bold'
                            : 'bg-amber-400 text-neutral-950 font-bold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {r === 'sales' ? 'Sales Rep' : r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
                {activePreviewTab === 'customer' && customerMsg}
                {activePreviewTab === 'sales' && salesMsg}
                {activePreviewTab === 'owner' && ownerMsg}
                {activePreviewTab === 'team' && teamMsg}
              </div>
            </div>
          </div>
        ) : (
          /* ===============================================================
             MODE 2: REPORT STAGE DELAY
             =============================================================== */
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Delay Alert Callout */}
            <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Log Stage Delay & Dispatch Immediate Stakeholder Alerts</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                When an obstacle or delay occurs at <strong className="text-white">{STAGE_CONFIG[order.currentStage].title}</strong>, logging it here immediately updates the scheduled delivery SLA and sends automated WhatsApp alerts to the <strong className="text-purple-300">Sales Executive</strong>, <strong className="text-emerald-300">Customer</strong>, and <strong className="text-amber-300">Management</strong> so everybody stays informed with zero surprises.
              </p>
            </div>

            {/* Delay Reason Selector */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                1. Select Delay Cause / Bottleneck Reason
              </label>
              <select
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 font-medium"
              >
                {STAGE_DELAY_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                <option value="Custom Floor Note">Custom Floor Note (Type below)...</option>
              </select>

              {delayReason === 'Custom Floor Note' && (
                <input
                  type="text"
                  placeholder="Enter specific machine or material obstacle..."
                  value={customDelayReason}
                  onChange={(e) => setCustomDelayReason(e.target.value)}
                  className="w-full mt-2 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              )}
            </div>

            {/* Delay Duration & SLA Recalculation */}
            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  2. Delay Duration & Dynamic Delivery SLA Recalibration
                </label>
                <span className="text-xs text-rose-400 font-bold">+{delayHours} Hours Added</span>
              </div>

              {/* Quick Hours Buttons */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[2, 4, 8, 12, 24, 48].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setDelayHours(h)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      delayHours === h
                        ? 'bg-rose-500 text-white shadow-md font-bold'
                        : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
                    }`}
                  >
                    +{h >= 24 ? `${h / 24} Day` : `${h}h`}
                  </button>
                ))}
              </div>

              {/* SLA Recalculation Card */}
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-mono">Previous SLA:</span>
                  <div className="text-neutral-300 font-medium line-through">
                    {formatDateTime(order.expectedDeliveryDate)}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-rose-400">
                  <ArrowRight className="w-4 h-4 hidden sm:inline" />
                  <span className="font-mono text-xs font-bold uppercase">+{delayHours}h delay</span>
                  <ArrowRight className="w-4 h-4 hidden sm:inline" />
                </div>

                <div>
                  <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold">
                    Revised Committed SLA:
                  </span>
                  <div className="text-white font-bold text-sm">
                    {formatDateTime(calculatedRevisedDeliveryDate)}
                  </div>
                </div>
              </div>
            </div>

            {/* Floor Action & Operator In-Charge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Floor Corrective Action / Machine Status
                </label>
                <input
                  type="text"
                  placeholder="e.g. Technician re-calibrating stereo plate cylinders, resuming at 4 PM"
                  value={delayNotes}
                  onChange={(e) => setDelayNotes(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Reporting Officer</label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Delay Notification Checkboxes */}
            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
              <div className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                3. Select Stakeholders to Notify on WhatsApp
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 text-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifySalesOnDelay}
                    onChange={(e) => setNotifySalesOnDelay(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-0"
                  />
                  <span className="font-medium text-purple-300">
                    ⚡ WhatsApp Sales Rep ({order.salesPersonName || 'Rajesh Sharma'})
                  </span>
                </label>

                <label className="flex items-center gap-2 text-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyCustomerOnDelay}
                    onChange={(e) => setNotifyCustomerOnDelay(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-0"
                  />
                  <span>Courteous Schedule Update to Customer ({order.customerName})</span>
                </label>

                <label className="flex items-center gap-2 text-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyOwnerOnDelay}
                    onChange={(e) => setNotifyOwnerOnDelay(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-0"
                  />
                  <span>Escalation Notice to Owner ({settings.ownerName})</span>
                </label>

                <label className="flex items-center gap-2 text-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifySupervisorOnDelay}
                    onChange={(e) => setNotifySupervisorOnDelay(e.target.checked)}
                    className="rounded text-blue-500 focus:ring-0"
                  />
                  <span>Plant Head Alert ({settings.productionSupervisorName})</span>
                </label>
              </div>
            </div>

            {/* Delay Message Preview Box */}
            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Delay WhatsApp Text Preview
                </span>

                <div className="flex gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800 text-[11px]">
                  {(['sales', 'customer', 'owner'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setDelayPreviewRole(r)}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        delayPreviewRole === r
                          ? r === 'sales'
                            ? 'bg-purple-600 text-white font-bold'
                            : 'bg-rose-500 text-white font-bold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {r === 'sales' ? 'Sales Alert' : r === 'customer' ? 'Customer Notice' : 'Owner Escalation'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
                {delayPreviewRole === 'sales' && delaySalesMsg}
                {delayPreviewRole === 'customer' && delayCustomerMsg}
                {delayPreviewRole === 'owner' && delayOwnerMsg}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const text = delayPreviewRole === 'sales' ? delaySalesMsg : delayPreviewRole === 'customer' ? delayCustomerMsg : delayOwnerMsg;
                    navigator.clipboard.writeText(text);
                    setCopiedDelayMsg(true);
                    setTimeout(() => setCopiedDelayMsg(false), 2000);
                  }}
                  className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white"
                >
                  {copiedDelayMsg ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDelayMsg ? 'Copied' : 'Copy Preview Text'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-neutral-950 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white rounded-lg transition-colors"
          >
            Cancel
          </button>

          {activeMode === 'advance' ? (
            <button
              type="button"
              onClick={handleApplyAdvance}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-all shadow-md"
            >
              <Send className="w-4 h-4" />
              <span>Confirm & Dispatch Stage Advance</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyDelay}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-all shadow-md"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Log Delay & Send Multi-Party Alerts</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
