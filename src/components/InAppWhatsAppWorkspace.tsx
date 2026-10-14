import React, { useState, useEffect, useRef } from 'react';
import { CorrugatedOrder, FactorySettings, InAppChatMessage } from '../types/order';
import { STAGE_CONFIG } from '../utils/whatsapp';
import { renderCustomWhatsAppMessage } from '../utils/whatsappTemplates';
import {
  generateProductionHeadHindiWhatsappMessage,
  generateProductionHeadHinglishWhatsappMessage,
} from '../utils/whatsappHindi';
import { STAGE_PRESET_PHOTOS } from '../utils/storage';
import {
  uploadStagePhotoToServer,
  copyImageToClipboard,
} from '../utils/photoUpload';
import {
  sendDirectInAppWhatsApp,
  fetchInAppWhatsAppMessages,
} from '../utils/whatsappClient';
import { soundManager } from '../utils/audio';
import {
  Send,
  Search,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  UserCheck,
  Briefcase,
  Factory,
  Building2,
  AlertTriangle,
  Sparkles,
  Languages,
  Check,
  Copy,
  Settings,
  X,
  ExternalLink,
  MessageSquare,
  QrCode,
  Monitor,
  Smartphone,
  ShieldCheck,
  Wifi,
  Download,
} from 'lucide-react';

interface InAppWhatsAppWorkspaceProps {
  orders: CorrugatedOrder[];
  settings: FactorySettings;
  onPhotoUpdated?: (orderId: string, photoUrl: string) => void;
  onLogDispatched?: (orderId: string, stage: CorrugatedOrder['currentStage'], recipientRole: string, phone: string, snippet: string) => void;
  onOpenSettings?: () => void;
}

