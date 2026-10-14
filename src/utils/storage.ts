import { CorrugatedOrder, NotificationLog, FactorySettings, OrderStage } from '../types/order';

const ORDERS_KEY = 'corrutrack_orders_v1';
const LOGS_KEY = 'corrutrack_notification_logs_v1';
const SETTINGS_KEY = 'corrutrack_factory_settings_v1';

export const STAGE_PRESET_PHOTOS: Record<OrderStage, Array<{ label: string; url: string }>> = {
  ORDER_PLACED: [
    { label: 'Paper Reel Warehouse Allocation', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80' },
    { label: 'Kraft Reel Slitting & Deckle Loading', url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80' }
  ],
  BOARD_PROCESSING: [
    { label: 'Corrugator Flute Pasting Line', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80' },
    { label: '3/5-Ply Continuous Board Stacker', url: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=800&q=80' }
  ],
  PRINTING_SLOTTING: [
    { label: 'High-Speed 2/4-Color Flexo Printing', url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80' },
    { label: 'Rotary Die-Cutting & Creasing Bed', url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80' }
  ],
  READY_FOR_DISPATCH: [
    { label: 'Strapped Bundles on Wooden Pallets', url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80' },
    { label: 'Shrink-Wrapped Finished Box Batches', url: 'https://images.unsplash.com/photo-1586528116493-a029325540fa?auto=format&fit=crop&w=800&q=80' }
  ],
  OUT_FOR_DELIVERY: [
    { label: 'Freight Truck Loading Bay', url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80' },
    { label: 'Delivery Carrier En Route with Goods Challan', url: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=800&q=80' }
  ],
  DELIVERED: [
    { label: 'Consignment Unloaded at Customer Dock', url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80' },
    { label: 'Signed Goods Receipt Note & Verification', url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80' }
  ]
};

export const DEFAULT_SETTINGS: FactorySettings = {
  companyName: 'SRV Packaging & Corrugation Mills',
  plantAddress: 'Plot 48, Industrial Growth Phase II, Sriperumbudur, Tamil Nadu 602105',
  contactNumber: '+91 98401 23456',
  ownerName: 'Sunil Verma (Managing Director)',
  ownerPhone: '+91 98401 23456',
  ownerEmail: 'sales@srvassociates.co.in',
  productionSupervisorName: 'Mahesh Patil (Plant Head)',
  productionSupervisorPhone: '+91 98401 98765',
  dispatchManagerPhone: '+91 98401 45678',
  webhookUrl: '',
  enableSoundAlerts: true,
  autoOpenWhatsApp: false,
  autoStalledAlerts: true,
  dailySummaryEmail: {
    enabled: true,
    recipientEmails: ['sales@srvassociates.co.in', 'sunil.verma@srvmills.com'],
    scheduledTime: '19:00',
    includeStageBreakdown: true,
    includeDelayedOrdersAlert: true,
    includeCommercialValue: true,
  },
  owners: [
    {
      id: 'owner-1',
      name: 'Sunil Verma',
      phone: '+91 98401 23456',
      email: 'sales@srvassociates.co.in',
      designation: 'Managing Director & Founder',
      responsibility: 'Overall Plant Operations & High-Value Approvals',
      isPrimary: true,
      active: true,
    },
    {
      id: 'owner-2',
      name: 'Anil Agarwal',
      phone: '+91 98201 11223',
      email: 'anil.agarwal@srvmills.com',
      designation: 'Joint Managing Director & Partner',
      responsibility: 'Commercial Finance & Paper Mill Procurement',
      isPrimary: false,
      active: true,
    },
    {
      id: 'owner-3',
      name: 'Vikram Singhania',
      phone: '+91 98110 99887',
      email: 'vikram.singhania@srvmills.com',
      designation: 'Director (Operations & Expansion)',
      responsibility: 'Unit 2 Converting Plant & Automation',
      isPrimary: false,
      active: true,
    },
  ],
  productionHeads: [
    {
      id: 'prod-1',
      name: 'Mahesh Patil',
      phone: '+91 98401 98765',
      designation: 'Chief Production Head',
      shiftOrSection: 'General Shift (Corrugation & Converting)',
      machineLine: '5-Ply High-Speed Automatic Corrugator',
      preferredLanguage: 'hi',
      isPrimary: true,
      active: true,
    },
    {
      id: 'prod-2',
      name: 'Ramesh Sharma',
      phone: '+91 98402 11223',
      designation: 'Corrugator Line Supervisor',
      shiftOrSection: 'Day Shift (06:00 AM – 02:00 PM)',
      machineLine: 'Corrugator Line 1 (Heavy 7-Ply)',
      preferredLanguage: 'hi',
      isPrimary: false,
      active: true,
    },
    {
      id: 'prod-3',
      name: 'Santosh Jadhav',
      phone: '+91 98403 33445',
      designation: 'Flexo Printing & Die-Cutting Supervisor',
      shiftOrSection: 'Printing & Converting Department',
      machineLine: '4-Color Bobst Flexo Folder-Gluer',
      preferredLanguage: 'hinglish',
      isPrimary: false,
      active: true,
    },
    {
      id: 'prod-4',
      name: 'Deepak Chawla',
      phone: '+91 98404 55667',
      designation: 'Night Shift Plant In-Charge',
      shiftOrSection: 'Night Shift (10:00 PM – 06:00 AM)',
      machineLine: 'Plant Operations & Emergency Maintenance',
      preferredLanguage: 'en',
      isPrimary: false,
      active: true,
    },
  ],
  salesTeam: [
    {
      id: 'sp-1',
      name: 'Rajesh Sharma',
      phone: '+91 98200 45678',
      email: 'rajesh.sharma@srvmills.com',
      region: 'North & West Hub (Auto / Heavy Engg)',
      active: true,
    },
    {
      id: 'sp-2',
      name: 'Pooja Mehta',
      phone: '+91 98211 98765',
      email: 'pooja.mehta@srvmills.com',
      region: 'South Region (Fresh Agro & Cold Chain)',
      active: true,
    },
    {
      id: 'sp-3',
      name: 'Vikram Rathore',
      phone: '+91 98112 34567',
      email: 'vikram.rathore@srvmills.com',
      region: 'NCR / Bhiwandi (E-Commerce Fulfillment)',
      active: true,
    },
    {
      id: 'sp-4',
      name: 'Kunal Desai',
      phone: '+91 98334 11223',
      email: 'kunal.desai@srvmills.com',
      region: 'Pharma & Clean Room Packaging',
      active: true,
    },
  ],
  productionShifts: [
    {
      id: 'shift-morning',
      type: 'Morning',
      label: 'Morning Shift (Shift A)',
      startTime: '06:00',
      endTime: '14:00',
      shiftSupervisorName: 'Mahesh Patil',
      shiftSupervisorPhone: '+91 98401 67890',
      targetBoxesPerShift: 15000,
      active: true,
      operators: [
        {
          id: 'op-m1',
          name: 'Ramesh Sharma',
          phone: '+91 98401 77889',
          role: 'Auto-Corrugator Line Lead',
          machineLine: 'Corrugator Line 1 (Heavy 5/7-Ply)',
          active: true,
        },
        {
          id: 'op-m2',
          name: 'Suresh Yadav',
          phone: '+91 98401 55443',
          role: 'Flexo Printing & Slotting Operator',
          machineLine: '2-Color High-Speed Flexo Printer Slotter',
          active: true,
        },
        {
          id: 'op-m3',
          name: 'Dinesh Kumar',
          phone: '+91 98401 66771',
          role: 'Auto-Stitching & Strapping Operator',
          machineLine: 'Auto-Stitching & Folder Gluer Line',
          active: true,
        },
      ],
    },
    {
      id: 'shift-evening',
      type: 'Evening',
      label: 'Evening Shift (Shift B)',
      startTime: '14:00',
      endTime: '22:00',
      shiftSupervisorName: 'Santosh Yadav',
      shiftSupervisorPhone: '+91 98401 55443',
      targetBoxesPerShift: 14000,
      active: true,
      operators: [
        {
          id: 'op-e1',
          name: 'Prakash Jadhav',
          phone: '+91 98401 33221',
          role: 'Corrugator & Flute Lamination Operator',
          machineLine: 'Corrugator Line 1 (Heavy 5/7-Ply)',
          active: true,
        },
        {
          id: 'op-e2',
          name: 'Anil Verma',
          phone: '+91 98401 88992',
          role: 'Rotary Die-Punching Operator',
          machineLine: 'Bobst Auto Rotary Die-Cutter',
          active: true,
        },
      ],
    },
    {
      id: 'shift-night',
      type: 'Night',
      label: 'Night Shift (Shift C)',
      startTime: '22:00',
      endTime: '06:00',
      shiftSupervisorName: 'Balwinder Singh',
      shiftSupervisorPhone: '+91 98401 33221',
      targetBoxesPerShift: 12000,
      active: true,
      operators: [
        {
          id: 'op-n1',
          name: 'Manoj Tiwari',
          phone: '+91 98401 44556',
          role: 'Night Corrugation & Reel Slitting Operator',
          machineLine: 'Corrugator Line 2 (3-Ply High-Speed)',
          active: true,
        },
        {
          id: 'op-n2',
          name: 'Rajendra Prasad',
          phone: '+91 98401 99001',
          role: 'Dispatch Bundling & Palletizing Lead',
          machineLine: 'Bundling & Stretch-Wrap Bay',
          active: true,
        },
      ],
    },
  ],
  customDomain: 'www.navyugtrack.in',
};


// Seed realistic corrugated orders
const INITIAL_ORDERS: CorrugatedOrder[] = [
  {
    id: 'CB-8944',
    customerName: 'Aarav Mehta',
    customerCompany: 'Apex Automotive Spares Pvt Ltd',
    customerPhone: '+91 98200 11223',
    customerEmail: 'procurement@apexauto.in',
    deliveryAddress: 'Gate 4, Heavy Industrial Estate, Chakan, Pune 410501',
    salesPersonId: 'sp-1',
    salesPersonName: 'Rajesh Sharma',
    salesPersonPhone: '+91 98200 45678',
    boxStyle: 'Heavy Duty Master Box',
    dimensions: {
      lengthMm: 500,
      widthMm: 400,
      heightMm: 350,
    },
    ply: '7-Ply',
    flute: 'BC-Flute (7.0mm Combined)',
    paperSpecs: {
      topLinerGsm: 220,
      flutingMediumGsm: 150,
      bottomLinerGsm: 200,
      middleLinerGsm: 180,
      paperGrade: 'Golden Virgin Kraft',
      burstingFactor: 24,
      burstingStrengthKgCm2: 14.2,
    },
    lamination: 'Matt Lamination',
    colorType: '2-Color Flexo',
    printingDetails: '2-Color Flexo (Apex Logo Red + Caution Heavy Black)',
    logoDetails: {
      hasLogo: true,
      brandName: 'APEX GENUINE SPARES',
      logoPlacement: 'Front & Back Panels',
      artworkStatus: 'Approved & Stereo Ready',
    },
    jointType: 'Stitched',
    quantity: 3500,
    bundlesCount: 140,
    ratePerBox: 48,
    totalAmount: 168000,
    orderDate: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    expectedDeliveryDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    currentStage: 'ORDER_PLACED',
    stageHistory: [
      {
        stage: 'ORDER_PLACED',
        timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        updatedBy: 'Ramesh (Shift In-charge)',
        notes: 'Job card generated. 220 GSM Virgin Kraft paper reels allocated from warehouse Bay 3.',
        photoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
    ],
    priority: 'Normal',
    assignedLine: 'Corrugator Line 1 (Heavy 7-Ply)',
    operatorInCharge: 'Ramesh Sharma',
  },
  {
    id: 'CB-8943',
    customerName: 'Kavita Nair',
    customerCompany: 'Green Valley Fresh Produce',
    customerPhone: '+91 98450 33445',
    customerEmail: 'dispatch@greenvalleyfresh.com',
    deliveryAddress: 'Cold Chain Packhouse, NH-48 Fruit Yard, Bangalore 560099',
    salesPersonId: 'sp-2',
    salesPersonName: 'Pooja Mehta',
    salesPersonPhone: '+91 98211 98765',
    boxStyle: 'Tray & Lid',
    dimensions: {
      lengthMm: 450,
      widthMm: 300,
      heightMm: 180,
    },
    ply: '3-Ply',
    flute: 'B-Flute (3.0mm)',
    paperSpecs: {
      topLinerGsm: 180,
      flutingMediumGsm: 140,
      bottomLinerGsm: 180,
      paperGrade: 'Semi-Chemical High Ring Crush',
      burstingFactor: 20,
      burstingStrengthKgCm2: 9.8,
    },
    lamination: 'None',
    colorType: '3-Color Flexo',
    printingDetails: '3-Color Flexo (Export Quality Kiwi & Green typography)',
    logoDetails: {
      hasLogo: true,
      brandName: 'GREEN VALLEY FRESH',
      logoPlacement: 'All 4 Panels',
      artworkStatus: 'Approved & Stereo Ready',
    },
    jointType: 'PVA Glue',
    quantity: 6000,
    bundlesCount: 240,
    ratePerBox: 24,
    totalAmount: 144000,
    orderDate: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    expectedDeliveryDate: new Date(Date.now() + 6 * 3600 * 1000).toISOString(), // Approaching deadline!
    currentStage: 'BOARD_PROCESSING',
    stageHistory: [
      {
        stage: 'ORDER_PLACED',
        timestamp: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
        updatedBy: 'Anand K (Sales Coordinator)',
        notes: 'Ventilated die-cut holes required for fruit respiration.',
        photoUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
      {
        stage: 'BOARD_PROCESSING',
        timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
        updatedBy: 'Suresh (Corrugator Lead)',
        notes: 'Pasting completed. Sheets curing on cooling rack. Move to rotary die cutter at 2 PM.',
        photoUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
    ],
    priority: 'High / Urgent',
    assignedLine: 'High Speed Fluter Line 2 (3-Ply)',
    operatorInCharge: 'Suresh Patil',
    queuePriority: 1,
    equipmentStatus: 'Reels Mounted',
  },
  {
    id: 'CB-8945',
    customerName: 'Anand Mahindra Spares',
    customerCompany: 'Titan Automotive Gears Ltd',
    customerPhone: '+91 98230 11223',
    customerEmail: 'procurement@titanautogears.com',
    deliveryAddress: 'Plant 4, Auto Component SEZ, Oragadam, Chennai 602105',
    salesPersonId: 'sp-1',
    salesPersonName: 'Rajesh Sharma',
    salesPersonPhone: '+91 98200 45678',
    boxStyle: 'Heavy Duty Master Box',
    dimensions: {
      lengthMm: 600,
      widthMm: 400,
      heightMm: 450,
    },
    ply: '5-Ply',
    flute: 'BC-Flute (7.0mm Combined)',
    paperSpecs: {
      topLinerGsm: 240,
      flutingMediumGsm: 180,
      bottomLinerGsm: 220,
      middleLinerGsm: 180,
      paperGrade: 'Imported Russian Virgin Kraft',
      burstingFactor: 28,
      burstingStrengthKgCm2: 16.5,
    },
    lamination: 'None',
    colorType: '2-Color Flexo',
    printingDetails: '2-Color Flexo (Heavy Stacking Arrow & Handling Icons)',
    logoDetails: {
      hasLogo: true,
      brandName: 'TITAN HEAVY DUTY AUTO',
      logoPlacement: 'All 4 Panels',
      artworkStatus: 'Approved & Stereo Ready',
    },
    jointType: 'Stitched',
    quantity: 4500,
    bundlesCount: 180,
    ratePerBox: 68,
    totalAmount: 306000,
    orderDate: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    expectedDeliveryDate: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    currentStage: 'BOARD_PROCESSING',
    stageHistory: [
      {
        stage: 'ORDER_PLACED',
        timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
        updatedBy: 'Rajesh Sharma (Commercial Head)',
        notes: '28 BF virgin kraft reel reserved from Bay 3. High compression rating required.',
        photoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
      {
        stage: 'BOARD_PROCESSING',
        timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        updatedBy: 'Ramesh Sharma (Shift A Lead)',
        notes: 'Deckle width matched at 1800mm. Ready for corrugator line startup.',
        photoUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
    ],
    priority: 'Normal',
    assignedLine: 'Corrugator Line 1 (Heavy 5/7-Ply)',
    operatorInCharge: 'Ramesh Sharma',
    queuePriority: 2,
    equipmentStatus: 'Tooling Ready',
  },
  {
    id: 'CB-8946',
    customerName: 'Pooja Iyer',
    customerCompany: 'Apex Formulations Pharma',
    customerPhone: '+91 99401 77889',
    customerEmail: 'pack@apexpharma.in',
    deliveryAddress: 'Sterile Zone 2, SIPCOT Pharma Park, Cuddalore, TN 607005',
    salesPersonId: 'sp-2',
    salesPersonName: 'Priya Sundaram',
    salesPersonPhone: '+91 98402 88990',
    boxStyle: 'Die-Cut Box',
    dimensions: {
      lengthMm: 320,
      widthMm: 220,
      heightMm: 160,
    },
    ply: '3-Ply',
    flute: 'E-Flute (1.5mm)',
    paperSpecs: {
      topLinerGsm: 180,
      flutingMediumGsm: 120,
      bottomLinerGsm: 140,
      paperGrade: 'White Top Kraft',
      burstingFactor: 22,
      burstingStrengthKgCm2: 8.2,
    },
    lamination: 'Matt Lamination',
    colorType: '4-Color Process CMYK',
    printingDetails: 'High-Res CMYK Printing with Pharma Batch Code window',
    logoDetails: {
      hasLogo: true,
      brandName: 'APEX RX PHARMA',
      logoPlacement: 'Top Flap & Side Panels',
      artworkStatus: 'Approved & Stereo Ready',
    },
    jointType: 'Hot Melt',
    quantity: 12000,
    bundlesCount: 480,
    ratePerBox: 18.5,
    totalAmount: 222000,
    orderDate: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    expectedDeliveryDate: new Date(Date.now() + 28 * 3600 * 1000).toISOString(),
    currentStage: 'BOARD_PROCESSING',
    stageHistory: [
      {
        stage: 'ORDER_PLACED',
        timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
        updatedBy: 'Priya S (Key Accounts)',
        notes: 'White top liner inspected for moisture content (<7.5%). Approved.',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
      {
        stage: 'BOARD_PROCESSING',
        timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        updatedBy: 'Suresh Patil (Operator)',
        notes: 'Queued on Line 2 awaiting current kiwi carton batch completion.',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
    ],
    priority: 'Normal',
    assignedLine: 'High Speed Fluter Line 2 (3-Ply)',
    operatorInCharge: 'Suresh Patil',
    queuePriority: 3,
    equipmentStatus: 'Ready for Setup',
  },
  {
    id: 'CB-8942',
    customerName: 'Vikram Sengupta',
    customerCompany: 'NexGen E-Commerce Fulfillment',
    customerPhone: '+91 97110 55667',
    customerEmail: 'vikram@nexgenhub.in',
    deliveryAddress: 'Hub 12, Amazon Seller Cluster, Bhiwandi, Maharashtra 421302',
    salesPersonId: 'sp-3',
    salesPersonName: 'Vikram Rathore',
    salesPersonPhone: '+91 98112 34567',
    boxStyle: 'RSC (Regular Slotted Carton)',
    dimensions: {
      lengthMm: 380,
      widthMm: 280,
      heightMm: 220,
    },
    ply: '5-Ply',
    flute: 'C-Flute (4.0mm)',
    paperSpecs: {
      topLinerGsm: 200,
      flutingMediumGsm: 140,
      bottomLinerGsm: 180,
      middleLinerGsm: 150,
      paperGrade: 'Golden Virgin Kraft',
      burstingFactor: 22,
      burstingStrengthKgCm2: 11.4,
    },
    lamination: 'None',
    colorType: '1-Color Flexo',
    printingDetails: '1-Color Flexo (E-com Barcode & Recyclable Symbol)',
    logoDetails: {
      hasLogo: true,
      brandName: 'NEXGEN FBA PRIME',
      logoPlacement: 'Front & Back Panels',
      artworkStatus: 'Approved & Stereo Ready',
    },
    jointType: 'Stitched',
    quantity: 8000,
    bundlesCount: 320,
    ratePerBox: 32,
    totalAmount: 256000,
    orderDate: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
    expectedDeliveryDate: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    currentStage: 'OUT_FOR_DELIVERY',
    stageHistory: [
      {
        stage: 'ORDER_PLACED',
        timestamp: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
        updatedBy: 'System Desk',
        notes: 'Standard Amazon FBA box compliance verified.',
        photoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
      {
        stage: 'BOARD_PROCESSING',
        timestamp: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
        updatedBy: 'Suresh Patil',
        notes: 'Corrugation 5-ply continuous run complete.',
        photoUrl: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=800&q=80',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
      {
        stage: 'PRINTING_SLOTTING',
        timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
        updatedBy: 'Manoj (Flexo Printer)',
        notes: 'Rotary slotting and barcode print clear.',
        photoUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
      {
        stage: 'READY_FOR_DISPATCH',
        timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
        updatedBy: 'Harish (QC Inspector)',
        notes: 'Bursting test 16.5 kg/cm2 passed. Strapped in 25 pcs bundles.',
        photoUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
      {
        stage: 'OUT_FOR_DELIVERY',
        timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        updatedBy: 'Sunil (Logistics Manager)',
        notes: 'Loaded on 14ft Eicher container. Dispatch Challan #DC-4892 issued.',
        photoUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
    ],
    priority: 'Normal',
    logistics: {
      driverName: 'Balwinder Singh',
      driverPhone: '+91 98199 77889',
      vehicleNumber: 'MH-04-GP-8834',
      dispatchChallanNo: 'DC-4892',
      dispatchedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
    assignedLine: 'Auto Corrugator Line 1',
    operatorInCharge: 'Sunil Verma',
  },
  {
    id: 'CB-8941',
    customerName: 'Deepak Chawla',
    customerCompany: 'Zenith Pharma & Health Care',
    customerPhone: '+91 99100 88990',
    customerEmail: 'deepak.c@zenithpharma.com',
    deliveryAddress: 'Plot 102, API Pharma Zone, Baddi, HP 173205',
    salesPersonId: 'sp-4',
    salesPersonName: 'Kunal Desai',
    salesPersonPhone: '+91 98334 11223',
    boxStyle: 'Die-Cut Box',
    dimensions: {
      lengthMm: 320,
      widthMm: 220,
      heightMm: 160,
    },
    ply: '5-Ply',
    flute: 'B-Flute (3.0mm)',
    paperSpecs: {
      topLinerGsm: 180,
      flutingMediumGsm: 140,
      bottomLinerGsm: 180,
      paperGrade: 'White Top Bleached Kraft',
      burstingFactor: 22,
      burstingStrengthKgCm2: 10.2,
    },
    lamination: 'Gloss Lamination',
    colorType: '2-Color Flexo',
    printingDetails: '2-Color (Pharma Blue + Tamper Warning)',
    logoDetails: {
      hasLogo: true,
      brandName: 'ZENITH HEALTHCARE',
      logoPlacement: 'Top Flap & Side Panels',
      artworkStatus: 'Approved & Stereo Ready',
    },
    jointType: 'Hot Melt',
    quantity: 5000,
    bundlesCount: 200,
    ratePerBox: 28,
    totalAmount: 140000,
    orderDate: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
    expectedDeliveryDate: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), // Slightly delayed
    currentStage: 'PRINTING_SLOTTING',
    stageHistory: [
      {
        stage: 'ORDER_PLACED',
        timestamp: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
        updatedBy: 'Anand K',
        notes: 'Pharma clean board requirements specified.',
        photoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
      {
        stage: 'BOARD_PROCESSING',
        timestamp: new Date(Date.now() - 32 * 3600 * 1000).toISOString(),
        updatedBy: 'Suresh Patil',
        notes: 'Pasting completed.',
        photoUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
      {
        stage: 'PRINTING_SLOTTING',
        timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
        updatedBy: 'Manoj',
        notes: 'Die-punch plate adjustment caused 3-hour delay.',
        photoUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
    ],
    priority: 'Emergency Batch',
    assignedLine: 'Die-Cutter Line 3',
    operatorInCharge: 'Manoj Kumar',
  },
  {
    id: 'CB-8940',
    customerName: 'Priya Sharma',
    customerCompany: 'Aroma Spice Exporters',
    customerPhone: '+91 98765 43210',
    customerEmail: 'priya@aromaspices.com',
    deliveryAddress: 'Container Freight Station, Port Trust, Cochin 682003',
    salesPersonId: 'sp-2',
    salesPersonName: 'Pooja Mehta',
    salesPersonPhone: '+91 98211 98765',
    boxStyle: 'RSC (Regular Slotted Carton)',
    dimensions: {
      lengthMm: 400,
      widthMm: 300,
      heightMm: 300,
    },
    ply: '5-Ply',
    flute: 'C-Flute (4.0mm)',
    paperSpecs: {
      topLinerGsm: 200,
      flutingMediumGsm: 150,
      bottomLinerGsm: 180,
      paperGrade: 'Golden Virgin Kraft',
      burstingFactor: 22,
      burstingStrengthKgCm2: 12.0,
    },
    lamination: 'UV Varnish',
    colorType: '2-Color Flexo',
    printingDetails: '2-Color Export Grade (Spice Aroma Logo)',
    logoDetails: {
      hasLogo: true,
      brandName: 'AROMA SPICES EXPORT',
      logoPlacement: 'All 4 Panels',
      artworkStatus: 'Approved & Stereo Ready',
    },
    jointType: 'Stitched',
    quantity: 4000,
    bundlesCount: 160,
    ratePerBox: 38,
    totalAmount: 152000,
    orderDate: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    expectedDeliveryDate: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    currentStage: 'DELIVERED',
    stageHistory: [
      {
        stage: 'ORDER_PLACED',
        timestamp: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
        updatedBy: 'Sales Desk',
        notes: 'Export batch for spices shipping.',
        photoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
      {
        stage: 'BOARD_PROCESSING',
        timestamp: new Date(Date.now() - 56 * 3600 * 1000).toISOString(),
        updatedBy: 'Suresh Patil',
        notes: 'Fluting runs completed.',
        photoUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
      {
        stage: 'PRINTING_SLOTTING',
        timestamp: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
        updatedBy: 'Manoj',
        notes: 'Printing & stapling inspected.',
        photoUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
      {
        stage: 'READY_FOR_DISPATCH',
        timestamp: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
        updatedBy: 'Harish',
        notes: '160 bundles palletized.',
        photoUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
      {
        stage: 'OUT_FOR_DELIVERY',
        timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
        updatedBy: 'Sunil',
        notes: 'Vehicle KL-07-CD-3942 departed.',
        photoUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
      {
        stage: 'DELIVERED',
        timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        updatedBy: 'Driver App / Customer Ack',
        notes: 'Acknowledged at CFS Gate 2 by Store In-charge Mr. Roy.',
        photoUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80',
        notificationsSent: {
          customerWhatsapp: true,
          salesPersonWhatsapp: true,
          ownerWhatsapp: true,
          teamWhatsapp: true,
          smsWebhook: true,
        },
      },
    ],
    priority: 'Normal',
    logistics: {
      driverName: 'Mohan Kumar',
      driverPhone: '+91 94471 22334',
      vehicleNumber: 'KL-07-CD-3942',
      dispatchChallanNo: 'DC-4880',
      dispatchedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      deliveredAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      receiverName: 'Mr. Roy (Warehouse In-charge)',
      receiverSignatureNote: 'All 160 bundles received intact without water or crush damage.',
    },
    assignedLine: 'Corrugator Line 1',
    operatorInCharge: 'Sunil Verma',
  },
];

export function getStoredOrders(): CorrugatedOrder[] {
  if (typeof window === 'undefined') return INITIAL_ORDERS;
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    const parsed: CorrugatedOrder[] = JSON.parse(raw);
    const existingIds = new Set(parsed.map((o) => o.id));
    // Merge any missing initial orders so newly added queue orders appear immediately
    const mergedList = [...parsed];
    for (const initOrder of INITIAL_ORDERS) {
      if (!existingIds.has(initOrder.id)) {
        mergedList.push(initOrder);
      }
    }

    return mergedList.map((o, idx) => ({
      ...o,
      lamination: o.lamination || 'None',
      colorType: o.colorType || 'Plain / Unprinted',
      salesPersonId: o.salesPersonId || 'sp-1',
      salesPersonName: o.salesPersonName || 'Rajesh Sharma',
      salesPersonPhone: o.salesPersonPhone || '+91 98200 45678',
      assignedLine: o.assignedLine || (o.ply === '5-Ply' ? 'Corrugator Line 1 (Heavy 5/7-Ply)' : 'High Speed Fluter Line 2 (3-Ply)'),
      queuePriority: typeof o.queuePriority === 'number' ? o.queuePriority : idx + 1,
      paperSpecs: {
        ...o.paperSpecs,
        topLinerGsm: o.paperSpecs?.topLinerGsm || 180,
        flutingMediumGsm: o.paperSpecs?.flutingMediumGsm || 140,
        bottomLinerGsm: o.paperSpecs?.bottomLinerGsm || 180,
        paperGrade: o.paperSpecs?.paperGrade || 'Kraft Virgin',
        burstingFactor: o.paperSpecs?.burstingFactor || 20,
      },
      logoDetails: o.logoDetails || {
        hasLogo: !!o.printingDetails && !o.printingDetails.toLowerCase().includes('plain'),
        brandName: o.customerCompany,
        logoPlacement: 'Front & Back Panels',
        artworkStatus: 'Approved & Stereo Ready',
      },
    }));
  } catch {
    return INITIAL_ORDERS;
  }
}

export function saveOrders(orders: CorrugatedOrder[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error('Failed to save orders to localStorage:', err);
  }
}

const INITIAL_LOGS: NotificationLog[] = [
  {
    id: 'log-seed-1',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    orderId: 'CB-8942',
    stage: 'OUT_FOR_DELIVERY',
    recipientName: 'Vikram Rathore',
    recipientRole: 'Sales Executive',
    phoneNumber: '+91 98112 34567',
    channel: 'WhatsApp',
    status: 'Delivered',
    messageSnippet: '✅ STEP 5 OF 6 COMPLETED: Loaded on freight carrier MH-04-GP-8834! Driver: Balwinder Singh (+91 98199 77889). Delivery SLA active.',
    directWhatsappUrl: 'https://wa.me/919811234567?text=STEP%205%20COMPLETED',
  },
  {
    id: 'log-seed-2',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    orderId: 'CB-8942',
    stage: 'OUT_FOR_DELIVERY',
    recipientName: 'Vikram Sengupta (NexGen)',
    recipientRole: 'Customer',
    phoneNumber: '+91 97110 55667',
    channel: 'WhatsApp',
    status: 'Delivered',
    messageSnippet: '🚚 SHIPMENT OUT FOR DELIVERY: Your 8,000 corrugated boxes are in transit via vehicle MH-04-GP-8834.',
    directWhatsappUrl: 'https://wa.me/919711055667?text=SHIPMENT%20IN%20TRANSIT',
  },
  {
    id: 'log-seed-3',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    orderId: 'CB-8943',
    stage: 'BOARD_PROCESSING',
    recipientName: 'Pooja Mehta',
    recipientRole: 'Sales Executive',
    phoneNumber: '+91 98211 98765',
    channel: 'WhatsApp',
    status: 'Delivered',
    messageSnippet: '✅ STEP 2 OF 6 COMPLETED: 3-Ply Board corrugation and pasting complete for Green Valley Fresh Produce! Moving to rotary die-cutter.',
    directWhatsappUrl: 'https://wa.me/919821198765?text=STEP%202%20COMPLETED',
  },
  {
    id: 'log-seed-4',
    timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    orderId: 'CB-8941',
    stage: 'PRINTING_SLOTTING',
    recipientName: 'Kunal Desai',
    recipientRole: 'Sales Executive',
    phoneNumber: '+91 98334 11223',
    channel: 'WhatsApp',
    status: 'Delivered',
    messageSnippet: '✅ STEP 3 OF 6 COMPLETED: 2-color flexo printing and die-punch slotting finished for Zenith Pharma! Moving to hot melt gluing.',
    directWhatsappUrl: 'https://wa.me/919833411223?text=STEP%203%20COMPLETED',
  },
  {
    id: 'log-seed-5',
    timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    orderId: 'CB-8940',
    stage: 'DELIVERED',
    recipientName: 'Pooja Mehta',
    recipientRole: 'Sales Executive',
    phoneNumber: '+91 98211 98765',
    channel: 'WhatsApp',
    status: 'Delivered',
    messageSnippet: '🎉 FINAL STEP COMPLETED: Consignment delivered & signed at Cochin CFS Gate 2 for Aroma Spice Exporters! Order fulfilled.',
    directWhatsappUrl: 'https://wa.me/919821198765?text=FINAL%20STEP%20DELIVERED',
  }
];

export function getStoredNotificationLogs(): NotificationLog[] {
  if (typeof window === 'undefined') return INITIAL_LOGS;
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    if (!raw) {
      localStorage.setItem(LOGS_KEY, JSON.stringify(INITIAL_LOGS));
      return INITIAL_LOGS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_LOGS;
  }
}

export function addNotificationLog(log: NotificationLog): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredNotificationLogs();
    const updated = [log, ...current].slice(0, 150); // keep last 150 logs
    localStorage.setItem(LOGS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save log:', err);
  }
}

export function getStoredSettings(): FactorySettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);

    const owners = Array.isArray(parsed.owners) && parsed.owners.length > 0
      ? parsed.owners
      : DEFAULT_SETTINGS.owners;

    const productionHeads = Array.isArray(parsed.productionHeads) && parsed.productionHeads.length > 0
      ? parsed.productionHeads
      : DEFAULT_SETTINGS.productionHeads;

    const primaryOwner = owners.find((o: any) => o.isPrimary) || owners[0];
    const primaryProd = productionHeads.find((p: any) => p.isPrimary) || productionHeads[0];

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      owners,
      productionHeads,
      ownerName: primaryOwner ? `${primaryOwner.name} (${primaryOwner.designation})` : (parsed.ownerName || DEFAULT_SETTINGS.ownerName),
      ownerPhone: primaryOwner ? primaryOwner.phone : (parsed.ownerPhone || DEFAULT_SETTINGS.ownerPhone),
      productionSupervisorName: primaryProd ? `${primaryProd.name} (${primaryProd.designation})` : (parsed.productionSupervisorName || DEFAULT_SETTINGS.productionSupervisorName),
      productionSupervisorPhone: primaryProd ? primaryProd.phone : (parsed.productionSupervisorPhone || DEFAULT_SETTINGS.productionSupervisorPhone),
      salesTeam: Array.isArray(parsed.salesTeam) && parsed.salesTeam.length > 0 
        ? parsed.salesTeam 
        : DEFAULT_SETTINGS.salesTeam,
      productionShifts: Array.isArray(parsed.productionShifts) && parsed.productionShifts.length > 0
        ? parsed.productionShifts
        : DEFAULT_SETTINGS.productionShifts,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: FactorySettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

const STALLED_ALERTS_KEY = 'corrutrack_stalled_alerts_v1';

export function getStoredStalledAlerts(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STALLED_ALERTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveStoredStalledAlerts(alerts: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STALLED_ALERTS_KEY, JSON.stringify(alerts));
  } catch (err) {
    console.error('Failed to save stalled alerts to localStorage:', err);
  }
}
