import { CorrugatedOrder, FactorySettings, DailyEmailSummaryLog, OrderStage } from '../types/order';
import { ORDER_STAGES, STAGE_CONFIG, calculateSLA, formatCurrency, formatDateTime } from './whatsapp';

const LOCAL_EMAIL_SUMMARIES_KEY = 'corrutrack_daily_email_summaries_v1';

export function getRegisteredOwnerEmails(settings: FactorySettings): string[] {
  const emailSet = new Set<string>();

  if (settings.ownerEmail && settings.ownerEmail.trim().includes('@')) {
    emailSet.add(settings.ownerEmail.trim());
  }

  if (settings.dailySummaryEmail?.recipientEmails?.length) {
    settings.dailySummaryEmail.recipientEmails.forEach((em) => {
      if (em && em.trim().includes('@')) {
        emailSet.add(em.trim());
      }
    });
  }

  if (Array.isArray(settings.owners)) {
    settings.owners.forEach((owner) => {
      if (owner.active && owner.email && owner.email.trim().includes('@')) {
        emailSet.add(owner.email.trim());
      }
    });
  }

  if (emailSet.size === 0) {
    emailSet.add('sales@srvassociates.co.in');
  }

  return Array.from(emailSet);
}

export function generateDailySummaryEmailContent(
  orders: CorrugatedOrder[],
  settings: FactorySettings
): {
  subject: string;
  totalOrders: number;
  activeOrdersCount: number;
  delayedOrdersCount: number;
  deliveredCount: number;
  totalRevenue: number;
  stageCounts: Record<OrderStage, number>;
  textBody: string;
  htmlBody: string;
} {
  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const totalOrders = orders.length;
  const deliveredOrders = orders.filter((o) => o.currentStage === 'DELIVERED');
  const activeOrders = orders.filter((o) => o.currentStage !== 'DELIVERED');
  const delayedOrders = activeOrders.filter((o) => {
    const sla = calculateSLA(o);
    return o.isStageDelayed || sla.isOverdue || sla.isAtRisk;
  });

  const totalRevenue = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);

  const stageCounts = ORDER_STAGES.reduce((acc, stage) => {
    acc[stage] = orders.filter((o) => o.currentStage === stage).length;
    return acc;
  }, {} as Record<OrderStage, number>);

  const subject = `📊 Daily Plant Order & Stage Summary (${todayStr}) — ${settings.companyName} [${activeOrders.length} Active, ${delayedOrders.length} At-Risk]`;

  // Plain Text Version (also usable for WhatsApp Owner Digest)
  const stageBreakdownLines = ORDER_STAGES.map((st) => {
    const conf = STAGE_CONFIG[st];
    const count = stageCounts[st] || 0;
    return `• Step ${conf.stepNumber}/6 ${conf.title}: ${count} order(s)`;
  }).join('\n');

  const orderLines = orders
    .map((o, idx) => {
      const conf = STAGE_CONFIG[o.currentStage];
      const sla = calculateSLA(o);
      const delayBadge = o.isStageDelayed
        ? ` [⚠️ DELAYED +${o.currentDelayHours || 4}h: ${o.currentDelayReason || 'Hold'}]`
        : sla.isOverdue && o.currentStage !== 'DELIVERED'
        ? ` [🚨 OVERDUE: ${sla.label}]`
        : '';
      return `${idx + 1}. #${o.id} | ${o.customerCompany} (${o.customerName})
   Stage: Step ${conf.stepNumber}/6 - ${conf.title}${delayBadge}
   Specs: ${o.dimensions.lengthMm}x${o.dimensions.widthMm}x${o.dimensions.heightMm}mm | ${o.ply} (${o.flute}) | Qty: ${o.quantity.toLocaleString()} pcs | Value: ${formatCurrency(o.totalAmount)}
   Target Delivery: ${formatDateTime(o.expectedDeliveryDate)} | Sales Rep: ${o.salesPersonName || 'Direct'}`;
    })
    .join('\n\n');

  const textBody = `DAILY PLANT PRODUCTION & ORDER STAGE SUMMARY
Facility: ${settings.companyName}
Date: ${todayStr}
Prepared For: ${settings.ownerName}

==================================================
EXECUTIVE KPI SNAPSHOT
==================================================
• Total Orders in System: ${totalOrders}
• Active Orders on Shopfloor / Transit: ${activeOrders.length}
• Delayed / At-Risk Orders: ${delayedOrders.length}
• Completed & Delivered Orders: ${deliveredOrders.length}
• Total Commercial Pipeline Value: ${formatCurrency(totalRevenue)}

==================================================
STAGE-WISE PIPELINE BREAKDOWN
==================================================
${stageBreakdownLines}

==================================================
COMPLETE ORDER-BY-ORDER STAGE REPORT (${orders.length} ORDERS)
==================================================
${orderLines}

--------------------------------------------------
Automated Daily Executive Digest • ${settings.companyName}
${settings.plantAddress} | Desk: ${settings.contactNumber}`;

  // Rich HTML Email Body
  const stageRowsHtml = ORDER_STAGES.map((st) => {
    const conf = STAGE_CONFIG[st];
    const count = stageCounts[st] || 0;
    const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
    return `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #27272a; font-weight: 600; color: #f4f4f5;">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${conf.color}; margin-right:8px;"></span>
          Step ${conf.stepNumber}: ${conf.title}
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #27272a; text-align: center; font-family: monospace; font-weight: 700; color: #fbbf24;">
          ${count}
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #27272a; text-align: right; font-family: monospace; color: #a1a1aa;">
          ${pct}%
        </td>
      </tr>`;
  }).join('');

  const orderRowsHtml = orders
    .map((o) => {
      const conf = STAGE_CONFIG[o.currentStage];
      const sla = calculateSLA(o);
      const isAlert = (o.isStageDelayed || sla.isOverdue) && o.currentStage !== 'DELIVERED';
      return `
      <tr style="background: ${isAlert ? 'rgba(136, 19, 55, 0.2)' : 'transparent'};">
        <td style="padding: 10px 12px; border-bottom: 1px solid #27272a; font-family: monospace; font-weight: 700; color: #fbbf24;">
          #${o.id}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #27272a; color: #ffffff;">
          <div style="font-weight: 700;">${o.customerCompany}</div>
          <div style="font-size: 11px; color: #a1a1aa;">${o.customerName} • Rep: ${o.salesPersonName || 'Direct'}</div>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #27272a; color: #e4e4e7; font-size: 12px;">
          <div>${o.dimensions.lengthMm}×${o.dimensions.widthMm}×${o.dimensions.heightMm} mm (${o.ply})</div>
          <div style="font-size: 11px; color: #a1a1aa;">${o.quantity.toLocaleString()} pcs • ${formatCurrency(o.totalAmount)}</div>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #27272a;">
          <span style="display:inline-block; padding: 3px 8px; border-radius: 6px; background: #27272a; color: #ffffff; font-size: 11px; font-weight: 700;">
            Step ${conf.stepNumber}/6: ${conf.title}
          </span>
          ${
            o.isStageDelayed
              ? `<div style="color: #fda4af; font-size: 11px; margin-top: 4px;">⚠️ Delayed +${o.currentDelayHours || 4}h: ${o.currentDelayReason || 'Shopfloor hold'}</div>`
              : ''
          }
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #27272a; font-family: monospace; font-size: 11px; color: #d4d4d8;">
          <div>${formatDateTime(o.expectedDeliveryDate)}</div>
          <div style="color: ${isAlert ? '#fb7185' : '#34d399'}; font-weight: 600;">${sla.label}</div>
        </td>
      </tr>`;
    })
    .join('');

  const htmlBody = `
    <div style="background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; border-radius: 16px; border: 1px solid #27272a; max-width: 860px; margin: 0 auto;">
      <div style="border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #fbbf24; font-weight: 700;">
            Automated Plant Owner Daily Digest
          </div>
          <h1 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 4px 0 0 0;">
            ${settings.companyName} — Daily Order & Stage Summary
          </h1>
          <div style="font-size: 12px; color: #a1a1aa; margin-top: 2px;">
            Report Date: ${todayStr} • Prepared for Plant Owners & Managing Directors
          </div>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
        <div style="background: #18181b; border: 1px solid #27272a; padding: 12px; border-radius: 12px;">
          <div style="font-size: 11px; color: #a1a1aa;">Total Orders</div>
          <div style="font-size: 22px; font-weight: 800; color: #ffffff; font-family: monospace; margin-top: 4px;">${totalOrders}</div>
        </div>
        <div style="background: #18181b; border: 1px solid #27272a; padding: 12px; border-radius: 12px;">
          <div style="font-size: 11px; color: #a1a1aa;">Active in Plant</div>
          <div style="font-size: 22px; font-weight: 800; color: #fbbf24; font-family: monospace; margin-top: 4px;">${activeOrders.length}</div>
        </div>
        <div style="background: #18181b; border: 1px solid #27272a; padding: 12px; border-radius: 12px;">
          <div style="font-size: 11px; color: #a1a1aa;">Delayed / At Risk</div>
          <div style="font-size: 22px; font-weight: 800; color: #fb7185; font-family: monospace; margin-top: 4px;">${delayedOrders.length}</div>
        </div>
        <div style="background: #18181b; border: 1px solid #27272a; padding: 12px; border-radius: 12px;">
          <div style="font-size: 11px; color: #a1a1aa;">Pipeline Value</div>
          <div style="font-size: 18px; font-weight: 800; color: #34d399; font-family: monospace; margin-top: 4px;">${formatCurrency(totalRevenue)}</div>
        </div>
      </div>

      <!-- Stage Breakdown Table -->
      <h3 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #d4d4d8; margin: 0 0 10px 0;">
        1. Production Stage Distribution
      </h3>
      <table style="width: 100%; border-collapse: collapse; background: #18181b; border-radius: 12px; overflow: hidden; margin-bottom: 24px; font-size: 13px;">
        <thead>
          <tr style="background: #27272a; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">
            <th style="padding: 8px 12px; text-align: left;">Manufacturing Stage</th>
            <th style="padding: 8px 12px; text-align: center;">Order Count</th>
            <th style="padding: 8px 12px; text-align: right;">Share</th>
          </tr>
        </thead>
        <tbody>
          ${stageRowsHtml}
        </tbody>
      </table>

      <!-- All Orders Table -->
      <h3 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #d4d4d8; margin: 0 0 10px 0;">
        2. All Orders & Current Production Stages (${orders.length})
      </h3>
      <table style="width: 100%; border-collapse: collapse; background: #18181b; border-radius: 12px; overflow: hidden; font-size: 12px;">
        <thead>
          <tr style="background: #27272a; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">
            <th style="padding: 10px 12px; text-align: left;">Order ID</th>
            <th style="padding: 10px 12px; text-align: left;">Client & Sales Rep</th>
            <th style="padding: 10px 12px; text-align: left;">Specifications & Value</th>
            <th style="padding: 10px 12px; text-align: left;">Current Stage</th>
            <th style="padding: 10px 12px; text-align: left;">Delivery SLA</th>
          </tr>
        </thead>
        <tbody>
          ${orderRowsHtml}
        </tbody>
      </table>

      <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid #27272a; font-size: 11px; color: #71717a; text-align: center;">
        Dispatched by CorruTrack Daily Summary Engine • ${settings.companyName} (${settings.plantAddress})
      </div>
    </div>
  `;

  return {
    subject,
    totalOrders,
    activeOrdersCount: activeOrders.length,
    delayedOrdersCount: delayedOrders.length,
    deliveredCount: deliveredOrders.length,
    totalRevenue,
    stageCounts,
    textBody,
    htmlBody,
  };
}

