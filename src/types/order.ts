export type OrderStage = 
  | 'ORDER_PLACED' 
  | 'BOARD_PROCESSING' 
  | 'PRINTING_SLOTTING' 
  | 'READY_FOR_DISPATCH' 
  | 'OUT_FOR_DELIVERY' 
  | 'DELIVERED';

export type PlyCount = '3-Ply' | '5-Ply' | '7-Ply' | 'Micro-Flute';
export type FluteType = 'A-Flute (4.8mm)' | 'B-Flute (3.0mm)' | 'C-Flute (4.0mm)' | 'E-Flute (1.5mm)' | 'BC-Flute (7.0mm Combined)';
export type BoxStyle = 'RSC (Regular Slotted Carton)' | 'Die-Cut Box' | 'Telescopic Box' | 'Tray & Lid' | 'Half Slotted (HSC)' | 'Heavy Duty Master Box';
export type JointType = 'Stitched' | 'PVA Glue' | 'Hot Melt';

export type LaminationType = 
  | 'None' 
  | 'Matt Lamination' 
  | 'Gloss Lamination' 
  | 'UV Varnish' 
  | 'Aqueous Coating';

export type ColorCount = 
  | 'Plain / Unprinted' 
  | '1-Color Flexo' 
  | '2-Color Flexo' 
  | '3-Color Flexo' 
  | '4-Color Process CMYK' 
  | 'Offset Litho-Lam';

export interface BoxDimensions {
  lengthMm: number;
  widthMm: number;
  heightMm: number;
}

export interface PaperSpecs {
  topLinerGsm: number;
  flutingMediumGsm: number;
  bottomLinerGsm: number;
  middleLinerGsm?: number; // for 5-ply & 7-ply middle liners
  paperGrade?: string; // e.g., 'Golden Virgin Kraft', 'White Top Kraft', 'Duplex Gray Back'
  burstingFactor: number; // e.g., 18 BF, 20 BF, 22 BF, 24 BF, 28 BF
  burstingStrengthKgCm2?: number; // calculated BS in kg/cm²
}

export interface LogoArtworkDetails {
  hasLogo: boolean;
  brandName?: string;
  logoPlacement?: 'Front & Back Panels' | 'All 4 Panels' | 'Top Flap & Side Panels' | 'Single Panel Center';
  artworkStatus?: 'Approved & Stereo Ready' | 'Stereo Under Preparation' | 'Proof Pending Client Approval' | 'Repeat Stereo Job';
  artworkNotes?: string;
}

export interface PlantOwner {
  id: string;
  name: string;
  phone: string;
  email?: string;
  designation: string; // e.g. 'Managing Director', 'Partner', 'Technical Director', 'Co-Founder', 'Commercial Head'
  responsibility?: string; // e.g. 'Unit 1 & High-Value Approvals', 'Commercial Finance & Mills', 'All Plant Operations'
  isPrimary?: boolean;
  active: boolean;
}

export type ProductType = 
  | 'paper_box' 
  | 'paper_bag' 
  | 'duplex_box' 
  | 'non_woven_bag' 
  | 'cake_base' 
  | 'plastic_container';

export interface ProductionHead {
  id: string;
  name: string;
  phone: string;
  designation: string; // e.g. 'Chief Production Head', 'Corrugator Line Supervisor', 'Flexo Printing In-Charge', 'Die-Cut & Finishing Head', 'Night Shift Head'
  shiftOrSection?: string; // e.g. 'Day Shift (Line 1 & 2)', 'Night Shift', 'Corrugation Plant', 'Converting & Slotting'
  machineLine?: string; // e.g. '5-Ply High-Speed Automatic Corrugator', '4-Color Bobst Flexo Folder-Gluer'
  preferredLanguage?: 'hi' | 'hinglish' | 'en'; // Hindi / Hinglish for supervisors with English reading difficulties
  isPrimary?: boolean;
  active: boolean;
}

export interface SalesPerson {
  id: string;
  name: string;
  phone: string;
  email?: string;
  region?: string;
  active: boolean;
}

export interface StageDelayLog {
  id: string;
  orderId: string;
  stage: OrderStage;
  delayedAt: string; // ISO
  delayReason: string;
  delayHours: number;
  previousDeliveryDate: string;
  revisedDeliveryDate: string;
  reportedBy: string;
  actionPlan?: string;
  notificationsDispatched: {
    sales: boolean;
    customer: boolean;
    owner: boolean;
    supervisor: boolean;
  };
}

