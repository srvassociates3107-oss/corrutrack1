import { CorrugatedOrder, FactorySettings } from '../types/order';
import { formatCurrency, formatDateTime, STAGE_CONFIG } from './whatsapp';

export interface InteractiveButtonConfig {
  id: string;
  type: 'call' | 'quick_reply' | 'url';
  label: string;
  value: string; // phone number, reply text payload, or URL
  icon?: 'phone' | 'reply' | 'external';
}

export interface WhatsAppInteractiveCardConfig {
  title: string;
  subtitle: string;
  cardType: 'spec_sheet' | 'reorder_reminder' | 'stage_update' | 'dispatch_notice';
  caption: string;
  hashtags: string[];
  buttons: InteractiveButtonConfig[];
  customImageUrl?: string;
  showPricing: boolean;
  showTechnicalSpecs: boolean;
  termsText: string;
}

export const DEFAULT_INTERACTIVE_TEMPLATES: Record<string, WhatsAppInteractiveCardConfig> = {
  reorder_reminder: {
    title: 'CORRUGATED BOX DEALER SPEC & PRICE LIST',
    subtitle: 'PREMIUM PACKAGING CARTONS & DIE-CUT BOXES',
    cardType: 'reorder_reminder',
    caption: 'Reminder !!! for corrugated box order for this month, Please check stock and confirm us order to lock raw kraft paper rates & ensure scheduled dispatch.',
    hashtags: ['#CorrugatedBoxes', '#PackagingIndustry', '#MasterCartons', '#BoxManufacturer', '#KraftPaper'],
    buttons: [
      { id: 'btn_call', type: 'call', label: '📞 Call Sales Team !!', value: '+91 98765 43210', icon: 'phone' },
      { id: 'btn_reply', type: 'quick_reply', label: '↩ Interested !! Send Price & Batch Quotation', value: 'Yes, I am interested! Please send updated price and batch quotation for our boxes.', icon: 'reply' },
    ],
    showPricing: true,
    showTechnicalSpecs: true,
    termsText: '1. GST 18% Extra as applicable\n2. Packing: 25 Boxes strapped bundle + Stretch film\n3. Delivery: Ready stock 48h / Made-to-order 4-5 days\n4. Contact Sales Person for custom die-line or artwork setup\n5. MOQ: 500 Pcs per size',
  },
  stage_update: {
    title: 'PRODUCTION MILESTONE & QUALITY INSPECTION CARD',
    subtitle: 'OFFICIAL SHOPFLOOR PRODUCTION REPORT',
    cardType: 'stage_update',
    caption: 'Update !!! Your box batch has successfully passed the quality inspection stage. Please review the live photo proof and confirm dispatch readiness.',
    hashtags: ['#ProductionUpdate', '#QualityApproved', '#OrderTracking', '#CorruTrack'],
    buttons: [
      { id: 'btn_call', type: 'call', label: '📞 Call Plant Supervisor', value: '+91 98765 43210', icon: 'phone' },
      { id: 'btn_approve', type: 'quick_reply', label: '↩ Approve Proof & Authorize Dispatch', value: 'Approved! Please proceed with packing and loading for dispatch.', icon: 'reply' },
    ],
    showPricing: false,
    showTechnicalSpecs: true,
    termsText: '1. Verified by Quality Assurance Inspector\n2. Bursting strength & Flute caliper tested\n3. Dispatch ready subject to gate pass clearance',
  },
  dispatch_notice: {
    title: 'DISPATCH NOTICE & FREIGHT GATE PASS',
    subtitle: 'OUT FOR DELIVERY — CORRUGATED SHIPMENT',
    cardType: 'dispatch_notice',
    caption: 'Shipment Dispatched !!! Your corrugated cartons are loaded onto our freight carrier. Please verify the invoice details and ensure unloading dock availability.',
    hashtags: ['#DispatchAlert', '#Logistics', '#FastDelivery', '#FactoryDirect'],
    buttons: [
      { id: 'btn_call', type: 'call', label: '📞 Call Dispatch Dock', value: '+91 98765 43210', icon: 'phone' },
      { id: 'btn_track', type: 'quick_reply', label: '↩ Share Live Driver Contact & LR Copy', value: 'Please share Driver Phone number and Lorry Receipt (LR) copy for our gate security.', icon: 'reply' },
    ],
    showPricing: true,
    showTechnicalSpecs: true,
    termsText: '1. Driver to carry E-Way Bill & Delivery Challan\n2. Unloading within 2 hours of arrival at dock\n3. Proof of Delivery (POD) signature required upon delivery',
  }
};

