import React, { useState } from 'react';
import { CorrugatedOrder, FactorySettings } from '../types/order';
import { calculateSLA, generateDelayEscalationWhatsappMessage, STAGE_CONFIG, formatDateTime } from '../utils/whatsapp';
import { sendDirectInAppWhatsApp } from '../utils/whatsappClient';
import { soundManager } from '../utils/audio';
import { AlertTriangle, Clock, ArrowRight, Phone, MessageSquare, Zap, ShieldAlert, CheckCircle, CheckCircle2 } from 'lucide-react';

interface DelayRadarProps {
  orders: CorrugatedOrder[];
  settings: FactorySettings;
  onOpenStageUpdate: (order: CorrugatedOrder) => void;
  onOpenTracker: (orderId: string) => void;
  onOpenStageDelay?: (order: CorrugatedOrder) => void;
  onOpenWhatsAppPlugin?: (order: CorrugatedOrder) => void;
}

export const DelayRadar: React.FC<DelayRadarProps> = ({
  orders,
  settings,
  onOpenStageUpdate,
  onOpenTracker,
  onOpenStageDelay,
  onOpenWhatsAppPlugin,
}) => {
  const [inAppSentBanner, setInAppSentBanner] = useState<string | null>(null);
  const activeOrders = orders.filter((o) => o.currentStage !== 'DELIVERED');

  // Categorize
  const loggedStageDelays = activeOrders.filter((o) => o.isStageDelayed);
  const overdueOrders = activeOrders.filter((o) => calculateSLA(o).isOverdue);
  const urgentOrders = activeOrders.filter((o) => {
    const sla = calculateSLA(o);
    return !sla.isOverdue && sla.isAtRisk;
  });
  const onTrackOrders = activeOrders.filter((o) => {
    const sla = calculateSLA(o);
    return !sla.isOverdue && !sla.isAtRisk && !o.isStageDelayed;
  });

  const handleEscalationAlarm = () => {
    soundManager.playDelayWarningSound();
  };

  const handleSendInAppAlert = async (
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
    setInAppSentBanner(
      `✓ Sent directly inside this webpage to ${recipientName} (${recipientPhone}) — No external tab opened!`
    );
    setTimeout(() => setInAppSentBanner(null), 5000);
  };

  return (
    <div className="space-y-6">
      {inAppSentBanner && (
        <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-xs text-emerald-300 font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{inAppSentBanner}</span>
        </div>
      )}
      {/* Top Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              <span>Zero-Delay Supply Chain Protocol</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Active Delay Prevention & Bottleneck Radar
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Continuous shopfloor monitoring across corrugators, flexo printing lines, and delivery transport to eliminate delays.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleEscalationAlarm}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-white border border-neutral-700 hover:border-neutral-600 rounded-lg transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Test Audio Alarm</span>
            </button>
          </div>
        </div>

        {/* 4 Metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-neutral-800">
          <div className="p-3 bg-neutral-950/60 rounded-lg border border-rose-900/40">
            <div className="text-xs text-neutral-400">Reported Stage Delays</div>
            <div className={`text-2xl font-bold font-mono mt-1 ${loggedStageDelays.length > 0 ? 'text-rose-400' : 'text-neutral-400'}`}>
              {loggedStageDelays.length}
            </div>
            <div className="text-[10px] text-rose-400 mt-0.5">
              Active shopfloor holds
            </div>
          </div>

          <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-800/80">
            <div className="text-xs text-neutral-400">Overdue Deliveries</div>
            <div className={`text-2xl font-bold font-mono mt-1 ${overdueOrders.length > 0 ? 'text-rose-400' : 'text-neutral-400'}`}>
              {overdueOrders.length}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              SLA deadline exceeded
            </div>
          </div>

          <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-800/80">
            <div className="text-xs text-neutral-400">Due Within 24 Hours</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {urgentOrders.length}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              Converting or dock staging
            </div>
          </div>

          <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-800/80">
            <div className="text-xs text-neutral-400">On-Track & Healthy</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {onTrackOrders.length}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              Nominal progress
            </div>
          </div>
        </div>
      </div>

      {/* Actively Logged Stage Delays */}
      {loggedStageDelays.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Actively Reported Stage Delays ({loggedStageDelays.length})
            </h3>
          </div>

          <div className="space-y-2">
            {loggedStageDelays.map((order) => {
              const repPhone = order.salesPersonPhone || settings.salesTeam?.[0]?.phone || settings.contactNumber;
              const repName = order.salesPersonName || 'Sales Rep';

              return (
                <div
                  key={order.id}
                  className="bg-rose-950/30 border border-rose-800/70 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-rose-400 text-sm">{order.id}</span>
                      <span className="text-white font-semibold">{order.customerCompany}</span>
                      <span className="text-xs text-rose-300 font-mono font-bold px-2 py-0.5 rounded bg-rose-950 border border-rose-800">
                        Delayed +{order.currentDelayHours || 4}h
                      </span>
                      <span className="text-xs text-purple-300">Rep: {repName}</span>
                    </div>

                    <div className="text-xs text-neutral-200">
                      <strong className="text-rose-300">Station:</strong> {STAGE_CONFIG[order.currentStage].title} · <strong className="text-amber-300">Reported Cause:</strong> {order.currentDelayReason || 'Machine hold'}
                    </div>

                    <div className="text-xs text-neutral-400 font-mono">
                      Revised SLA: <strong className="text-white">{formatDateTime(order.expectedDeliveryDate)}</strong> · Batch: {order.quantity.toLocaleString()} boxes ({order.ply})
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenWhatsAppPlugin
                          ? onOpenWhatsAppPlugin(order)
                          : handleSendInAppAlert(
                              order,
                              'Sales Executive',
                              repName,
                              repPhone,
                              `🚨 Urgent update on delayed batch #${order.id} (${order.customerCompany}): ${order.currentDelayReason}`
                            )
                      }
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-purple-200 bg-purple-900/60 hover:bg-purple-800/80 border border-purple-700/60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Sales Rep (In-App)</span>
                    </button>

                    <button
                      onClick={() => onOpenStageUpdate(order)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <span>Update Stage / Delay</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Critical Overdue Orders Section */}
      {overdueOrders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Critical Overdue Batches ({overdueOrders.length})
            </h3>
          </div>

          <div className="space-y-2">
            {overdueOrders.map((order) => {
              const sla = calculateSLA(order);
              const escalationMsg = generateDelayEscalationWhatsappMessage(order, settings);

              return (
                <div
                  key={order.id}
                  className="bg-rose-950/20 border border-rose-900/60 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-rose-400 text-sm">{order.id}</span>
                      <span className="text-white font-semibold">{order.customerCompany}</span>
                      <span className="text-xs text-rose-400 font-mono font-semibold">
                        · {sla.label}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-300">
                      <span>{order.quantity.toLocaleString()} boxes ({order.ply}, {order.flute})</span>
                      <span className="mx-2 text-neutral-600">·</span>
                      <span>Target was: {formatDateTime(order.expectedDeliveryDate)}</span>
                      <span className="mx-2 text-neutral-600">·</span>
                      <span className="text-amber-400">Current Stage: {STAGE_CONFIG[order.currentStage].title}</span>
                    </div>

                    <div className="text-xs text-neutral-400">
                      Assigned: {order.assignedLine || 'Plant Floor'} (Lead: {order.operatorInCharge || 'Shift Lead'})
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleSendInAppAlert(
                          order,
                          'Production Team',
                          settings.productionSupervisorName,
                          settings.productionSupervisorPhone,
                          escalationMsg
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors whitespace-nowrap shadow cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Urgent Escalation (In-App)</span>
                    </button>

                    <button
                      onClick={() => onOpenStageUpdate(order)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <span>Update Stage</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Due Within 24h Batches */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Approaching SLA Deadline &lt; 24 Hours ({urgentOrders.length})
          </h3>
        </div>

        {urgentOrders.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center text-xs text-neutral-500">
            No orders nearing deadline in the next 24 hours.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {urgentOrders.map((order) => {
              const sla = calculateSLA(order);

              return (
                <div
                  key={order.id}
                  className="bg-neutral-900 border border-amber-900/40 rounded-xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onOpenTracker(order.id)}
                        className="font-mono font-bold text-amber-400 hover:underline"
                      >
                        {order.id}
                      </button>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {sla.label}
                      </span>
                    </div>

                    <div className="font-semibold text-white text-sm mt-1">
                      {order.customerCompany}
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {order.quantity.toLocaleString()} pcs · {order.dimensions.lengthMm}x{order.dimensions.widthMm}x{order.dimensions.heightMm} mm
                    </div>

                    <div className="mt-2 text-xs text-neutral-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span>{STAGE_CONFIG[order.currentStage].title}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                    <span className="text-[11px] text-neutral-400 font-mono">
                      Due: {formatDateTime(order.expectedDeliveryDate)}
                    </span>

                    <button
                      onClick={() => onOpenStageUpdate(order)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
                    >
                      <span>Advance</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transparency Guarantee Guide */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
          Automated Anti-Delay Rules In Place
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-300">
          <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
            <div className="font-semibold text-white mb-1">1. Instant 3-Way Notification</div>
            <p className="text-neutral-400 text-[11px]">
              Every stage update by the plant floor operator sends instant WhatsApp links to the customer, owner, and dispatch driver.
            </p>
          </div>
          <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
            <div className="font-semibold text-white mb-1">2. Dynamic Delivery ETA</div>
            <p className="text-neutral-400 text-[11px]">
              If a machine line faces a jam or die adjustment, the operator updates the expected delivery date and the customer receives an automatic WhatsApp advisory.
            </p>
          </div>
          <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
            <div className="font-semibold text-white mb-1">3. Amazon-Style Live Portal</div>
            <p className="text-neutral-400 text-[11px]">
              Customers can check their order progress, vehicle driver contact, and technical board specifications 24/7 without needing to call the office.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
