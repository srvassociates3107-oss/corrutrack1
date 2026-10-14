import React, { useState } from 'react';
import { FactorySettings, SalesPerson, PlantOwner, ProductionHead, ProductionShift, ShiftOperator, ShiftType, AppTheme } from '../types/order';
import { 
  X, 
  Save, 
  RotateCcw, 
  Building, 
  Phone, 
  Volume2, 
  Shield, 
  Webhook, 
  Briefcase, 
  Plus, 
  Trash2, 
  UserCheck, 
  Clock, 
  AlertTriangle,
  Factory,
  Palette,
  MessageSquare,
  Check,
  Star,
  Users,
  UserPlus,
  Mail,
  Cpu,
  Layers,
  Sparkles,
  Languages,
  Sun,
  Sunset,
  Moon,
  Globe,
  Copy,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { STAGE_BENCHMARKS_HOURS } from '../utils/whatsapp';
import { APP_THEMES, applyTheme } from '../utils/theme';
import { DEFAULT_SETTINGS } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: FactorySettings;
  onSaveSettings: (settings: FactorySettings) => void;
  onResetSampleData: () => void;
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  onOpenTemplateEditor?: () => void;
  initialTab?: 'owners' | 'production' | 'shifts' | 'sales' | 'general' | 'theme' | 'domain';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetSampleData,
  currentTheme,
  onThemeChange,
  onOpenTemplateEditor,
  initialTab,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'owners' | 'production' | 'shifts' | 'sales' | 'general' | 'theme' | 'domain'>(
    initialTab || 'owners'
  );
  const [customDomainInput, setCustomDomainInput] = useState<string>(
    settings.customDomain || 'www.navyugtrack.in'
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [dnsCheckLoading, setDnsCheckLoading] = useState<boolean>(false);
  const [dnsStatus, setDnsStatus] = useState<{
    tested: boolean;
    cnameAnswer?: string;
    aAnswers?: string[];
    nameservers?: string[];
    isConfigured: boolean;
    comment?: string;
    checkedAt?: string;
  } | null>(null);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  const checkLiveDns = async (domainToCheck: string = customDomainInput) => {
    setDnsCheckLoading(true);
    try {
      const clean = domainToCheck.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
      const apex = clean.startsWith('www.') ? clean.substring(4) : clean;

      const [cnameRes, aRes, nsRes] = await Promise.all([
        fetch(`https://dns.google/resolve?name=${clean}&type=CNAME`).then((r) => r.json()).catch(() => null),
        fetch(`https://dns.google/resolve?name=${clean}&type=A`).then((r) => r.json()).catch(() => null),
        fetch(`https://dns.google/resolve?name=${apex}&type=NS`).then((r) => r.json()).catch(() => null),
      ]);

      const cnameAnswer = cnameRes?.Answer?.find((a: any) => a.type === 5)?.data?.replace(/\.$/, '');
      const aAnswers = aRes?.Answer?.filter((a: any) => a.type === 1).map((a: any) => a.data) || [];
      const nameservers = nsRes?.Answer?.filter((a: any) => a.type === 2).map((a: any) => a.data?.replace(/\.$/, '')) || [];

      // Check if it's pointing to Firebase Hosting or Cloud Run or custom proxy
      const isConfigured = Boolean(
        (cnameAnswer && (cnameAnswer.includes('web.app') || cnameAnswer.includes('run.app') || cnameAnswer.includes('googlehosted') || cnameAnswer.includes('vercel') || cnameAnswer.includes('netlify'))) ||
        aAnswers.some((ip: string) => ip === '199.36.158.100')
      );

      setDnsStatus({
        tested: true,
        cnameAnswer,
        aAnswers,
        nameservers,
        isConfigured,
        comment: cnameRes?.Comment || aRes?.Comment,
        checkedAt: new Date().toLocaleTimeString(),
      });
    } catch {
      setDnsStatus({
        tested: true,
        isConfigured: false,
        checkedAt: new Date().toLocaleTimeString(),
      });
    } finally {
      setDnsCheckLoading(false);
    }
  };


  const [formData, setFormData] = useState<FactorySettings>(() => {
    const owners: PlantOwner[] = Array.isArray(settings.owners) && settings.owners.length > 0
      ? settings.owners
      : [
          {
            id: 'owner-1',
            name: settings.ownerName || 'Sunil Verma',
            phone: settings.ownerPhone || settings.contactNumber,
            email: 'sunil.verma@srvmills.com',
            designation: 'Managing Director & Founder',
            responsibility: 'Overall Plant Operations & High-Value Commercial Approvals',
            isPrimary: true,
            active: true,
          }
        ];

    const productionHeads: ProductionHead[] = Array.isArray(settings.productionHeads) && settings.productionHeads.length > 0
      ? settings.productionHeads
      : [
          {
            id: 'prod-1',
            name: settings.productionSupervisorName || 'Mahesh Patil',
            phone: settings.productionSupervisorPhone || settings.contactNumber,
            designation: 'Chief Production Head',
            shiftOrSection: 'General Shift (Corrugation & Converting)',
            machineLine: '5-Ply High-Speed Automatic Corrugator',
            isPrimary: true,
            active: true,
          }
        ];

    const productionShifts: ProductionShift[] =
      Array.isArray(settings.productionShifts) && settings.productionShifts.length > 0
        ? settings.productionShifts
        : DEFAULT_SETTINGS.productionShifts || [];

    return {
      ...settings,
      owners,
      productionHeads,
      salesTeam: settings.salesTeam || [],
      productionShifts,
    };
  });

  // State for Daily Production Shifts & Operator Assignment
  const [selectedShiftTypeForOp, setSelectedShiftTypeForOp] = useState<ShiftType | null>(null);
  const [newOpName, setNewOpName] = useState('');
  const [newOpPhone, setNewOpPhone] = useState('+91 ');
  const [newOpRole, setNewOpRole] = useState('Auto-Corrugator Line Operator');
  const [newOpMachineLine, setNewOpMachineLine] = useState('Corrugator Line 1 (Heavy 5/7-Ply)');

  // State for adding new Plant Owner
  const [isAddingOwner, setIsAddingOwner] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('+91 ');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerDesignation, setNewOwnerDesignation] = useState('Managing Partner');
  const [newOwnerResponsibility, setNewOwnerResponsibility] = useState('');
  const [newOwnerIsPrimary, setNewOwnerIsPrimary] = useState(false);

  // State for adding new Production Head
  const [isAddingProdHead, setIsAddingProdHead] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdPhone, setNewProdPhone] = useState('+91 ');
  const [newProdDesignation, setNewProdDesignation] = useState('Shift Production In-Charge');
  const [newProdShift, setNewProdShift] = useState('Day Shift (06:00 AM – 02:00 PM)');
  const [newProdMachineLine, setNewProdMachineLine] = useState('');
  const [newProdLanguage, setNewProdLanguage] = useState<'hi' | 'hinglish' | 'en'>('hi');
  const [newProdIsPrimary, setNewProdIsPrimary] = useState(false);

  // State for adding new Sales Rep
  const [isAddingSalesPerson, setIsAddingSalesPerson] = useState(false);
  const [newSalesName, setNewSalesName] = useState('');
  const [newSalesPhone, setNewSalesPhone] = useState('+91 ');
  const [newSalesEmail, setNewSalesEmail] = useState('');
  const [newSalesRegion, setNewSalesRegion] = useState('');

  // -------------------------------------------------------------
  // Owner Handlers
  // -------------------------------------------------------------
  const handleAddOwner = () => {
    if (!newOwnerName.trim() || !newOwnerPhone.trim() || newOwnerPhone.trim() === '+91') {
      alert('Please enter Owner name and WhatsApp phone number');
      return;
    }

    const newOwner: PlantOwner = {
      id: `owner-${Date.now()}`,
      name: newOwnerName.trim(),
      phone: newOwnerPhone.trim(),
      email: newOwnerEmail.trim() || undefined,
      designation: newOwnerDesignation.trim() || 'Partner',
      responsibility: newOwnerResponsibility.trim() || 'Plant Administration',
      isPrimary: newOwnerIsPrimary || formData.owners.length === 0,
      active: true,
    };

    let updatedOwners = [...formData.owners];
    if (newOwner.isPrimary) {
      updatedOwners = updatedOwners.map((o) => ({ ...o, isPrimary: false }));
    }
    updatedOwners.push(newOwner);

    const primary = updatedOwners.find((o) => o.isPrimary) || updatedOwners[0];

    setFormData({
      ...formData,
      owners: updatedOwners,
      ownerName: `${primary.name} (${primary.designation})`,
      ownerPhone: primary.phone,
    });

    setNewOwnerName('');
    setNewOwnerPhone('+91 ');
    setNewOwnerEmail('');
    setNewOwnerResponsibility('');
    setNewOwnerIsPrimary(false);
    setIsAddingOwner(false);
  };

  const handleRemoveOwner = (id: string) => {
    if (formData.owners.length <= 1) {
      alert('At least one Plant Owner must remain in the directory');
      return;
    }

    const updated = formData.owners.filter((o) => o.id !== id);
    if (!updated.some((o) => o.isPrimary)) {
      updated[0].isPrimary = true;
    }

    const primary = updated.find((o) => o.isPrimary) || updated[0];

    setFormData({
      ...formData,
      owners: updated,
      ownerName: `${primary.name} (${primary.designation})`,
      ownerPhone: primary.phone,
    });
  };

  const handleSetPrimaryOwner = (id: string) => {
    const updated = formData.owners.map((o) => ({
      ...o,
      isPrimary: o.id === id,
    }));
    const primary = updated.find((o) => o.isPrimary);
    if (primary) {
      setFormData({
        ...formData,
        owners: updated,
        ownerName: `${primary.name} (${primary.designation})`,
        ownerPhone: primary.phone,
      });
    }
  };

  const handleToggleActiveOwner = (id: string) => {
    const updated = formData.owners.map((o) => 
      o.id === id ? { ...o, active: !o.active } : o
    );
    setFormData({ ...formData, owners: updated });
  };

  // -------------------------------------------------------------
  // Production Head Handlers
  // -------------------------------------------------------------
  const handleAddProdHead = () => {
    if (!newProdName.trim() || !newProdPhone.trim() || newProdPhone.trim() === '+91') {
      alert('Please enter Production Head name and WhatsApp phone number');
      return;
    }

    const newHead: ProductionHead = {
      id: `prod-${Date.now()}`,
      name: newProdName.trim(),
      phone: newProdPhone.trim(),
      designation: newProdDesignation.trim() || 'Production Supervisor',
      shiftOrSection: newProdShift.trim() || 'General Shift',
      machineLine: newProdMachineLine.trim() || 'Plant Machinery',
      preferredLanguage: newProdLanguage || 'hi',
      isPrimary: newProdIsPrimary || formData.productionHeads.length === 0,
      active: true,
    };

    let updatedHeads = [...formData.productionHeads];
    if (newHead.isPrimary) {
      updatedHeads = updatedHeads.map((p) => ({ ...p, isPrimary: false }));
    }
    updatedHeads.push(newHead);

    const primary = updatedHeads.find((p) => p.isPrimary) || updatedHeads[0];

    setFormData({
      ...formData,
      productionHeads: updatedHeads,
      productionSupervisorName: `${primary.name} (${primary.designation})`,
      productionSupervisorPhone: primary.phone,
    });

    setNewProdName('');
    setNewProdPhone('+91 ');
    setNewProdMachineLine('');
    setNewProdLanguage('hi');
    setNewProdIsPrimary(false);
    setIsAddingProdHead(false);
  };

  const handleToggleProdHeadLang = (id: string, newLang: 'hi' | 'hinglish' | 'en') => {
    const updated = formData.productionHeads.map((p) =>
      p.id === id ? { ...p, preferredLanguage: newLang } : p
    );
    setFormData({ ...formData, productionHeads: updated });
  };

  const handleRemoveProdHead = (id: string) => {
    if (formData.productionHeads.length <= 1) {
      alert('At least one Production Head must remain in the directory');
      return;
    }

    const updated = formData.productionHeads.filter((p) => p.id !== id);
    if (!updated.some((p) => p.isPrimary)) {
      updated[0].isPrimary = true;
    }

    const primary = updated.find((p) => p.isPrimary) || updated[0];

    setFormData({
      ...formData,
      productionHeads: updated,
      productionSupervisorName: `${primary.name} (${primary.designation})`,
      productionSupervisorPhone: primary.phone,
    });
  };

  const handleSetPrimaryProdHead = (id: string) => {
    const updated = formData.productionHeads.map((p) => ({
      ...p,
      isPrimary: p.id === id,
    }));
    const primary = updated.find((p) => p.isPrimary);
    if (primary) {
      setFormData({
        ...formData,
        productionHeads: updated,
        productionSupervisorName: `${primary.name} (${primary.designation})`,
        productionSupervisorPhone: primary.phone,
      });
    }
  };

  const handleToggleActiveProdHead = (id: string) => {
    const updated = formData.productionHeads.map((p) => 
      p.id === id ? { ...p, active: !p.active } : p
    );
    setFormData({ ...formData, productionHeads: updated });
  };

  // -------------------------------------------------------------
  // Sales Person Handlers
  // -------------------------------------------------------------
  const handleAddSalesPerson = () => {
    if (!newSalesName.trim() || !newSalesPhone.trim() || newSalesPhone.trim() === '+91') {
      alert('Please enter sales person name and phone number');
      return;
    }

    const newPerson: SalesPerson = {
      id: `sp-${Date.now()}`,
      name: newSalesName.trim(),
      phone: newSalesPhone.trim(),
      email: newSalesEmail.trim() || undefined,
      region: newSalesRegion.trim() || 'General Accounts',
      active: true,
    };

    setFormData({
      ...formData,
      salesTeam: [...formData.salesTeam, newPerson],
    });

    setNewSalesName('');
    setNewSalesPhone('+91 ');
    setNewSalesEmail('');
    setNewSalesRegion('');
    setIsAddingSalesPerson(false);
  };

  const handleRemoveSalesPerson = (id: string) => {
    if (formData.salesTeam.length <= 1) {
      alert('At least one sales executive must remain in the directory');
      return;
    }
    setFormData({
      ...formData,
      salesTeam: formData.salesTeam.filter((s) => s.id !== id),
    });
  };

  // -------------------------------------------------------------
  // Daily Production Shifts (Morning, Evening, Night) & Operator Handlers
  // -------------------------------------------------------------
  const handleUpdateShiftField = (
    shiftType: ShiftType,
    field: keyof ProductionShift,
    value: any
  ) => {
    const shifts = (formData.productionShifts || []).map((sh) =>
      sh.type === shiftType ? { ...sh, [field]: value } : sh
    );
    setFormData({ ...formData, productionShifts: shifts });
  };

  const handleAddOperatorToShift = (shiftType: ShiftType) => {
    if (!newOpName.trim()) return;
    const newOp: ShiftOperator = {
      id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: newOpName.trim(),
      phone: newOpPhone.trim() || '+91 98401 00000',
      role: newOpRole.trim() || 'Machine Operator',
      machineLine: newOpMachineLine.trim() || 'Corrugator Line 1',
      active: true,
    };

    const shifts = (formData.productionShifts || []).map((sh) =>
      sh.type === shiftType
        ? { ...sh, operators: [...(sh.operators || []), newOp] }
        : sh
    );

    setFormData({ ...formData, productionShifts: shifts });
    setNewOpName('');
    setNewOpPhone('+91 ');
    setSelectedShiftTypeForOp(null);
  };

  const handleRemoveOperatorFromShift = (shiftType: ShiftType, operatorId: string) => {
    const shifts = (formData.productionShifts || []).map((sh) =>
      sh.type === shiftType
        ? { ...sh, operators: (sh.operators || []).filter((op) => op.id !== operatorId) }
        : sh
    );
    setFormData({ ...formData, productionShifts: shifts });
  };

  const handleToggleOperatorActive = (shiftType: ShiftType, operatorId: string) => {
    const shifts = (formData.productionShifts || []).map((sh) =>
      sh.type === shiftType
        ? {
            ...sh,
            operators: (sh.operators || []).map((op) =>
              op.id === operatorId ? { ...op, active: !op.active } : op
            ),
          }
        : sh
    );
    setFormData({ ...formData, productionShifts: shifts });
  };

  const handleMoveOperatorToShift = (
    fromShiftType: ShiftType,
    toShiftType: ShiftType,
    operator: ShiftOperator
  ) => {
    if (fromShiftType === toShiftType) return;
    const shifts = (formData.productionShifts || []).map((sh) => {
      if (sh.type === fromShiftType) {
        return {
          ...sh,
          operators: (sh.operators || []).filter((op) => op.id !== operator.id),
        };
      }
      if (sh.type === toShiftType) {
        return {
          ...sh,
          operators: [...(sh.operators || []), operator],
        };
      }
      return sh;
    });
    setFormData({ ...formData, productionShifts: shifts });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({ ...formData, customDomain: customDomainInput });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                  Factory Configuration
                </span>
                <span className="text-xs text-neutral-400">· Stakeholder Management</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">
                Multi-Owner, Production Head & Sales Directory
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Sub-bar */}
        <div className="px-6 py-2.5 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('owners')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'owners'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-300" />
              <span>Plant Owners & Partners ({formData.owners.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('production')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'production'
                  ? 'bg-amber-500 text-neutral-950 shadow-md font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>Production Heads & Shift Leads ({formData.productionHeads.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('shifts')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'shifts'
                  ? 'bg-cyan-500 text-neutral-950 shadow-md font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                Daily Shifts & Operators (
                {(formData.productionShifts || []).reduce(
                  (acc, sh) => acc + (sh.operators?.length || 0),
                  0
                )}
                )
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'sales'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-purple-300" />
              <span>Sales Executives ({formData.salesTeam.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'general'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Facility & Webhooks</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('theme')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'theme'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-emerald-300" />
              <span>Theme & Templates</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('domain')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'domain'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-blue-300" />
              <span>Custom Domain & DNS</span>
            </button>
          </div>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6 text-xs">
          {/* TAB 1: PLANT OWNERS & DIRECTORS DIRECTORY */}
          {activeTab === 'owners' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-blue-950/20 border border-blue-900/40">
                <div>
                  <h3 className="font-bold text-sm text-blue-200 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span>Plant Owners, Managing Directors & Partners Directory</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Add multiple plant owners, directors, and financial partners. Every owner can receive high-level commercial summaries, stage delay alerts, and daily production reports.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingOwner(!isAddingOwner)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Plant Owner / Partner</span>
                </button>
              </div>

              {/* Form Drawer: Add New Owner */}
              {isAddingOwner && (
                <div className="p-4 bg-neutral-950 border border-blue-800/60 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between font-bold text-xs text-blue-300">
                    <span>Enter New Owner / Director Details:</span>
                    <span className="text-[11px] text-neutral-400">WhatsApp notifications enabled</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-neutral-400 mb-1">Owner Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Rajesh Agarwal"
                        value={newOwnerName}
                        onChange={(e) => setNewOwnerName(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-400 mb-1">WhatsApp Phone Number *</label>
                      <input
                        type="text"
                        placeholder="+91 98401 23456"
                        value={newOwnerPhone}
                        onChange={(e) => setNewOwnerPhone(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-400 mb-1">Designation / Title</label>
                      <select
                        value={newOwnerDesignation}
                        onChange={(e) => setNewOwnerDesignation(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="Managing Director">Managing Director</option>
                        <option value="Managing Partner">Managing Partner</option>
                        <option value="Joint Managing Director">Joint Managing Director</option>
                        <option value="Director (Commercial & Finance)">Director (Commercial & Finance)</option>
                        <option value="Director (Technical & Operations)">Director (Technical & Operations)</option>
                        <option value="Plant Co-Owner">Plant Co-Owner</option>
                        <option value="Executive Chairman">Executive Chairman</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-neutral-400 mb-1">Email Address (Optional)</label>
                      <input
                        type="email"
                        placeholder="owner@plant.com"
                        value={newOwnerEmail}
                        onChange={(e) => setNewOwnerEmail(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-neutral-400 mb-1">Plant Responsibility / Branch Unit</label>
                      <input
                        type="text"
                        placeholder="e.g. Unit 1 High-Value Orders & Paper Reel Approvals"
                        value={newOwnerResponsibility}
                        onChange={(e) => setNewOwnerResponsibility(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                    <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                      <input
                        type="checkbox"
                        checked={newOwnerIsPrimary}
                        onChange={(e) => setNewOwnerIsPrimary(e.target.checked)}
                        className="rounded text-blue-500 focus:ring-0"
                      />
                      <span>Set as Primary Contact for Automated WhatsApp Escalations</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingOwner(false)}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddOwner}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow"
                      >
                        Save Owner
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Owner Cards List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {formData.owners.map((owner) => (
                  <div
                    key={owner.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      owner.isPrimary
                        ? 'bg-neutral-900/90 border-blue-500/60 shadow-lg shadow-blue-950/20'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    } ${!owner.active ? 'opacity-60' : ''}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                            {owner.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white flex items-center gap-2">
                              <span>{owner.name}</span>
                              {owner.isPrimary && (
                                <span className="flex items-center gap-1 text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full font-semibold">
                                  <Star className="w-3 h-3 text-blue-400 fill-blue-400" />
                                  <span>Primary Contact</span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-blue-400 font-medium mt-0.5">
                              {owner.designation}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleActiveOwner(owner.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                              owner.active 
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {owner.active ? 'Active' : 'Muted'}
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-xs">
                        <div className="flex items-center gap-2 text-neutral-300 font-mono">
                          <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{owner.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-neutral-300">
                          <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <input
                            type="email"
                            placeholder="Enter owner's registered email for daily summary..."
                            value={owner.email || ''}
                            onChange={(e) => {
                              const nextEmail = e.target.value;
                              const updated = formData.owners.map((o) =>
                                o.id === owner.id ? { ...o, email: nextEmail } : o
                              );
                              const primary = updated.find((o) => o.isPrimary) || updated[0];
                              setFormData({
                                ...formData,
                                owners: updated,
                                ownerEmail: primary?.email || nextEmail,
                              });
                            }}
                            className="flex-1 bg-neutral-900 border border-neutral-700/80 rounded-lg px-2.5 py-1 text-xs text-blue-200 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        {owner.responsibility && (
                          <div className="text-[11px] text-neutral-400 bg-neutral-900/80 p-2 rounded-lg border border-neutral-800/80 mt-1">
                            <span className="text-neutral-500 block">Responsibility:</span>
                            <span className="text-neutral-300">{owner.responsibility}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                      {!owner.isPrimary ? (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryOwner(owner.id)}
                          className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition-colors flex items-center gap-1"
                        >
                          <Star className="w-3 h-3" />
                          <span>Make Primary Owner</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-neutral-500">Default Escalation Recipient</span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveOwner(owner.id)}
                        className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-neutral-800 transition-colors"
                        title="Remove Plant Owner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTION HEADS & SHIFT SUPERVISORS DIRECTORY */}
          {activeTab === 'production' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-950/20 border border-amber-900/40">
                <div>
                  <h3 className="font-bold text-sm text-amber-200 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-amber-400" />
                    <span>Production Heads & Machine Line Supervisors Directory</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Register all shift in-charges, corrugator line leads, printing supervisors, and finishing heads. Automated stalled alerts (&gt;150% benchmark) and line job cards route directly to them.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingProdHead(!isAddingProdHead)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl text-xs font-bold transition-all shadow-md shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Production Head</span>
                </button>
              </div>

              {/* Form Drawer: Add New Production Head */}
              {isAddingProdHead && (
                <div className="p-4 bg-neutral-950 border border-amber-800/60 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between font-bold text-xs text-amber-300">
                    <span>Enter New Production Head / Shift Lead Details:</span>
                    <span className="text-[11px] text-neutral-400">Direct shopfloor WhatsApp hotline</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-neutral-400 mb-1">Supervisor Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Ramesh Sharma"
                        value={newProdName}
                        onChange={(e) => setNewProdName(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-400 mb-1">WhatsApp Phone Number *</label>
                      <input
                        type="text"
                        placeholder="+91 98401 98765"
                        value={newProdPhone}
                        onChange={(e) => setNewProdPhone(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-400 mb-1">Designation / Role</label>
                      <select
                        value={newProdDesignation}
                        onChange={(e) => setNewProdDesignation(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="Chief Production Head">Chief Production Head</option>
                        <option value="Corrugator Line Supervisor">Corrugator Line Supervisor</option>
                        <option value="Flexo Printing & Slotting In-Charge">Flexo Printing & Slotting In-Charge</option>
                        <option value="Rotary Die-Cutting & Punching Head">Rotary Die-Cutting & Punching Head</option>
                        <option value="Lamination & Pasting Supervisor">Lamination & Pasting Supervisor</option>
                        <option value="Quality Assurance & BF Lab Lead">Quality Assurance & BF Lab Lead</option>
                        <option value="Night Shift Production In-Charge">Night Shift Production In-Charge</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-neutral-400 mb-1">Working Shift / Department</label>
                      <input
                        type="text"
                        placeholder="e.g. Day Shift (06:00 AM – 02:00 PM)"
                        value={newProdShift}
                        onChange={(e) => setNewProdShift(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-neutral-400 mb-1">Assigned Machine Line / Floor Area</label>
                      <input
                        type="text"
                        placeholder="e.g. 5-Ply High-Speed Automatic Corrugator Line 1"
                        value={newProdMachineLine}
                        onChange={(e) => setNewProdMachineLine(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div className="sm:col-span-3 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800">
                      <label className="block text-neutral-300 font-semibold mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Languages className="w-3.5 h-3.5 text-amber-400" />
                          <span>WhatsApp Alert Language (भाषा)</span>
                        </span>
                        <span className="text-[10px] text-amber-400 font-normal">
                          For production heads with English reading issues
                        </span>
                      </label>
                      <select
                        value={newProdLanguage}
                        onChange={(e) => setNewProdLanguage(e.target.value as any)}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="hi">🇮🇳 Hindi (हिन्दी) — Complete job card & specs formatted in clean Hindi</option>
                        <option value="hinglish">💬 Hinglish — Simple Hindi in Roman script for easy phone reading</option>
                        <option value="en">🇬🇧 English — Standard English floor dispatch</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                    <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                      <input
                        type="checkbox"
                        checked={newProdIsPrimary}
                        onChange={(e) => setNewProdIsPrimary(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-0"
                      />
                      <span>Set as Chief Production Head (Default Stalled Process Recipient)</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingProdHead(false)}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddProdHead}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-xs shadow"
                      >
                        Save Production Head
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Production Head Cards List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {formData.productionHeads.map((head) => (
                  <div
                    key={head.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      head.isPrimary
                        ? 'bg-neutral-900/90 border-amber-500/60 shadow-lg shadow-amber-950/20'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    } ${!head.active ? 'opacity-60' : ''}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
                            {head.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white flex items-center gap-2">
                              <span>{head.name}</span>
                              {head.isPrimary && (
                                <span className="flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-semibold">
                                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                  <span>Chief Plant Head</span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-amber-400 font-medium mt-0.5">
                              {head.designation}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleActiveProdHead(head.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                              head.active 
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {head.active ? 'Active' : 'Off-Duty'}
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs">
                        <div className="flex items-center gap-2 text-neutral-300 font-mono">
                          <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{head.phone}</span>
                        </div>
                        {head.shiftOrSection && (
                          <div className="flex items-center gap-1.5 text-[11px] text-neutral-300">
                            <Clock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                            <span className="bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                              {head.shiftOrSection}
                            </span>
                          </div>
                        )}
                        {head.machineLine && (
                          <div className="text-[11px] text-neutral-400 bg-neutral-900/80 p-2 rounded-lg border border-neutral-800/80 mt-1">
                            <span className="text-neutral-500 block">Machine Assignment:</span>
                            <span className="text-neutral-300">{head.machineLine}</span>
                          </div>
                        )}

                        {/* Language Preference */}
                        <div className="flex items-center justify-between text-[11px] bg-neutral-900/90 px-2.5 py-1.5 rounded-lg border border-neutral-800 mt-2">
                          <span className="text-neutral-400 flex items-center gap-1">
                            <Languages className="w-3 h-3 text-amber-400" />
                            <span>WhatsApp Alerts:</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleProdHeadLang(head.id, 'hi')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                (head.preferredLanguage || 'hi') === 'hi'
                                  ? 'bg-amber-400 text-neutral-950'
                                  : 'text-neutral-400 hover:text-white'
                              }`}
                              title="Send alerts in Hindi (हिन्दी)"
                            >
                              🇮🇳 हिन्दी
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleProdHeadLang(head.id, 'hinglish')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                head.preferredLanguage === 'hinglish'
                                  ? 'bg-amber-400 text-neutral-950'
                                  : 'text-neutral-400 hover:text-white'
                              }`}
                              title="Send alerts in Hinglish"
                            >
                              Hinglish
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleProdHeadLang(head.id, 'en')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                head.preferredLanguage === 'en'
                                  ? 'bg-amber-400 text-neutral-950'
                                  : 'text-neutral-400 hover:text-white'
                              }`}
                              title="Send alerts in English"
                            >
                              English
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                      {!head.isPrimary ? (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryProdHead(head.id)}
                          className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold transition-colors flex items-center gap-1"
                        >
                          <Star className="w-3 h-3" />
                          <span>Set as Chief Head</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-neutral-500">Receives &gt;150% Stalled Line Alerts</span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveProdHead(head.id)}
                        className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-neutral-800 transition-colors"
                        title="Remove Production Head"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2.5: DAILY PRODUCTION SHIFTS (MORNING, EVENING, NIGHT) & OPERATOR ASSIGNMENT */}
          {activeTab === 'shifts' && (
            <div className="space-y-5">
              {/* Top Overview Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-cyan-950/20 border border-cyan-900/40">
                <div>
                  <h3 className="font-bold text-sm text-cyan-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>Daily Production Shifts (Morning, Evening, Night) & Operator Roster</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Define 24-hour plant shift schedules, set shift output targets, and assign machine operators to Morning, Evening, or Night shifts. Operators assigned here appear in Order Creation, Bulk Machine Assignment, and Order Edit selectors.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold">
                    Total Operators:{' '}
                    {(formData.productionShifts || []).reduce(
                      (sum, sh) => sum + (sh.operators?.length || 0),
                      0
                    )}
                  </span>
                </div>
              </div>

              {/* 3 Shift Cards: Morning, Evening, Night */}
              <div className="space-y-4">
                {(formData.productionShifts || []).map((shift) => {
                  const ShiftIcon =
                    shift.type === 'Morning'
                      ? Sun
                      : shift.type === 'Evening'
                      ? Sunset
                      : Moon;
                  const accentColor =
                    shift.type === 'Morning'
                      ? 'amber'
                      : shift.type === 'Evening'
                      ? 'orange'
                      : 'indigo';
                  const isAddingOpHere = selectedShiftTypeForOp === shift.type;

                  return (
                    <div
                      key={shift.id}
                      className={`p-4 rounded-2xl border transition-all space-y-4 ${
                        shift.active
                          ? 'bg-neutral-950 border-neutral-800'
                          : 'bg-neutral-950/50 border-neutral-900 opacity-65'
                      }`}
                    >
                      {/* Shift Header & Timing Configuration */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold ${
                              shift.type === 'Morning'
                                ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400'
                                : shift.type === 'Evening'
                                ? 'bg-orange-500/15 border border-orange-500/40 text-orange-400'
                                : 'bg-indigo-500/15 border border-indigo-500/40 text-indigo-400'
                            }`}
                          >
                            <ShiftIcon className="w-5 h-5" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <input
                                type="text"
                                value={shift.label}
                                onChange={(e) =>
                                  handleUpdateShiftField(shift.type, 'label', e.target.value)
                                }
                                className="bg-neutral-900 border border-neutral-700/80 rounded-lg px-2.5 py-1 text-sm font-bold text-white focus:outline-none focus:border-cyan-500"
                              />
                              <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold uppercase">
                                {shift.type} Shift
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateShiftField(shift.type, 'active', !shift.active)
                                }
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                  shift.active
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-neutral-800 text-neutral-400'
                                }`}
                              >
                                {shift.active ? '✓ Shift Active' : 'Paused'}
                              </button>
                            </div>
                            <div className="text-[11px] text-neutral-400 mt-1">
                              {(shift.operators || []).length} Assigned Operator(s) • Target:{' '}
                              <strong className="text-white font-mono">
                                {(shift.targetBoxesPerShift || 0).toLocaleString()} boxes/shift
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* Shift Timings, Supervisor & Add Operator CTA */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5">
                            <span className="text-[10px] text-neutral-400">Start:</span>
                            <input
                              type="time"
                              value={shift.startTime}
                              onChange={(e) =>
                                handleUpdateShiftField(shift.type, 'startTime', e.target.value)
                              }
                              className="bg-transparent text-xs font-mono text-white focus:outline-none"
                            />
                            <span className="text-neutral-600">→</span>
                            <span className="text-[10px] text-neutral-400">End:</span>
                            <input
                              type="time"
                              value={shift.endTime}
                              onChange={(e) =>
                                handleUpdateShiftField(shift.type, 'endTime', e.target.value)
                              }
                              className="bg-transparent text-xs font-mono text-white focus:outline-none"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedShiftTypeForOp(
                                isAddingOpHere ? null : shift.type
                              )
                            }
                            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors shadow"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Assign Operator to {shift.type}</span>
                          </button>
                        </div>
                      </div>

                      {/* Shift Supervisor & Output Target Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800/80">
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">
                            {shift.type} Shift In-Charge / Supervisor
                          </label>
                          <input
                            type="text"
                            value={shift.shiftSupervisorName}
                            onChange={(e) =>
                              handleUpdateShiftField(
                                shift.type,
                                'shiftSupervisorName',
                                e.target.value
                              )
                            }
                            placeholder="Supervisor Name"
                            className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">
                            Supervisor WhatsApp Phone
                          </label>
                          <input
                            type="text"
                            value={shift.shiftSupervisorPhone}
                            onChange={(e) =>
                              handleUpdateShiftField(
                                shift.type,
                                'shiftSupervisorPhone',
                                e.target.value
                              )
                            }
                            placeholder="+91 98401 00000"
                            className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">
                            Shift Production Target (Boxes)
                          </label>
                          <input
                            type="number"
                            value={shift.targetBoxesPerShift}
                            onChange={(e) =>
                              handleUpdateShiftField(
                                shift.type,
                                'targetBoxesPerShift',
                                Number(e.target.value)
                              )
                            }
                            className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold"
                          />
                        </div>
                      </div>

                      {/* Add New Operator Drawer for this Shift */}
                      {isAddingOpHere && (
                        <div className="p-3.5 rounded-xl bg-neutral-900 border border-cyan-500/50 space-y-3 animate-in fade-in">
                          <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                            <span>Assign New Operator to {shift.label}:</span>
                            <button
                              type="button"
                              onClick={() => setSelectedShiftTypeForOp(null)}
                              className="text-neutral-400 hover:text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                            <div>
                              <label className="block text-[11px] text-neutral-400 mb-1">
                                Operator Full Name *
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Vikram Jadhav"
                                value={newOpName}
                                onChange={(e) => setNewOpName(e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] text-neutral-400 mb-1">
                                WhatsApp / Mobile Phone
                              </label>
                              <input
                                type="text"
                                placeholder="+91 98401 11223"
                                value={newOpPhone}
                                onChange={(e) => setNewOpPhone(e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] text-neutral-400 mb-1">
                                Operator Role / Specialty
                              </label>
                              <select
                                value={newOpRole}
                                onChange={(e) => setNewOpRole(e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                              >
                                <option value="Auto-Corrugator Line Operator">Auto-Corrugator Line Operator</option>
                                <option value="Flexo Printing & Slotting Operator">Flexo Printing & Slotting Operator</option>
                                <option value="Rotary Die-Punching Operator">Rotary Die-Punching Operator</option>
                                <option value="Flute Lamination & Pasting Operator">Flute Lamination & Pasting Operator</option>
                                <option value="Auto-Stitching & Gluing Operator">Auto-Stitching & Gluing Operator</option>
                                <option value="Dispatch Bundling & Strapping Lead">Dispatch Bundling & Strapping Lead</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] text-neutral-400 mb-1">
                                Assigned Machine Line
                              </label>
                              <select
                                value={newOpMachineLine}
                                onChange={(e) => setNewOpMachineLine(e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                              >
                                <option value="Corrugator Line 1 (Heavy 5/7-Ply)">Corrugator Line 1 (Heavy 5/7-Ply)</option>
                                <option value="Corrugator Line 2 (3-Ply High-Speed)">Corrugator Line 2 (3-Ply High-Speed)</option>
                                <option value="2-Color High-Speed Flexo Printer Slotter">2-Color High-Speed Flexo Printer Slotter</option>
                                <option value="Bobst Auto Rotary Die-Cutter">Bobst Auto Rotary Die-Cutter</option>
                                <option value="Auto-Stitching & Folder Gluer Line">Auto-Stitching & Folder Gluer Line</option>
                                <option value="Bundling & Stretch-Wrap Bay">Bundling & Stretch-Wrap Bay</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setSelectedShiftTypeForOp(null)}
                              className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddOperatorToShift(shift.type)}
                              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs"
                            >
                              + Save Operator to {shift.type} Shift
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Assigned Operators Grid for this Shift */}
                      <div>
                        <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                          Assigned {shift.type} Shift Operators ({(shift.operators || []).length}):
                        </div>

                        {(shift.operators || []).length === 0 ? (
                          <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 text-center text-neutral-500 text-xs">
                            No operators assigned to {shift.label} yet. Click "Assign Operator to {shift.type}" above.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {(shift.operators || []).map((op) => (
                              <div
                                key={op.id}
                                className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${
                                  op.active
                                    ? 'bg-neutral-900/90 border-neutral-800'
                                    : 'bg-neutral-900/40 border-neutral-800/50 opacity-60'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-white text-xs truncate">
                                      👷 {op.name}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleOperatorActive(shift.type, op.id)}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                        op.active
                                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                          : 'bg-neutral-800 text-neutral-400'
                                      }`}
                                    >
                                      {op.active ? 'On-Duty' : 'Off'}
                                    </button>
                                  </div>

                                  <div className="text-[11px] text-cyan-300 font-medium truncate">
                                    {op.role}
                                  </div>
                                  <div className="text-[10px] text-neutral-400 truncate">
                                    ⚙️ {op.machineLine}
                                  </div>
                                  <div className="text-[10px] text-neutral-400 font-mono">
                                    📞 {op.phone}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 gap-2">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-neutral-500">Move to:</span>
                                    {(['Morning', 'Evening', 'Night'] as ShiftType[])
                                      .filter((t) => t !== shift.type)
                                      .map((targetShift) => (
                                        <button
                                          key={targetShift}
                                          type="button"
                                          onClick={() =>
                                            handleMoveOperatorToShift(shift.type, targetShift, op)
                                          }
                                          className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-300 hover:text-white transition-colors"
                                          title={`Reassign ${op.name} to ${targetShift} Shift`}
                                        >
                                          {targetShift}
                                        </button>
                                      ))}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveOperatorFromShift(shift.type, op.id)
                                    }
                                    className="p-1 text-neutral-500 hover:text-rose-400 rounded transition-colors"
                                    title="Remove Operator from Shift"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: SALES EXECUTIVES DIRECTORY */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-purple-950/20 border border-purple-900/40">
                <div>
                  <h3 className="font-bold text-sm text-purple-200 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-purple-400" />
                    <span>Fixed Sales Executives Directory</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Orders originate from these sales reps. Whenever a box milestone or stage delay happens, automated WhatsApp alerts route directly to them.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingSalesPerson(!isAddingSalesPerson)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Sales Person</span>
                </button>
              </div>

              {/* Add form drawer */}
              {isAddingSalesPerson && (
                <div className="p-4 bg-neutral-950 border border-purple-800/60 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="font-semibold text-xs text-purple-300">Add New Sales Executive:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-neutral-400 mb-1">Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Ramesh Patil"
                        value={newSalesName}
                        onChange={(e) => setNewSalesName(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-400 mb-1">WhatsApp Phone *</label>
                      <input
                        type="text"
                        placeholder="+91 98200 45678"
                        value={newSalesPhone}
                        onChange={(e) => setNewSalesPhone(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-400 mb-1">Region / Account Hub</label>
                      <input
                        type="text"
                        placeholder="e.g. North Zone (FMCG Accounts)"
                        value={newSalesRegion}
                        onChange={(e) => setNewSalesRegion(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setIsAddingSalesPerson(false)}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSalesPerson}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold"
                    >
                      Save Executive
                    </button>
                  </div>
                </div>
              )}

              {/* Sales Team List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {formData.salesTeam.map((sp) => (
                  <div
                    key={sp.id}
                    className="p-4 bg-neutral-950 border border-neutral-800/90 rounded-2xl hover:border-purple-500/40 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-sm">
                        {sp.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white flex items-center gap-2">
                          <span>{sp.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300 border border-neutral-800">
                            {sp.region || 'Sales Executive'}
                          </span>
                        </div>
                        <div className="text-xs text-purple-400 font-mono mt-0.5 flex items-center gap-2">
                          <span>{sp.phone}</span>
                          {sp.email && <span className="text-neutral-500">| {sp.email}</span>}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSalesPerson(sp.id)}
                      className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-neutral-800 transition-colors"
                      title="Remove Sales Executive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: FACILITY & WEBHOOKS */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <h3 className="font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-400" />
                  <span>Manufacturing Facility Identity</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-neutral-400 mb-1">Company / Plant Name</label>
                    <input
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">Plant Floor Address</label>
                    <input
                      type="text"
                      value={formData.plantAddress}
                      onChange={(e) => setFormData({ ...formData, plantAddress: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">Inquiry / Office Desk Hotline</label>
                    <input
                      type="text"
                      value={formData.contactNumber}
                      onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Automated Stalled Alerts */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <h3 className="font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Automated Stalled Process Alerts (&gt;150% Benchmark)</span>
                </h3>

                <label className="flex items-center gap-2 cursor-pointer bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                  <input
                    type="checkbox"
                    checked={formData.autoStalledAlerts}
                    onChange={(e) => setFormData({ ...formData, autoStalledAlerts: e.target.checked })}
                    className="rounded text-rose-500 focus:ring-0"
                  />
                  <span className="text-neutral-200 font-semibold text-xs">
                    Auto-trigger WhatsApp alert to Production Heads when an order dwells &gt;150% of benchmark
                  </span>
                </label>
              </div>

              {/* Webhooks & In-App WhatsApp Gateway */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-emerald-800/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-2 text-xs">
                    <Webhook className="w-4 h-4 text-emerald-400" />
                    <span>Direct In-App WhatsApp Gateway (No External Tab Needed)</span>
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                    Embedded Dispatch
                  </span>
                </div>

                <p className="text-xs text-neutral-400">
                  Choose how messages send directly from inside the application without opening any external browser tab:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: 'in_app_messenger',
                      title: 'Built-In App Messenger',
                      desc: 'Instant in-app dispatch & live chat log',
                    },
                    {
                      id: 'ultramsg',
                      title: 'UltraMsg / QR Instance',
                      desc: 'Send from your own phone via QR API',
                    },
                    {
                      id: 'meta_cloud_api',
                      title: 'Meta Cloud API',
                      desc: 'Official WhatsApp Business API',
                    },
                  ].map((prov) => {
                    const currentProv = formData.whatsappGateway?.provider || 'in_app_messenger';
                    const isSelected = currentProv === prov.id;
                    return (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            whatsappGateway: {
                              provider: prov.id as any,
                              enabled: true,
                              ...formData.whatsappGateway,
                              // override provider
                            },
                          })
                        }
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-emerald-950/50 border-emerald-500 text-white'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-bold">{prov.title}</div>
                        <div className="text-[10px] opacity-80 mt-0.5">{prov.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {formData.whatsappGateway?.provider === 'ultramsg' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-neutral-400 text-[11px] mb-1">UltraMsg Instance ID</label>
                      <input
                        type="text"
                        placeholder="instance12345"
                        value={formData.whatsappGateway?.ultramsgInstanceId || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            whatsappGateway: {
                              ...(formData.whatsappGateway || { provider: 'ultramsg', enabled: true }),
                              provider: 'ultramsg',
                              ultramsgInstanceId: e.target.value,
                            },
                          })
                        }
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-400 text-[11px] mb-1">UltraMsg API Token</label>
                      <input
                        type="password"
                        placeholder="Your UltraMsg Token"
                        value={formData.whatsappGateway?.ultramsgToken || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            whatsappGateway: {
                              ...(formData.whatsappGateway || { provider: 'ultramsg', enabled: true }),
                              provider: 'ultramsg',
                              ultramsgToken: e.target.value,
                            },
                          })
                        }
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                )}

                {formData.whatsappGateway?.provider === 'meta_cloud_api' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-neutral-400 text-[11px] mb-1">Meta Phone Number ID</label>
                      <input
                        type="text"
                        placeholder="e.g. 10592837465"
                        value={formData.whatsappGateway?.metaPhoneNumberId || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            whatsappGateway: {
                              ...(formData.whatsappGateway || { provider: 'meta_cloud_api', enabled: true }),
                              provider: 'meta_cloud_api',
                              metaPhoneNumberId: e.target.value,
                            },
                          })
                        }
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-400 text-[11px] mb-1">Meta Permanent Access Token</label>
                      <input
                        type="password"
                        placeholder="EAAG..."
                        value={formData.whatsappGateway?.metaAccessToken || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            whatsappGateway: {
                              ...(formData.whatsappGateway || { provider: 'meta_cloud_api', enabled: true }),
                              provider: 'meta_cloud_api',
                              metaAccessToken: e.target.value,
                            },
                          })
                        }
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-neutral-400 mb-1 text-xs">
                    Optional Webhook URL (Zapier, Make, Custom WhatsApp Bot)
                  </label>
                  <input
                    type="url"
                    placeholder="https://api.yourgateway.com/v1/webhook"
                    value={formData.webhookUrl}
                    onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.enableSoundAlerts}
                      onChange={(e) => setFormData({ ...formData, enableSoundAlerts: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-0"
                    />
                    <span className="text-neutral-200 text-xs">Audio chimes for stage updates & messages</span>
                  </label>
                </div>
              </div>

              {/* Reset Data */}
              <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-neutral-300">Reset Demo Orders</div>
                  <div className="text-[11px] text-neutral-500">Restore factory sample corrugated orders and defaults</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Reset orders to initial demo state?')) {
                      onResetSampleData();
                      onClose();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 border border-rose-900/60 rounded-xl transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Data</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: THEME & TEMPLATES */}
          {activeTab === 'theme' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                <div>
                  <h3 className="font-semibold text-neutral-200 text-sm flex items-center gap-2">
                    <Palette className="w-4 h-4 text-emerald-400" />
                    <span>Visual Themes</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Select tailored contrast themes for factory shopfloors and daylight offices
                  </p>
                </div>

                {onOpenTemplateEditor && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTemplateEditor();
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Open Master Template Editor</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {APP_THEMES.map((theme) => {
                  const isSelected = theme.id === currentTheme;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        applyTheme(theme.id);
                        onThemeChange(theme.id);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-amber-400 bg-neutral-900 shadow-lg ring-1 ring-amber-400/40'
                          : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center -space-x-1">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-neutral-800"
                            style={{ backgroundColor: theme.previewColors.bg }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-neutral-800"
                            style={{ backgroundColor: theme.previewColors.card }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-neutral-800"
                            style={{ backgroundColor: theme.previewColors.accent }}
                          />
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      <div className="text-xs font-bold text-white">
                        {theme.name}
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {theme.tagline}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'domain' && (
            <div className="space-y-6">
              {/* Header Box with Status */}
              <div className="bg-gradient-to-r from-blue-950/70 via-neutral-900 to-amber-950/30 border border-blue-700/50 rounded-2xl p-5 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-white">Custom Domain & Publishing Center</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Target: www.navyugtrack.in
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Settle your custom domain <code className="text-amber-300 font-bold">www.navyugtrack.in</code> and publish your Corrugated Manufacturing & Transparency app.
                      </p>
                    </div>
                  </div>

                  {/* DNS Live Tester CTA */}
                  <button
                    type="button"
                    onClick={() => checkLiveDns(customDomainInput)}
                    disabled={dnsCheckLoading}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md self-start sm:self-auto disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${dnsCheckLoading ? 'animate-spin' : ''}`} />
                    <span>{dnsCheckLoading ? 'Querying DNS...' : 'Test Live DNS Resolution'}</span>
                  </button>
                </div>

                {/* Live DNS Diagnostic Status Result */}
                {dnsStatus && (
                  <div className="mt-4 pt-4 border-t border-blue-800/30">
                    <div className="p-3.5 rounded-xl bg-neutral-950/90 border border-neutral-800 text-xs font-mono space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-400">DNS Resolution Result:</span>
                          {dnsStatus.isConfigured ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Pointed & Live
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-400 font-bold">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Action Required (Currently Parked on GoDaddy)
                            </span>
                          )}
                        </div>
                        {dnsStatus.checkedAt && (
                          <span className="text-[10px] text-neutral-500 font-sans">
                            Checked at {dnsStatus.checkedAt} via Google Public DNS
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
                        <div className="bg-neutral-900 p-2 rounded border border-neutral-800">
                          <span className="text-neutral-400 block text-[10px]">CNAME for www.navyugtrack.in:</span>
                          <span className="text-white font-semibold">
                            {dnsStatus.cnameAnswer || 'No CNAME found'}
                          </span>
                        </div>
                        <div className="bg-neutral-900 p-2 rounded border border-neutral-800">
                          <span className="text-neutral-400 block text-[10px]">Apex A Records (navyugtrack.in):</span>
                          <span className="text-white font-semibold">
                            {dnsStatus.aAnswers && dnsStatus.aAnswers.length > 0
                              ? dnsStatus.aAnswers.join(', ')
                              : 'No A records'}
                          </span>
                        </div>
                      </div>

                      {dnsStatus.nameservers && dnsStatus.nameservers.length > 0 && (
                        <div className="text-[10px] text-neutral-400 pt-1">
                          Registrar Nameservers Detected:{' '}
                          <span className="text-blue-300 font-semibold">
                            {dnsStatus.nameservers.join(', ')}
                          </span>{' '}
                          (GoDaddy India)
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Cloud & Project Details Bar */}
                <div className="mt-4 pt-4 border-t border-blue-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-neutral-400 text-[11px]">Hosting & Cloud Run Target:</span>
                    <div className="font-mono text-white text-xs mt-0.5 break-all">
                      ais-pre-6debxezmeeam2p3hkekux2-28225476515.asia-southeast1.run.app
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('ais-pre-6debxezmeeam2p3hkekux2-28225476515.asia-southeast1.run.app');
                      setCopiedField('target-url');
                      setTimeout(() => setCopiedField(null), 2000);
                    }}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-xs transition-colors whitespace-nowrap shadow-sm border border-neutral-700"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedField === 'target-url' ? 'Copied Target!' : 'Copy Target URL'}</span>
                  </button>
                </div>
              </div>

              {/* Interactive Domain DNS Calculator */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                <label className="block text-xs font-bold text-white mb-2">
                  Target Custom Domain:
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={customDomainInput}
                      onChange={(e) => setCustomDomainInput(e.target.value.trim().toLowerCase())}
                      placeholder="e.g. www.navyugtrack.in"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-400 font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomDomainInput('www.navyugtrack.in')}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition-colors"
                  >
                    Reset to www.navyugtrack.in
                  </button>
                </div>

                {/* DNS Records Table */}
                <div className="mt-5 border border-neutral-800 rounded-xl overflow-hidden text-xs">
                  <div className="bg-neutral-950 px-4 py-3 font-bold text-neutral-200 border-b border-neutral-800 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>DNS Records to Enter in GoDaddy DNS Manager</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                      Free SSL Auto-Provisioned
                    </span>
                  </div>

                  <div className="p-4 bg-neutral-900/60 space-y-3 font-mono">
                    {/* Record 1: CNAME for www */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                            RECORD 1 (CNAME - Primary Subdomain)
                          </span>
                        </div>
                        <div className="text-neutral-300 text-xs">
                          <strong className="text-neutral-400">Type:</strong> <span className="text-amber-400 font-bold">CNAME</span> &nbsp;|&nbsp;
                          <strong className="text-neutral-400">Name / Host:</strong> <span className="text-white font-bold">www</span> &nbsp;|&nbsp;
                          <strong className="text-neutral-400">Points To:</strong> <span className="text-blue-300 break-all">diesel-passage-t2t1j.web.app</span> &nbsp;|&nbsp;
                          <strong className="text-neutral-400">TTL:</strong> 1/2 Hour (600s)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('diesel-passage-t2t1j.web.app');
                          setCopiedField('cname-val');
                          setTimeout(() => setCopiedField(null), 2000);
                        }}
                        className="px-3 py-1.5 text-xs font-sans font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedField === 'cname-val' ? 'Copied' : 'Copy Value'}</span>
                      </button>
                    </div>

                    {/* Record 2: Alternative Cloud Run CNAME */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/20 text-purple-400 font-bold border border-purple-500/30">
                            ALTERNATIVE DIRECT TARGET (Cloud Run / Applet Preview)
                          </span>
                        </div>
                        <div className="text-neutral-300 text-xs">
                          <strong className="text-neutral-400">Type:</strong> <span className="text-amber-400 font-bold">CNAME</span> &nbsp;|&nbsp;
                          <strong className="text-neutral-400">Name / Host:</strong> <span className="text-white font-bold">www</span> &nbsp;|&nbsp;
                          <strong className="text-neutral-400">Points To:</strong> <span className="text-purple-300 break-all">ais-pre-6debxezmeeam2p3hkekux2-28225476515.asia-southeast1.run.app</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('ais-pre-6debxezmeeam2p3hkekux2-28225476515.asia-southeast1.run.app');
                          setCopiedField('cname-cr');
                          setTimeout(() => setCopiedField(null), 2000);
                        }}
                        className="px-3 py-1.5 text-xs font-sans font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedField === 'cname-cr' ? 'Copied' : 'Copy Value'}</span>
                      </button>
                    </div>

                    {/* Record 3: Root Apex A Records */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                            RECORD 2 & 3 (A RECORD - Root Apex navyugtrack.in)
                          </span>
                        </div>
                        <div className="text-neutral-300 text-xs">
                          <strong className="text-neutral-400">Type:</strong> <span className="text-amber-400 font-bold">A</span> &nbsp;|&nbsp;
                          <strong className="text-neutral-400">Name / Host:</strong> <span className="text-white font-bold">@</span> &nbsp;|&nbsp;
                          <strong className="text-neutral-400">Points To:</strong> <span className="text-emerald-400">199.36.158.100</span> (Firebase Global Anycast IP)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('199.36.158.100');
                          setCopiedField('a-val');
                          setTimeout(() => setCopiedField(null), 2000);
                        }}
                        className="px-3 py-1.5 text-xs font-sans font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedField === 'a-val' ? 'Copied' : 'Copy IP'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Exact Step-by-Step GoDaddy Instructions */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>How to Settle in GoDaddy (Step-by-Step for www.navyugtrack.in):</span>
                </h4>

                {/* Step 1: GoDaddy Setup */}
                <div className="border border-neutral-800 bg-neutral-900 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-neutral-950 font-mono">
                        STEP 1
                      </span>
                      <strong className="text-white text-xs">Update GoDaddy DNS Records</strong>
                    </div>
                    <a
                      href="https://dcc.godaddy.com/manage/navyugtrack.in/dns"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                    >
                      <span>Open GoDaddy DNS</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-neutral-300 text-xs leading-relaxed pl-1">
                    <li>Log into your <strong>GoDaddy Account</strong> &rarr; Go to <strong>My Products</strong> &rarr; Click <strong>DNS</strong> next to <code className="text-amber-300 font-bold">navyugtrack.in</code>.</li>
                    <li>Under the <strong>DNS Records</strong> table, look for the row where Type is <strong>CNAME</strong> and Name is <strong>www</strong>.</li>
                    <li>Click the <strong>Edit (Pencil)</strong> icon on that row.</li>
                    <li>Change the <strong>Value</strong> to <code className="text-blue-300 font-bold">diesel-passage-t2t1j.web.app</code> (or your Cloud Run target).</li>
                    <li>Change <strong>TTL</strong> to <strong>1/2 Hour</strong> (or 600s), and click <strong>Save</strong>.</li>
                    <li>
                      <strong>Apex Domain Forwarding (Recommended):</strong> Scroll down to the <strong>Forwarding</strong> section on the same GoDaddy page &rarr; Click <strong>Add Forwarding</strong> &rarr; Forward <code className="text-neutral-400">navyugtrack.in</code> to <code className="text-amber-300 font-bold">https://www.navyugtrack.in</code> (301 Permanent Redirect) with SSL enabled.
                    </li>
                  </ol>
                </div>

                {/* Step 2: Firebase Hosting Linking */}
                <div className="border border-neutral-800 bg-neutral-900 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500 text-white font-mono">
                        STEP 2
                      </span>
                      <strong className="text-white text-xs">Link Domain in Firebase Console (Project diesel-passage-t2t1j)</strong>
                    </div>
                    <a
                      href="https://console.firebase.google.com/project/diesel-passage-t2t1j/hosting"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                    >
                      <span>Open Firebase Hosting</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-neutral-300 text-xs leading-relaxed pl-1">
                    <li>Open <strong>Firebase Console</strong> for your provisioned project <code className="text-blue-300 font-bold">diesel-passage-t2t1j</code>.</li>
                    <li>Click on <strong>Build</strong> &rarr; <strong>Hosting</strong> in the left sidebar.</li>
                    <li>Click <strong>Add custom domain</strong>.</li>
                    <li>Enter <code className="text-amber-300 font-bold">www.navyugtrack.in</code> and check <em>"Redirect navyugtrack.in to www.navyugtrack.in"</em>.</li>
                    <li>If Firebase asks for domain verification, add the displayed <strong>TXT record</strong> (<code className="text-neutral-400">google-site-verification=...</code>) into your GoDaddy DNS table.</li>
                    <li>Click <strong>Verify</strong>. Firebase will issue a managed SSL certificate automatically within 15–60 minutes.</li>
                  </ol>
                </div>

                {/* Step 3: Cloudflare Alternative (Instant 2-Minute Propagation) */}
                <div className="border border-neutral-800 bg-neutral-900 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-neutral-950 font-mono">
                        OPTION B
                      </span>
                      <strong className="text-white text-xs">Cloudflare Edge Proxy (Instant SSL + DDoS Protection)</strong>
                    </div>
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-neutral-300 text-xs leading-relaxed pl-1">
                    <li>If you route DNS through <strong>Cloudflare</strong>, add a CNAME record with Name <code className="text-amber-300">www</code> pointing to <code className="text-blue-300">ais-pre-6debxezmeeam2p3hkekux2-28225476515.asia-southeast1.run.app</code>.</li>
                    <li>Leave <strong>Proxy Status: Proxied (Orange Cloud)</strong> turned ON. Cloudflare will terminate SSL at its Indian edge servers immediately without waiting for DNS propagation!</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Save Team Directory & Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
