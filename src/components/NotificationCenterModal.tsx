import React, { useState } from 'react';
import { NotificationLog, CorrugatedOrder, FactorySettings } from '../types/order';
import { 
  formatDateTime, 
  buildWhatsappLink, 
  buildWhatsappWebLink,
  STAGE_CONFIG 
} from '../utils/whatsapp';
import { 
  renderCustomWhatsAppMessage, 
  DEFAULT_TEMPLATES, 
  getActiveTemplateText 
} from '../utils/whatsappTemplates';
import { sendDirectInAppWhatsApp } from '../utils/whatsappClient';
import { soundManager } from '../utils/audio';
import { 
  X, 
  Bell, 
  MessageSquare, 
  ExternalLink, 
  Send, 
  CheckCircle, 
  RefreshCw, 
  Smartphone, 
  Webhook, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  Briefcase, 
  UserCheck, 
  Factory, 
  Building2, 
  AlertTriangle,
  Sliders,
  Download,
  Settings,
  Sparkles
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: NotificationLog[];
  orders: CorrugatedOrder[];
  settings: FactorySettings;
  onClearLogs: () => void;
  onOpenTemplateEditor?: () => void;
  onOpenStageDelayModal?: (order: CorrugatedOrder) => void;
  onOpenInteractiveCardModal?: (order: CorrugatedOrder) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  logs,
  orders,
  settings,
  onClearLogs,
  onOpenTemplateEditor,
  onOpenStageDelayModal,
  onOpenInteractiveCardModal,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'audit' | 'dispatcher' | 'rules'>('audit');
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [selectedRole, setSelectedRole] = useState<'Customer' | 'Sales Executive' | 'Business Owner' | 'Production Team'>('Customer');
  const [logFilterRole, setLogFilterRole] = useState<string>('All');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [showDelaysOnly, setShowDelaysOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testWebhookStatus, setTestWebhookStatus] = useState<string | null>(null);
  const [inAppDispatchedId, setInAppDispatchedId] = useState<string | null>(null);
  const [dispatcherSentBanner, setDispatcherSentBanner] = useState<string | null>(null);

  const handleResendLogInApp = async (log: NotificationLog) => {
    const targetOrder = orders.find((o) => o.id === log.orderId) || orders[0];
    if (!targetOrder) return;
    await sendDirectInAppWhatsApp({
      order: targetOrder,
      settings,
      recipientRole: log.recipientRole,
      recipientName: log.recipientName,
      recipientPhone: log.phoneNumber,
      message: log.messageSnippet,
    });
    if (settings.enableSoundAlerts) {
      soundManager.playStageUpdateSound();
    }
    setInAppDispatchedId(log.id);
    setTimeout(() => setInAppDispatchedId(null), 3500);
  };

  const handleManualDispatchInApp = async () => {
    if (!activeOrder) return;
    await sendDirectInAppWhatsApp({
      order: activeOrder,
      settings,
      recipientRole: selectedRole,
      recipientName: selectedRole,
      recipientPhone,
      message: sampleMessage,
    });
    if (settings.enableSoundAlerts) {
      soundManager.playStageUpdateSound();
    }
    setDispatcherSentBanner(
      `✓ Dispatched directly inside this webpage to ${selectedRole} (${recipientPhone}) — No external tab opened!`
    );
    setTimeout(() => setDispatcherSentBanner(null), 5000);
  };

  const activeOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  let sampleMessage = '';
  let recipientPhone = '';

  if (activeOrder) {
    if (selectedRole === 'Customer') {
      sampleMessage = renderCustomWhatsAppMessage('CUSTOMER_STAGE_UPDATE', activeOrder, settings);
      recipientPhone = activeOrder.customerPhone;
    } else if (selectedRole === 'Sales Executive') {
      sampleMessage = renderCustomWhatsAppMessage('SALES_STAGE_COMPLETED', activeOrder, settings);
      recipientPhone = activeOrder.salesPersonPhone || settings.salesTeam?.[0]?.phone || settings.contactNumber;
    } else if (selectedRole === 'Business Owner') {
      sampleMessage = renderCustomWhatsAppMessage('OWNER_SUMMARY', activeOrder, settings);
      recipientPhone = settings.ownerPhone;
    } else {
      sampleMessage = renderCustomWhatsAppMessage('PRODUCTION_JOB_CARD', activeOrder, settings);
      recipientPhone = settings.productionSupervisorPhone;
    }
  }

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (showDelaysOnly && !log.isDelayAlert && !log.messageSnippet.includes('DELAY') && !log.messageSnippet.includes('STALLED')) {
      return false;
    }
    if (logFilterRole !== 'All' && log.recipientRole !== logFilterRole) {
      return false;
    }
    if (logSearchQuery.trim()) {
      const q = logSearchQuery.toLowerCase();
      const matchOrder = log.orderId.toLowerCase().includes(q);
      const matchRecipient = log.recipientName.toLowerCase().includes(q);
      const matchPhone = log.phoneNumber.includes(q);
      const matchSnippet = log.messageSnippet.toLowerCase().includes(q);
      return matchOrder || matchRecipient || matchPhone || matchSnippet;
    }
    return true;
  });

  const handleCopyLogMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Timestamp', 'OrderID', 'RecipientName', 'RecipientRole', 'PhoneNumber', 'Channel', 'Snippet'];
    const rows = logs.map((l) => [
      l.id,
      l.timestamp,
      l.orderId,
      `"${l.recipientName.replace(/"/g, '""')}"`,
      l.recipientRole,
      l.phoneNumber,
      l.channel,
      `"${l.messageSnippet.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `corrutrack_notification_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTestWebhook = async () => {
    if (!settings.webhookUrl) {
      setTestWebhookStatus('No Webhook URL configured in settings. Set one in Settings modal.');
      return;
    }

    setTestWebhookStatus('Dispatching test HTTP POST payload...');
    try {
      const response = await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'TEST_DISPATCH',
          timestamp: new Date().toISOString(),
          company: settings.companyName,
          order: activeOrder,
          message: sampleMessage,
        }),
      });
      if (response.ok) {
        setTestWebhookStatus('Payload delivered successfully (HTTP 200 OK)');
      } else {
        setTestWebhookStatus(`Server responded with HTTP ${response.status}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      setTestWebhookStatus(`Webhook dispatch attempted: ${message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-400/10 text-amber-400 rounded-xl border border-amber-400/20">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                    Live Dispatch Hub
                  </span>
                  <span className="text-xs text-neutral-500">/</span>
                  <span className="text-xs text-neutral-300 font-semibold">
                    Supply Chain Audit Center
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">
                  All Notifications & WhatsApp Records
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenInteractiveCardModal && (
                <button
                  type="button"
                  onClick={() => {
                    const targetOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];
                    if (targetOrder) {
                      onClose();
                      onOpenInteractiveCardModal(targetOrder);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-xs font-semibold text-emerald-300 border border-emerald-500/40 rounded-lg transition-colors shadow-sm"
                  title="Generate WhatsApp Interactive Media Card & Quick Reply Buttons"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Interactive Spec Card</span>
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
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center justify-between gap-2 mt-4 pt-2 border-t border-neutral-800/80">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'audit'
                    ? 'bg-amber-400 text-neutral-950 font-bold'
                    : 'bg-neutral-950 text-neutral-400 hover:text-white'
                }`}
              >
                All Outbound Logs ({logs.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('dispatcher')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'dispatcher'
                    ? 'bg-amber-400 text-neutral-950 font-bold'
                    : 'bg-neutral-950 text-neutral-400 hover:text-white'
                }`}
              >
                Direct WhatsApp Dispatcher
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rules')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'rules'
                    ? 'bg-amber-400 text-neutral-950 font-bold'
                    : 'bg-neutral-950 text-neutral-400 hover:text-white'
                }`}
              >
                Notification Trigger Rules
              </button>
            </div>

            {activeTab === 'audit' && logs.length > 0 && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {activeTab === 'audit' && (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by Order ID, Client, Sales Rep, or Mobile..."
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Role Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {['All', 'Sales Executive', 'Customer', 'Production Team', 'Business Owner'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setLogFilterRole(role)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                        logFilterRole === role
                          ? role === 'Sales Executive'
                            ? 'bg-purple-600 text-white font-bold'
                            : 'bg-amber-400 text-neutral-950 font-bold'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      {role === 'Sales Executive' ? 'Sales' : role === 'Business Owner' ? 'Owner' : role}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setShowDelaysOnly(!showDelaysOnly)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors flex items-center gap-1 ${
                      showDelaysOnly
                        ? 'bg-rose-500 text-white border-rose-400'
                        : 'bg-neutral-900 text-rose-400 border-rose-900/50 hover:bg-rose-950/40'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Delays Only</span>
                  </button>
                </div>
              </div>

              {/* Log List */}
              {filteredLogs.length === 0 ? (
                <div className="p-12 text-center text-neutral-500 space-y-2">
                  <Bell className="w-8 h-8 mx-auto opacity-30" />
                  <div className="text-sm font-semibold">No notification logs match your filters</div>
                  <div className="text-xs">Notifications are created automatically when production steps advance or delays occur.</div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredLogs.map((log) => {
                    const isSales = log.recipientRole === 'Sales Executive';
                    const isCustomer = log.recipientRole === 'Customer';
                    const isDelay = log.isDelayAlert || log.messageSnippet.includes('DELAY') || log.messageSnippet.includes('STALLED');

                    return (
                      <div
                        key={log.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isDelay
                            ? 'bg-rose-950/20 border-rose-800/40'
                            : 'bg-neutral-950 border-neutral-800/90 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/40">
                              {log.orderId}
                            </span>

                            {isSales && (
                              <span className="text-[10px] font-semibold bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-800/60 flex items-center gap-1">
                                <Briefcase className="w-3 h-3 text-purple-400" />
                                <span>Sales Rep Alert</span>
                              </span>
                            )}

                            {isCustomer && (
                              <span className="text-[10px] font-semibold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/60 flex items-center gap-1">
                                <UserCheck className="w-3 h-3 text-emerald-400" />
                                <span>Customer Dispatch</span>
                              </span>
                            )}

                            {isDelay && (
                              <span className="text-[10px] font-bold bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800/60 flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Stage Delay Alert</span>
                              </span>
                            )}

                            <span className="text-xs text-white font-medium">
                              {log.recipientName}
                            </span>
                            <span className="text-[11px] font-mono text-neutral-400">
                              ({log.phoneNumber})
                            </span>
                          </div>

                          <div className="text-[11px] font-mono text-neutral-400">
                            {formatDateTime(log.timestamp)}
                          </div>
                        </div>

                        {/* Snippet */}
                        <div className="p-2.5 bg-neutral-900/90 rounded-lg text-xs font-mono text-neutral-300 whitespace-pre-wrap leading-relaxed border border-neutral-800">
                          {log.messageSnippet}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-neutral-800/60 text-xs">
                          <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>Channel: {log.channel}</span>
                            <span>·</span>
                            <span>Status: {log.status}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopyLogMessage(log.id, log.messageSnippet)}
                              className="flex items-center gap-1 px-2 py-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
                            >
                              {copiedId === log.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400 font-medium">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleResendLogInApp(log)}
                              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg font-semibold transition-colors cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>
                                {inAppDispatchedId === log.id
                                  ? '✓ Sent In-App!'
                                  : 'Resend WhatsApp (In-App)'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'dispatcher' && (
            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Direct In-App WhatsApp Dispatcher</h3>
                  <p className="text-xs text-neutral-400">Trigger test messages or send targeted notifications immediately inside this webpage.</p>
                </div>
                <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Same-Webpage WhatsApp Plugin Active</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Select Batch</label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.id} - {o.customerCompany} ({o.quantity} boxes)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Select Recipient Role</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {(['Customer', 'Sales Executive', 'Production Team', 'Business Owner'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSelectedRole(r)}
                        className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                          selectedRole === r
                            ? r === 'Sales Executive'
                              ? 'bg-purple-600 text-white font-bold shadow'
                              : 'bg-amber-400 text-neutral-950 font-bold shadow'
                            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                        }`}
                      >
                        {r === 'Sales Executive' ? 'Sales' : r === 'Business Owner' ? 'Owner' : r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Message preview */}
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg font-mono text-xs text-neutral-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {sampleMessage}
              </div>

              {dispatcherSentBanner && (
                <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-300 font-semibold">
                  {dispatcherSentBanner}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="text-xs text-neutral-400 font-mono">
                  Target Recipient Phone: <span className="text-amber-400">{recipientPhone}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestWebhook}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    <Webhook className="w-3.5 h-3.5 text-blue-400" />
                    <span>Trigger Webhook</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleManualDispatchInApp}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shadow cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send WhatsApp Now (Inside App)</span>
                  </button>
                </div>
              </div>

              {testWebhookStatus && (
                <div className="text-[11px] font-mono p-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-300">
                  {testWebhookStatus}
                </div>
              )}
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
                <h3 className="text-sm font-bold text-white">Automated Trigger Matrix & Rules</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Every manufacturing step, delay event, and inspection proof can be automatically routed to the right stakeholders on WhatsApp:
                </p>

                <div className="space-y-2 pt-2 text-xs">
                  <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">Sales Executive Step Milestones</div>
                      <div className="text-[11px] text-neutral-400">
                        Dispatches automated WhatsApp to the fixed Sales Person when corrugation, printing, or bundling is checked off.
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                      Active
                    </span>
                  </div>

                  <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">Stage Delay Alerts</div>
                      <div className="text-[11px] text-neutral-400">
                        Immediately escalates delay causes (+hours) to Sales Person, Customer, and Plant Head with recalculated SLAs.
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                      Active
                    </span>
                  </div>

                  <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">Stalled Process Radar (&gt;150% Benchmark)</div>
                      <div className="text-[11px] text-neutral-400">
                        Detects orders lingering too long on corrugators or flexo machines and alerts supervisor Mahesh Patil.
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                      Active
                    </span>
                  </div>

                  <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">Customer Live Tracking Link & Proof</div>
                      <div className="text-[11px] text-neutral-400">
                        Appends unique tracking URL and inspection photo link to customer messages.
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-neutral-950 border-t border-neutral-800 text-xs">
          <div className="text-neutral-500 font-mono text-[11px]">
            Total Logged Events: {logs.length}
          </div>

          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear notification audit history?')) {
                    onClearLogs();
                  }
                }}
                className="text-neutral-400 hover:text-rose-400 px-3 py-1.5 transition-colors"
              >
                Clear History
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
