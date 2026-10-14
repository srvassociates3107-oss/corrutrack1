import React, { useState, useEffect } from 'react';
import { CorrugatedOrder, FactorySettings, InAppChatMessage } from '../types/order';
import { 
  buildWhatsappLink,
  buildWhatsappWebLink,
  buildWhatsappProtocolLink,
  STAGE_CONFIG,
  generateProductionHeadHindiWhatsappMessage,
  generateProductionHeadHinglishWhatsappMessage
} from '../utils/whatsapp';
import { 
  renderCustomWhatsAppMessage, 
  saveCustomTemplate 
} from '../utils/whatsappTemplates';
import { STAGE_PRESET_PHOTOS } from '../utils/storage';
import {
  uploadStagePhotoToServer,
  copyImageToClipboard,
  shareImageFileWithText,
  syncOrderSnapshotToServer
} from '../utils/photoUpload';
import {
  sendDirectInAppWhatsApp,
  fetchInAppWhatsAppMessages
} from '../utils/whatsappClient';
import { soundManager } from '../utils/audio';
import { 
  X, 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  Smartphone, 
  Laptop, 
  Camera, 
  Image as ImageIcon, 
  UserCheck, 
  Briefcase, 
  Factory, 
  Building2, 
  Sparkles,
  Share2,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Save,
  MessageSquare,
  Languages
} from 'lucide-react';

interface WhatsAppPluginModalProps {
  order: CorrugatedOrder;
  settings: FactorySettings;
  isOpen: boolean;
  onClose: () => void;
  onPhotoUpdated?: (orderId: string, photoUrl: string) => void;
  onLogDispatched?: (recipientRole: string, phone: string, snippet: string) => void;
  onOpenTemplateEditor?: () => void;
  onOpenInteractiveCard?: () => void;
}