export interface StageHistoryItem {
  stage: OrderStage;
  timestamp: string; // ISO string
  updatedBy: string; // e.g. "Ramesh (Line 2 Operator)"
  notes?: string;
  photoUrl?: string; // Captured production proof photo for customer & QA
  isDelayed?: boolean;
  delayReason?: string;
  delayHours?: number;
  revisedDeliveryDate?: string;
  notificationsSent: {
    customerWhatsapp: boolean;
    salesPersonWhatsapp?: boolean;
    ownerWhatsapp: boolean;
    teamWhatsapp: boolean;
    smsWebhook: boolean;
  };
}

export interface CorrugatedOrder {
  id: string; // e.g. "CB-1048"
  customerName: string;
  customerCompany: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;

  // Multi-Product Type & Subcategory classification
  productType?: ProductType; // 'paper_box' | 'paper_bag' | 'duplex_box' | 'non_woven_bag' | 'cake_base' | 'plastic_container'
  productSubCategory?: string; // e.g. "Twisted Paper Handle Bag", "FBB Folding Carton", "Round Meal Prep 750ml", etc.
  productSpecsSummary?: string; // Formatted technical specifications string
  productRequirements?: Record<string, any>; // Product-specific additional requirements & parameters

  // Sales Person who brought in the order (fixed internal sales team)
  salesPersonId?: string;
  salesPersonName?: string;
  salesPersonPhone?: string;

  // Box technical specs
  boxStyle: BoxStyle;
  dimensions: BoxDimensions;
  ply: PlyCount;
  flute: FluteType;
  
  // GSM specifications (top, bottom, fluting/sides, middle)
  paperSpecs: PaperSpecs;

  // Finishing, Lamination & Color
  lamination: LaminationType;
  colorType: ColorCount;
  printingDetails: string; // e.g. "Pantone Warm Red + Process Black"
  logoDetails?: LogoArtworkDetails;
  jointType: JointType;
  
  // Quantities & Commercials
  quantity: number;
  bundlesCount?: number;
  ratePerBox: number;
  totalAmount: number;

  // Timeline & SLA
  orderDate: string; // ISO
  expectedDeliveryDate: string; // ISO
  currentStage: OrderStage;
  stageHistory: StageHistoryItem[];
  priority: 'Normal' | 'High / Urgent' | 'Emergency Batch';

  // Stage delay tracking
  isStageDelayed?: boolean;
  currentDelayReason?: string;
  currentDelayHours?: number;
  delayHistory?: StageDelayLog[];

  // Logistics info (when in transit)
  logistics?: {
    driverName: string;
    driverPhone: string;
    vehicleNumber: string;
    dispatchChallanNo: string;
    transporterName?: string;
    dispatchedAt?: string;
    deliveredAt?: string;
    receiverName?: string;
    receiverSignatureNote?: string;
  };

  // Internal plant tags
  assignedLine?: string; // e.g. "Corrugator Line 1", "Bobst Die-Cutter"
  operatorInCharge?: string;
  assignedShift?: ShiftType;
  queuePriority?: number; // Shop floor equipment queue sequence
  equipmentStatus?: 'Ready for Setup' | 'Reels Mounted' | 'Tooling Ready' | 'Awaiting Deckle' | string;
  driveAttachments?: Array<{
    fileId: string;
    fileName: string;
    fileUrl: string;
    mimeType?: string;
    uploadedAt?: string;
  }>;
}

export type ShiftType = 'Morning' | 'Evening' | 'Night';

export interface ShiftOperator {
  id: string;
  name: string;
  phone: string;
  role: string; // e.g. "Corrugator Operator", "Flexo Printer", "Die-Cutting Lead", "Stitching & Bundling"
  machineLine: string; // e.g. "Corrugator Line 1 (5-Ply)"
  active: boolean;
}