export const InAppWhatsAppWorkspace: React.FC<InAppWhatsAppWorkspaceProps> = ({
  orders,
  settings,
  onPhotoUpdated,
  onLogDispatched,
  onOpenSettings,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [orderSearch, setOrderSearch] = useState('');
  const [activeRecipient, setActiveRecipient] = useState<'customer' | 'sales' | 'production' | 'owner' | 'delay'>('customer');
  const [prodHeadLang, setProdHeadLang] = useState<'hi' | 'hinglish' | 'en'>(() => {
    const primary = settings.productionHeads?.find((p) => p.isPrimary) || settings.productionHeads?.[0];
    return primary?.preferredLanguage || 'hi';
  });

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  const [photoUrl, setPhotoUrl] = useState<string>(() => {
    if (!selectedOrder) return '';
    const lastHist = selectedOrder.stageHistory?.[selectedOrder.stageHistory.length - 1];
    return lastHist?.photoUrl || STAGE_PRESET_PHOTOS[selectedOrder.currentStage]?.[0]?.url || '';
  });

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const [messageDraft, setMessageDraft] = useState<string>('');
  const [customRecipientPhone, setCustomRecipientPhone] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [sentNotice, setSentNotice] = useState<{ text: string; isReal: boolean } | null>(null);
  const [copiedImg, setCopiedImg] = useState(false);
  const [allMessages, setAllMessages] = useState<InAppChatMessage[]>([]);
  const [showEmbeddedLoginPanel, setShowEmbeddedLoginPanel] = useState(true);
  const [testPingPhone, setTestPingPhone] = useState<string>(settings.ownerPhone || settings.contactNumber || '+91 ');
  const [testPingStatus, setTestPingStatus] = useState<{ ok?: boolean; text: string } | null>(null);
  const [isSendingTestPing, setIsSendingTestPing] = useState(false);
  const [waSession, setWaSession] = useState<{
    status: 'disconnected' | 'initializing' | 'qr_ready' | 'connected' | 'error';
    qrDataUrl: string | null;
    pairingCode: string | null;
    connectedPhone: string | null;
    connectedName: string | null;
    lastError: string | null;
  }>({
    status: 'initializing',
    qrDataUrl: null,
    pairingCode: null,
    connectedPhone: null,
    connectedName: null,
    lastError: null,
  });
  const [loginMethod, setLoginMethod] = useState<'qr' | 'pairing'>('qr');
  const [pairingPhoneInput, setPairingPhoneInput] = useState(settings.contactNumber || '+91 ');
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [isRefreshingQR, setIsRefreshingQR] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Poll real WhatsApp Web Multi-Device session & QR code from backend
  const fetchWhatsAppSessionStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/session');
      if (res.ok) {
        const data = await res.json();
        setWaSession(data);
      }
    } catch {
      // ignore network error
    }
  };

  useEffect(() => {
    fetchWhatsAppSessionStatus();
    const timer = setInterval(fetchWhatsAppSessionStatus, 2500);
    return () => clearInterval(timer);
  }, []);

  const handleRefreshRealQR = async () => {
    setIsRefreshingQR(true);
    try {
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) setWaSession(data.state);
      }
    } finally {
      setTimeout(() => {
        fetchWhatsAppSessionStatus();
        setIsRefreshingQR(false);
      }, 1500);
    }
  };

  const handleRequestPairingCode = async () => {
    setIsRequestingCode(true);
    try {
      const res = await fetch('/api/whatsapp/pairing-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: pairingPhoneInput }),
      });
      const data = await res.json();
      if (data.state) {
        setWaSession(data.state);
      }
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleLogoutWhatsApp = async () => {
    await fetch('/api/whatsapp/logout', { method: 'POST' });
    fetchWhatsAppSessionStatus();
  };

  // Load messages and poll every 3.5s so incoming WhatsApp replies appear live
  useEffect(() => {
    const loadMsgs = () => {
      fetchInAppWhatsAppMessages().then((msgs) => {
        setAllMessages(msgs);
      });
    };
    loadMsgs();
    const msgTimer = setInterval(loadMsgs, 3500);
    return () => clearInterval(msgTimer);
  }, []);

  // Update photo when selected order changes
  useEffect(() => {
    if (selectedOrder) {
      const lastHist = selectedOrder.stageHistory?.[selectedOrder.stageHistory.length - 1];
      const nextPhoto = lastHist?.photoUrl || STAGE_PRESET_PHOTOS[selectedOrder.currentStage]?.[0]?.url || '';
      setPhotoUrl(nextPhoto);
    }
  }, [selectedOrder?.id, selectedOrder?.currentStage]);

  // Compute recipient details & default template text
  const getRecipientDetails = () => {
    if (!selectedOrder) {
      return {
        role: 'Customer',
        name: 'Customer',
        phone: '',
        defaultText: '',
      };
    }

    switch (activeRecipient) {
      case 'customer':
        return {
          role: 'Customer',
          name: `${selectedOrder.customerName} (${selectedOrder.customerCompany})`,
          phone: selectedOrder.customerPhone,
          defaultText: renderCustomWhatsAppMessage(
            selectedOrder.currentStage === 'ORDER_PLACED'
              ? 'CUSTOMER_ORDER_PLACED'
              : selectedOrder.currentStage === 'OUT_FOR_DELIVERY'
              ? 'CUSTOMER_OUT_FOR_DELIVERY'
              : selectedOrder.currentStage === 'DELIVERED'
              ? 'CUSTOMER_DELIVERED'
              : 'CUSTOMER_STAGE_UPDATE',
            selectedOrder,
            settings,
            { photoUrl }
          ),
        };
      case 'sales':
        return {
          role: 'Sales Executive',
          name: selectedOrder.salesPersonName || settings.salesTeam?.[0]?.name || 'Sales Executive',
          phone: selectedOrder.salesPersonPhone || settings.salesTeam?.[0]?.phone || settings.contactNumber,
          defaultText: renderCustomWhatsAppMessage('SALES_STAGE_COMPLETED', selectedOrder, settings, { photoUrl }),
        };
      case 'production': {
        const targetHead =
          settings.productionHeads?.find((p) => p.isPrimary) || settings.productionHeads?.[0];
        let defaultText = '';
        if (prodHeadLang === 'hi') {
          defaultText =
            renderCustomWhatsAppMessage('PRODUCTION_JOB_CARD_HI', selectedOrder, settings, { photoUrl }) ||
            generateProductionHeadHindiWhatsappMessage(selectedOrder, settings, targetHead);
        } else if (prodHeadLang === 'hinglish') {
          defaultText =
            renderCustomWhatsAppMessage('PRODUCTION_JOB_CARD_HINGLISH', selectedOrder, settings, { photoUrl }) ||
            generateProductionHeadHinglishWhatsappMessage(selectedOrder, settings, targetHead);
        } else {
          defaultText = renderCustomWhatsAppMessage('PRODUCTION_JOB_CARD', selectedOrder, settings, { photoUrl });
        }
        return {
          role: 'Production Head',
          name: targetHead ? `${targetHead.name} (${targetHead.designation})` : settings.productionSupervisorName,
          phone: targetHead?.phone || settings.productionSupervisorPhone,
          defaultText,
        };
      }
      case 'owner': {
        const targetOwner = settings.owners?.find((o) => o.isPrimary) || settings.owners?.[0];
        return {
          role: 'Plant Owner',
          name: targetOwner ? `${targetOwner.name} (${targetOwner.designation})` : settings.ownerName,
          phone: targetOwner?.phone || settings.ownerPhone,
          defaultText: renderCustomWhatsAppMessage('OWNER_SUMMARY', selectedOrder, settings, { photoUrl }),
        };
      }
      case 'delay':
        return {
          role: 'Stage Delay Alert',
          name: selectedOrder.salesPersonName || selectedOrder.customerName,
          phone: selectedOrder.salesPersonPhone || selectedOrder.customerPhone,
          defaultText: renderCustomWhatsAppMessage('SALES_STAGE_DELAY', selectedOrder, settings, {
            delayReason: selectedOrder.currentDelayReason || 'Machine adjustment & reel check',
            delayHours: selectedOrder.currentDelayHours || 4,
            photoUrl,
          }),
        };
    }
  };

  const recipient = getRecipientDetails();

  // Auto-populate composer draft & target phone when order, recipient, language, or photo changes
  useEffect(() => {
    setMessageDraft(recipient.defaultText);
    setCustomRecipientPhone(recipient.phone);
  }, [selectedOrder?.id, activeRecipient, prodHeadLang, photoUrl]);

  const effectiveRecipientPhone = customRecipientPhone.trim() || recipient.phone;

  const handleSendTestPing = async () => {
    if (!testPingPhone.trim()) return;
    setIsSendingTestPing(true);
    setTestPingStatus(null);
    try {
      const dummyOrder = selectedOrder || orders[0];
      const result = await sendDirectInAppWhatsApp({
        order: dummyOrder,
        settings,
        recipientRole: 'WhatsApp Test Verification',
        recipientName: 'Test Number',
        recipientPhone: testPingPhone.trim(),
        message: `✅ *CorruTrack In-App WhatsApp Verification*\n\nYour built-in WhatsApp engine is connected and delivering real messages directly from *${settings.companyName}* without opening any external browser tab!\n\n🕒 Timestamp: ${new Date().toLocaleString('en-IN')}`,
      });
      if (result.realExternalDelivered) {
        setTestPingStatus({
          ok: true,
          text: `✓ Real WhatsApp message delivered to ${testPingPhone.trim()} via ${result.providerUsed}! Check your phone now.`,
        });
      } else {
        setTestPingStatus({
          ok: false,
          text:
            result.deliveryWarning ||
            'Phone is not linked yet! Please scan the QR code on the left (or use the 8-digit pairing code) first.',
        });
      }
    } finally {
      setIsSendingTestPing(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedOrder) return;
    setIsUploadingPhoto(true);
    try {
      const stageTitle = STAGE_CONFIG[selectedOrder.currentStage]?.title;
      const uploaded = await uploadStagePhotoToServer(file, selectedOrder, settings, stageTitle);
      setPhotoUrl(uploaded.rawPhotoUrl);
      if (onPhotoUpdated) {
        onPhotoUpdated(selectedOrder.id, uploaded.rawPhotoUrl);
      }
      copyImageToClipboard(uploaded.rawPhotoUrl).then((ok) => {
        if (ok) {
          setCopiedImg(true);
          setTimeout(() => setCopiedImg(false), 3500);
        }
      });
    } finally {
      setIsUploadingPhoto(false);
      setIsPresetOpen(false);
    }
  };

  const handleSendInApp = async () => {
    if (!selectedOrder || !messageDraft.trim()) return;
    setIsSending(true);
    setSentNotice(null);

    try {
      const result = await sendDirectInAppWhatsApp({
        order: selectedOrder,
        settings,
        recipientRole: recipient.role,
        recipientName: recipient.name,
        recipientPhone: effectiveRecipientPhone,
        message: messageDraft,
        photoUrl: photoUrl || undefined,
      });

      if (settings.enableSoundAlerts) {
        soundManager.playStageUpdateSound();
      }

      if (result.message) {
        setAllMessages((prev) => [result.message!, ...prev.filter((m) => m.id !== result.message!.id)]);
      }

      if (result.realExternalDelivered) {
        setSentNotice({
          isReal: true,
          text: `✓ REAL WHATSAPP DELIVERED to ${recipient.name} (${effectiveRecipientPhone}) via ${result.providerUsed}!`,
        });
        setTimeout(() => setSentNotice(null), 7000);
      } else {
        setShowEmbeddedLoginPanel(true);
        setSentNotice({
          isReal: false,
          text: `⚠️ Saved in app log ONLY — Not delivered to ${effectiveRecipientPhone} on real WhatsApp because your WhatsApp phone is not linked yet! Scan the QR Code above (or enter 8-digit pairing code) to send real WhatsApp messages.`,
        });
      }

      if (onLogDispatched) {
        onLogDispatched(
          selectedOrder.id,
          selectedOrder.currentStage,
          recipient.role,
          effectiveRecipientPhone,
          messageDraft.slice(0, 120)
        );
      }

      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } finally {
      setIsSending(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!orderSearch.trim()) return true;
    const q = orderSearch.toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      o.customerCompany.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q)
    );
  });

  const orderChatMessages = allMessages
    .filter((m) => selectedOrder && m.orderId.toUpperCase() === selectedOrder.id.toUpperCase())
    .slice()
    .reverse();

  const gatewayProviderLabel =
    waSession.status === 'connected'
      ? `Real QR-Linked WhatsApp Connected (${waSession.connectedPhone || 'Live'})`
      : settings.whatsappGateway?.provider === 'meta_cloud_api' && settings.whatsappGateway?.metaAccessToken
      ? 'Meta WhatsApp Cloud API Connected'
      : settings.whatsappGateway?.provider === 'ultramsg' && settings.whatsappGateway?.ultramsgToken
      ? 'UltraMsg QR-Linked WhatsApp Connected'
      : settings.webhookUrl
      ? 'Cloud Webhook Gateway Connected'
      : 'Built-In App Messenger (Scan QR Above to Link Phone)';

  const handleDownloadWindowsDesktopLauncher = () => {
    const appUrl = window.location.origin;
    const batContent = `@echo off
title CorruTrack - Corrugated Box ERP + Built-in WhatsApp Desktop App
echo Starting CorruTrack Windows Application...
start msedge --app="${appUrl}" --window-size=1440,900
if %errorlevel% neq 0 (
  start chrome --app="${appUrl}" --window-size=1440,900
)
`;
    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CorruTrack_Windows_Desktop_App.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* EMBEDDED WHATSAPP SESSION & WINDOWS APPLICATION STATUS BAR */}
      <div className="p-3.5 rounded-2xl bg-neutral-900 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white">
                In-App WhatsApp Multi-Device Engine
              </span>
              {waSession.status === 'connected' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                  ✓ Phone Linked: {waSession.connectedName || 'Plant WhatsApp'} ({waSession.connectedPhone})
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold animate-pulse">
                  ⚡ Scan Genuine WhatsApp QR Below to Link Your Phone
                </span>
              )}
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              Zero external browser tabs • Link your WhatsApp via QR Code or 8-Digit Phone Pairing Code right below.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setShowEmbeddedLoginPanel(!showEmbeddedLoginPanel)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-extrabold transition-colors shadow"
          >
            <QrCode className="w-4 h-4" />
            <span>
              {showEmbeddedLoginPanel
                ? 'Hide WhatsApp QR & Setup Guide'
                : waSession.status === 'connected'
                ? 'Manage Linked WhatsApp'
                : 'Scan WhatsApp QR / Configure'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleDownloadWindowsDesktopLauncher}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold transition-colors"
            title="Download standalone Windows Desktop Application launcher (.bat)"
          >
            <Monitor className="w-4 h-4 text-amber-400" />
            <span>Windows Desktop App (.bat)</span>
          </button>
        </div>
      </div>

      {/* EXPANDABLE IN-PAGE WHATSAPP QR LOGIN & API PLUGIN DRAWER */}
      {showEmbeddedLoginPanel && (
        <div className="p-5 rounded-2xl bg-[#111b21] border-2 border-emerald-500/50 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-[#2a3942] pb-3">
            <div className="flex items-center gap-2.5">
              <QrCode className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Real In-App WhatsApp Login (Official Multi-Device Protocol) & Setup Guide
                </h3>
                <p className="text-xs text-[#8696a0]">
                  Scan this live WhatsApp Web QR code with your phone (or use an 8-digit pairing code) so messages & photos go directly from your WhatsApp number!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowEmbeddedLoginPanel(false)}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Column 1 (5 cols): Real Live WhatsApp QR & 8-Digit Pairing Code */}
            <div className="lg:col-span-5 p-4 rounded-xl bg-[#202c33] border border-emerald-500/40 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    <span>Option 1: Link Your Phone Directly</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      waSession.status === 'connected'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {waSession.status === 'connected'
                      ? '✓ PHONE LINKED'
                      : waSession.status === 'qr_ready'
                      ? 'READY TO SCAN'
                      : 'GENERATING QR...'}
                  </span>
                </div>

                {/* Switch between QR Code Scan and 8-Digit Phone Pairing Code */}
                {waSession.status !== 'connected' && (
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#111b21] rounded-lg border border-[#2a3942]">
                    <button
                      type="button"
                      onClick={() => setLoginMethod('qr')}
                      className={`py-1.5 rounded text-xs font-bold transition-all ${
                        loginMethod === 'qr'
                          ? 'bg-emerald-500 text-neutral-950'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      📷 Scan QR Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginMethod('pairing')}
                      className={`py-1.5 rounded text-xs font-bold transition-all ${
                        loginMethod === 'pairing'
                          ? 'bg-emerald-500 text-neutral-950'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      🔢 Link with Phone Number
                    </button>
                  </div>
                )}

                {waSession.status === 'connected' ? (
                  <div className="space-y-3 py-2">
                    <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex items-center gap-3">
                      <ShieldCheck className="w-10 h-10 text-emerald-400 shrink-0" />
                      <div className="text-xs">
                        <div className="font-bold text-white text-sm">
                          ✓ WhatsApp Successfully Linked!
                        </div>
                        <div className="text-emerald-300 font-mono mt-0.5">
                          {waSession.connectedName} • {waSession.connectedPhone}
                        </div>
                        <div className="text-[11px] text-neutral-300 mt-1">
                          Every message & photo you send below will now be delivered directly from your WhatsApp account without opening any tab.
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleLogoutWhatsApp}
                      className="w-full py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/50 text-xs text-rose-200 font-semibold transition-colors"
                    >
                      Disconnect / Switch WhatsApp Account
                    </button>
                  </div>
                ) : loginMethod === 'qr' ? (
                  <div className="space-y-3 text-center">
                    <div className="mx-auto w-56 h-56 bg-white p-2.5 rounded-2xl shadow-lg flex items-center justify-center relative">
                      {waSession.qrDataUrl ? (
                        <img
                          src={waSession.qrDataUrl}
                          alt="Official WhatsApp Multi-Device QR Code"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-neutral-700 text-xs font-semibold px-4 space-y-2">
                          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                          <div>Generating real WhatsApp Web cryptographic QR code...</div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleRefreshRealQR}
                        disabled={isRefreshingQR}
                        className="px-4 py-1.5 rounded-lg bg-[#111b21] hover:bg-neutral-800 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-colors"
                      >
                        {isRefreshingQR ? 'Generating Fresh QR...' : '↻ Refresh New QR Code'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 p-3 rounded-xl bg-[#111b21] border border-[#2a3942]">
                    <div className="text-xs text-neutral-200 font-semibold">
                      Link with 8-Digit Code (No Camera Scan Needed):
                    </div>
                    <p className="text-[11px] text-[#8696a0]">
                      Enter your WhatsApp phone number with country code (e.g. <code className="text-emerald-300">919840123456</code>), then enter the 8-digit code on your phone in <strong>Linked Devices → Link with phone number instead</strong>.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={pairingPhoneInput}
                        onChange={(e) => setPairingPhoneInput(e.target.value)}
                        placeholder="+91 98401 23456"
                        className="flex-1 bg-[#202c33] border border-[#2a3942] rounded-lg px-3 py-2 text-xs text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleRequestPairingCode}
                        disabled={isRequestingCode}
                        className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs shrink-0"
                      >
                        {isRequestingCode ? 'Requesting...' : 'Get 8-Digit Code'}
                      </button>
                    </div>

                    {waSession.pairingCode && (
                      <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500 text-center space-y-1">
                        <div className="text-[10px] text-emerald-300 uppercase font-bold">
                          Enter this 8-Digit Code in WhatsApp on your phone:
                        </div>
                        <div className="text-2xl font-mono font-black tracking-widest text-white">
                          {waSession.pairingCode}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Column 2 (4 cols): Step-by-Step How to Configure & Scan Guide */}
            <div className="lg:col-span-4 p-4 rounded-xl bg-[#202c33] border border-[#2a3942] space-y-3">
              <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>How to Link Your WhatsApp (30 Seconds)</span>
              </div>

              <ol className="space-y-2.5 text-xs text-neutral-200 list-decimal list-inside leading-relaxed">
                <li className="p-2 rounded-lg bg-[#111b21] border border-[#2a3942]">
                  Open <strong>WhatsApp</strong> or <strong>WhatsApp Business</strong> on your mobile phone.
                </li>
                <li className="p-2 rounded-lg bg-[#111b21] border border-[#2a3942]">
                  Tap the <strong>Menu (⋮)</strong> on Android or <strong>Settings (⚙️)</strong> on iPhone, then tap <strong>Linked Devices</strong>.
                </li>
                <li className="p-2 rounded-lg bg-[#111b21] border border-[#2a3942]">
                  Tap <strong>Link a Device</strong> and point your phone camera at the <strong>QR Code on the left</strong> (or click <em>Link with Phone Number</em> to get an 8-digit code).
                </li>
                <li className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-200">
                  Once scanned, the status changes to <strong>✓ PHONE LINKED</strong> and every message & stage photo sends directly from your phone!
                </li>
              </ol>
            </div>

            {/* Column 3 (3 cols): Cloud API Plugin & Windows App */}
            <div className="lg:col-span-3 p-4 rounded-xl bg-[#202c33] border border-[#2a3942] flex flex-col justify-between space-y-3">
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Settings className="w-4 h-4" />
                  <span>Option 2: Cloud API Gateway</span>
                </div>
                <p className="text-[11px] text-[#8696a0] leading-relaxed">
                  Prefer using <strong>Meta Official WhatsApp Cloud API</strong> or <strong>UltraMsg API</strong>? Configure your API token in Settings.
                </p>
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="w-full py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs"
                  >
                    Configure Cloud API Keys →
                  </button>
                )}
              </div>

              <div className="pt-3 border-t border-[#2a3942] space-y-2">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Real Test WhatsApp Message</span>
                </div>
                <p className="text-[10px] text-[#8696a0]">
                  Enter your own mobile number below to test real WhatsApp delivery right now:
                </p>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={testPingPhone}
                    onChange={(e) => setTestPingPhone(e.target.value)}
                    placeholder="+91 98401 23456"
                    className="flex-1 min-w-0 bg-[#111b21] border border-[#2a3942] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSendTestPing}
                    disabled={isSendingTestPing}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold text-[11px] shrink-0"
                  >
                    {isSendingTestPing ? 'Sending...' : 'Test Send'}
                  </button>
                </div>
                {testPingStatus && (
                  <div
                    className={`p-2 rounded-lg text-[10px] font-medium border ${
                      testPingStatus.ok
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                        : 'bg-amber-950/70 border-amber-500/60 text-amber-300'
                    }`}
                  >
                    {testPingStatus.text}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[720px] max-h-[85vh]">
      {/* LEFT SIDEBAR: ORDERS & CONVERSATION LIST (WhatsApp Desktop Style) */}
      <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-neutral-800 bg-[#111b21] flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="p-3.5 bg-[#202c33] border-b border-[#2a3942] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-500 text-neutral-950 font-black flex items-center justify-center text-sm shadow">
              WA
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight">In-App WhatsApp</div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Zero External Tabs</span>
              </div>
            </div>
          </div>

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 text-neutral-300 hover:text-white bg-[#2a3942] hover:bg-neutral-700 rounded-lg transition-colors"
              title="Configure WhatsApp Cloud API / UltraMsg Gateway"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Orders */}
        <div className="p-2.5 bg-[#111b21] border-b border-[#202c33]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8696a0] absolute left-3 top-2.5" />
            <input
              type="text"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder="Search order or client..."
              className="w-full bg-[#202c33] text-xs text-white placeholder-[#8696a0] pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#202c33]">
          {filteredOrders.map((o) => {
            const isSelected = selectedOrder?.id === o.id;
            const st = STAGE_CONFIG[o.currentStage];
            const sentCount = allMessages.filter((m) => m.orderId.toUpperCase() === o.id.toUpperCase()).length;
            const hasPhoto = !!o.stageHistory?.[o.stageHistory.length - 1]?.photoUrl;

            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelectedOrderId(o.id)}
                className={`w-full p-3 text-left transition-colors flex items-start gap-3 ${
                  isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]/60'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {o.customerCompany.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white truncate">{o.customerCompany}</span>
                    <span className="text-[10px] font-mono text-amber-400 font-semibold shrink-0">{o.id}</span>
                  </div>
                  <div className="text-[11px] text-[#8696a0] truncate mt-0.5">
                    {o.customerName} • {o.customerPhone}
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#111b21] text-neutral-300 border border-[#2a3942] truncate">
                      {st?.title}
                    </span>
                    <div className="flex items-center gap-1">
                      {hasPhoto && (
                        <span className="text-[10px] text-amber-400" title="Stage photo attached">
                          📷
                        </span>
                      )}
                      {sentCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-neutral-950 font-bold text-[10px]">
                          {sentCount} sent
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CENTER & RIGHT: EMBEDDED WHATSAPP CHAT & PHOTO STUDIO */}
      {selectedOrder ? (
        <div className="flex-1 flex flex-col bg-[#0b141a] overflow-hidden">
          {/* Top Chat Contact Bar & Recipient Role Switcher */}
          <div className="px-4 py-3 bg-[#202c33] border-b border-[#2a3942] flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                  {recipient.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{recipient.name}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      {recipient.role}
                    </span>
                  </div>
                  <div className="text-xs text-emerald-400 font-mono flex items-center gap-2">
                    <span>{recipient.phone}</span>
                    <span className="text-[#8696a0]">•</span>
                    <span className="text-[#8696a0] font-sans">{gatewayProviderLabel}</span>
                  </div>
                </div>
              </div>

              {/* Recipient Quick Switcher Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'customer', label: '1. Customer', icon: UserCheck },
                  { id: 'sales', label: '2. Sales Rep', icon: Briefcase },
                  { id: 'production', label: '3. Plant Head', icon: Factory },
                  { id: 'owner', label: '4. Owner', icon: Building2 },
                  { id: 'delay', label: '5. Delay Alert', icon: AlertTriangle },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = activeRecipient === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveRecipient(tab.id as any)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        active
                          ? 'bg-emerald-500 text-neutral-950 font-bold shadow'
                          : 'bg-[#111b21] text-neutral-300 hover:text-white border border-[#2a3942]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Production Head Language Bar (Hindi / Hinglish / English) */}
            {activeRecipient === 'production' && (
              <div className="px-3 py-1.5 bg-[#111b21] rounded-lg border border-amber-500/30 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
                  <Languages className="w-4 h-4 text-amber-400" />
                  <span>Production Head Message Language (भाषा चुनें):</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'hi', label: '🇮🇳 हिन्दी (Hindi)' },
                    { id: 'hinglish', label: '💬 Hinglish' },
                    { id: 'en', label: '🇬🇧 English' },
                  ].map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setProdHeadLang(l.id as any)}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                        prodHeadLang === l.id
                          ? 'bg-amber-400 text-neutral-950'
                          : 'bg-[#202c33] text-neutral-300 hover:text-white'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Split Inside Chat: Left = Live Chat Stream & Composer, Right = Stage Photo Attachment */}
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 overflow-hidden">
            {/* Chat Thread & Direct In-App Composer (8 cols) */}
            <div className="xl:col-span-8 flex flex-col border-r border-[#202c33] overflow-hidden">
              {/* Scrollable Chat History + Live Preview Bubble */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0b141a]">
                <div className="text-center">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#182229] text-[#8696a0] text-[11px] border border-[#222e35]">
                    🔒 Direct In-App WhatsApp Channel • Messages send directly from here without opening any external webpage
                  </span>
                </div>

                {/* Sent & Received Messages History for this Order */}
                {orderChatMessages.map((msg) => {
                  const isInbound = msg.direction === 'inbound';
                  const isRealExternal =
                    msg.status === 'sent_via_gateway' ||
                    (msg.providerUsed && !msg.providerUsed.includes('Phone Not Linked'));

                  return (
                    <div key={msg.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl p-3 shadow-md space-y-2 ${
                          isInbound
                            ? 'bg-[#202c33] text-[#e9edef] rounded-tl-none border border-[#2a3942]'
                            : isRealExternal
                            ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none border border-emerald-500/30'
                            : 'bg-neutral-800/90 text-neutral-200 rounded-tr-none border border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 text-[10px] border-b border-white/10 pb-1">
                          <span className="font-bold text-emerald-200">
                            {isInbound
                              ? `⬅ Reply from ${msg.recipientName} (${msg.recipientPhone})`
                              : `➡ To ${msg.recipientName} (${msg.recipientPhone})`}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono ${
                              isRealExternal
                                ? 'bg-emerald-950/60 text-emerald-300'
                                : 'bg-amber-950/80 text-amber-300'
                            }`}
                          >
                            {msg.providerUsed || 'In-App'}
                          </span>
                        </div>

                        {msg.photoUrl && (
                          <div className="rounded-lg overflow-hidden border border-emerald-400/30 bg-black">
                            <img
                              src={msg.photoUrl}
                              alt="Dispatched Stage Photo"
                              className="w-full max-h-48 object-contain"
                            />
                          </div>
                        )}

                        <div className="text-xs whitespace-pre-wrap leading-relaxed">{msg.message}</div>

                        <div className="flex items-center justify-end gap-1.5 text-[10px]">
                          <span className="text-neutral-300/80">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isInbound ? (
                            <span className="text-emerald-300 font-semibold">✓ Received on Linked Phone</span>
                          ) : isRealExternal ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-300" />
                              <span className="text-cyan-200 font-semibold">Delivered to Real WhatsApp</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-amber-300 font-semibold">
                                Saved in App Only (Link QR Above to Deliver to Phone)
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Current Ready-to-Send Preview Card */}
                <div className="p-3.5 rounded-2xl bg-[#182229] border border-emerald-500/40 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Ready to Send Directly Inside App</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(messageDraft)}
                      className="text-[11px] text-neutral-300 hover:text-white flex items-center gap-1 bg-[#202c33] px-2 py-1 rounded"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Text</span>
                    </button>
                  </div>

                  {/* Editable Target WhatsApp Number Bar (so user can test with their real number instead of sample number) */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-xl bg-[#111b21] border border-emerald-500/30">
                    <div className="text-xs font-bold text-emerald-300 shrink-0">
                      📲 Target WhatsApp Number:
                    </div>
                    <input
                      type="text"
                      value={customRecipientPhone}
                      onChange={(e) => setCustomRecipientPhone(e.target.value)}
                      placeholder="+91 98401 23456"
                      className="flex-1 bg-[#202c33] border border-[#2a3942] focus:border-emerald-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                    />
                    <span className="text-[10px] text-[#8696a0]">
                      (You can type any real mobile number with country code to test live delivery)
                    </span>
                  </div>

                  {photoUrl && (
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-[#111b21] border border-[#2a3942]">
                      <img src={photoUrl} alt="Attached" className="w-16 h-12 object-cover rounded-lg" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white">
                          📸 Stage Photo Attached (Sent as Real WhatsApp Image + Caption)
                        </div>
                        <div className="text-[11px] text-emerald-400 truncate">
                          Direct Photo Link also included (opens ONLY the photo, never your dashboard)
                        </div>
                      </div>
                    </div>
                  )}

                  <textarea
                    value={messageDraft}
                    onChange={(e) => setMessageDraft(e.target.value)}
                    rows={8}
                    className="w-full bg-[#111b21] border border-[#2a3942] rounded-xl p-3 text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-emerald-500 resize-y"
                  />
                </div>

                <div ref={chatEndRef} />
              </div>

              {/* Bottom Instant In-App Send Bar */}
              <div className="p-3.5 bg-[#202c33] border-t border-[#2a3942] space-y-2">
                {sentNotice && (
                  <div
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
                      sentNotice.isReal
                        ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                        : 'bg-amber-500/20 border-2 border-amber-500/60 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {sentNotice.isReal ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <span>{sentNotice.text}</span>
                    </div>
                    <button type="button" onClick={() => setSentNotice(null)}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-[#8696a0] hidden sm:block">
                    Sending to: <strong className="text-white">{recipient.name}</strong> (
                    <span className="text-emerald-400 font-mono">{effectiveRecipientPhone}</span>)
                  </div>

                  <button
                    type="button"
                    onClick={handleSendInApp}
                    disabled={isSending}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isSending
                        ? 'Sending Message via WhatsApp Engine...'
                        : waSession.status === 'connected'
                        ? `Send Real WhatsApp Message Now to ${effectiveRecipientPhone}`
                        : `Send WhatsApp Message (${
                            settings.whatsappGateway?.enabled &&
                            settings.whatsappGateway?.provider !== 'in_app_messenger'
                              ? 'Via Cloud Gateway'
                              : 'Link QR Above for Real Phone Delivery'
                          })`}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Stage Photo Upload & Direct Photo Link Inspector (4 cols) */}
            <div className="xl:col-span-4 p-4 bg-[#111b21] flex flex-col justify-between space-y-4 overflow-y-auto">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>Stage Photo Proof</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                    Direct Image Link
                  </span>
                </div>

                <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-[#2a3942]">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Stage Proof" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500 text-xs">
                      <ImageIcon className="w-7 h-7 mb-1" />
                      <span>No photo selected</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs rounded-xl cursor-pointer transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                    <input type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" />
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsPresetOpen(!isPresetOpen)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#202c33] hover:bg-[#2a3942] text-white font-semibold text-xs rounded-xl border border-[#2a3942]"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>Stage Presets</span>
                  </button>
                </div>

                {photoUrl && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await copyImageToClipboard(photoUrl);
                        if (ok) {
                          setCopiedImg(true);
                          setTimeout(() => setCopiedImg(false), 3000);
                        }
                      }}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#202c33] hover:bg-[#2a3942] text-emerald-300 text-[11px] font-semibold border border-emerald-500/30 flex items-center justify-center gap-1.5"
                    >
                      {copiedImg ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedImg ? 'Photo Copied!' : 'Copy Raw Image'}</span>
                    </button>

                    <a
                      href={
                        photoUrl.startsWith('/api/photos/')
                          ? photoUrl.replace('/api/photos/', '/api/photo-view/')
                          : photoUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-2.5 rounded-lg bg-[#202c33] hover:bg-[#2a3942] text-amber-300 text-[11px] font-semibold border border-[#2a3942] flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Test Photo Link</span>
                    </a>
                  </div>
                )}

                {isPresetOpen && (
                  <div className="p-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] space-y-2">
                    <div className="text-[11px] font-semibold text-neutral-300">Select Stage Snapshot:</div>
                    <div className="grid grid-cols-2 gap-2">
                      {(STAGE_PRESET_PHOTOS[selectedOrder.currentStage] || []).map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPhotoUrl(p.url);
                            if (onPhotoUpdated) onPhotoUpdated(selectedOrder.id, p.url);
                            setIsPresetOpen(false);
                          }}
                          className="p-1.5 rounded-lg bg-[#111b21] hover:bg-neutral-800 border border-[#2a3942] text-left"
                        >
                          <img src={p.url} alt={p.label} className="w-full h-12 object-cover rounded mb-1" />
                          <div className="text-[10px] text-neutral-300 truncate">{p.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Info Box Explaining Direct In-App Integration */}
              <div className="p-3 rounded-xl bg-[#182229] border border-[#2a3942] text-[11px] text-[#8696a0] space-y-1.5">
                <div className="text-white font-semibold flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>100% In-App WhatsApp Integration</span>
                </div>
                <p>
                  Clicking <strong>Send WhatsApp Message Now</strong> dispatches your message & photo directly from this screen without opening any external browser tab.
                </p>
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="text-emerald-400 hover:text-emerald-300 underline font-semibold block pt-1"
                  >
                    Configure Meta Cloud API / UltraMsg Gateway →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
};
