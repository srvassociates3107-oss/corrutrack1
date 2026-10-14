import { CorrugatedOrder, OrderStage, FactorySettings, ProductionHead } from '../types/order';
import { getProductCatalogItem, formatProductSpecsSummary } from './productCatalog';
import { generateProductionHeadHindiWhatsappMessage, generateProductionHeadHinglishWhatsappMessage } from './whatsappHindi';
import { getPublicAppOrigin } from './url';

export { generateProductionHeadHindiWhatsappMessage, generateProductionHeadHinglishWhatsappMessage };

export const STAGE_CONFIG: Record<
  OrderStage,
  {
    title: string;
    description: string;
    stepNumber: number;
    color: string;
    accentClass: string;
    icon: string;
  }
> = {
  ORDER_PLACED: {
    title: 'Order Placed & Job Card Created',
    description: 'Order registered, paper deckle scheduled, expected delivery date locked.',
    stepNumber: 1,
    color: '#3B82F6', // Blue
    accentClass: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    icon: 'FileText',
  },
  BOARD_PROCESSING: {
    title: 'Board Corrugation & Sheet Making',
    description: 'Kraft paper reels mounted on corrugator. Fluting & pasting underway.',
    stepNumber: 2,
    color: '#EAB308', // Amber
    accentClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    icon: 'Layers',
  },
  PRINTING_SLOTTING: {
    title: 'Printing, Slotting & Finishing',
    description: 'Flexo printing, rotary die-cutting, creasing & stitch/glue assembly.',
    stepNumber: 3,
    color: '#8B5CF6', // Purple
    accentClass: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    icon: 'Scissors',
  },
  READY_FOR_DISPATCH: {
    title: 'Quality Checked & Bundled',
    description: 'Passed bursting factor & compression test. Bundled and palletized on dock.',
    stepNumber: 4,
    color: '#06B6D4', // Cyan
    accentClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    icon: 'PackageCheck',
  },
  OUT_FOR_DELIVERY: {
    title: 'Out for Delivery / In Transit',
    description: 'Loaded on delivery freight vehicle. On its way to delivery location.',
    stepNumber: 5,
    color: '#F97316', // Orange
    accentClass: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    icon: 'Truck',
  },
  DELIVERED: {
    title: 'Delivered & Confirmed',
    description: 'Shipment delivered at destination. Receiver acknowledgment confirmed.',
    stepNumber: 6,
    color: '#10B981', // Emerald
    accentClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    icon: 'CheckCircle2',
  },
};