export function WhatsAppPluginModal({
  order,
  settings,
  isOpen,
  onClose,
  onPhotoUpdated,
  onLogDispatched,
  onOpenTemplateEditor,
  onOpenInteractiveCard,
}: WhatsAppPluginModalProps) {
  const [activeRecipient, setActiveRecipient] = useState<'customer' | 'sales' | 'production' | 'owner' | 'delay'>('customer');
  const [copied, setCopied] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string>(() => {
    const currentHist = order.stageHistory?.[order.stageHistory.length - 1];
    return currentHist?.photoUrl || STAGE_PRESET_PHOTOS[order.currentStage]?.[0]?.url || '';
  });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoCopiedToClipboard, setPhotoCopiedToClipboard] = useState(false);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [apiDispatched, setApiDispatched] = useState<string | null>(null);
  const [isSendingInApp, setIsSendingInApp] = useState(false);
  const [inAppSentBanner, setInAppSentBanner] = useState<{ text: string; isReal: boolean } | null>(null);
  const [chatHistory, setChatHistory] = useState<InAppChatMessage[]>([]);
  const [customTargetPhone, setCustomTargetPhone] = useState<string>('');
  const [waSession, setWaSession] = useState<{
    status: 'disconnected' | 'initializing' | 'qr_ready' | 'connected' | 'error';
    qrDataUrl: string | null;
    connectedPhone: string | null;
    connectedName: string | null;
  }>({
    status: 'initializing',
    qrDataUrl: null,
    connectedPhone: null,
    connectedName: null,
  });
  const [showQuickQRDrawer, setShowQuickQRDrawer] = useState(false);

  useEffect(() => {
    if (isOpen && order.id) {
      fetchInAppWhatsAppMessages(order.id).then((msgs) => {
        setChatHistory(msgs);
      });
      const pollSession = () => {
        fetch('/api/whatsapp/session')
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d) setWaSession(d);
          })
          .catch(() => {});
      };
      pollSession();
      const t = setInterval(pollSession, 2500);
      return () => clearInterval(t);
    }
  }, [isOpen, order.id]);

  if (!isOpen) return null;

  const stageInfo = STAGE_CONFIG[order.currentStage];

  const ownersList = Array.isArray(settings.owners) && settings.owners.length > 0 
    ? settings.owners 
    : [{ id: 'o-default', name: settings.ownerName || 'Sunil Verma', phone: settings.ownerPhone || settings.contactNumber, designation: 'Managing Director', responsibility: 'Plant Management', isPrimary: true, active: true }];

  const prodHeadsList = Array.isArray(settings.productionHeads) && settings.productionHeads.length > 0 
    ? settings.productionHeads 
    : [{ id: 'p-default', name: settings.productionSupervisorName || 'Mahesh Patil', phone: settings.productionSupervisorPhone || settings.contactNumber, designation: 'Chief Production Head', shiftOrSection: 'General Shift', isPrimary: true, active: true }];

  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(() => {
    const primary = ownersList.find(o => o.isPrimary) || ownersList[0];
    return primary?.id || '';
  });

  const [selectedProdHeadId, setSelectedProdHeadId] = useState<string>(() => {
    const primary = prodHeadsList.find(p => p.isPrimary) || prodHeadsList[0];
    return primary?.id || '';
  });

  const [prodHeadLang, setProdHeadLang] = useState<'hi' | 'hinglish' | 'en'>(() => {
    const primaryHead = prodHeadsList.find(p => p.isPrimary) || prodHeadsList[0];
    return primaryHead?.preferredLanguage || 'hi';
  });

  // Get recipient specific details using custom template renderer
  const getRecipientInfo = () => {
    switch (activeRecipient) {
      case 'customer':
        return {
          role: 'Customer',
          name: order.customerName,
          subtext: order.customerCompany,
          phone: order.customerPhone,
          defaultMsg: renderCustomWhatsAppMessage('CUSTOMER_STAGE_UPDATE', order, settings, { photoUrl: customPhotoUrl }),
          templateKey: 'CUSTOMER_STAGE_UPDATE',
          badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: UserCheck,
        };
      case 'sales':
        return {
          role: 'Sales Executive',
          name: order.salesPersonName || 'Assigned Sales Executive',
          subtext: `Commission & Account Lead`,
          phone: order.salesPersonPhone || settings.salesTeam[0]?.phone || settings.contactNumber,
          defaultMsg: renderCustomWhatsAppMessage('SALES_STAGE_COMPLETED', order, settings),
          templateKey: 'SALES_STAGE_COMPLETED',
          badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          icon: Briefcase,
        };
      case 'production': {
        const targetHead = prodHeadsList.find(p => p.id === selectedProdHeadId) || prodHeadsList[0];
        const templateKey = prodHeadLang === 'hi' 
          ? 'PRODUCTION_JOB_CARD_HI' 
          : prodHeadLang === 'hinglish' 
          ? 'PRODUCTION_JOB_CARD_HINGLISH' 
          : 'PRODUCTION_JOB_CARD';

        const defaultMsg = prodHeadLang === 'hi'
          ? (renderCustomWhatsAppMessage('PRODUCTION_JOB_CARD_HI', order, settings) || generateProductionHeadHindiWhatsappMessage(order, settings, targetHead))
          : prodHeadLang === 'hinglish'
          ? (renderCustomWhatsAppMessage('PRODUCTION_JOB_CARD_HINGLISH', order, settings) || generateProductionHeadHinglishWhatsappMessage(order, settings, targetHead))
          : renderCustomWhatsAppMessage('PRODUCTION_JOB_CARD', order, settings);

        return {
          role: 'Production Head',
          name: targetHead ? `${targetHead.name} (${targetHead.designation})` : settings.productionSupervisorName,
          subtext: targetHead?.shiftOrSection || 'Plant Floor & Machine Line',
          phone: targetHead?.phone || settings.productionSupervisorPhone,
          defaultMsg,
          templateKey,
          badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: Factory,
        };
      }
      case 'owner': {
        const targetOwner = ownersList.find(o => o.id === selectedOwnerId) || ownersList[0];
        return {
          role: 'Business Owner',
          name: targetOwner ? `${targetOwner.name} (${targetOwner.designation})` : settings.ownerName,
          subtext: targetOwner?.responsibility || 'Managing Director / Partner',
          phone: targetOwner?.phone || settings.ownerPhone,
          defaultMsg: renderCustomWhatsAppMessage('OWNER_SUMMARY', order, settings),
          templateKey: 'OWNER_SUMMARY',
          badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          icon: Building2,
        };
      }
      case 'delay':
        return {
          role: 'Stage Delay Notice',
          name: order.salesPersonName || 'Sales & Customer',
          subtext: 'Obstacle / SLA Recalibration Alert',
          phone: order.salesPersonPhone || settings.salesTeam[0]?.phone || order.customerPhone,
          defaultMsg: renderCustomWhatsAppMessage('SALES_STAGE_DELAY', order, settings, {
            delayReason: order.currentDelayReason || 'Machine adjustment & material reel wait',
            delayHours: order.currentDelayHours || 4,
          }),
          templateKey: 'SALES_STAGE_DELAY',
          badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          icon: AlertTriangle,
        };
    }
  };

  const recipient = getRecipientInfo();
  const activeMessageText = isEditingMessage ? customMessage : (customMessage || recipient.defaultMsg);
  const effectivePhone = customTargetPhone.trim() || recipient.phone;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeMessageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAsDefaultTemplate = () => {
    if (recipient.templateKey && activeMessageText.trim()) {
      saveCustomTemplate(recipient.templateKey, activeMessageText);
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 2500);
    }
  };

  const handleCopyPhotoToClipboard = async () => {
    if (!customPhotoUrl) return;
    const ok = await copyImageToClipboard(customPhotoUrl);
    if (ok) {
      setPhotoCopiedToClipboard(true);
      setTimeout(() => setPhotoCopiedToClipboard(false), 3500);
    }
  };

  const handleSendDirectlyInsideApp = async () => {
    setIsSendingInApp(true);
    setInAppSentBanner(null);

    try {
      const result = await sendDirectInAppWhatsApp({
        order,
        settings,
        recipientRole: recipient.role,
        recipientName: recipient.name,
        recipientPhone: effectivePhone,
        message: activeMessageText,
        photoUrl: customPhotoUrl || undefined,
      });

      if (settings.enableSoundAlerts) {
        soundManager.playStageUpdateSound();
      }

      if (result.message) {
        setChatHistory((prev) => [result.message!, ...prev.filter((m) => m.id !== result.message!.id)]);
      }

      if (result.realExternalDelivered) {
        setInAppSentBanner({
          isReal: true,
          text: `✓ REAL WHATSAPP MESSAGE DELIVERED to ${recipient.name} (${effectivePhone}) via ${result.providerUsed}!`,
        });
        setTimeout(() => setInAppSentBanner(null), 6000);
      } else {
        setShowQuickQRDrawer(true);
        setInAppSentBanner({
          isReal: false,
          text: `⚠️ Saved in app log ONLY — Not delivered to ${effectivePhone} on real WhatsApp because your WhatsApp phone is not linked yet! Scan the QR Code below to link your phone.`,
        });
      }

      if (onLogDispatched) {
        onLogDispatched(recipient.role, effectivePhone, activeMessageText.slice(0, 120));
      }
    } finally {
      setIsSendingInApp(false);
    }
  };

  const handleOpenWhatsapp = async (mode: 'web' | 'direct' | 'app') => {
    // Sync order snapshot to server so customer link always works
    syncOrderSnapshotToServer(order, settings, customPhotoUrl);

    // Also automatically copy the photo to clipboard so the user can press Ctrl+V in WhatsApp Web!
    if (customPhotoUrl) {
      copyImageToClipboard(customPhotoUrl).then((ok) => {
        if (ok) {
          setPhotoCopiedToClipboard(true);
          setTimeout(() => setPhotoCopiedToClipboard(false), 4000);
        }
      });
    }

    let url = '';
    if (mode === 'web') {
      url = buildWhatsappWebLink(recipient.phone, activeMessageText);
    } else if (mode === 'app') {
      url = buildWhatsappProtocolLink(recipient.phone, activeMessageText);
    } else {
      url = buildWhatsappLink(recipient.phone, activeMessageText);
    }

    if (onLogDispatched) {
      onLogDispatched(recipient.role, recipient.phone, activeMessageText.slice(0, 100));
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    syncOrderSnapshotToServer(order, settings, customPhotoUrl);
    if (customPhotoUrl) {
      const shared = await shareImageFileWithText(customPhotoUrl, order.id, activeMessageText);
      if (shared) return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Order #${order.id} - ${stageInfo.title}`,
          text: activeMessageText,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  const handleTriggerWebhook = async () => {
    if (!settings.webhookUrl) {
      setApiDispatched('Set Webhook URL in Settings first');
      return;
    }
    setApiDispatched('Dispatching payload...');
    try {
      const resp = await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'DISPATCH_WHATSAPP_NOTIFICATION',
          orderId: order.id,
          recipientRole: recipient.role,
          recipientPhone: recipient.phone,
          message: activeMessageText,
          photoUrl: customPhotoUrl,
          timestamp: new Date().toISOString(),
        }),
      });
      if (resp.ok) {
        setApiDispatched('Delivered (HTTP 200)');
      } else {
        setApiDispatched(`HTTP ${resp.status}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      setApiDispatched(`Failed: ${msg}`);
    }
  };

  const handleSelectPresetPhoto = (url: string) => {
    setCustomPhotoUrl(url);
    syncOrderSnapshotToServer(order, settings, url);
    if (onPhotoUpdated) {
      onPhotoUpdated(order.id, url);
    }
    setIsPhotoPickerOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingPhoto(true);
      try {
        const uploaded = await uploadStagePhotoToServer(file, order, settings, stageInfo.title);
        // Use the standalone photo viewer URL or direct image URL so clicking in WhatsApp opens the photo!
        const finalPhotoUrl = uploaded.photoViewUrl || uploaded.rawPhotoUrl;
        setCustomPhotoUrl(uploaded.rawPhotoUrl);
        setCustomMessage(''); // Reset custom message so template re-renders with new hosted photo link
        if (onPhotoUpdated) {
          onPhotoUpdated(order.id, uploaded.rawPhotoUrl);
        }
        // Also copy image to clipboard immediately for convenience
        copyImageToClipboard(uploaded.rawPhotoUrl).then((ok) => {
          if (ok) {
            setPhotoCopiedToClipboard(true);
            setTimeout(() => setPhotoCopiedToClipboard(false), 4000);
          }
        });
        void finalPhotoUrl;
      } finally {
        setIsUploadingPhoto(false);
        setIsPhotoPickerOpen(false);
      }
    }
  };

  const presetPhotosForStage = STAGE_PRESET_PHOTOS[order.currentStage] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">WhatsApp Dispatch Console & Plugin</h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Order #{order.id}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-800 text-neutral-300">
                  {stageInfo.title}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Smooth multi-recipient WhatsApp notification routing with live stage photo verification
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onOpenInteractiveCard && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInteractiveCard();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-xs font-semibold text-emerald-300 border border-emerald-600/40 rounded-lg transition-colors shadow-sm"
                title="Create Media Flyer Card + Clickable Quick Reply Buttons (like WhatsApp Catalog)"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Interactive Spec Card & Buttons</span>
              </button>
            )}

            {onOpenTemplateEditor && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTemplateEditor();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Customize Templates</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Recipient Switcher Tabs */}
        <div className="px-6 pt-3 pb-2 bg-neutral-950/40 border-b border-neutral-800/80">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Select Target Recipient (Fixed Plant Team + Customer + Delays):</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {/* Customer */}
            <button
              onClick={() => {
                setActiveRecipient('customer');
                setIsEditingMessage(false);
                setCustomMessage('');
                setCustomTargetPhone('');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                activeRecipient === 'customer'
                  ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-md ring-1 ring-emerald-500/30'
                  : 'bg-neutral-800/50 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold">1. Customer</span>
              </div>
              <div className="text-xs text-white font-medium truncate">{order.customerName}</div>
              <div className="text-[10px] text-neutral-400 truncate">{order.customerPhone}</div>
            </button>

            {/* Sales Executive */}
            <button
              onClick={() => {
                setActiveRecipient('sales');
                setIsEditingMessage(false);
                setCustomMessage('');
                setCustomTargetPhone('');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                activeRecipient === 'sales'
                  ? 'bg-purple-950/40 border-purple-500 text-purple-300 shadow-md ring-1 ring-purple-500/30'
                  : 'bg-neutral-800/50 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold">2. Sales Rep</span>
              </div>
              <div className="text-xs text-white font-medium truncate">{order.salesPersonName || 'Sales Rep'}</div>
              <div className="text-[10px] text-neutral-400 truncate">{order.salesPersonPhone || 'Fixed in Directory'}</div>
            </button>

            {/* Production Head */}
            <button
              onClick={() => {
                setActiveRecipient('production');
                setIsEditingMessage(false);
                setCustomMessage('');
                setCustomTargetPhone('');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                activeRecipient === 'production'
                  ? 'bg-amber-950/40 border-amber-500 text-amber-300 shadow-md ring-1 ring-amber-500/30'
                  : 'bg-neutral-800/50 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Factory className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold">3. Plant Head</span>
              </div>
              <div className="text-xs text-white font-medium truncate">{settings.productionSupervisorName}</div>
              <div className="text-[10px] text-neutral-400 truncate">{settings.productionSupervisorPhone}</div>
            </button>

            {/* Plant Owner */}
            <button
              onClick={() => {
                setActiveRecipient('owner');
                setIsEditingMessage(false);
                setCustomMessage('');
                setCustomTargetPhone('');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                activeRecipient === 'owner'
                  ? 'bg-blue-950/40 border-blue-500 text-blue-300 shadow-md ring-1 ring-blue-500/30'
                  : 'bg-neutral-800/50 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold">4. Plant Owner</span>
              </div>
              <div className="text-xs text-white font-medium truncate">{settings.ownerName}</div>
              <div className="text-[10px] text-neutral-400 truncate">{settings.ownerPhone}</div>
            </button>

            {/* Stage Delay Notice */}
            <button
              onClick={() => {
                setActiveRecipient('delay');
                setIsEditingMessage(false);
                setCustomMessage('');
                setCustomTargetPhone('');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                activeRecipient === 'delay'
                  ? 'bg-rose-950/40 border-rose-500 text-rose-300 shadow-md ring-1 ring-rose-500/30'
                  : 'bg-neutral-800/50 border-neutral-800 text-rose-400 hover:border-rose-700 hover:text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-semibold">5. Delay Alert</span>
              </div>
              <div className="text-xs text-white font-medium truncate">
                {order.isStageDelayed ? `+${order.currentDelayHours || 4}h Delay` : 'Dispatch Alert'}
              </div>
              <div className="text-[10px] text-rose-400 truncate">
                {order.currentDelayReason ? 'Logged Delay' : 'Urgent Notice'}
              </div>
            </button>
          </div>

          {/* Dynamic Owner Selector Sub-bar */}
          {activeRecipient === 'owner' && ownersList.length > 1 && (
            <div className="mt-2.5 pt-2 border-t border-neutral-800 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-blue-300 font-semibold shrink-0">Select Plant Owner:</span>
              {ownersList.map((own) => (
                <button
                  key={own.id}
                  type="button"
                  onClick={() => {
                    setSelectedOwnerId(own.id);
                    setIsEditingMessage(false);
                    setCustomMessage('');
                  }}
                  className={`px-2.5 py-1 rounded-lg border transition-all text-xs flex items-center gap-1.5 shrink-0 ${
                    selectedOwnerId === own.id
                      ? 'bg-blue-600 text-white border-blue-500 font-bold shadow'
                      : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <span>{own.name}</span>
                  <span className="text-[10px] opacity-80">({own.designation})</span>
                </button>
              ))}
            </div>
          )}

          {/* Dynamic Production Head Selector Sub-bar */}
          {activeRecipient === 'production' && prodHeadsList.length > 1 && (
            <div className="mt-2.5 pt-2 border-t border-neutral-800 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-amber-300 font-semibold shrink-0">Select Production Head:</span>
              {prodHeadsList.map((head) => (
                <button
                  key={head.id}
                  type="button"
                  onClick={() => {
                    setSelectedProdHeadId(head.id);
                    setIsEditingMessage(false);
                    setCustomMessage('');
                  }}
                  className={`px-2.5 py-1 rounded-lg border transition-all text-xs flex items-center gap-1.5 shrink-0 ${
                    selectedProdHeadId === head.id
                      ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold shadow'
                      : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <span>{head.name}</span>
                  <span className="text-[10px] opacity-80">({head.designation})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal Main Content */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
          {/* Left Column: Stage Photo Proof & WhatsApp Launch Actions */}
          <div className="lg:col-span-5 space-y-4">
            {/* Stage Progress Photo Card */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span>Stage Production Proof Photo</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  Attached to Customer Update
                </span>
              </div>

              {/* Photo Display */}
              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 group">
                {customPhotoUrl ? (
                  <img
                    src={customPhotoUrl}
                    alt="Stage Proof"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <span className="text-xs">No stage photo attached yet</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                  <span className="text-[11px] text-white font-medium bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                    {stageInfo.title}
                  </span>
                </div>
              </div>

              {/* Photo Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPhotoPickerOpen(!isPhotoPickerOpen)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-medium border border-neutral-700 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>{customPhotoUrl ? 'Preset Photos' : 'Pick Photo'}</span>
                </button>
                <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded-lg text-xs font-semibold border border-amber-500/40 cursor-pointer transition-colors">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {/* Copy Image for Direct Paste in WhatsApp & Open Standalone Photo Link */}
              {customPhotoUrl && (
                <div className="pt-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyPhotoToClipboard}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        photoCopiedToClipboard
                          ? 'bg-emerald-500 text-neutral-950 border-emerald-400 font-bold'
                          : 'bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border-emerald-700/60'
                      }`}
                    >
                      {photoCopiedToClipboard ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>
                        {photoCopiedToClipboard
                          ? 'Photo Copied! Press Ctrl+V in WhatsApp'
                          : 'Copy Photo (Paste in WhatsApp)'}
                      </span>
                    </button>

                    <a
                      href={
                        customPhotoUrl.startsWith('/api/photos/')
                          ? customPhotoUrl.replace('/api/photos/', '/api/photo-view/')
                          : customPhotoUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium border border-neutral-700 flex items-center gap-1 transition-colors"
                      title="Open direct photo page (never opens dashboard)"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                      <span>Photo Link</span>
                    </a>
                  </div>
                  <div className="text-[10px] text-emerald-400/90 bg-emerald-950/30 border border-emerald-900/40 rounded px-2 py-1 leading-snug">
                    ✓ <strong>Direct Photo Link Ready:</strong> Clicking the photo link in WhatsApp opens ONLY this image (not your dashboard). Photo is also auto-copied so you can press <strong>Ctrl+V</strong> inside WhatsApp chat!
                  </div>
                </div>
              )}

              {/* Photo Picker Drawer */}
              {isPhotoPickerOpen && (
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2">
                  <div className="text-[11px] font-semibold text-neutral-300">
                    Select Genuine Stage Snapshot:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {presetPhotosForStage.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPresetPhoto(preset.url)}
                        className={`text-left p-1.5 rounded-lg border transition-all ${
                          customPhotoUrl === preset.url
                            ? 'border-emerald-500 bg-emerald-950/30'
                            : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-full h-14 object-cover rounded mb-1"
                        />
                        <div className="text-[10px] text-neutral-300 truncate">{preset.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick 1-Click Launchers */}
            <div className="bg-neutral-950 border border-emerald-800/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      waSession.status === 'connected' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                    }`}
                  />
                  <span>Embedded WhatsApp Engine (Same Webpage):</span>
                </div>
                {waSession.status === 'connected' ? (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                    ✓ Linked ({waSession.connectedPhone})
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowQuickQRDrawer(!showQuickQRDrawer)}
                    className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold hover:bg-amber-500/30"
                  >
                    {showQuickQRDrawer ? 'Hide QR' : '⚡ Scan QR to Link Phone'}
                  </button>
                )}
              </div>

              {/* Editable Target Phone Number */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-emerald-400 uppercase">
                  📲 Target WhatsApp Number (Editable for Live Testing):
                </label>
                <input
                  type="text"
                  value={customTargetPhone || recipient.phone}
                  onChange={(e) => setCustomTargetPhone(e.target.value)}
                  placeholder="+91 98401 23456"
                  className="w-full bg-neutral-900 border border-neutral-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              {/* Inline QR Scan Box if Phone Not Linked */}
              {showQuickQRDrawer && waSession.status !== 'connected' && (
                <div className="p-3 rounded-xl bg-[#111b21] border border-emerald-500/50 text-center space-y-2">
                  <div className="text-[11px] font-bold text-white">
                    Scan with WhatsApp → Linked Devices → Link a Device
                  </div>
                  <div className="mx-auto w-44 h-44 bg-white p-2 rounded-xl flex items-center justify-center">
                    {waSession.qrDataUrl ? (
                      <img
                        src={waSession.qrDataUrl}
                        alt="WhatsApp QR"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-neutral-700">Loading QR...</span>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-400">
                    Once scanned, messages & photos send directly from your WhatsApp number to {effectivePhone}!
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {/* PRIMARY: 1-Click Send Directly Inside App */}
                <button
                  type="button"
                  onClick={handleSendDirectlyInsideApp}
                  disabled={isSendingInApp}
                  className="w-full flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-neutral-950 rounded-xl text-xs font-extrabold transition-all shadow-lg shadow-emerald-900/40 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    <span>
                      {isSendingInApp
                        ? 'Dispatching via WhatsApp Engine...'
                        : `Send WhatsApp Message to ${effectivePhone}`}
                    </span>
                  </div>
                  <span className="text-[10px] bg-neutral-950/20 px-2 py-0.5 rounded font-bold">
                    {waSession.status === 'connected' ? 'Real Phone' : 'Same Page'}
                  </span>
                </button>

                {inAppSentBanner && (
                  <div
                    className={`p-2.5 rounded-xl text-[11px] font-medium flex items-start gap-2 animate-in fade-in ${
                      inAppSentBanner.isReal
                        ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-300'
                        : 'bg-amber-950/80 border border-amber-500/60 text-amber-200'
                    }`}
                  >
                    {inAppSentBanner.isReal ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <span>{inAppSentBanner.text}</span>
                  </div>
                )}

                <div className="p-2.5 rounded-lg bg-neutral-900/90 border border-neutral-800 text-[11px] text-neutral-300 leading-relaxed">
                  🔒 <strong>Same-Webpage WhatsApp Engine:</strong>{' '}
                  {waSession.status === 'connected'
                    ? `Connected to ${waSession.connectedPhone}. Clicking Send delivers real WhatsApp messages & stage photos directly to ${effectivePhone}.`
                    : 'Scan the QR code once with your phone so messages deliver directly to real WhatsApp numbers without opening any tab.'}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live WhatsApp Message Mockup & Customizer */}
          <div className="lg:col-span-7 space-y-4">
            {/* WhatsApp Bubble Preview */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col h-full">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                    {recipient.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{recipient.name}</span>
                      <span className="text-[10px] font-normal text-neutral-400">({recipient.role})</span>
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono">{recipient.phone}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isEditingMessage && (
                    <button
                      type="button"
                      onClick={handleSaveAsDefaultTemplate}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 rounded-lg text-xs font-bold transition-all shadow-sm"
                      title="Save this edited text as default template"
                    >
                      {templateSaved ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{templateSaved ? 'Saved Template!' : 'Save as Template'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-medium border border-neutral-700 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingMessage(!isEditingMessage)}
                    className="text-xs text-amber-400 hover:text-amber-300 underline font-medium"
                  >
                    {isEditingMessage ? 'Preview Mode' : 'Edit Text'}
                  </button>
                </div>
              </div>

              {/* Language Selection for Production Head */}
              {activeRecipient === 'production' && (
                <div className="mb-3 p-2.5 bg-neutral-900/90 rounded-xl border border-amber-500/30 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                    <Languages className="w-4 h-4 text-amber-400" />
                    <span>Production Head Language (भाषा):</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setProdHeadLang('hi');
                        setCustomMessage('');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        prodHeadLang === 'hi'
                          ? 'bg-amber-400 text-neutral-950 shadow-sm'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      }`}
                    >
                      🇮🇳 हिन्दी (Hindi)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProdHeadLang('hinglish');
                        setCustomMessage('');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        prodHeadLang === 'hinglish'
                          ? 'bg-amber-400 text-neutral-950 shadow-sm'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      }`}
                    >
                      💬 Hinglish
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProdHeadLang('en');
                        setCustomMessage('');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        prodHeadLang === 'en'
                          ? 'bg-amber-400 text-neutral-950 shadow-sm'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      }`}
                    >
                      🇬🇧 English
                    </button>
                  </div>
                </div>
              )}

              {/* Message Content Container Styled as WhatsApp Bubble */}
              <div className="flex-1 bg-[#0b141a] rounded-xl p-4 border border-[#202c33] font-sans text-sm text-[#e9edef] overflow-y-auto max-h-[380px] shadow-inner space-y-3">
                {/* Photo in bubble if available */}
                {customPhotoUrl && (
                  <div className="rounded-lg overflow-hidden border border-[#202c33]">
                    <img src={customPhotoUrl} alt="Stage Proof" className="w-full max-h-48 object-cover" />
                    <div className="p-1.5 bg-[#1f2c34] text-[11px] text-[#8696a0] flex items-center justify-between">
                      <span>📷 Production verification snapshot</span>
                      <span>Verified</span>
                    </div>
                  </div>
                )}

                {/* Text Bubble */}
                {isEditingMessage ? (
                  <textarea
                    value={activeMessageText}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={12}
                    className="w-full bg-[#111b21] border border-[#222e35] rounded-lg p-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 resize-none"
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-xs leading-relaxed bg-[#005c4b]/30 p-3.5 rounded-lg border border-[#005c4b]/50">
                    {activeMessageText}
                    <div className="mt-2 text-right text-[10px] text-[#8696a0] flex items-center justify-end gap-1">
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                    </div>
                  </div>
                )}

                {/* Previously Sent In-App Messages for this Order */}
                {chatHistory.length > 0 && (
                  <div className="pt-3 border-t border-[#202c33] space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                      <span>✓ Dispatched Directly From Inside App ({chatHistory.length})</span>
                      <span className="text-[#8696a0] font-normal">Live Chat Log</span>
                    </div>
                    {chatHistory.slice(0, 4).map((msg) => (
                      <div
                        key={msg.id}
                        className="p-2.5 rounded-lg bg-[#005c4b]/50 border border-emerald-500/30 text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] text-emerald-300 font-semibold">
                          <span>To: {msg.recipientName} ({msg.recipientPhone})</span>
                          <span className="text-[#8696a0] font-mono">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                          </span>
                        </div>
                        {msg.photoUrl && (
                          <div className="flex items-center gap-2 py-1">
                            <img src={msg.photoUrl} alt="Sent" className="w-10 h-8 object-cover rounded border border-emerald-500/30" />
                            <span className="text-[10px] text-emerald-200">📸 Photo Proof Attached</span>
                          </div>
                        )}
                        <div className="text-[#e9edef] line-clamp-2 whitespace-pre-wrap">{msg.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Technical Spec Quick Tags */}
              <div className="mt-3 pt-3 border-t border-neutral-800/80 flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="text-neutral-500">Box Specs:</span>
                <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                  {order.dimensions.lengthMm}x{order.dimensions.widthMm}x{order.dimensions.heightMm} mm
                </span>
                <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  {order.ply} ({order.flute})
                </span>
                <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  Finish: {order.lamination || 'None'}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  GSM: {order.paperSpecs.topLinerGsm}/{order.paperSpecs.flutingMediumGsm}/{order.paperSpecs.bottomLinerGsm}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  BF: {order.paperSpecs.burstingFactor}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-xs text-neutral-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Built-In Direct WhatsApp Messenger Active (No external webpage required)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSendDirectlyInsideApp}
              disabled={isSendingInApp}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shadow-lg shadow-emerald-900/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isSendingInApp ? 'Sending...' : `Send Directly to ${recipient.role} (In-App)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
