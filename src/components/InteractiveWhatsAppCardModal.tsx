import React, { useState, useRef } from 'react';
import { CorrugatedOrder, FactorySettings } from '../types/order';
import { 
  DEFAULT_INTERACTIVE_TEMPLATES, 
  WhatsAppInteractiveCardConfig, 
  InteractiveButtonConfig,
  generateWhatsAppCloudApiPayload,
  generateInteractiveShareText
} from '../utils/whatsappInteractive';
import { formatCurrency, formatDateTime } from '../utils/whatsapp';
import { sendDirectInAppWhatsApp } from '../utils/whatsappClient';
import { soundManager } from '../utils/audio';
import { 
  X, 
  Phone, 
  CornerDownLeft, 
  Send, 
  Copy, 
  Download, 
  Check, 
  Sparkles, 
  Share2, 
  Smartphone, 
  FileCode, 
  ExternalLink,
  Plus,
  Trash2,
  Package,
  Layers,
  CheckCircle2,
  Eye,
  Camera,
  MessageSquare
} from 'lucide-react';

interface InteractiveWhatsAppCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: CorrugatedOrder;
  settings: FactorySettings;
  onLogDispatched?: (recipientRole: string, phone: string, snippet: string) => void;
}

export const InteractiveWhatsAppCardModal: React.FC<InteractiveWhatsAppCardModalProps> = ({
  isOpen,
  onClose,
  order,
  settings,
  onLogDispatched,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'customize' | 'api_payload'>('preview');
  const [templateKey, setTemplateKey] = useState<string>('reorder_reminder');
  
  const [cardConfig, setCardConfig] = useState<WhatsAppInteractiveCardConfig>(() => ({
    ...DEFAULT_INTERACTIVE_TEMPLATES.reorder_reminder,
    buttons: [
      { 
        id: 'btn_call', 
        type: 'call', 
        label: `📞 Call ${order.salesPersonName ? order.salesPersonName.split(' ')[0] : 'Sales Team'} !!`, 
        value: order.salesPersonPhone || settings.salesTeam?.[0]?.phone || settings.contactNumber, 
        icon: 'phone' 
      },
      { 
        id: 'btn_reply', 
        type: 'quick_reply', 
        label: '↩ Interested !! Send Price', 
        value: `Interested in re-ordering #${order.id} (${order.dimensions.lengthMm}x${order.dimensions.widthMm}x${order.dimensions.heightMm} mm)! Please send updated rate for next month.`, 
        icon: 'reply' 
      },
    ]
  }));

  const [recipientTarget, setRecipientTarget] = useState<'customer' | 'sales' | 'custom'>('customer');
  const [customPhone, setCustomPhone] = useState(order.customerPhone);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [activeSimulatedReply, setActiveSimulatedReply] = useState<string | null>(null);

  const flyerCardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const currentRecipientPhone = recipientTarget === 'customer' 
    ? order.customerPhone 
    : recipientTarget === 'sales' 
      ? (order.salesPersonPhone || settings.salesTeam?.[0]?.phone || settings.contactNumber)
      : customPhone;

  const shareText = generateInteractiveShareText(order, cardConfig, settings);
  const apiPayload = generateWhatsAppCloudApiPayload(currentRecipientPhone, order, cardConfig, settings);

  const handleSelectTemplate = (key: string) => {
    setTemplateKey(key);
    const base = DEFAULT_INTERACTIVE_TEMPLATES[key] || DEFAULT_INTERACTIVE_TEMPLATES.reorder_reminder;
    setCardConfig({
      ...base,
      buttons: [
        { 
          id: 'btn_call', 
          type: 'call', 
          label: `📞 Call ${order.salesPersonName ? order.salesPersonName.split(' ')[0] : 'Sales Team'} !!`, 
          value: order.salesPersonPhone || settings.salesTeam?.[0]?.phone || settings.contactNumber, 
          icon: 'phone' 
        },
        ...base.buttons.filter(b => b.type !== 'call')
      ]
    });
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2200);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(apiPayload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2200);
  };

  // Client-side HTML Canvas image export for 100% fidelity
  const handleDownloadFlyerImage = async () => {
    if (!flyerCardRef.current) return;
    setIsExportingImage(true);

    try {
      // Draw onto an SVG / Canvas to allow saving as PNG image
      const node = flyerCardRef.current;
      const width = node.offsetWidth || 500;
      const height = node.offsetHeight || 680;

      const canvas = document.createElement('canvas');
      canvas.width = width * 2; // retina 2x
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.scale(2, 2);
        // Fill clean white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Serialize HTML to SVG foreignObject
        const htmlContent = new XMLSerializer().serializeToString(node);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; background: #fff; width: ${width}px; height: ${height}px;">
              ${htmlContent}
            </div>
          </foreignObject>
        </svg>`;

        const img = new Image();
        const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(svgBlob);

        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(blobURL);

          const a = document.createElement('a');
          a.download = `WhatsApp_Card_${order.id}_${order.customerCompany.replace(/\s+/g, '_')}.png`;
          a.href = canvas.toDataURL('image/png');
          a.click();
          setIsExportingImage(false);
        };

        img.onerror = () => {
          setIsExportingImage(false);
          // Fallback: copy formatted text
          handleCopyText();
        };

        img.src = blobURL;
      }
    } catch {
      setIsExportingImage(false);
      handleCopyText();
    }
  };

  const [isSendingInApp, setIsSendingInApp] = useState(false);
  const [inAppSentNotice, setInAppSentNotice] = useState<{ text: string; isReal: boolean } | null>(null);

  const handleSendInteractiveCardInApp = async () => {
    setIsSendingInApp(true);
    setInAppSentNotice(null);

    try {
      const roleLabel = recipientTarget === 'customer' ? 'Customer' : 'Sales Executive';
      const nameLabel =
        recipientTarget === 'customer'
          ? `${order.customerName} (${order.customerCompany})`
          : order.salesPersonName || 'Sales Executive';

      const lastHistPhoto = order.stageHistory?.[order.stageHistory.length - 1]?.photoUrl;

      const result = await sendDirectInAppWhatsApp({
        order,
        settings,
        recipientRole: roleLabel,
        recipientName: nameLabel,
        recipientPhone: currentRecipientPhone,
        message: shareText,
        photoUrl: lastHistPhoto,
      });

      if (settings.enableSoundAlerts) {
        soundManager.playStageUpdateSound();
      }

      if (onLogDispatched) {
        onLogDispatched(
          roleLabel,
          currentRecipientPhone,
          `📲 Sent Interactive WhatsApp Card In-App: ${cardConfig.title} to ${currentRecipientPhone}`
        );
      }

      if (result.realExternalDelivered) {
        setInAppSentNotice({
          isReal: true,
          text: `✓ REAL WHATSAPP DELIVERED to ${nameLabel} (${currentRecipientPhone}) via ${result.providerUsed}!`,
        });
        setTimeout(() => setInAppSentNotice(null), 6000);
      } else {
        setInAppSentNotice({
          isReal: false,
          text: `⚠️ Saved in app log ONLY — Not delivered to ${currentRecipientPhone} on real WhatsApp because your WhatsApp phone is not linked yet! Go to the In-App WhatsApp tab and scan the QR Code to link your phone.`,
        });
      }
    } finally {
      setIsSendingInApp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl my-auto max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold uppercase text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
                  WhatsApp Interactive Message Builder
                </span>
                <span className="text-xs text-neutral-400">
                  Media Card + Clickable Quick Reply Buttons
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">
                Catalog Flyer & Action Buttons for #{order.id} ({order.customerCompany})
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switchers */}
            <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'preview' ? 'bg-amber-400 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>WhatsApp Simulator</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('customize')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'customize' ? 'bg-amber-400 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Edit Specs & Buttons</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('api_payload')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'api_payload' ? 'bg-amber-400 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Cloud API JSON</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preset Selector Banner */}
        <div className="px-6 py-2.5 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between gap-3 overflow-x-auto text-xs">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 font-medium shrink-0">Preset Style:</span>
            {[
              { id: 'reorder_reminder', label: 'Monthly Reorder & Price List', icon: '📦' },
              { id: 'stage_update', label: 'Quality Proof & Stage Update', icon: '✅' },
              { id: 'dispatch_notice', label: 'Dispatch Notice & Gate Pass', icon: '🚚' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectTemplate(p.id)}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                  templateKey === p.id 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold shadow-sm' 
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-neutral-400">Recipient:</span>
            <select
              value={recipientTarget}
              onChange={(e) => setRecipientTarget(e.target.value as any)}
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-amber-400 font-mono"
            >
              <option value="customer">Customer ({order.customerPhone})</option>
              <option value="sales">Sales Executive ({order.salesPersonPhone || 'Directory'})</option>
              <option value="custom">Custom Phone Number</option>
            </select>
            {recipientTarget === 'custom' && (
              <input
                type="text"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                placeholder="+91..."
                className="bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-white text-xs w-32 font-mono"
              />
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-950/50">
          {activeTab === 'preview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* WhatsApp Mobile Chat Simulator (Left 7 cols) */}
              <div className="lg:col-span-7 flex flex-col items-center">
                {/* Mobile Phone Mockup Frame */}
                <div className="w-full max-w-md bg-[#0b141a] rounded-[36px] p-3 shadow-2xl border-4 border-neutral-800 text-neutral-100 flex flex-col relative overflow-hidden">
                  {/* Phone Status Bar */}
                  <div className="flex items-center justify-between px-4 py-1.5 text-[11px] font-mono text-neutral-300">
                    <span className="font-bold">2:30</span>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span>Vo LTE 5G</span>
                      <span>81%</span>
                    </div>
                  </div>

                  {/* WhatsApp Chat Header */}
                  <div className="bg-[#1f2c34] px-3 py-2 rounded-2xl flex items-center justify-between text-white shadow-sm mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-emerald-700/80 border border-emerald-500/50 flex items-center justify-center font-bold text-sm tracking-wider text-white overflow-hidden shadow-inner">
                        {order.customerCompany.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold tracking-wide">
                          {order.customerCompany.toUpperCase()}
                        </div>
                        <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>online · WhatsApp Business Verified</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Chat Wallpaper Area */}
                  <div 
                    className="p-3 rounded-2xl flex flex-col gap-2 min-h-[500px]"
                    style={{
                      backgroundColor: '#efeae2',
                      backgroundImage: `radial-gradient(#d1c7b7 0.75px, transparent 0.75px)`,
                      backgroundSize: '16px 16px',
                    }}
                  >
                    {/* Unread banner */}
                    <div className="flex justify-center my-1">
                      <span className="bg-white/90 text-neutral-700 text-[11px] px-3 py-0.5 rounded-full font-medium shadow-sm border border-neutral-200">
                        1 unread message
                      </span>
                    </div>

                    {/* WhatsApp Inbound / Outbound Chat Bubble */}
                    <div className="self-end max-w-[94%] bg-white rounded-2xl p-2.5 shadow-md border border-neutral-200/80 text-neutral-900 text-xs flex flex-col gap-2 animate-in fade-in">
                      {/* 1. VISUAL FLYER / SPEC CARD (The exact graphic card from screenshot!) */}
                      <div 
                        ref={flyerCardRef}
                        className="bg-white rounded-xl border border-neutral-300 p-3 shadow-inner flex flex-col gap-2.5 overflow-hidden text-neutral-900"
                        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                      >
                        {/* Flyer Header */}
                        <div className="flex items-start justify-between border-b pb-2 border-neutral-300">
                          <div className="flex items-center gap-2">
                            <div className="bg-red-600 text-white font-black px-2 py-1 rounded text-xs tracking-wider">
                              {settings.companyName.split(' ')[0].toUpperCase()}
                            </div>
                            <div className="text-[9px] font-bold text-neutral-700 leading-tight">
                              PACKAGING SYSTEMS
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] font-mono text-neutral-500">
                              REF: {order.id} • {new Date().toLocaleDateString('en-GB')}
                            </div>
                            <div className="text-xs font-black tracking-wide text-neutral-900 uppercase">
                              {cardConfig.title}
                            </div>
                          </div>
                        </div>

                        {/* Title & Product Name */}
                        <div className="text-center bg-neutral-100 py-1 px-2 rounded border border-neutral-200">
                          <div className="text-[11px] font-black uppercase text-neutral-900">
                            {order.ply} CORRUGATED {order.boxStyle.toUpperCase()} CARTONS ({order.lamination || 'MATT'} LAMINATION)
                          </div>
                          <div className="text-[9px] font-bold text-red-600">
                            PRINT COLOR: {order.printingDetails || order.colorType} · JOINT: {order.jointType.toUpperCase()}
                          </div>
                        </div>

                        {/* Structured Specification & Price Table */}
                        <div className="overflow-hidden border border-neutral-300 rounded text-[9px]">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-sky-600 text-white font-bold">
                                <th className="p-1 border-r border-sky-500">SIZE (L×W×H)</th>
                                <th className="p-1 border-r border-sky-500">PLY / FLUTE</th>
                                <th className="p-1 border-r border-sky-500">GSM T/F/B</th>
                                <th className="p-1 border-r border-sky-500">PCS/CTN</th>
                                <th className="p-1 text-right">INR/BOX</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200">
                              <tr className="bg-white hover:bg-neutral-50 font-mono">
                                <td className="p-1 font-bold border-r border-neutral-200 text-neutral-900">
                                  {order.dimensions.lengthMm}×{order.dimensions.widthMm}×{order.dimensions.heightMm} mm
                                </td>
                                <td className="p-1 border-r border-neutral-200 text-neutral-700">
                                  {order.ply} ({order.flute})
                                </td>
                                <td className="p-1 border-r border-neutral-200 text-neutral-700">
                                  {order.paperSpecs?.topLinerGsm || 180}/{order.paperSpecs?.flutingMediumGsm || 120}/{order.paperSpecs?.bottomLinerGsm || 150}
                                </td>
                                <td className="p-1 border-r border-neutral-200 text-neutral-700">
                                  25 / Bundle
                                </td>
                                <td className="p-1 text-right font-black text-emerald-700">
                                  {formatCurrency(order.ratePerBox)}
                                </td>
                              </tr>
                              <tr className="bg-neutral-50/70 font-mono">
                                <td className="p-1 font-bold border-r border-neutral-200 text-neutral-900">
                                  Total Batch
                                </td>
                                <td className="p-1 border-r border-neutral-200 text-neutral-700" colSpan={2}>
                                  {order.quantity.toLocaleString()} Boxes Order
                                </td>
                                <td className="p-1 border-r border-neutral-200 text-neutral-700 font-bold">
                                  {Math.ceil(order.quantity / 25)} Bundles
                                </td>
                                <td className="p-1 text-right font-black text-neutral-900">
                                  {formatCurrency(order.totalAmount)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Terms & Conditions Box */}
                        <div className="p-1.5 rounded bg-neutral-50 border border-neutral-200 text-[8px] text-neutral-600 leading-tight">
                          <div className="font-bold text-neutral-800 mb-0.5">Terms & Conditions:</div>
                          <div>1. GST: 18% Extra as applicable</div>
                          <div>2. Packing: Bundled with PP Strapping + Stretch Wrap</div>
                          <div>3. Delivery SLA: {formatDateTime(order.expectedDeliveryDate)}</div>
                          <div>4. Sales Person: {order.salesPersonName || settings.salesTeam?.[0]?.name} ({order.salesPersonPhone || settings.salesTeam?.[0]?.phone})</div>
                          <div>5. Minimum Order Qty: {order.quantity} Pcs Batch</div>
                        </div>

                        {/* Visual Mockup Icons (Brand, Box, Carton) */}
                        <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-neutral-200">
                          <div className="flex flex-col items-center">
                            <div className="w-12 h-10 rounded border border-neutral-300 bg-neutral-100 flex items-center justify-center p-1">
                              <span className="font-bold text-[9px] text-neutral-800 uppercase tracking-tighter">
                                {order.customerCompany.slice(0, 5)}
                              </span>
                            </div>
                            <span className="text-[8px] font-bold text-neutral-600 mt-0.5">BRAND LOGO</span>
                          </div>

                          <div className="flex flex-col items-center">
                            <div className="w-12 h-10 rounded border border-amber-300 bg-amber-50/80 flex items-center justify-center text-amber-700 font-bold text-xs">
                              📦
                            </div>
                            <span className="text-[8px] font-bold text-neutral-600 mt-0.5">SINGLE BOX</span>
                          </div>

                          <div className="flex flex-col items-center">
                            <div className="w-12 h-10 rounded border border-amber-400 bg-amber-100/80 flex items-center justify-center text-amber-800 font-bold text-xs">
                              📦📦
                            </div>
                            <span className="text-[8px] font-bold text-neutral-600 mt-0.5">MASTER CTN</span>
                          </div>
                        </div>

                        {/* Footer Email / Hotline */}
                        <div className="bg-neutral-900 text-white text-[8px] py-0.5 text-center font-mono rounded">
                          Factory Desk: {settings.contactNumber} • Owner: {settings.ownerPhone}
                        </div>
                      </div>

                      {/* 2. CAPTION & HASHTAGS (Exact style from screenshot) */}
                      <div className="text-neutral-900 text-xs px-1 leading-relaxed">
                        <p className="font-medium">{cardConfig.caption}</p>
                        <div className="text-sky-700 text-[11px] font-mono mt-2 font-medium">
                          {cardConfig.hashtags.join(' ')}
                        </div>
                      </div>

                      {/* Timestamp & double tick */}
                      <div className="flex items-center justify-end gap-1 text-[10px] text-neutral-400 px-1">
                        <span>2:30 pm</span>
                        <span className="text-sky-500 font-bold">✓✓</span>
                      </div>
                    </div>

                    {/* 3. INTERACTIVE CLICKABLE QUICK ACTION BUTTONS (The exact buttons from screenshot!) */}
                    <div className="self-end max-w-[94%] w-full flex flex-col gap-1.5 mt-0.5">
                      {cardConfig.buttons.map((btn) => (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => {
                            if (btn.type === 'call') {
                              window.location.href = `tel:${btn.value.replace(/\s+/g, '')}`;
                            } else {
                              setActiveSimulatedReply(btn.value);
                            }
                          }}
                          className="w-full bg-white hover:bg-neutral-50 active:bg-neutral-100 text-[#00a884] font-semibold text-xs py-2.5 px-4 rounded-xl shadow-sm border border-neutral-200 flex items-center justify-center gap-2 transition-all hover:shadow"
                        >
                          {btn.icon === 'phone' ? (
                            <Phone className="w-4 h-4 text-[#00a884]" />
                          ) : (
                            <CornerDownLeft className="w-4 h-4 text-[#00a884]" />
                          )}
                          <span>{btn.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Simulated Customer Reply Speech Bubble */}
                    {activeSimulatedReply && (
                      <div className="self-start max-w-[85%] bg-white rounded-2xl p-2.5 shadow-md border border-neutral-200 text-neutral-900 text-xs mt-2 animate-in fade-in slide-in-from-bottom-2">
                        <div className="text-[10px] font-bold text-neutral-500 flex items-center justify-between mb-1">
                          <span>{order.customerName} (Customer Response)</span>
                          <button 
                            onClick={() => setActiveSimulatedReply(null)}
                            className="text-neutral-400 hover:text-neutral-600 text-[10px]"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="font-medium text-emerald-800">
                          {activeSimulatedReply}
                        </p>
                        <div className="text-right text-[10px] text-neutral-400 mt-1">
                          Just now
                        </div>
                      </div>
                    )}
                  </div>

                  {/* WhatsApp Chat Input Bar Footer */}
                  <div className="bg-[#1f2c34] px-3 py-2 flex items-center justify-between gap-2 text-neutral-400 text-xs">
                    <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-1.5 text-neutral-300 text-xs">
                      Message
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[#00a884] text-white flex items-center justify-center font-bold text-xs shadow">
                      🎙️
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Toolbar & One-Click Sharing (Right 5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {/* Primary Quick Launch Buttons */}
                <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-sm font-bold text-white">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-emerald-400" />
                      <span>Dispatch Inside Same Webpage</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Zero External Tabs
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendInteractiveCardInApp}
                    disabled={isSendingInApp}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl text-xs font-extrabold transition-all shadow-lg shadow-emerald-950/60 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isSendingInApp
                        ? 'Dispatching Inside Webpage...'
                        : `Send Interactive Card Now (${currentRecipientPhone})`}
                    </span>
                  </button>

                  {inAppSentNotice && (
                    <div
                      className={`p-2.5 rounded-xl text-[11px] font-semibold flex items-start gap-2 ${
                        inAppSentNotice.isReal
                          ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-950/80 border border-amber-500/60 text-amber-200'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{inAppSentNotice.text}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={handleDownloadFlyerImage}
                      disabled={isExportingImage}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-xl text-xs font-medium transition-colors"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>{isExportingImage ? 'Generating...' : 'Save Flyer (PNG)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-xl text-xs font-medium transition-colors"
                    >
                      {copiedText ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-neutral-400" />
                          <span>Copy Caption</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Technical Specifications Summary */}
                <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-2.5 text-xs">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>Card Product Highlights</span>
                    <span className="font-mono text-amber-400">#{order.id}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                      <span className="text-neutral-500 block">Box Dimensions:</span>
                      <span className="text-neutral-200 font-bold">
                        {order.dimensions.lengthMm} × {order.dimensions.widthMm} × {order.dimensions.heightMm} mm
                      </span>
                    </div>

                    <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                      <span className="text-neutral-500 block">Structure & Finish:</span>
                      <span className="text-neutral-200 font-bold">
                        {order.ply} • {order.lamination || 'None'}
                      </span>
                    </div>

                    <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                      <span className="text-neutral-500 block">GSM Makeup:</span>
                      <span className="text-neutral-200 font-bold">
                        Top {order.paperSpecs?.topLinerGsm || 180} / Flute {order.paperSpecs?.flutingMediumGsm || 120} / Bottom {order.paperSpecs?.bottomLinerGsm || 150}
                      </span>
                    </div>

                    <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                      <span className="text-neutral-500 block">Batch Value:</span>
                      <span className="text-emerald-400 font-bold">
                        {formatCurrency(order.totalAmount)} ({order.quantity} pcs)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Helpful Instruction Note */}
                <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-200/90 leading-relaxed">
                  <span className="font-bold block text-amber-300 mb-0.5">💡 How to Send Image + Buttons on WhatsApp:</span>
                  1. Tap <strong>Save Flyer (PNG)</strong> to download the technical spec flyer.<br />
                  2. Tap <strong>WhatsApp Web / App</strong> to launch chat with {order.customerName}.<br />
                  3. Attach the flyer image with the pre-copied caption text, and recipients can tap the call and reply action triggers directly!
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customize' && (
            <div className="max-w-3xl mx-auto flex flex-col gap-5 text-xs">
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-white">Customize WhatsApp Card Content & Buttons</h3>

                {/* Card Title */}
                <div>
                  <label className="block text-neutral-400 font-medium mb-1">
                    Card Banner Title
                  </label>
                  <input
                    type="text"
                    value={cardConfig.title}
                    onChange={(e) => setCardConfig({ ...cardConfig, title: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                {/* Caption / Reminder message */}
                <div>
                  <label className="block text-neutral-400 font-medium mb-1">
                    WhatsApp Message Text (Caption below flyer)
                  </label>
                  <textarea
                    rows={4}
                    value={cardConfig.caption}
                    onChange={(e) => setCardConfig({ ...cardConfig, caption: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white font-mono text-xs leading-relaxed"
                  />
                </div>

                {/* Hashtags */}
                <div>
                  <label className="block text-neutral-400 font-medium mb-1">
                    Hashtags (Space separated)
                  </label>
                  <input
                    type="text"
                    value={cardConfig.hashtags.join(' ')}
                    onChange={(e) => setCardConfig({ 
                      ...cardConfig, 
                      hashtags: e.target.value.split(' ').filter(Boolean) 
                    })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sky-400 font-mono"
                  />
                </div>

                {/* Action Buttons Editor */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-neutral-300 font-bold">
                      Interactive Buttons (Max 3 supported in WhatsApp Business)
                    </label>
                    {cardConfig.buttons.length < 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newBtn: InteractiveButtonConfig = {
                            id: `btn_${Date.now()}`,
                            type: 'quick_reply',
                            label: '↩ Re-order Carton Batch',
                            value: `Please re-order ${order.quantity} cartons of #${order.id}`,
                            icon: 'reply'
                          };
                          setCardConfig({ ...cardConfig, buttons: [...cardConfig.buttons, newBtn] });
                        }}
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-xs font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Button</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {cardConfig.buttons.map((btn, index) => (
                      <div key={btn.id} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
                        <select
                          value={btn.type}
                          onChange={(e) => {
                            const newButtons = [...cardConfig.buttons];
                            newButtons[index].type = e.target.value as any;
                            newButtons[index].icon = e.target.value === 'call' ? 'phone' : 'reply';
                            setCardConfig({ ...cardConfig, buttons: newButtons });
                          }}
                          className="bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-white text-xs font-mono"
                        >
                          <option value="call">Phone Call (tel:)</option>
                          <option value="quick_reply">Quick Reply Text</option>
                        </select>

                        <input
                          type="text"
                          value={btn.label}
                          onChange={(e) => {
                            const newButtons = [...cardConfig.buttons];
                            newButtons[index].label = e.target.value;
                            setCardConfig({ ...cardConfig, buttons: newButtons });
                          }}
                          placeholder="Button Label"
                          className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-white text-xs"
                        />

                        <input
                          type="text"
                          value={btn.value}
                          onChange={(e) => {
                            const newButtons = [...cardConfig.buttons];
                            newButtons[index].value = e.target.value;
                            setCardConfig({ ...cardConfig, buttons: newButtons });
                          }}
                          placeholder={btn.type === 'call' ? '+91...' : 'Pre-filled Reply Text'}
                          className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-neutral-300 text-xs font-mono"
                        />

                        {cardConfig.buttons.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setCardConfig({
                                ...cardConfig,
                                buttons: cardConfig.buttons.filter((_, i) => i !== index)
                              });
                            }}
                            className="p-1.5 text-neutral-500 hover:text-rose-400 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold rounded-xl text-xs transition-colors"
                  >
                    View in WhatsApp Simulator →
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api_payload' && (
            <div className="max-w-3xl mx-auto flex flex-col gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      WhatsApp Business Cloud API Payload (JSON)
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Compatible with Meta Graph API, Wati, Interakt, AiSensy & Twilio
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied Payload</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-[380px] leading-relaxed">
                  {JSON.stringify(apiPayload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