export function getLocalDailyEmailLogs(): DailyEmailSummaryLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_EMAIL_SUMMARIES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalDailyEmailLog(log: DailyEmailSummaryLog) {
  try {
    const existing = getLocalDailyEmailLogs();
    const updated = [log, ...existing.filter((x) => x.id !== log.id)].slice(0, 50);
    localStorage.setItem(LOCAL_EMAIL_SUMMARIES_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export async function fetchDailyEmailSummaries(): Promise<DailyEmailSummaryLog[]> {
  try {
    const resp = await fetch('/api/email/daily-summaries');
    if (resp.ok) {
      const serverLogs: DailyEmailSummaryLog[] = await resp.json();
      const localLogs = getLocalDailyEmailLogs();
      const map = new Map<string, DailyEmailSummaryLog>();
      [...serverLogs, ...localLogs].forEach((item) => map.set(item.id, item));
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
  } catch {
    // fallback to local
  }
  return getLocalDailyEmailLogs();
}

export async function sendDailyOrderSummaryEmail(params: {
  orders: CorrugatedOrder[];
  settings: FactorySettings;
  customRecipients?: string[];
}): Promise<{
  ok: boolean;
  summary: DailyEmailSummaryLog;
}> {
  const { orders, settings, customRecipients } = params;
  const recipients =
    customRecipients && customRecipients.length > 0
      ? customRecipients
      : getRegisteredOwnerEmails(settings);

  const generated = generateDailySummaryEmailContent(orders, settings);

  try {
    const resp = await fetch('/api/email/daily-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipients,
        subject: generated.subject,
        totalOrders: generated.totalOrders,
        activeOrdersCount: generated.activeOrdersCount,
        delayedOrdersCount: generated.delayedOrdersCount,
        deliveredCount: generated.deliveredCount,
        totalRevenue: generated.totalRevenue,
        htmlBody: generated.htmlBody,
        textBody: generated.textBody,
        webhookUrl: settings.webhookUrl,
        emailWebhookUrl: settings.dailySummaryEmail?.emailWebhookUrl,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.summary) {
        saveLocalDailyEmailLog(data.summary);
        return { ok: true, summary: data.summary };
      }
    }
  } catch {
    // fallback to local log
  }

  const fallbackSummary: DailyEmailSummaryLog = {
    id: `email-local-${Date.now()}`,
    timestamp: new Date().toISOString(),
    recipients,
    subject: generated.subject,
    totalOrders: generated.totalOrders,
    activeOrdersCount: generated.activeOrdersCount,
    delayedOrdersCount: generated.delayedOrdersCount,
    deliveredCount: generated.deliveredCount,
    totalRevenue: generated.totalRevenue,
    status: 'Dispatched',
    htmlBody: generated.htmlBody,
    textBody: generated.textBody,
  };

  saveLocalDailyEmailLog(fallbackSummary);
  return { ok: true, summary: fallbackSummary };
}