export interface ProductionShift {
  id: string;
  type: ShiftType;
  label: string; // e.g. "Morning Shift (Shift A)"
  startTime: string; // e.g. "06:00"
  endTime: string; // e.g. "14:00"
  shiftSupervisorName: string;
  shiftSupervisorPhone: string;
  targetBoxesPerShift: number;
  active: boolean;
  operators: ShiftOperator[];
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  orderId: string;
  stage: OrderStage;
  recipientName: string;
  recipientRole: 'Customer' | 'Business Owner' | 'Production Team' | 'Sales Executive' | 'Dispatch Driver';
  phoneNumber: string;
  channel: 'WhatsApp' | 'SMS' | 'Webhook';
  status: 'Sent' | 'Delivered' | 'Pending';
  messageSnippet: string;
  directWhatsappUrl: string;
  isDelayAlert?: boolean;
}

export type AppTheme = 'kraft' | 'slate' | 'emerald' | 'monochrome' | 'light';

export interface WhatsAppTemplate {
  key: string;
  title: string;
  category: 'Customer' | 'Sales Executive' | 'Production Team' | 'Business Owner' | 'Stage Delay';
  description: string;
  template: string;
  availableVariables: string[];
}

export interface NotificationMatrixSettings {
  notifySalesOnOrderPlaced: boolean;
  notifySalesOnStepComplete: boolean;
  notifySalesOnStageDelay: boolean;
  notifyCustomerOnOrderPlaced: boolean;
  notifyCustomerOnStepComplete: boolean;
  notifyCustomerOnStageDelay: boolean;
  notifyCustomerOnDelivery: boolean;
  notifyOwnerOnHighValue: boolean;
  notifyOwnerOnStageDelay: boolean;
  notifySupervisorOnStall: boolean;
}

export type WhatsAppGatewayProvider =
  | 'in_app_messenger'
  | 'meta_cloud_api'
  | 'ultramsg'
  | 'twilio'
  | 'custom_webhook';

export interface WhatsAppGatewayConfig {
  provider: WhatsAppGatewayProvider;
  enabled: boolean;
  // Meta WhatsApp Cloud API
  metaPhoneNumberId?: string;
  metaAccessToken?: string;
  // UltraMsg / WaAPI (QR-Code Linked WhatsApp Number)
  ultramsgInstanceId?: string;
  ultramsgToken?: string;
  // Twilio WhatsApp
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  // Custom Webhook
  customWebhookUrl?: string;
}

export interface InAppChatMessage {
  id: string;
  orderId: string;
  recipientRole: string;
  recipientName: string;
  recipientPhone: string;
  direction: 'outbound' | 'inbound';
  message: string;
  photoUrl?: string;
  status: 'delivered' | 'read' | 'sent_via_gateway';
  providerUsed?: string;
  timestamp: string;
}

export interface DailySummaryEmailConfig {
  enabled: boolean;
  recipientEmails: string[]; // Defaults to plant owners' registered emails
  scheduledTime: string; // e.g. '19:00'
  includeStageBreakdown: boolean;
  includeDelayedOrdersAlert: boolean;
  includeCommercialValue: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  emailWebhookUrl?: string;
  lastSentAt?: string;
}

export interface DailyEmailSummaryLog {
  id: string;
  timestamp: string;
  recipients: string[];
  subject: string;
  totalOrders: number;
  activeOrdersCount: number;
  delayedOrdersCount: number;
  deliveredCount: number;
  totalRevenue: number;
  status: 'Dispatched' | 'Logged (In-App Mail)';
  htmlBody: string;
  textBody: string;
}

export interface FactorySettings {
  companyName: string;
  plantAddress: string;
  contactNumber: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  productionSupervisorName: string;
  productionSupervisorPhone: string;
  dispatchManagerPhone: string;
  webhookUrl: string;
  enableSoundAlerts: boolean;
  autoOpenWhatsApp: boolean;
  autoStalledAlerts: boolean; // Auto WhatsApp alert to production supervisor if dwell > 150% benchmark
  owners: PlantOwner[]; // Multiple plant owners, partners & directors directory
  productionHeads: ProductionHead[]; // Multiple production heads, shift leads & line supervisors directory
  salesTeam: SalesPerson[]; // Fixed sales person directory
  productionShifts?: ProductionShift[]; // Daily production shifts (Morning, Evening, Night) & assigned operators
  theme?: AppTheme;
  customTemplates?: Record<string, string>;
  notificationMatrix?: NotificationMatrixSettings;
  whatsappGateway?: WhatsAppGatewayConfig;
  dailySummaryEmail?: DailySummaryEmailConfig;
  customDomain?: string;
}

