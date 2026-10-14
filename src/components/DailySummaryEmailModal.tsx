import React, { useState, useEffect } from 'react';
import { CorrugatedOrder, FactorySettings, DailyEmailSummaryLog } from '../types/order';
import {
  getRegisteredOwnerEmails,
  generateDailySummaryEmailContent,
  sendDailyOrderSummaryEmail,
  fetchDailyEmailSummaries,
} from '../utils/dailyEmailSummary';
import { sendDirectInAppWhatsApp } from '../utils/whatsappClient';
import { formatCurrency, formatDateTime, ORDER_STAGES, STAGE_CONFIG } from '../utils/whatsapp';
import { soundManager } from '../utils/audio';
import {
  X,
  Mail,
  Send,
  CheckCircle2,
  Clock,
  Layers,
  AlertTriangle,
  Copy,
  Check,
  Plus,
  Trash2,
  Eye,
  FileText,
  History,
  MessageSquare,
  Building2,
} from 'lucide-react';

interface DailySummaryEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: CorrugatedOrder[];
  settings: FactorySettings;
  onSaveSettings: (updated: FactorySettings) => void;
  onLogDispatched?: (recipientName: string, emailOrPhone: string, snippet: string) => void;
  onOpenSettingsOwners?: () => void;
}

export const DailySummaryEmailModal: React.FC<DailySummaryEmailModalProps> = ({
  isOpen,
  onClose,
  orders,
  settings,
  onSaveSettings,
  onLogDispatched,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'schedule' | 'history'>('preview');
  const [viewFormat, setViewFormat] = useState<'visual' | 'text'>('visual');
  const [recipientEmails, setRecipientEmails] = useState<string[]>(() =>
    getRegisteredOwnerEmails(settings)
  );
  const [newEmailInput, setNewEmailInput] = useState('');
  const [scheduledTime, setScheduledTime] = useState<string>(
    settings.dailySummaryEmail?.scheduledTime || '19:00'
  );
  const [autoDailyEnabled, setAutoDailyEnabled] = useState<boolean>(
    settings.dailySummaryEmail?.enabled ?? true
  );
  const [emailWebhookUrl, setEmailWebhookUrl] = useState<string>(
    settings.dailySummaryEmail?.emailWebhookUrl || ''
  );

  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingWhatsAppDigest, setIsSendingWhatsAppDigest] = useState(false);
  const [sentBanner, setSentBanner] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [emailHistory, setEmailHistory] = useState<DailyEmailSummaryLog[]>([]);

  useEffect(() => {
    if (isOpen) {
      setRecipientEmails(getRegisteredOwnerEmails(settings));
      fetchDailyEmailSummaries().then((list) => setEmailHistory(list));
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const summaryData = generateDailySummaryEmailContent(orders, settings);

  const handleAddRecipient = () => {
    const clean = newEmailInput.trim();
    if (!clean || !clean.includes('@')) return;
    if (!recipientEmails.includes(clean)) {
      const updated = [...recipientEmails, clean];
      setRecipientEmails(updated);
      saveEmailConfigToSettings(updated, scheduledTime, autoDailyEnabled, emailWebhookUrl);
    }
    setNewEmailInput('');
  };

  const handleRemoveRecipient = (email: string) => {
    if (recipientEmails.length <= 1) return;
    const updated = recipientEmails.filter((e) => e !== email);
    setRecipientEmails(updated);
    saveEmailConfigToSettings(updated, scheduledTime, autoDailyEnabled, emailWebhookUrl);
  };

  const saveEmailConfigToSettings = (
    emails: string[],
    time: string,
    enabled: boolean,
    hookUrl: string
  ) => {
    onSaveSettings({
      ...settings,
      ownerEmail: emails[0] || settings.ownerEmail,
      dailySummaryEmail: {
        enabled,
        recipientEmails: emails,
        scheduledTime: time,
        includeStageBreakdown: true,
        includeDelayedOrdersAlert: true,
        includeCommercialValue: true,
        emailWebhookUrl: hookUrl,
        lastSentAt: settings.dailySummaryEmail?.lastSentAt,
      },
    });
  };

  const handleSendDailySummaryNow = async () => {
    setIsSendingEmail(true);
    setSentBanner(null);

    try {
      const result = await sendDailyOrderSummaryEmail({
        orders,
        settings,
        customRecipients: recipientEmails,
      });

      if (settings.enableSoundAlerts) {
        soundManager.playStageUpdateSound();
      }

      setEmailHistory((prev) => [result.summary, ...prev.filter((x) => x.id !== result.summary.id)]);

      // Update lastSentAt in settings
      onSaveSettings({
        ...settings,
        ownerEmail: recipientEmails[0] || settings.ownerEmail,
        dailySummaryEmail: {
          enabled: autoDailyEnabled,
          recipientEmails,
          scheduledTime,
          includeStageBreakdown: true,
          includeDelayedOrdersAlert: true,
          includeCommercialValue: true,
          emailWebhookUrl,
          lastSentAt: new Date().toISOString(),
        },
      });

      if (onLogDispatched) {
        onLogDispatched(
          `${settings.ownerName} (Daily Summary Email)`,
          recipientEmails.join(', '),
          `📧 Daily Summary Email Dispatched: ${summaryData.totalOrders} Total Orders (${summaryData.activeOrdersCount} Active, ${summaryData.delayedOrdersCount} Delayed)`
        );
      }

      setSentBanner(
        `✓ Daily Order & Stage Summary Email dispatched to Plant Owner (${recipientEmails.join(', ')})!`
      );
      setTimeout(() => setSentBanner(null), 6000);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleAlsoSendSummaryViaInAppWhatsApp = async () => {
    setIsSendingWhatsAppDigest(true);
    setSentBanner(null);

    try {
      const primaryOwner = settings.owners?.find((o) => o.isPrimary) || settings.owners?.[0];
      const ownerPhone = primaryOwner?.phone || settings.ownerPhone;
      const ownerName = primaryOwner?.name || settings.ownerName;

      await sendDirectInAppWhatsApp({
        order: orders[0] || ({ id: 'DAILY-DIGEST', currentStage: 'ORDER_PLACED' } as any),
        settings,
        recipientRole: 'Plant Owner (Daily Summary)',
        recipientName: ownerName,
        recipientPhone: ownerPhone,
        message: summaryData.textBody,
      });

      if (settings.enableSoundAlerts) {
        soundManager.playStageUpdateSound();
      }

      if (onLogDispatched) {
        onLogDispatched(
          `${ownerName} (Daily WhatsApp Digest)`,
          ownerPhone,
          `📲 Daily Summary sent via Built-In WhatsApp Messenger to ${ownerName} (${ownerPhone})`
        );
      }

      setSentBanner(
        `✓ Daily Summary also sent directly inside the app via WhatsApp to ${ownerName} (${ownerPhone}) — No external tab opened!`
      );
      setTimeout(() => setSentBanner(null), 6000);
    } finally {
      setIsSendingWhatsAppDigest(false);
    }
  };

  const handleCopyPlainText = () => {
    navigator.clipboard.writeText(summaryData.textBody);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl my-auto max-h-[94vh] flex flex-col">
        {/* Top Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Executive Daily Email Digest
                </span>
                <span className="text-xs text-emerald-400 font-medium">
                  • Registered Owner Email Ready
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">
                Daily Order & Stage Summary Email to Plant Owner
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-amber-400 text-neutral-950 font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Summary & Send</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'schedule'
                    ? 'bg-amber-400 text-neutral-950 font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Owner Emails & Auto-Schedule</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'history'
                    ? 'bg-amber-400 text-neutral-950 font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Sent Archive ({emailHistory.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Recipient & Quick Dispatch Banner */}
        <div className="px-6 py-3 bg-neutral-950 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-neutral-400 font-medium flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Plant Owner Registered Email(s):</span>
            </span>
            {recipientEmails.map((em) => (
              <span
                key={em}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono text-[11px] font-semibold flex items-center gap-1.5"
              >
                <Mail className="w-3 h-3 text-amber-400" />
                <span>{em}</span>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className="text-[11px] text-amber-400 hover:underline font-medium ml-1"
            >
              Edit Owner Email →
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAlsoSendSummaryViaInAppWhatsApp}
              disabled={isSendingWhatsAppDigest}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/40 font-semibold text-xs transition-colors"
              title="Also send this daily summary directly to the Plant Owner on WhatsApp inside this app (no external tab)"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {isSendingWhatsAppDigest ? 'Sending In-App...' : 'Also Send to Owner WhatsApp (In-App)'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSendDailySummaryNow}
              disabled={isSendingEmail}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isSendingEmail
                  ? 'Dispatching Daily Summary Email...'
                  : 'Send Daily Summary Email Now'}
              </span>
            </button>
          </div>
        </div>

        {/* Status Notification Banner */}
        {sentBanner && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-xs text-emerald-300 font-semibold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{sentBanner}</span>
            </div>
            <button type="button" onClick={() => setSentBanner(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'preview' && (
            <div className="space-y-5">
              {/* Executive KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[11px] text-neutral-400">Total Plant Orders</div>
                  <div className="text-2xl font-black text-white font-mono mt-1">
                    {summaryData.totalOrders}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Included in today&apos;s report</div>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950 border border-amber-500/30">
                  <div className="text-[11px] text-amber-300">Active in Production / Transit</div>
                  <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                    {summaryData.activeOrdersCount}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Across 6 shopfloor stages</div>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950 border border-rose-500/30">
                  <div className="text-[11px] text-rose-300">Delayed / At-Risk SLA</div>
                  <div className="text-2xl font-black text-rose-400 font-mono mt-1">
                    {summaryData.delayedOrdersCount}
                  </div>
                  <div className="text-[10px] text-rose-400/80 mt-0.5">Flagged for owner attention</div>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950 border border-emerald-500/30">
                  <div className="text-[11px] text-emerald-300">Total Commercial Value</div>
                  <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                    {formatCurrency(summaryData.totalRevenue)}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    {summaryData.deliveredCount} Delivered batches
                  </div>
                </div>
              </div>

              {/* Stage Distribution Bar */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>Stage-by-Stage Order Breakdown</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewFormat('visual')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold ${
                        viewFormat === 'visual'
                          ? 'bg-amber-400 text-neutral-950 font-bold'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white'
                      }`}
                    >
                      Rich HTML Email View
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewFormat('text')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                        viewFormat === 'text'
                          ? 'bg-amber-400 text-neutral-950 font-bold'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      <span>Plain Text Digest</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyPlainText}
                      className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 flex items-center gap-1"
                    >
                      {copiedText ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Report</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {ORDER_STAGES.map((st) => {
                    const conf = STAGE_CONFIG[st];
                    const count = summaryData.stageCounts[st] || 0;
                    return (
                      <div
                        key={st}
                        className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-neutral-400">
                            Step {conf.stepNumber}
                          </span>
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: conf.color }}
                          />
                        </div>
                        <div className="text-lg font-black text-white font-mono my-1">{count}</div>
                        <div className="text-[10px] text-neutral-300 truncate" title={conf.title}>
                          {conf.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Email Preview Container */}
              {viewFormat === 'visual' ? (
                <div className="rounded-2xl border border-neutral-800 overflow-hidden bg-neutral-950 shadow-inner">
                  <div className="px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="text-neutral-400">
                        <strong className="text-neutral-200">To:</strong>{' '}
                        <span className="text-amber-400 font-mono">{recipientEmails.join(', ')}</span>
                      </div>
                      <div className="text-neutral-400">
                        <strong className="text-neutral-200">Subject:</strong>{' '}
                        <span className="text-white font-semibold">{summaryData.subject}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      HTML Email Preview
                    </span>
                  </div>
                  <div
                    className="p-4 max-h-[420px] overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: summaryData.htmlBody }}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                  <pre className="text-xs font-mono text-neutral-200 whitespace-pre-wrap leading-relaxed max-h-[420px] overflow-y-auto">
                    {summaryData.textBody}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="max-w-3xl mx-auto space-y-5 text-xs">
              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-400" />
                  <span>Plant Owner Registered Email Addresses</span>
                </h3>
                <p className="text-neutral-400">
                  All daily order &amp; stage summary reports are dispatched to these registered Plant Owner email addresses:
                </p>

                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    placeholder="Add owner or director email (e.g. director@srvmills.com)..."
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddRecipient}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Email</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {recipientEmails.map((em, idx) => (
                    <div
                      key={em}
                      className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-800"
                    >
                      <div className="flex items-center gap-2.5">
                        <Mail className="w-4 h-4 text-amber-400" />
                        <span className="font-mono font-semibold text-white">{em}</span>
                        {idx === 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                            Primary Owner Email
                          </span>
                        )}
                      </div>
                      {recipientEmails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipient(em)}
                          className="text-neutral-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Automated Daily Summary Schedule</span>
                </h3>

                <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <input
                    type="checkbox"
                    checked={autoDailyEnabled}
                    onChange={(e) => {
                      setAutoDailyEnabled(e.target.checked);
                      saveEmailConfigToSettings(
                        recipientEmails,
                        scheduledTime,
                        e.target.checked,
                        emailWebhookUrl
                      );
                    }}
                    className="rounded text-amber-400 focus:ring-0"
                  />
                  <span className="font-semibold text-white">
                    Automatically generate and send Daily Order &amp; Stage Summary Email every day
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-400 mb-1">Daily Dispatch Time (24h IST)</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => {
                        setScheduledTime(e.target.value);
                        saveEmailConfigToSettings(
                          recipientEmails,
                          e.target.value,
                          autoDailyEnabled,
                          emailWebhookUrl
                        );
                      }}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">
                      Optional Email Gateway / Zapier / Make Webhook URL
                    </label>
                    <input
                      type="url"
                      value={emailWebhookUrl}
                      onChange={(e) => {
                        setEmailWebhookUrl(e.target.value);
                        saveEmailConfigToSettings(
                          recipientEmails,
                          scheduledTime,
                          autoDailyEnabled,
                          e.target.value
                        );
                      }}
                      placeholder="https://hooks.zapier.com/..."
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {emailHistory.length === 0 ? (
                <div className="p-12 text-center text-neutral-500 space-y-2 bg-neutral-950 rounded-2xl border border-neutral-800">
                  <Mail className="w-8 h-8 mx-auto opacity-40" />
                  <div className="text-sm font-bold text-neutral-300">
                    No Daily Summary Emails Dispatched Yet
                  </div>
                  <div className="text-xs">
                    Click &quot;Send Daily Summary Email Now&quot; above to generate and send today&apos;s report.
                  </div>
                </div>
              ) : (
                emailHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                          ✓ {item.status}
                        </span>
                        <span className="font-bold text-white">{item.subject}</span>
                      </div>
                      <div className="text-neutral-400 font-mono text-[11px]">
                        To: <span className="text-amber-300">{item.recipients.join(', ')}</span> • Sent:{' '}
                        {formatDateTime(item.timestamp)}
                      </div>
                      <div className="text-neutral-400 text-[11px]">
                        Orders: <strong>{item.totalOrders}</strong> ({item.activeOrdersCount} Active,{' '}
                        {item.delayedOrdersCount} Delayed, {item.deliveredCount} Delivered) • Value:{' '}
                        <strong className="text-emerald-400">{formatCurrency(item.totalRevenue)}</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(item.textBody);
                        setCopiedText(true);
                        setTimeout(() => setCopiedText(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium self-start sm:self-center shrink-0"
                    >
                      Copy Text
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-xs">
          <div className="text-neutral-400">
            Last Dispatched:{' '}
            <span className="text-white font-mono">
              {settings.dailySummaryEmail?.lastSentAt
                ? formatDateTime(settings.dailySummaryEmail.lastSentAt)
                : 'Ready to send'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSendDailySummaryNow}
              disabled={isSendingEmail}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold shadow"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingEmail ? 'Sending...' : 'Send Daily Summary Email Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
