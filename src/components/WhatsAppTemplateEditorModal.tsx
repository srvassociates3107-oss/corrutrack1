import React, { useState } from 'react';
import { CorrugatedOrder, FactorySettings, WhatsAppTemplate } from '../types/order';
import { 
  DEFAULT_TEMPLATES, 
  getStoredCustomTemplates, 
  saveCustomTemplate, 
  resetTemplateToDefault, 
  resetAllTemplates, 
  renderCustomWhatsAppMessage,
  getActiveTemplateText
} from '../utils/whatsappTemplates';
import { buildWhatsappLink } from '../utils/whatsapp';
import { getProductCatalogItem, formatProductSpecsSummary } from '../utils/productCatalog';
import { 
  X, 
  Save, 
  RotateCcw, 
  MessageSquare, 
  Sparkles, 
  Check, 
  Copy, 
  ExternalLink, 
  Tag, 
  HelpCircle,
  AlertTriangle,
  Layers,
  UserCheck,
  Briefcase,
  Factory,
  Building2
} from 'lucide-react';

interface WhatsAppTemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: CorrugatedOrder[];
  settings: FactorySettings;
  onTemplatesUpdated?: () => void;
}

export const WhatsAppTemplateEditorModal: React.FC<WhatsAppTemplateEditorModalProps> = ({
  isOpen,
  onClose,
  orders,
  settings,
  onTemplatesUpdated,
}) => {
  const [selectedKey, setSelectedKey] = useState<string>(DEFAULT_TEMPLATES[0].key);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [editedText, setEditedText] = useState<string>(() => getActiveTemplateText(DEFAULT_TEMPLATES[0].key));
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentTemplateDef = DEFAULT_TEMPLATES.find((t) => t.key === selectedKey) || DEFAULT_TEMPLATES[0];
  const sampleOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  const handleSelectTemplate = (key: string) => {
    setSelectedKey(key);
    setEditedText(getActiveTemplateText(key));
    setSaveSuccess(false);
  };

  const handleInsertVariable = (variable: string) => {
    setEditedText((prev) => prev + ` ${variable} `);
  };

  const handleSave = () => {
    saveCustomTemplate(selectedKey, editedText);
    setSaveSuccess(true);
    if (onTemplatesUpdated) onTemplatesUpdated();
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleResetCurrent = () => {
    if (confirm(`Reset "${currentTemplateDef.title}" back to default factory format?`)) {
      resetTemplateToDefault(selectedKey);
      setEditedText(currentTemplateDef.template);
      if (onTemplatesUpdated) onTemplatesUpdated();
    }
  };

  const handleResetAll = () => {
    if (confirm('Reset ALL WhatsApp templates back to factory default formats?')) {
      resetAllTemplates();
      setEditedText(currentTemplateDef.template);
      if (onTemplatesUpdated) onTemplatesUpdated();
    }
  };

  // Filter templates by category
  const filteredTemplates = DEFAULT_TEMPLATES.filter((t) => {
    if (activeCategory === 'All') return true;
    return t.category === activeCategory;
  });

  // Render live preview with temporary editedText
  const renderLivePreview = () => {
    if (!sampleOrder) return 'No orders available for preview.';
    
    // Temporarily substitute variables in editedText
    const stageInfo = currentTemplateDef.key.includes('DELAY')
      ? { title: 'Board Corrugation Line 1', stepNumber: 2, description: 'Kraft fluting and reel mounting.' }
      : { title: 'Printing, Slotting & Finishing', stepNumber: 3, description: 'Flexo printing, rotary die-cutting.' };
    
    const trackUrl = typeof window !== 'undefined' ? `${window.location.origin}?track=${sampleOrder.id}` : `https://track.corrutrack.com?track=${sampleOrder.id}`;
    const dims = `${sampleOrder.dimensions.lengthMm} x ${sampleOrder.dimensions.widthMm} x ${sampleOrder.dimensions.heightMm} mm`;
    const gsm = `Top ${sampleOrder.paperSpecs.topLinerGsm} / Flute ${sampleOrder.paperSpecs.flutingMediumGsm} / Bot ${sampleOrder.paperSpecs.bottomLinerGsm} (${sampleOrder.paperSpecs.burstingFactor} BF)`;

    const productItem = getProductCatalogItem(sampleOrder.productType);
    const subCategoryName = sampleOrder.productSubCategory || productItem.subCategories[0]?.title || 'Standard';
    const productSpecsSummary = sampleOrder.productSpecsSummary || formatProductSpecsSummary(sampleOrder);

    const map: Record<string, string> = {
      '{orderId}': sampleOrder.id,
      '{productTitle}': productItem.title,
      '{productTitleHindi}': productItem.titleHindi,
      '{subCategory}': subCategoryName,
      '{productSpecsSummary}': productSpecsSummary,
      '{customerName}': sampleOrder.customerName,
      '{customerCompany}': sampleOrder.customerCompany,
      '{customerPhone}': sampleOrder.customerPhone,
      '{stageName}': stageInfo.title,
      '{stepNumber}': String(stageInfo.stepNumber),
      '{stageDescription}': stageInfo.description,
      '{dimensions}': dims,
      '{ply}': sampleOrder.ply,
      '{flute}': sampleOrder.flute,
      '{gsmSpecs}': gsm,
      '{lamination}': sampleOrder.lamination || 'None',
      '{colorType}': sampleOrder.colorType || 'Plain',
      '{quantity}': sampleOrder.quantity.toLocaleString(),
      '{ratePerBox}': String(sampleOrder.ratePerBox),
      '{totalAmount}': `₹${sampleOrder.totalAmount.toLocaleString()}`,
      '{deliveryAddress}': sampleOrder.deliveryAddress,
      '{expectedDelivery}': 'Oct 3, 2026, 5:00 PM',
      '{previousDelivery}': 'Oct 2, 2026, 12:00 PM',
      '{delayReason}': 'Reel stock transit delay from paper mill & glue curing calibration',
      '{delayHours}': '6',
      '{trackingUrl}': trackUrl,
      '{photoUrlText}': '📸 *Production Proof:* https://images.unsplash.com/photo-1581091226825-a6a2a5aee158\n',
      '{photoUrl}': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158',
      '{plantName}': settings.companyName,
      '{plantPhone}': settings.contactNumber,
      '{plantAddress}': settings.plantAddress,
      '{salesPersonName}': sampleOrder.salesPersonName || settings.salesTeam?.[0]?.name || 'Rajesh Sharma',
      '{salesPersonPhone}': sampleOrder.salesPersonPhone || settings.salesTeam?.[0]?.phone || '+91 98200 45678',
      '{driverName}': 'Balwinder Singh',
      '{driverPhone}': '+91 98199 77889',
      '{vehicleNumber}': 'MH-04-GP-8834',
    };

    let result = editedText;
    for (const [k, v] of Object.entries(map)) {
      result = result.split(k).join(v);
    }
    return result;
  };

  const previewText = renderLivePreview();

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const customSaved = getStoredCustomTemplates();
  const isCurrentlyCustomized = !!customSaved[selectedKey];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl my-auto max-h-[94vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Customization Suite
                </span>
                <span className="text-xs text-neutral-500">/</span>
                <span className="text-xs text-neutral-300 font-semibold">
                  WhatsApp Dispatch Templates
                </span>
              </div>
              <h2 className="text-lg font-bold text-white">
                Customize WhatsApp Message Option & Alerts
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetAll}
              className="text-xs text-neutral-400 hover:text-rose-400 px-3 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
              title="Reset all templates to factory defaults"
            >
              Reset All to Defaults
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Column: Template List & Category Filter */}
          <div className="w-full md:w-72 border-r border-neutral-800 bg-neutral-950/50 flex flex-col overflow-y-auto max-h-56 md:max-h-full">
            {/* Category Filter Pills */}
            <div className="p-3 border-b border-neutral-800/80 flex flex-wrap gap-1">
              {['All', 'Customer', 'Sales Executive', 'Stage Delay', 'Production Team', 'Business Owner'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-amber-400 text-neutral-950 font-bold'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  {cat === 'Sales Executive' ? 'Sales' : cat === 'Business Owner' ? 'Owner' : cat}
                </button>
              ))}
            </div>

            {/* Template Selector List */}
            <div className="p-2 space-y-1 overflow-y-auto flex-1">
              {filteredTemplates.map((t) => {
                const isSelected = t.key === selectedKey;
                const isCustom = !!customSaved[t.key];
                return (
                  <button
                    key={t.key}
                    onClick={() => handleSelectTemplate(t.key)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-neutral-800 text-white border border-amber-400/50 shadow-sm'
                        : 'text-neutral-300 hover:bg-neutral-900 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold truncate">{t.title}</span>
                      {isCustom && (
                        <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/50 shrink-0">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                      {t.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center Column: Interactive Template Editor & Variable Placeholders */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 border-r border-neutral-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    {currentTemplateDef.title}
                  </h3>
                  {isCurrentlyCustomized && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      User Customization Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {currentTemplateDef.description}
                </p>
              </div>

              {isCurrentlyCustomized && (
                <button
                  type="button"
                  onClick={handleResetCurrent}
                  className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-amber-400 py-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Factory Default</span>
                </button>
              )}
            </div>

            {/* Clickable Variable Insertion Chips */}
            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Click to Insert Dynamic Placeholders</span>
                </span>
                <span className="text-[10px] text-neutral-500">
                  Substituted automatically at dispatch
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {currentTemplateDef.availableVariables.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleInsertVariable(v)}
                    className="px-2 py-1 bg-neutral-900 hover:bg-amber-400 hover:text-neutral-950 text-neutral-300 font-mono text-[11px] rounded-md border border-neutral-800 transition-colors"
                    title={`Click to insert ${v}`}
                  >
                    + {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Message Format Template (Supports WhatsApp *bold*, _italic_, and linebreaks)
                </label>
                <span className="text-[10px] font-mono text-neutral-500">
                  {editedText.length} characters · {editedText.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>

              <textarea
                rows={12}
                value={editedText}
                onChange={(e) => {
                  setEditedText(e.target.value);
                  setSaveSuccess(false);
                }}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-xl p-3.5 text-xs text-white font-mono leading-relaxed focus:outline-none resize-none"
                placeholder="Type your WhatsApp message format with variables..."
              />
            </div>

            {/* Save Controls */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 animate-in fade-in">
                    <Check className="w-4 h-4" />
                    <span>Template saved successfully!</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs rounded-xl shadow-md transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Save Custom Template</span>
              </button>
            </div>
          </div>

          {/* Right Column: Live WhatsApp Simulation Preview */}
          <div className="w-full md:w-80 p-4 bg-neutral-950/70 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Real-Time WhatsApp Preview</span>
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">Live Simulation</span>
              </div>

              {/* Sample Order Picker */}
              <div>
                <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                  Preview with Batch Data:
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id} - {o.customerCompany}
                    </option>
                  ))}
                </select>
              </div>

              {/* WhatsApp Chat Bubble */}
              <div className="bg-[#0b141a] border border-[#202c33] rounded-2xl p-3 shadow-inner space-y-2">
                <div className="text-[10px] font-semibold text-[#00a884] pb-1 border-b border-neutral-800/80">
                  WhatsApp Direct Message
                </div>
                <div className="text-xs text-neutral-200 font-sans whitespace-pre-wrap leading-relaxed max-h-[360px] overflow-y-auto">
                  {previewText}
                </div>
                <div className="text-right text-[10px] text-neutral-500 font-mono pt-1">
                  12:45 PM · Delivered ✓✓
                </div>
              </div>
            </div>

            {/* Quick Actions for Preview */}
            <div className="pt-4 space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyPreview}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Preview'}</span>
                </button>

                <a
                  href={buildWhatsappLink(sampleOrder?.customerPhone || settings.contactNumber, previewText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold rounded-lg transition-colors"
                  title="Test in WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Test</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