export const ORDER_STAGES: OrderStage[] = [
  'ORDER_PLACED',
  'BOARD_PROCESSING',
  'PRINTING_SLOTTING',
  'READY_FOR_DISPATCH',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export function cleanPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Default to standard 10 or 12 digit format (prefix 91 if 10 digit Indian number)
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Calculate delay and SLA
export interface SLAAnalysis {
  isOverdue: boolean;
  isAtRisk: boolean; // within 24 hours of deadline and not completed
  hoursRemaining: number;
  label: string;
  badgeColor: string;
}

export function calculateSLA(order: CorrugatedOrder): SLAAnalysis {
  if (order.currentStage === 'DELIVERED') {
    return {
      isOverdue: false,
      isAtRisk: false,
      hoursRemaining: 0,
      label: 'Delivered On Schedule',
      badgeColor: 'text-emerald-400',
    };
  }

  const now = new Date().getTime();
  const target = new Date(order.expectedDeliveryDate).getTime();
  const diffMs = target - now;
  const hours = Math.round(diffMs / (1000 * 60 * 60));

  if (hours < 0) {
    const absHours = Math.abs(hours);
    const days = Math.floor(absHours / 24);
    const remHours = absHours % 24;
    const timeStr = days > 0 ? `${days}d ${remHours}h` : `${absHours}h`;
    return {
      isOverdue: true,
      isAtRisk: true,
      hoursRemaining: hours,
      label: `Delayed by ${timeStr}`,
      badgeColor: 'text-rose-400',
    };
  }

  if (hours <= 24) {
    return {
      isOverdue: false,
      isAtRisk: true,
      hoursRemaining: hours,
      label: `Due in ${hours}h (Urgent)`,
      badgeColor: 'text-amber-400',
    };
  }

  const days = Math.floor(hours / 24);
  return {
    isOverdue: false,
    isAtRisk: false,
    hoursRemaining: hours,
    label: `${days}d ${hours % 24}h remaining`,
    badgeColor: 'text-slate-400',
  };
}

// Visual Stage Dwell Timer & Bottleneck Analysis
export interface StageDwellAnalysis {
  durationText: string;
  elapsedMinutes: number;
  elapsedHours: number;
  enteredAtString: string;
  isStalled: boolean;
  isWarning: boolean;
  benchmarkHours: number;
  stalledThresholdHours: number;
  progressPercent: number;
  badgeClass: string;
  statusLabel: string;
}

export const STAGE_BENCHMARKS_HOURS: Record<OrderStage, number> = {
  ORDER_PLACED: 4,
  BOARD_PROCESSING: 4,
  PRINTING_SLOTTING: 5,
  READY_FOR_DISPATCH: 4,
  OUT_FOR_DELIVERY: 6,
  DELIVERED: 0,
};

export function calculateStageDwellTime(order: CorrugatedOrder, currentTimeMs?: number): StageDwellAnalysis {
  const now = currentTimeMs || Date.now();
  
  if (order.currentStage === 'DELIVERED') {
    const deliveredHist = order.stageHistory?.find(h => h.stage === 'DELIVERED');
    const deliveredAt = order.logistics?.deliveredAt || deliveredHist?.timestamp || order.orderDate;
    const totalMs = Math.max(0, new Date(deliveredAt).getTime() - new Date(order.orderDate).getTime());
    const totalHours = Math.floor(totalMs / (1000 * 60 * 60));
    const totalDays = Math.floor(totalHours / 24);
    const remHours = totalHours % 24;
    const durStr = totalDays > 0 ? `${totalDays}d ${remHours}h total cycle` : `${totalHours}h cycle`;

    return {
      durationText: durStr,
      elapsedMinutes: Math.floor(totalMs / (1000 * 60)),
      elapsedHours: totalHours,
      enteredAtString: formatDateTime(deliveredAt),
      isStalled: false,
      isWarning: false,
      benchmarkHours: 0,
      stalledThresholdHours: 0,
      progressPercent: 100,
      badgeClass: 'text-emerald-400 bg-emerald-950/25 border-emerald-900/40',
      statusLabel: 'Completed',
    };
  }

  // Find when order entered currentStage
  let enteredAtTime = new Date(order.orderDate).getTime();
  let enteredTimestampStr = order.orderDate;

  if (order.stageHistory && order.stageHistory.length > 0) {
    const stageEntries = order.stageHistory.filter(h => h.stage === order.currentStage);
    if (stageEntries.length > 0) {
      const lastEntry = stageEntries[stageEntries.length - 1];
      enteredAtTime = new Date(lastEntry.timestamp).getTime();
      enteredTimestampStr = lastEntry.timestamp;
    }
  }

  const elapsedMs = Math.max(0, now - enteredAtTime);
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const remMinutes = elapsedMinutes % 60;
  const elapsedDays = Math.floor(elapsedHours / 24);

  let durationText = '';
  if (elapsedDays > 0) {
    durationText = `${elapsedDays}d ${elapsedHours % 24}h`;
  } else if (elapsedHours > 0) {
    durationText = `${elapsedHours}h ${remMinutes}m`;
  } else {
    durationText = `${Math.max(1, elapsedMinutes)}m`;
  }

  const benchmarkHours = STAGE_BENCHMARKS_HOURS[order.currentStage] || 4;
  const benchmarkMs = benchmarkHours * 60 * 60 * 1000;
  const stalledThresholdHours = Number((benchmarkHours * 1.5).toFixed(1));
  const stalledThresholdMs = benchmarkMs * 1.5; // Exceeds 150% of the benchmark time
  const progressPercent = Math.round((elapsedMs / benchmarkMs) * 100);

  // Stalled threshold: exceeded 150% of the benchmark time
  const isStalled = elapsedMs >= stalledThresholdMs;
  const isWarning = !isStalled && elapsedMs >= benchmarkMs;

  let badgeClass = 'text-neutral-400 bg-neutral-900 border-neutral-800';
  let statusLabel = 'Normal Pace';

  if (isStalled) {
    badgeClass = 'text-rose-400 bg-rose-950/40 border-rose-800/70 font-semibold';
    statusLabel = `STALLED (${progressPercent}%)`;
  } else if (isWarning) {
    badgeClass = 'text-amber-400 bg-amber-950/30 border-amber-800/50';
    statusLabel = `Slow Progress (${progressPercent}%)`;
  }

  return {
    durationText,
    elapsedMinutes,
    elapsedHours,
    enteredAtString: formatDateTime(enteredTimestampStr),
    isStalled,
    isWarning,
    benchmarkHours,
    stalledThresholdHours,
    progressPercent,
    badgeClass,
    statusLabel,
  };
}

export function generateStalledProcessAlertWhatsappMessage(
  order: CorrugatedOrder,
  settings: FactorySettings,
  dwell: StageDwellAnalysis
): string {
  const stageInfo = STAGE_CONFIG[order.currentStage];
  const formattedDelivery = formatDateTime(order.expectedDeliveryDate);
  const thresholdHours = dwell.benchmarkHours * 1.5;

  return `🚨 *AUTOMATED BOTTLENECK ALERT: STALLED ORDER #${order.id}*

⚠️ *ATTENTION PRODUCTION SUPERVISOR (${settings.productionSupervisorPhone})*:
Order #${order.id} has exceeded 150% of its stage benchmark and is officially STALLED!

📍 *Stalled Stage:* ${stageInfo.title}
⏱️ *Dwell Duration:* *${dwell.durationText}*
📊 *Benchmark Status:* Nominal ${dwell.benchmarkHours}h | 150% Threshold: ${thresholdHours}h (${dwell.progressPercent}% of budget)
🏢 *Client:* ${order.customerCompany} (${order.customerName})
📞 *Client Phone:* ${order.customerPhone}
📦 *Batch Volume:* ${order.quantity.toLocaleString()} pcs (${order.ply}, ${order.flute})
📐 *Dimensions:* ${order.dimensions.lengthMm} x ${order.dimensions.widthMm} x ${order.dimensions.heightMm} mm
⚙️ *Assigned Line:* ${order.assignedLine || 'Main Converting Line'}
👨‍🏭 *Operator:* ${order.operatorInCharge || 'Shift In-Charge'}
🗓️ *Dispatch Commitment SLA:* ${formattedDelivery}

⚡ *Urgent Floor Action Required:*
Inspect machine line for mechanical jams, ink registration issues, or material reel shortages. Please clear blockage immediately to safeguard delivery commitments.

- *CorruTrack Plant Floor Intelligence | ${settings.companyName}*`;
}

export function generateSalesPersonWhatsappMessage(
  order: CorrugatedOrder,
  settings: FactorySettings,
  appUrl: string = getPublicAppOrigin()
): string {
  const stageInfo = STAGE_CONFIG[order.currentStage];
  const stepNum = stageInfo.stepNumber;
  const formattedDelivery = formatDateTime(order.expectedDeliveryDate);
  const trackUrl = `${appUrl}?track=${order.id}`;

  const laminationText = order.lamination && order.lamination !== 'None' ? ` | ✨ ${order.lamination}` : '';
  const colorText = order.colorType ? ` | 🎨 ${order.colorType}` : '';
  const logoText = order.logoDetails?.hasLogo ? ` | 🏷️ Logo: ${order.logoDetails.brandName || 'Brand Artwork'}` : '';

  const isDelivered = order.currentStage === 'DELIVERED';
  const latestNote = order.stageHistory?.[order.stageHistory.length - 1]?.notes;

  const headerEmoji = isDelivered ? '🎉 *FINAL STEP COMPLETED: DELIVERED!*' : `✅ *PRODUCTION STEP ${stepNum} OF 6 COMPLETED!*`;

  return `${headerEmoji}
*ORDER #${order.id} MILESTONE NOTIFICATION*

Hi *${order.salesPersonName || 'Sales Partner'}*,
A production milestone was just completed for your client's work order:

📍 *Milestone Completed:* *${stageInfo.title}* (Step ${stepNum}/6)
📝 *Factory Note:* ${latestNote || stageInfo.description}
${stageInfo.stepNumber < 6 ? `➡️ *Next Station:* ${ORDER_STAGES[stepNum] ? STAGE_CONFIG[ORDER_STAGES[stepNum]].title : 'Final Inspection'}\n` : ''}
🏢 *Client:* ${order.customerCompany} (${order.customerName})
📞 *Client Contact:* ${order.customerPhone}
📦 *Box Specs:* ${order.dimensions.lengthMm} x ${order.dimensions.widthMm} x ${order.dimensions.heightMm} mm
📋 *Structure:* ${order.ply} (${order.flute})${laminationText}${colorText}${logoText}
🔬 *GSM:* Top ${order.paperSpecs.topLinerGsm} / Flute ${order.paperSpecs.flutingMediumGsm} / Bot ${order.paperSpecs.bottomLinerGsm} (${order.paperSpecs.burstingFactor} BF)
📦 *Volume:* ${order.quantity.toLocaleString()} boxes @ ₹${order.ratePerBox}/box
💰 *Total Value:* ${formatCurrency(order.totalAmount)}
⏱️ *Promised Delivery SLA:* ${formattedDelivery}
${order.logistics?.vehicleNumber ? `🚛 *Dispatch Vehicle:* ${order.logistics.vehicleNumber} (Driver: ${order.logistics.driverName} - ${order.logistics.driverPhone})\n` : ''}
🔗 *Live Tracking Link for Client:*
${trackUrl}

- *Automated Plant Floor Alert | ${settings.companyName}*`;
}

// WhatsApp Message Formatters
export function generateCustomerWhatsappMessage(
  order: CorrugatedOrder,
  settings: FactorySettings,
  appUrl: string = getPublicAppOrigin()
): string {
  const stageInfo = STAGE_CONFIG[order.currentStage];
  const formattedDelivery = formatDateTime(order.expectedDeliveryDate);
  const trackUrl = `${appUrl}?track=${order.id}`;

  const laminationBadge = order.lamination && order.lamination !== 'None' ? ` | ✨ Finish: ${order.lamination}` : '';
  const printBadge = order.colorType && order.colorType !== 'Plain / Unprinted' ? ` | 🎨 Print: ${order.colorType}` : '';
  const salesContact = order.salesPersonName ? `\n👔 *Account Manager:* ${order.salesPersonName} (${order.salesPersonPhone || settings.contactNumber})` : '';

  if (order.currentStage === 'ORDER_PLACED') {
    return `📦 *ORDER CONFIRMED - ${settings.companyName.toUpperCase()}*

Dear *${order.customerName}* (${order.customerCompany}),
Thank you for your order! Your corrugated box manufacturing schedule is locked.

🆔 *Order ID:* ${order.id}
📐 *Box Dimensions:* ${order.dimensions.lengthMm} x ${order.dimensions.widthMm} x ${order.dimensions.heightMm} mm
📋 *Structure:* ${order.ply} (${order.flute})${laminationBadge}${printBadge}
🔬 *Paper Specs:* Top ${order.paperSpecs.topLinerGsm} GSM / Flute ${order.paperSpecs.flutingMediumGsm} GSM / Bottom ${order.paperSpecs.bottomLinerGsm} GSM (${order.paperSpecs.burstingFactor} BF)
${order.logoDetails?.hasLogo ? `🏷️ *Artwork/Logo:* ${order.logoDetails.brandName || 'Confirmed'} (${order.logoDetails.logoPlacement || 'Front & Back'})` : ''}
📦 *Batch Quantity:* ${order.quantity.toLocaleString()} boxes
⏱️ *Committed Delivery:* *${formattedDelivery}*
📍 *Destination:* ${order.deliveryAddress}${salesContact}

🔗 *Live Order Tracking:*
${trackUrl}

You will receive real-time notifications as your boxes complete corrugation, printing, and vehicle dispatch.

For instant queries: ${settings.contactNumber}`;
  }

  if (order.currentStage === 'OUT_FOR_DELIVERY') {
    return `🚚 *SHIPMENT OUT FOR DELIVERY - ${settings.companyName.toUpperCase()}*

Dear *${order.customerName}*,
Your corrugated box shipment is loaded and out for delivery!

🆔 *Order ID:* ${order.id}
📦 *Boxes:* ${order.quantity.toLocaleString()} units (${order.dimensions.lengthMm} x ${order.dimensions.widthMm} x ${order.dimensions.heightMm} mm)
🚛 *Vehicle No:* ${order.logistics?.vehicleNumber || 'Plant Logistics Vehicle'}
👨‍✈️ *Driver:* ${order.logistics?.driverName || 'Dispatch Driver'} (${order.logistics?.driverPhone || settings.contactNumber})
⏱️ *Expected Arrival:* *${formattedDelivery}*

Please ensure receipt verification and unloading at dock:
📍 ${order.deliveryAddress}${salesContact}

🔗 *Live Tracking & Delivery Challan:*
${trackUrl}`;
  }

  if (order.currentStage === 'DELIVERED') {
    return `✅ *ORDER DELIVERED SUCCESSFULLY!*

Dear *${order.customerName}*,
Your consignment *#${order.id}* (${order.quantity.toLocaleString()} boxes) has been successfully delivered and acknowledged at ${order.deliveryAddress}.

Thank you for choosing *${settings.companyName}*.
We appreciate your partnership!${salesContact}

🔗 *View Complete Dispatch Summary & Proof:*
${trackUrl}`;
  }

  // Intermediate Stages (Board Corrugation, Finishing, Ready for Dispatch)
  return `⚙️ *PRODUCTION UPDATE - ORDER #${order.id}*

Dear *${order.customerName}*,
Your order has advanced to the next manufacturing milestone!

📍 *Current Status:* *${stageInfo.title}*
📝 *Stage Detail:* ${stageInfo.description}
📦 *Order:* ${order.quantity.toLocaleString()} x ${order.ply} Boxes (${order.dimensions.lengthMm}x${order.dimensions.widthMm}x${order.dimensions.heightMm} mm)
${order.lamination && order.lamination !== 'None' ? `✨ *Finish:* ${order.lamination}\n` : ''}⏱️ *Expected Delivery:* *${formattedDelivery}*${salesContact}

🔗 *Track Real-Time Progress:*
${trackUrl}

- *${settings.companyName}*`;
}

export function generateOwnerWhatsappMessage(
  order: CorrugatedOrder,
  settings: FactorySettings
): string {
  const stageInfo = STAGE_CONFIG[order.currentStage];
  const sla = calculateSLA(order);
  const formattedDelivery = formatDateTime(order.expectedDeliveryDate);
  const salesRep = order.salesPersonName ? `👔 Rep: ${order.salesPersonName}` : '';

  return `🔔 *PLANT OWNER ALERT: ${order.id} [${stageInfo.title}]*

🏢 *Client:* ${order.customerCompany} (${order.customerName})
📞 *Phone:* ${order.customerPhone}
${salesRep ? `${salesRep}\n` : ''}📦 *Volume:* ${order.quantity.toLocaleString()} boxes | ${order.ply} (${order.flute})
📐 *Size:* ${order.dimensions.lengthMm} x ${order.dimensions.widthMm} x ${order.dimensions.heightMm} mm
✨ *Finish:* ${order.lamination || 'None'} | 🎨 ${order.colorType || 'Standard'}
🔬 *GSM:* T:${order.paperSpecs.topLinerGsm} / F:${order.paperSpecs.flutingMediumGsm} / B:${order.paperSpecs.bottomLinerGsm} (${order.paperSpecs.burstingFactor} BF)
💰 *Value:* ${formatCurrency(order.totalAmount)} (@ ₹${order.ratePerBox}/box)
⏱️ *Deadline:* ${formattedDelivery}
⏳ *SLA Health:* ${sla.label}

${order.logistics?.driverName ? `🚚 Driver: ${order.logistics.driverName} (${order.logistics.vehicleNumber})` : ''}
⚡ *Assigned:* ${order.assignedLine || 'Line 1'} | Operator: ${order.operatorInCharge || 'Production Console'}`;
}

export function generateProductionTeamWhatsappMessage(
  order: CorrugatedOrder,
  settings: FactorySettings,
  productionHead?: ProductionHead,
  languageOverride?: 'hi' | 'hinglish' | 'en'
): string {
  const chosenLang = languageOverride || productionHead?.preferredLanguage || 'hi';

  if (chosenLang === 'hi') {
    return generateProductionHeadHindiWhatsappMessage(order, settings, productionHead);
  }

  if (chosenLang === 'hinglish') {
    return generateProductionHeadHinglishWhatsappMessage(order, settings, productionHead);
  }

  const stageInfo = STAGE_CONFIG[order.currentStage];
  const formattedDelivery = formatDateTime(order.expectedDeliveryDate);
  const product = getProductCatalogItem(order.productType);
  const subCategoryName = order.productSubCategory || product.subCategories[0]?.title || 'Standard';

  const middleGsmText = order.paperSpecs.middleLinerGsm ? ` / Mid ${order.paperSpecs.middleLinerGsm}g` : '';
  const logoInfo = order.logoDetails?.hasLogo ? `\n🏷️ *Stereo/Logo:* ${order.logoDetails.brandName || 'Brand Stereo'} (${order.logoDetails.logoPlacement || 'Both Sides'} - ${order.logoDetails.artworkStatus || 'Ready'})` : '';

  return `🏭 *FACTORY FLOOR JOB CARD #${order.id}*

📦 *Product:* ${product.title} (${subCategoryName})
⚠️ *Priority:* ${order.priority.toUpperCase()}
📍 *Target Station:* ${stageInfo.title}
📦 *Job Batch:* ${order.quantity.toLocaleString()} ${product.defaultUnitName}s (${order.bundlesCount ? `${order.bundlesCount} bundles` : 'Bundled'})
📐 *Dimensions/Size:* ${order.dimensions.lengthMm} (L) x ${order.dimensions.widthMm} (W) x ${order.dimensions.heightMm} (H) mm
🔬 *Material Specs:* ${order.productSpecsSummary || formatProductSpecsSummary(order)}
📄 *Deckle Specs:* ${order.ply} | Flute: ${order.flute}
🔬 *GSM Recipe:*
 • Top Liner: ${order.paperSpecs.topLinerGsm} GSM (${order.paperSpecs.paperGrade || 'Kraft'})
 • Fluting Medium: ${order.paperSpecs.flutingMediumGsm} GSM
 • Bottom Liner: ${order.paperSpecs.bottomLinerGsm} GSM${middleGsmText}
 • Bursting Factor: ${order.paperSpecs.burstingFactor} BF
✨ *Lamination/Finish:* ${order.lamination || 'None'}
🎨 *Color/Printing:* ${order.colorType || 'Plain'} - ${order.printingDetails || 'None'}${logoInfo}
🔗 *Joint:* ${order.jointType}
👔 *Sales Contact:* ${order.salesPersonName || 'Direct'} (${order.salesPersonPhone || 'N/A'})
⏱️ *Dispatch Deadline:* ${formattedDelivery}

Please verify caliper, burst factor, and print registration before forwarding.`;
}

export function generateDelayEscalationWhatsappMessage(
  order: CorrugatedOrder,
  settings: FactorySettings
): string {
  const sla = calculateSLA(order);
  return `🚨 *CRITICAL SLA WARNING: ORDER #${order.id}*

⚠️ *ATTENTION PLANT SUPERVISOR & DISPATCH:*
Order #${order.id} for *${order.customerCompany}* is ${sla.label}!

📦 *Volume:* ${order.quantity.toLocaleString()} boxes (${order.ply})
📍 *Current Bottleneck:* ${STAGE_CONFIG[order.currentStage].title}
⏱️ *Commitment Date:* ${formatDateTime(order.expectedDeliveryDate)}
📞 *Client Contact:* ${order.customerPhone}
${order.salesPersonName ? `👔 *Sales Rep:* ${order.salesPersonName} (${order.salesPersonPhone})\n` : ''}
*Action Required:* Clear machine line queue and expedite this batch immediately to preserve customer delivery commitments.`;
}

export function buildWhatsappLink(phone: string, text: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

export function buildWhatsappWebLink(phone: string, text: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(text);
  return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
}

export function buildWhatsappProtocolLink(phone: string, text: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(text);
  return `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
}
