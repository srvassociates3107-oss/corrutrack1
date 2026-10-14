import { CorrugatedOrder, FactorySettings, WhatsAppTemplate, OrderStage } from '../types/order';
import { STAGE_CONFIG, formatDateTime, formatCurrency } from './whatsapp';
import { getProductCatalogItem, formatProductSpecsSummary } from './productCatalog';

export const TEMPLATES_STORAGE_KEY = 'corrutrack_custom_whatsapp_templates_v1';

export const DEFAULT_TEMPLATES: WhatsAppTemplate[] = [
  {
    key: 'CUSTOMER_ORDER_PLACED',
    title: 'Customer: Order Confirmation',
    category: 'Customer',
    description: 'Sent immediately to the customer when the order is registered and schedule is locked.',
    availableVariables: [
      '{customerName}',
      '{customerCompany}',
      '{orderId}',
      '{dimensions}',
      '{ply}',
      '{flute}',
      '{quantity}',
      '{expectedDelivery}',
      '{deliveryAddress}',
      '{salesPersonName}',
      '{salesPersonPhone}',
      '{trackingUrl}',
      '{plantName}',
      '{plantPhone}',
    ],
    template: `📦 *ORDER CONFIRMED - {plantName}*

Dear *{customerName}* ({customerCompany}),
Thank you for your order! Your corrugated box manufacturing schedule is locked.

🆔 *Order ID:* {orderId}
📐 *Box Dimensions:* {dimensions}
📋 *Structure:* {ply} ({flute})
📦 *Batch Quantity:* {quantity} boxes
⏱️ *Committed Delivery SLA:* *{expectedDelivery}*
📍 *Destination:* {deliveryAddress}
👔 *Account Manager:* {salesPersonName} ({salesPersonPhone})

🔗 *Live Order Tracking:*
{trackingUrl}

You will receive real-time notifications as your boxes complete corrugation, printing, and vehicle dispatch.
For queries: {plantPhone}`,
  },
  {
    key: 'CUSTOMER_STAGE_UPDATE',
    title: 'Customer: Milestone Step Progress',
    category: 'Customer',
    description: 'Sent to customer on step advancement (e.g., corrugation done, flexo print complete, packed).',
    availableVariables: [
      '{customerName}',
      '{orderId}',
      '{stageName}',
      '{stepNumber}',
      '{stageDescription}',
      '{quantity}',
      '{dimensions}',
      '{expectedDelivery}',
      '{salesPersonName}',
      '{trackingUrl}',
      '{photoUrl}',
      '{plantName}',
    ],
    template: `⚙️ *PRODUCTION UPDATE - ORDER #{orderId}*

Dear *{customerName}*,
Your order has advanced to the next manufacturing milestone!

📍 *Current Status:* *{stageName}* (Step {stepNumber}/6)
📝 *Stage Detail:* {stageDescription}
📦 *Order:* {quantity} Boxes ({dimensions})
⏱️ *Expected Delivery:* *{expectedDelivery}*
👔 *Account Lead:* {salesPersonName}

{photoUrlText}🔗 *Track Real-Time Progress:*
{trackingUrl}

- *{plantName}*`,
  },
  {
    key: 'CUSTOMER_STAGE_DELAY',
    title: 'Customer: Polite Delay Notice',
    category: 'Stage Delay',
    description: 'Courteous notification dispatched if a production delay or quality check recalibration occurs.',
    availableVariables: [
      '{customerName}',
      '{orderId}',
      '{stageName}',
      '{delayReason}',
      '{delayHours}',
      '{expectedDelivery}',
      '{salesPersonName}',
      '{salesPersonPhone}',
      '{trackingUrl}',
      '{plantName}',
    ],
    template: `⚠️ *PRODUCTION SCHEDULE UPDATE - ORDER #{orderId}*

Dear *{customerName}*,
We are writing to inform you of a slight adjustment to the production schedule for your box order #{orderId}.

📍 *Stage Affected:* *{stageName}*
⏱️ *Estimated Additional Time:* *+{delayHours} hours*
🔍 *Reason:* {delayReason} (Quality assurance & calibration)
🗓️ *Revised Expected Delivery:* *{expectedDelivery}*

Our team is actively expediting the line to minimize impact. Your account manager *{salesPersonName}* ({salesPersonPhone}) is closely tracking the batch.

🔗 *Live Tracking Link:*
{trackingUrl}

Thank you for your patience and understanding.
- *{plantName}*`,
  },
  {
    key: 'CUSTOMER_OUT_FOR_DELIVERY',
    title: 'Customer: Out for Delivery',
    category: 'Customer',
    description: 'Sent when the shipment leaves the dock with driver and vehicle tracking details.',
    availableVariables: [
      '{customerName}',
      '{orderId}',
      '{quantity}',
      '{dimensions}',
      '{vehicleNumber}',
      '{driverName}',
      '{driverPhone}',
      '{deliveryAddress}',
      '{expectedDelivery}',
      '{trackingUrl}',
      '{plantName}',
    ],
    template: `🚚 *SHIPMENT OUT FOR DELIVERY - {plantName}*

Dear *{customerName}*,
Your corrugated box shipment is loaded and out for delivery!

🆔 *Order ID:* {orderId}
📦 *Boxes:* {quantity} units ({dimensions})
🚛 *Vehicle No:* {vehicleNumber}
👨‍✈️ *Driver:* {driverName} ({driverPhone})
⏱️ *Expected Arrival:* *{expectedDelivery}*

Please ensure receipt verification and unloading at dock:
📍 {deliveryAddress}

🔗 *Live Tracking & Delivery Challan:*
{trackingUrl}`,
  },
  {
    key: 'CUSTOMER_DELIVERED',
    title: 'Customer: Delivery Completed',
    category: 'Customer',
    description: 'Sent upon receipt acknowledgment and signed challan.',
    availableVariables: [
      '{customerName}',
      '{orderId}',
      '{quantity}',
      '{deliveryAddress}',
      '{trackingUrl}',
      '{salesPersonName}',
      '{plantName}',
    ],
    template: `✅ *ORDER DELIVERED SUCCESSFULLY!*

Dear *{customerName}*,
Your consignment *#{orderId}* ({quantity} boxes) has been successfully delivered and acknowledged at {deliveryAddress}.

Thank you for choosing *{plantName}*.
We appreciate your partnership!
👔 Contact: {salesPersonName}

🔗 *View Complete Dispatch Summary & Proof:*
{trackingUrl}`,
  },
  {
    key: 'SALES_STAGE_COMPLETED',
    title: 'Sales Rep: Milestone Step Completed',
    category: 'Sales Executive',
    description: 'Automated milestone alert for the fixed Sales Executive who booked the order.',
    availableVariables: [
      '{salesPersonName}',
      '{orderId}',
      '{stageName}',
      '{stepNumber}',
      '{customerCompany}',
      '{customerName}',
      '{customerPhone}',
      '{quantity}',
      '{dimensions}',
      '{ply}',
      '{flute}',
      '{totalAmount}',
      '{expectedDelivery}',
      '{trackingUrl}',
      '{plantName}',
    ],
    template: `✅ *PRODUCTION STEP {stepNumber} OF 6 COMPLETED!*
*ORDER #{orderId} MILESTONE NOTIFICATION*

Hi *{salesPersonName}*,
A production milestone was just completed for your client's work order:

📍 *Milestone Completed:* *{stageName}* (Step {stepNumber}/6)
🏢 *Client:* {customerCompany} ({customerName})
📞 *Client Contact:* {customerPhone}
📦 *Box Specs:* {dimensions} | {ply} ({flute})
📦 *Volume:* {quantity} boxes
💰 *Total Value:* {totalAmount}
⏱️ *Committed SLA:* {expectedDelivery}

🔗 *Live Tracking Link for Client:*
{trackingUrl}

- *Automated Plant Floor Alert | {plantName}*`,
  },
  {
    key: 'SALES_STAGE_DELAY',
    title: 'Sales Rep: Urgent Stage Delay Alert',
    category: 'Stage Delay',
    description: 'Notifies sales rep immediately when an obstacle occurs so they can proactively manage the client.',
    availableVariables: [
      '{salesPersonName}',
      '{orderId}',
      '{stageName}',
      '{delayReason}',
      '{delayHours}',
      '{previousDelivery}',
      '{expectedDelivery}',
      '{customerCompany}',
      '{customerName}',
      '{customerPhone}',
      '{trackingUrl}',
      '{plantName}',
    ],
    template: `🚨 *URGENT SALES ALERT: STAGE DELAY ON ORDER #{orderId}*

Hi *{salesPersonName}*,
Please note an operational delay on your client's order:

🏢 *Client:* {customerCompany} ({customerName})
📞 *Client Phone:* {customerPhone}
📍 *Delayed Stage:* *{stageName}*
⏳ *Delay Duration:* *+{delayHours} hours*
⚠️ *Reason:* {delayReason}
🗓️ *Previous SLA:* {previousDelivery}
🗓️ *New Target Delivery:* *{expectedDelivery}*

⚡ *Sales Action:*
Please reach out to {customerName} if needed or monitor live floor progress at:
{trackingUrl}

- *CorruTrack Dispatch Desk | {plantName}*`,
  },
  {
    key: 'PRODUCTION_JOB_CARD',
    title: 'Production Team: Floor Job Card (English)',
    category: 'Production Team',
    description: 'Technical manufacturing recipe in English sent to machine line operators and supervisor.',
    availableVariables: [
      '{orderId}',
      '{productTitle}',
      '{subCategory}',
      '{stageName}',
      '{quantity}',
      '{dimensions}',
      '{ply}',
      '{flute}',
      '{gsmSpecs}',
      '{productSpecsSummary}',
      '{lamination}',
      '{colorType}',
      '{salesPersonName}',
      '{salesPersonPhone}',
      '{expectedDelivery}',
      '{plantName}',
    ],
    template: `🏭 *FACTORY FLOOR JOB CARD #{orderId}*

📦 *Product:* {productTitle} ({subCategory})
📍 *Target Station:* {stageName}
📦 *Job Batch:* {quantity} units
📐 *Dimensions/Size:* {dimensions}
📋 *Structure:* {ply} | Flute: {flute}
🔬 *Material Specs:* {productSpecsSummary}
✨ *Lamination/Finish:* {lamination}
🎨 *Color/Print:* {colorType}
👔 *Sales Contact:* {salesPersonName} ({salesPersonPhone})
⏱ *Dispatch Deadline:* {expectedDelivery}

Please verify caliper, burst factor, and print registration before forwarding.`,
  },
  {
    key: 'PRODUCTION_JOB_CARD_HI',
    title: 'Production Head: Job Card in Hindi (हिन्दी)',
    category: 'Production Team',
    description: 'स्पेशल हिन्दी जॉब कार्ड - उत्पादन प्रमुख व मशीन ऑपरेटरों के लिए जिन्हें अंग्रेजी पढ़ने में दिक्कत होती है।',
    availableVariables: [
      '{orderId}',
      '{productTitleHindi}',
      '{subCategory}',
      '{stageName}',
      '{quantity}',
      '{dimensions}',
      '{productSpecsSummary}',
      '{lamination}',
      '{colorType}',
      '{customerCompany}',
      '{salesPersonName}',
      '{salesPersonPhone}',
      '{expectedDelivery}',
      '{plantName}',
    ],
    template: `🏭 *कारखाना उत्पादन जॉब कार्ड #{orderId}*

नमस्ते प्रोडक्शन हेड जी,
कारखाने में नया काम शेड्यूल हुआ है:

📋 *ऑर्डर नंबर:* #{orderId}
📦 *उत्पाद (Product):* *{productTitleHindi}*
🏷️ *प्रकार (Sub-category):* {subCategory}
📊 *कुल मात्रा:* *{quantity} पीस*
📍 *मौजूदा स्टेज:* {stageName}
📐 *साइज / माप:* {dimensions}
🔬 *मटेरियल स्पेसिफिकेशन:* {productSpecsSummary}
✨ *फिनिशिंग / लेमिनेशन:* {lamination}
🎨 *प्रिंटिंग:* {colorType}
🏢 *पार्टी का नाम:* {customerCompany}
⏱️ *डिलीवरी की आखिरी तारीख:* *{expectedDelivery}*
👔 *सेल्स हेड:* {salesPersonName} ({salesPersonPhone})

👉 *सुपरवाइजर विशेष निर्देश:*
कृपया कच्चा माल (Raw Material) और मशीन लाइन तुरंत चेक करें। पहला सैंपल पास होने पर ही पूरा लॉट चलाएं!

- *{plantName}*`,
  },
  {
    key: 'PRODUCTION_JOB_CARD_HINGLISH',
    title: 'Production Head: Job Card in Hinglish',
    category: 'Production Team',
    description: 'Simple Hinglish (Hindi in Roman English script) for easy mobile reading by supervisors.',
    availableVariables: [
      '{orderId}',
      '{productTitle}',
      '{subCategory}',
      '{stageName}',
      '{quantity}',
      '{dimensions}',
      '{productSpecsSummary}',
      '{customerCompany}',
      '{salesPersonName}',
      '{expectedDelivery}',
      '{plantName}',
    ],
    template: `🏭 *FACTORY JOB CARD ALERT #{orderId}*

Namaste Production Head ji,
Naya order production schedule me add hua hai:

📋 *Order ID:* #{orderId}
📦 *Product:* {productTitle} ({subCategory})
📊 *Quantity:* *{quantity} pcs*
📐 *Size:* {dimensions}
🔬 *Specs:* {productSpecsSummary}
🏢 *Party:* {customerCompany}
⏱️ *Delivery Deadline:* *{expectedDelivery}*
👔 *Sales Rep:* {salesPersonName}

👉 *Floor Note:* Kripya material check karke production shuru karein aur delivery time par maintain karein!

- *{plantName}*`,
  },
  {
    key: 'OWNER_SUMMARY',
    title: 'Plant Owner: Commercial & SLA Summary',
    category: 'Business Owner',
    description: 'Summary of commercial value, margins, and timeline for the Managing Director / Owner.',
    availableVariables: [
      '{orderId}',
      '{stageName}',
      '{customerCompany}',
      '{customerName}',
      '{customerPhone}',
      '{salesPersonName}',
      '{quantity}',
      '{dimensions}',
      '{totalAmount}',
      '{ratePerBox}',
      '{expectedDelivery}',
      '{plantName}',
    ],
    template: `🔔 *PLANT OWNER ALERT: {orderId} [{stageName}]*

🏢 *Client:* {customerCompany} ({customerName})
📞 *Phone:* {customerPhone}
👔 *Sales Rep:* {salesPersonName}
📦 *Volume:* {quantity} boxes
📐 *Size:* {dimensions}
💰 *Value:* {totalAmount} (@ ₹{ratePerBox}/box)
⏱️ *Deadline:* {expectedDelivery}

⚡ Plant Floor Intelligence | {plantName}`,
  },
  {
    key: 'OWNER_STAGE_DELAY',
    title: 'Plant Owner / MD: Delay Escalation',
    category: 'Stage Delay',
    description: 'Escalation sent to Owner/MD when a line bottleneck or SLA delay exceeds threshold.',
    availableVariables: [
      '{orderId}',
      '{stageName}',
      '{delayReason}',
      '{delayHours}',
      '{expectedDelivery}',
      '{customerCompany}',
      '{totalAmount}',
      '{salesPersonName}',
      '{plantName}',
    ],
    template: `🚨 *OWNER BOTTLENECK ESCALATION: ORDER #{orderId}*

Managing Director Sunil Verma,
Order #{orderId} has logged a production delay:

🏢 *Client:* {customerCompany}
💰 *Order Value:* {totalAmount}
📍 *Station Bottleneck:* {stageName}
⏳ *Delay:* +{delayHours} hours
⚠️ *Reported Cause:* {delayReason}
🗓️ *New Delivery SLA:* {expectedDelivery}
👔 *Lead Rep:* {salesPersonName}

Corrective actions on shopfloor are initiated to safeguard client relationship.
- *{plantName}*`,
  },
];