/**
 * Builds standard WhatsApp Business Cloud API JSON payload for Interactive Button Messages
 */
export function generateWhatsAppCloudApiPayload(
  recipientPhone: string,
  order: CorrugatedOrder,
  config: WhatsAppInteractiveCardConfig,
  settings: FactorySettings,
  mediaImageUrl?: string
) {
  const cleanPhone = recipientPhone.replace(/[^\d]/g, '');
  const tags = config.hashtags.join(' ');
  const fullBody = `${config.caption}\n\n*Order Ref:* #${order.id} - ${order.customerCompany}\n*Size:* ${order.dimensions.lengthMm}x${order.dimensions.widthMm}x${order.dimensions.heightMm} mm (${order.ply})\n*Lamination:* ${order.lamination || 'None'}\n\n${tags}`;

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: mediaImageUrl
        ? {
            type: 'image',
            image: {
              link: mediaImageUrl,
            },
          }
        : {
            type: 'text',
            text: config.title,
          },
      body: {
        text: fullBody,
      },
      footer: {
        text: `${settings.companyName} • CorruTrack ERP`,
      },
      action: {
        buttons: config.buttons.slice(0, 3).map((btn) => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.label.slice(0, 20), // WhatsApp enforces max 20 chars for button title
          },
        })),
      },
    },
  };
}

/**
 * Generates formatted text message with simulated clickable action triggers
 */
export function generateInteractiveShareText(
  order: CorrugatedOrder,
  config: WhatsAppInteractiveCardConfig,
  settings: FactorySettings
): string {
  const tags = config.hashtags.join(' ');
  const actionPrompts = config.buttons
    .map((b) => {
      if (b.type === 'call') {
        return `[ ${b.label} ] 👉 tel:${b.value.replace(/\s+/g, '')}`;
      }
      return `[ ${b.label} ] 👉 Reply "${b.value}"`;
    })
    .join('\n');

  return `📦 *${config.title}*\n_${config.subtitle}_\n` +
    `🏢 *${settings.companyName.toUpperCase()}*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 *ORDER / QUOTE:* #${order.id}\n` +
    `👤 *Client:* ${order.customerCompany} (${order.customerName})\n` +
    `📐 *Box Size:* ${order.dimensions.lengthMm} × ${order.dimensions.widthMm} × ${order.dimensions.heightMm} mm (${order.boxStyle})\n` +
    `🏷️ *Ply / Strength:* ${order.ply} • ${order.flute} • GSM ${order.paperSpecs?.topLinerGsm || 180}/${order.paperSpecs?.flutingMediumGsm || 120}/${order.paperSpecs?.bottomLinerGsm || 150}\n` +
    `✨ *Lamination:* ${order.lamination || 'None'} • Color: ${order.colorType || '1-Color Flexo'}\n` +
    `🔢 *Quantity:* ${order.quantity.toLocaleString()} Boxes @ ${formatCurrency(order.ratePerBox)}/box\n` +
    `💰 *Total Value:* ${formatCurrency(order.totalAmount)}\n` +
    `🚚 *Target Delivery:* ${formatDateTime(order.expectedDeliveryDate)}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${config.caption}\n\n` +
    `${tags}\n\n` +
    `👇 *QUICK ACTION BUTTONS:*\n` +
    `${actionPrompts}\n\n` +
    `🌐 Track Order: https://corrutrack.factory/track/${order.id}`;
}
