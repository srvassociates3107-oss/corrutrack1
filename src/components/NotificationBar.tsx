import React, { useState, useEffect } from 'react';
import { NotificationLog, CorrugatedOrder, FactorySettings } from '../types/order';
import { 
  Bell, 
  CheckCircle2, 
  Send, 
  Briefcase, 
  UserCheck, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  ExternalLink,
  MessageSquare,
  Sparkles,
  Layers,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { buildWhatsappLink, STAGE_CONFIG } from '../utils/whatsapp';

interface NotificationBarProps {
  logs: NotificationLog[];
  orders: CorrugatedOrder[];
  settings: FactorySettings;
  onOpenNotifications: () => void;
  onOpenOrderTracker: (orderId: string) => void;
  onOpenWhatsAppPlugin?: (order: CorrugatedOrder) => void;
}

export const NotificationBar: React.FC<NotificationBarProps> = ({
  logs,
  orders,
  settings,
  onOpenNotifications,
  onOpenOrderTracker,
  onOpenWhatsAppPlugin,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'sales' | 'customer' | 'delays'>('all');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Filter logs for meaningful step completions
  const filteredLogs = logs.filter((log) => {
    if (filterType === 'delays') {
      return log.isDelayAlert || log.messageSnippet.includes('DELAY') || log.messageSnippet.includes('STALLED');
    }
    if (filterType === 'sales') return log.recipientRole === 'Sales Executive';
    if (filterType === 'customer') return log.recipientRole === 'Customer';
    return true;
  });

  // Cycle through notifications automatically
  useEffect(() => {
    if (isPaused || filteredLogs.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % filteredLogs.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, filteredLogs.length]);

  // Reset index if filter changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [filterType]);

  if (isDismissed || filteredLogs.length === 0) {
    return null;
  }

  const currentLog = filteredLogs[currentIndex] || filteredLogs[0];
  const relatedOrder = orders.find((o) => o.id === currentLog.orderId);
  const stageInfo = STAGE_CONFIG[currentLog.stage];
  const isDelayNotification = currentLog.isDelayAlert || currentLog.messageSnippet.includes('DELAY') || currentLog.messageSnippet.includes('STALLED');
  const isSalesNotification = currentLog.recipientRole === 'Sales Executive';
  const isCustomerNotification = currentLog.recipientRole === 'Customer';

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`border-y px-4 py-2 text-xs shadow-md transition-all relative overflow-hidden ${
        isDelayNotification
          ? 'bg-rose-950/20 border-rose-800/50 text-rose-100'
          : 'bg-neutral-900 border-neutral-800/90 text-neutral-200'
      }`}
    >
      {/* Decorative gradient glow on edge */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
        isDelayNotification
          ? 'bg-rose-500 animate-pulse'
          : isSalesNotification
          ? 'bg-purple-500'
          : isCustomerNotification
          ? 'bg-emerald-500'
          : 'bg-amber-400'
      }`} />

      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pl-2">
        {/* Left: Live Notification Ticker Item */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Badge & Step indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isDelayNotification ? (
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-300 bg-rose-950/90 px-2 py-0.5 rounded border border-rose-800/80 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-400 animate-pulse" />
                <span>Delay Alert</span>
              </span>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                  Live Alert
                </span>
              </>
            )}

            {isSalesNotification && (
              <span className="text-[10px] font-semibold bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded border border-purple-800/60 flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-purple-400" />
                <span>Sales Rep</span>
              </span>
            )}

            {isCustomerNotification && (
              <span className="text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/60 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-emerald-400" />
                <span>Customer</span>
              </span>
            )}
          </div>

          {/* Log Message Headline */}
          <div className="flex items-center gap-2 truncate text-xs text-white">
            <button
              onClick={() => onOpenOrderTracker(currentLog.orderId)}
              className="font-mono font-bold text-amber-400 hover:underline shrink-0"
            >
              #{currentLog.orderId}
            </button>
            <span className="text-neutral-500">·</span>
            <span className="font-semibold text-neutral-200 shrink-0">
              {stageInfo ? `Step ${stageInfo.stepNumber}/6: ${stageInfo.title}` : currentLog.stage}
            </span>
            <span className="text-neutral-500 hidden md:inline">·</span>
            <span className="text-neutral-300 truncate hidden md:inline">
              Recipient: <strong className="text-white">{currentLog.recipientName}</strong> ({currentLog.phoneNumber})
            </span>
          </div>
        </div>

        {/* Right: Quick Launchers, Filter Pills, and Dismiss */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {/* Direct In-App WhatsApp Action for the current log */}
          {relatedOrder && onOpenWhatsAppPlugin && (
            <button
              type="button"
              onClick={() => onOpenWhatsAppPlugin(relatedOrder)}
              title={`Send In-App WhatsApp to ${currentLog.recipientName} (Same Webpage)`}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 text-[11px] font-medium transition-colors cursor-pointer"
            >
              <Send className="w-3 h-3 text-emerald-400" />
              <span>WhatsApp {isSalesNotification ? 'Sales Rep' : 'Contact'} (In-App)</span>
            </button>
          )}

          {/* Filter Pills */}
          <div className="hidden sm:flex items-center bg-neutral-950 rounded p-0.5 border border-neutral-800 text-[10px]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                filterType === 'all' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('sales')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                filterType === 'sales' ? 'bg-purple-900/60 text-purple-300 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Sales
            </button>
            <button
              onClick={() => setFilterType('customer')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                filterType === 'customer' ? 'bg-emerald-900/60 text-emerald-300 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Customer
            </button>
            <button
              onClick={() => setFilterType('delays')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                filterType === 'delays' ? 'bg-rose-900/60 text-rose-300 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Delays
            </button>
          </div>

          {/* Stepper counter */}
          <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 pl-1">
            <span>
              {currentIndex + 1}/{filteredLogs.length}
            </span>
            <button
              onClick={() =>
                setCurrentIndex((prev) => (prev - 1 + filteredLogs.length) % filteredLogs.length)
              }
              title="Previous Alert"
              className="p-1 hover:text-white rounded hover:bg-neutral-800"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % filteredLogs.length)}
              title="Next Alert"
              className="p-1 hover:text-white rounded hover:bg-neutral-800"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* All Notifications Hub trigger */}
          <button
            onClick={onOpenNotifications}
            title="View All Dispatched Notifications"
            className="text-[11px] text-amber-400 hover:underline px-1 whitespace-nowrap"
          >
            History
          </button>

          {/* Dismiss button */}
          <button
            onClick={() => setIsDismissed(true)}
            title="Dismiss Notification Bar"
            className="p-1 text-neutral-500 hover:text-white rounded hover:bg-neutral-800 transition-colors ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