export function getStoredCustomTemplates(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveCustomTemplate(key: string, templateText: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredCustomTemplates();
    existing[key] = templateText;
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to save custom WhatsApp template:', err);
  }
}

export function resetTemplateToDefault(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredCustomTemplates();
    delete existing[key];
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to reset template:', err);
  }
}

export function resetAllTemplates(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TEMPLATES_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear custom templates:', err);
  }
}

export function getActiveTemplateText(key: string): string {
  const custom = getStoredCustomTemplates();
  if (custom[key]) return custom[key];
  const def = DEFAULT_TEMPLATES.find((t) => t.key === key);
  return def ? def.template : '';
}

export function renderCustomWhatsAppMessage(
  templateKey: string,
  order: CorrugatedOrder,
  settings: FactorySettings,
  extra?: {
    delayReason?: string;
    delayHours?: number;
    notes?: string;
    photoUrl?: string;
    previousDelivery?: string;
    appUrl?: string;
    stageOverride?: OrderStage;
  }
): string {
  const rawTemplate = getActiveTemplateText(templateKey);
  if (!rawTemplate) return '';

  const activeStage = extra?.stageOverride || order.currentStage;
  const stageInfo = STAGE_CONFIG[activeStage];
  const appUrl = extra?.appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const trackUrl = `${appUrl}?track=${encodeURIComponent(order.id)}&public=1`;

  const dimensionsStr = `${order.dimensions.lengthMm} x ${order.dimensions.widthMm} x ${order.dimensions.heightMm} mm`;
  const gsmSpecsStr = `Top ${order.paperSpecs.topLinerGsm} / Flute ${order.paperSpecs.flutingMediumGsm} / Bot ${order.paperSpecs.bottomLinerGsm} (${order.paperSpecs.burstingFactor} BF)`;

  // Ensure we NEVER inject a huge base64 data:image string into a WhatsApp URL!
  let cleanPhotoUrl = extra?.photoUrl || '';
  if (cleanPhotoUrl.startsWith('data:image')) {
    cleanPhotoUrl = `${appUrl}?track=${encodeURIComponent(order.id)}&photo=1&public=1`;
  } else if (cleanPhotoUrl.startsWith('/api/')) {
    cleanPhotoUrl = `${appUrl}${cleanPhotoUrl}`;
  }

  const photoUrlText = cleanPhotoUrl
    ? `📸 *Direct Stage Photo Proof (Click to Open Image):*\n${cleanPhotoUrl}\n`
    : '';

  const productItem = getProductCatalogItem(order.productType);
  const subCategoryName = order.productSubCategory || productItem.subCategories[0]?.title || 'Standard';
  const productSpecsSummary = order.productSpecsSummary || formatProductSpecsSummary(order);

  const replacements: Record<string, string> = {
    '{orderId}': order.id,
    '{productTitle}': productItem.title,
    '{productTitleHindi}': productItem.titleHindi,
    '{subCategory}': subCategoryName,
    '{productSpecsSummary}': productSpecsSummary,
    '{customerName}': order.customerName,
    '{customerCompany}': order.customerCompany,
    '{customerPhone}': order.customerPhone,
    '{stageName}': stageInfo.title,
    '{stepNumber}': String(stageInfo.stepNumber),
    '{stageDescription}': stageInfo.description,
    '{dimensions}': dimensionsStr,
    '{ply}': order.ply,
    '{flute}': order.flute,
    '{gsmSpecs}': gsmSpecsStr,
    '{lamination}': order.lamination || 'None',
    '{colorType}': order.colorType || 'Plain',
    '{quantity}': order.quantity.toLocaleString(),
    '{ratePerBox}': String(order.ratePerBox),
    '{totalAmount}': formatCurrency(order.totalAmount),
    '{deliveryAddress}': order.deliveryAddress,
    '{expectedDelivery}': formatDateTime(order.expectedDeliveryDate),
    '{previousDelivery}': extra?.previousDelivery ? formatDateTime(extra.previousDelivery) : formatDateTime(order.expectedDeliveryDate),
    '{delayReason}': extra?.delayReason || order.currentDelayReason || 'Machine adjustment and quality re-verification',
    '{delayHours}': String(extra?.delayHours || order.currentDelayHours || 4),
    '{trackingUrl}': trackUrl,
    '{photoUrlText}': photoUrlText,
    '{photoUrl}': cleanPhotoUrl,
    '{plantName}': settings.companyName,
    '{plantPhone}': settings.contactNumber,
    '{plantAddress}': settings.plantAddress,
    '{salesPersonName}': order.salesPersonName || settings.salesTeam?.[0]?.name || 'Sales Desk',
    '{salesPersonPhone}': order.salesPersonPhone || settings.salesTeam?.[0]?.phone || settings.contactNumber,
    '{driverName}': order.logistics?.driverName || 'Designated Driver',
    '{driverPhone}': order.logistics?.driverPhone || settings.dispatchManagerPhone || settings.contactNumber,
    '{vehicleNumber}': order.logistics?.vehicleNumber || 'Dispatch Truck',
  };

  let rendered = rawTemplate;
  for (const [placeholder, value] of Object.entries(replacements)) {
    rendered = rendered.split(placeholder).join(value);
  }

  return rendered;
}
