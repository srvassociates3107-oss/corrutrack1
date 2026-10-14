import React, { useState } from 'react';
import { 
  CorrugatedOrder, 
  ProductType,
  BoxStyle, 
  PlyCount, 
  FluteType, 
  JointType, 
  LaminationType, 
  ColorCount, 
  FactorySettings 
} from '../types/order';
import { 
  buildWhatsappLink, 
  generateCustomerWhatsappMessage, 
  generateOwnerWhatsappMessage, 
  generateSalesPersonWhatsappMessage,
  generateProductionTeamWhatsappMessage,
  generateProductionHeadHindiWhatsappMessage,
  generateProductionHeadHinglishWhatsappMessage,
  formatCurrency 
} from '../utils/whatsapp';
import { 
  PRODUCT_CATALOG, 
  PRODUCT_LIST, 
  getProductCatalogItem, 
  formatProductSpecsSummary 
} from '../utils/productCatalog';
import { soundManager } from '../utils/audio';
import { sendDirectInAppWhatsApp } from '../utils/whatsappClient';
import { 
  X, 
  Package, 
  ShoppingBag,
  Layers, 
  Briefcase, 
  Disc, 
  Coffee,
  Calendar, 
  Phone, 
  MapPin, 
  Calculator, 
  Send, 
  AlertCircle, 
  Sparkles, 
  Scissors, 
  Tag, 
  CheckCircle2, 
  UserCheck,
  Languages,
  Info
} from 'lucide-react';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: FactorySettings;
  onSaveOrder: (newOrder: CorrugatedOrder) => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveOrder,
}) => {
  if (!isOpen) return null;

  // Fixed Sales Person selection (defaults to first sales person in factory directory)
  const defaultSalesPerson = settings.salesTeam?.[0] || {
    id: 'sp-1',
    name: 'Rajesh Sharma',
    phone: '+91 98200 45678',
    email: 'rajesh.sharma@srvmills.com',
    region: 'North & West Hub',
    active: true,
  };

  const [selectedSalesPersonId, setSelectedSalesPersonId] = useState<string>(defaultSalesPerson.id);

  // Customer Variable Data
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+91 ');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  // -------------------------------------------------------------
  // Product Selection & Classification
  // -------------------------------------------------------------
  const [productType, setProductType] = useState<ProductType>('paper_box');
  const [productSubCategory, setProductSubCategory] = useState<string>('5-Ply Master Shipping Carton');
  
  // Custom Product Requirements state (populated dynamically per product)
  const [productRequirements, setProductRequirements] = useState<Record<string, any>>({
    boxFlute: 'C-Flute (4.0mm Medium)',
    boxJoint: 'Wire Stitched (पिन सिलाई)',
    burstFactor: '22 BF (Virgin Kraft)',
    moistureProof: false,
  });

  // Production Head Language Preference (Defaults to Hindi for supervisors with English reading issues)
  const defaultProdHead = settings.productionHeads?.find(p => p.isPrimary) || settings.productionHeads?.[0];
  const [productionHeadLang, setProductionHeadLang] = useState<'hi' | 'hinglish' | 'en'>(
    defaultProdHead?.preferredLanguage || 'hi'
  );

  // Box Technical Specifications
  const [boxStyle, setBoxStyle] = useState<BoxStyle>('RSC (Regular Slotted Carton)');
  const [lengthMm, setLengthMm] = useState<number>(400);
  const [widthMm, setWidthMm] = useState<number>(300);
  const [heightMm, setHeightMm] = useState<number>(250);

  const [ply, setPly] = useState<PlyCount>('5-Ply');
  const [flute, setFlute] = useState<FluteType>('C-Flute (4.0mm)');
  
  // GSM specifications (top, bottom, sides/flute, middle)
  const [topLinerGsm, setTopLinerGsm] = useState<number>(200);
  const [flutingMediumGsm, setFlutingMediumGsm] = useState<number>(140);
  const [bottomLinerGsm, setBottomLinerGsm] = useState<number>(180);
  const [middleLinerGsm, setMiddleLinerGsm] = useState<number>(150);
  const [paperGrade, setPaperGrade] = useState<string>('Golden Virgin Kraft');
  const [burstingFactor, setBurstingFactor] = useState<number>(22);

  // Lamination & Finishing
  const [lamination, setLamination] = useState<LaminationType>('Matt Lamination');
  const [colorType, setColorType] = useState<ColorCount>('2-Color Flexo');
  const [printingDetails, setPrintingDetails] = useState('Process Black + Reflex Blue');
  const [jointType, setJointType] = useState<JointType>('Stitched');

  // Logo / Branding Details
  const [hasLogo, setHasLogo] = useState<boolean>(true);
  const [brandName, setBrandName] = useState<string>('');
  const [logoPlacement, setLogoPlacement] = useState<'Front & Back Panels' | 'All 4 Panels' | 'Top Flap & Side Panels' | 'Single Panel Center'>('Front & Back Panels');
  const [artworkStatus, setArtworkStatus] = useState<'Approved & Stereo Ready' | 'Stereo Under Preparation' | 'Proof Pending Client Approval' | 'Repeat Stereo Job'>('Approved & Stereo Ready');

  // Commercials
  const [quantity, setQuantity] = useState<number>(3000);
  const [ratePerBox, setRatePerBox] = useState<number>(34);
  const [priority, setPriority] = useState<'Normal' | 'High / Urgent' | 'Emergency Batch'>('Normal');
  const [assignedLine, setAssignedLine] = useState('Corrugator Line 1 (Heavy 5-Ply)');
  const [operatorInCharge, setOperatorInCharge] = useState('Mahesh Patil');

  // Expected Delivery Calculation
  const defaultDelivery = new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 16);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(defaultDelivery);

  // Multi-party Notification Routing Toggles
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [notifySalesPerson, setNotifySalesPerson] = useState(true);
  const [notifyProductionHead, setNotifyProductionHead] = useState(true);
  const [notifyOwner, setNotifyOwner] = useState(true);

  // Handle Product Switch
  const handleSelectProductType = (newType: ProductType) => {
    setProductType(newType);
    const cat = PRODUCT_CATALOG[newType];
    const firstSub = cat.subCategories[0]?.title || '';
    setProductSubCategory(firstSub);
    setRatePerBox(cat.defaultRate);
    setQuantity(cat.defaultQuantity);

    // Initialize product requirements
    const initialReqs: Record<string, any> = {};
    cat.additionalRequirements.forEach((req) => {
      initialReqs[req.key] = req.defaultValue;
    });
    setProductRequirements(initialReqs);

    // Contextual sizing & machine defaults
    if (newType === 'paper_bag') {
      setLengthMm(350); // Height
      setWidthMm(250);  // Width
      setHeightMm(110); // Gusset
      setLamination('None');
      setColorType('1-Color Flexo');
      setPrintingDetails('Brand Logo on Front Center');
      setAssignedLine('Automatic Paper Bag Tubing & Pasting Line');
    } else if (newType === 'duplex_box') {
      setLengthMm(220);
      setWidthMm(150);
      setHeightMm(70);
      setLamination('Gloss Lamination');
      setColorType('4-Color Process CMYK');
      setPrintingDetails('Offset 4-Color Process CMYK + Drip-off');
      setAssignedLine('Heidelberg 4-Color + Bobst Auto Die-Cutter');
    } else if (newType === 'non_woven_bag') {
      setLengthMm(350); // Width
      setWidthMm(400); // Height
      setHeightMm(100); // Gusset
      setLamination('None');
      setColorType('1-Color Flexo');
      setPrintingDetails('Single Color Screen Print (Front)');
      setAssignedLine('High-Speed Ultrasonic Non-Woven Bag Making Machine');
    } else if (newType === 'cake_base') {
      setLengthMm(250); // 10 inch diameter
      setWidthMm(250);
      setHeightMm(3);   // 3mm thickness
      setLamination('Gloss Lamination');
      setColorType('Plain / Unprinted');
      setPrintingDetails('Embossed Metallic Gold Pattern');
      setAssignedLine('Heavy Die-Punch & Foil Lamination Bed');
    } else if (newType === 'plastic_container') {
      setLengthMm(175);
      setWidthMm(120);
      setHeightMm(65);
      setLamination('None');
      setColorType('Plain / Unprinted');
      setPrintingDetails('Embossed Food Grade & Recycle Mark');
      setAssignedLine('High-Speed Thermoforming Mould Line 1');
    } else {
      setLengthMm(400);
      setWidthMm(300);
      setHeightMm(250);
      setLamination('Matt Lamination');
      setColorType('2-Color Flexo');
      setPrintingDetails('Process Black + Reflex Blue');
      setAssignedLine('Corrugator Line 1 (Heavy 5-Ply)');
    }
  };

  // Quick delivery hours helpers
  const setQuickDeliveryHours = (hours: number) => {
    const d = new Date(Date.now() + hours * 3600 * 1000);
    setExpectedDeliveryDate(d.toISOString().slice(0, 16));
  };

  const totalAmount = quantity * ratePerBox;
  const bundlesCount = Math.ceil(quantity / 25);

  // Unit conversions & calculated properties
  const lengthInches = (lengthMm / 25.4).toFixed(1);
  const widthInches = (widthMm / 25.4).toFixed(1);
  const heightInches = (heightMm / 25.4).toFixed(1);

  // Estimated Bursting Strength calculation (BS = Total GSM / 100 * BF / 10 approximately)
  const totalCombinedGsm = ply === '3-Ply' 
    ? topLinerGsm + flutingMediumGsm * 1.4 + bottomLinerGsm
    : ply === '5-Ply'
    ? topLinerGsm + flutingMediumGsm * 1.4 * 2 + middleLinerGsm + bottomLinerGsm
    : topLinerGsm + flutingMediumGsm * 1.4 * 3 + middleLinerGsm * 2 + bottomLinerGsm;
  const estimatedBsKgCm2 = ((totalCombinedGsm * (burstingFactor / 1000)) * 0.95).toFixed(1);

  const selectedSalesPerson = settings.salesTeam?.find(s => s.id === selectedSalesPersonId) || defaultSalesPerson;
  const currentProductItem = getProductCatalogItem(productType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerCompany.trim() || !customerPhone.trim()) {
      alert('Please enter company name and customer WhatsApp contact number');
      return;
    }

    const orderId = `CB-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();
    const deliveryIso = new Date(expectedDeliveryDate).toISOString();

    const partialOrder: Partial<CorrugatedOrder> = {
      id: orderId,
      customerName: customerName.trim() || customerCompany.trim(),
      customerCompany: customerCompany.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim() || undefined,
      deliveryAddress: deliveryAddress.trim() || 'Factory Pickup / Ex-Mill',
      productType,
      productSubCategory,
      productRequirements,
      dimensions: {
        lengthMm: Number(lengthMm),
        widthMm: Number(widthMm),
        heightMm: Number(heightMm),
      },
      ply,
      flute,
      paperSpecs: {
        topLinerGsm: Number(topLinerGsm),
        flutingMediumGsm: Number(flutingMediumGsm),
        bottomLinerGsm: Number(bottomLinerGsm),
        middleLinerGsm: ply !== '3-Ply' ? Number(middleLinerGsm) : undefined,
        paperGrade,
        burstingFactor: Number(burstingFactor),
        burstingStrengthKgCm2: Number(estimatedBsKgCm2),
      },
      lamination,
      colorType,
      jointType,
      quantity: Number(quantity),
      ratePerBox: Number(ratePerBox),
      totalAmount,
      priority,
    };

    const formattedSpecs = formatProductSpecsSummary(partialOrder as CorrugatedOrder);

    const newOrder: CorrugatedOrder = {
      id: orderId,
      customerName: customerName.trim() || customerCompany.trim(),
      customerCompany: customerCompany.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim() || undefined,
      deliveryAddress: deliveryAddress.trim() || 'Factory Pickup / Ex-Mill',
      
      // Multi-Product Type & Subcategory classification
      productType,
      productSubCategory,
      productSpecsSummary: formattedSpecs,
      productRequirements,

      // Fixed Sales Person
      salesPersonId: selectedSalesPerson.id,
      salesPersonName: selectedSalesPerson.name,
      salesPersonPhone: selectedSalesPerson.phone,

      // Box Specs
      boxStyle,
      dimensions: {
        lengthMm: Number(lengthMm),
        widthMm: Number(widthMm),
        heightMm: Number(heightMm),
      },
      ply,
      flute,
      paperSpecs: {
        topLinerGsm: Number(topLinerGsm),
        flutingMediumGsm: Number(flutingMediumGsm),
        bottomLinerGsm: Number(bottomLinerGsm),
        middleLinerGsm: ply !== '3-Ply' ? Number(middleLinerGsm) : undefined,
        paperGrade,
        burstingFactor: Number(burstingFactor),
        burstingStrengthKgCm2: Number(estimatedBsKgCm2),
      },
      lamination,
      colorType,
      printingDetails,
      logoDetails: {
        hasLogo,
        brandName: brandName.trim() || customerCompany.trim(),
        logoPlacement,
        artworkStatus,
      },
      jointType,
      
      // Commercials
      quantity: Number(quantity),
      bundlesCount,
      ratePerBox: Number(ratePerBox),
      totalAmount,

      orderDate: nowIso,
      expectedDeliveryDate: deliveryIso,
      currentStage: 'ORDER_PLACED',
      stageHistory: [
        {
          stage: 'ORDER_PLACED',
          timestamp: nowIso,
          updatedBy: operatorInCharge || 'Production Scheduling Desk',
          notes: `Work order booked by ${selectedSalesPerson.name}. Product: ${currentProductItem.title} (${productSubCategory}). Specs: ${formattedSpecs}`,
          notificationsSent: {
            customerWhatsapp: notifyCustomer,
            salesPersonWhatsapp: notifySalesPerson,
            ownerWhatsapp: notifyOwner,
            teamWhatsapp: notifyProductionHead,
            smsWebhook: !!settings.webhookUrl,
          },
        },
      ],
      priority,
      assignedLine,
      operatorInCharge,
    };

    onSaveOrder(newOrder);

    // Play feedback sound
    if (settings.enableSoundAlerts) {
      soundManager.playNewOrderSound();
    }

    // Send WhatsApp notifications directly inside the application (no external tab opened!)
    if (notifyCustomer) {
      const msg = generateCustomerWhatsappMessage(newOrder, settings);
      sendDirectInAppWhatsApp({
        order: newOrder,
        settings,
        recipientRole: 'Customer',
        recipientName: `${newOrder.customerName} (${newOrder.customerCompany})`,
        recipientPhone: newOrder.customerPhone,
        message: msg,
      });
    }

    if (notifyProductionHead) {
      const headMsg = productionHeadLang === 'hi'
        ? generateProductionHeadHindiWhatsappMessage(newOrder, settings, defaultProdHead)
        : productionHeadLang === 'hinglish'
        ? generateProductionHeadHinglishWhatsappMessage(newOrder, settings, defaultProdHead)
        : generateProductionTeamWhatsappMessage(newOrder, settings, defaultProdHead, 'en');
      const headPhone = defaultProdHead?.phone || settings.productionSupervisorPhone;
      sendDirectInAppWhatsApp({
        order: newOrder,
        settings,
        recipientRole: 'Production Head',
        recipientName: defaultProdHead?.name || settings.productionSupervisorName,
        recipientPhone: headPhone,
        message: headMsg,
      });
    }

    if (notifySalesPerson) {
      const salesMsg = generateSalesPersonWhatsappMessage(newOrder, settings);
      sendDirectInAppWhatsApp({
        order: newOrder,
        settings,
        recipientRole: 'Sales Executive',
        recipientName: selectedSalesPerson.name,
        recipientPhone: selectedSalesPerson.phone,
        message: salesMsg,
      });
    }

    onClose();
  };

  const getProductIcon = (type: ProductType) => {
    switch (type) {
      case 'paper_bag':
        return <ShoppingBag className="w-5 h-5" />;
      case 'duplex_box':
        return <Layers className="w-5 h-5" />;
      case 'non_woven_bag':
        return <Briefcase className="w-5 h-5" />;
      case 'cake_base':
        return <Disc className="w-5 h-5" />;
      case 'plastic_container':
        return <Coffee className="w-5 h-5" />;
      case 'paper_box':
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              {getProductIcon(productType)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  New Manufacturing Work Order
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {currentProductItem.titleHindi}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Book manufacturing order with tailored technical specifications and instant Hindi WhatsApp job card for production head
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {/* PRODUCT TYPE SELECTOR - 6 Products */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Select Product Line / उत्पाद चुनें
                </h3>
              </div>
              <span className="text-[11px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                6 Multi-Product Manufacturing Lines Supported
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {PRODUCT_LIST.map((prod) => {
                const isSelected = productType === prod.id;
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleSelectProductType(prod.id)}
                    className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-500/50'
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:bg-neutral-850 hover:border-neutral-700 hover:text-neutral-200'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 ${
                      isSelected ? 'bg-amber-400 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-300'
                    }`}>
                      {getProductIcon(prod.id)}
                    </div>
                    <span className="text-xs font-bold leading-tight">{prod.title.split('(')[0].trim()}</span>
                    <span className="text-[10px] text-amber-400/90 font-medium mt-0.5">{prod.titleHindi.split('/')[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 1: Fixed Team Routing & Variable Customer Details */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  01. Sales Executive & Client Details
                </h3>
              </div>
              <span className="text-[11px] text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/40">
                Sales Rep Receives Instant WhatsApp Milestone Alerts
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Fixed Sales Person Dropdown */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-purple-300 mb-1">
                  Sales Person (Booked By) *
                </label>
                <select
                  value={selectedSalesPersonId}
                  onChange={(e) => setSelectedSalesPersonId(e.target.value)}
                  className="w-full bg-neutral-900 border border-purple-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
                >
                  {settings.salesTeam?.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name} ({sp.region || 'Sales'})
                    </option>
                  ))}
                </select>
                <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-400">
                  <span>WhatsApp:</span>
                  <span className="font-mono text-purple-300">{selectedSalesPerson.phone}</span>
                </div>
              </div>

              {/* Customer Company */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Customer / Client Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Automotive Spares Pvt Ltd"
                  value={customerCompany}
                  onChange={(e) => {
                    setCustomerCompany(e.target.value);
                    if (!brandName) setBrandName(e.target.value);
                  }}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              {/* Contact Person Name */}
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Client Contact Person
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aarav Mehta (Procurement)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Customer WhatsApp Phone */}
              <div>
                <label className="block text-xs font-semibold text-emerald-400 mb-1">
                  Customer WhatsApp Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-2.5 text-emerald-400" />
                  <input
                    type="text"
                    required
                    placeholder="+91 98200 11223"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-neutral-900 border border-emerald-900/60 rounded-lg pl-9 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <span className="text-[10px] text-neutral-500">Live order tracking links sent here</span>
              </div>

              {/* Customer Email */}
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Client Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="procurement@apexauto.in"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Delivery Address */}
              <div className="sm:col-span-3">
                <label className="block text-xs text-neutral-400 mb-1">
                  Destination Delivery Address & Plant Gate
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Gate 4, Heavy Industrial Estate, Chakan, Pune 410501"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Subcategory Selection & Additional Product Requirements */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  02. {currentProductItem.title} - Subcategory & Sizing
                </h3>
              </div>
              <div className="text-xs font-mono text-amber-400 bg-amber-950/40 px-2.5 py-0.5 rounded border border-amber-800/40">
                {productType === 'cake_base' ? `${lengthMm} mm (${(lengthMm/25.4).toFixed(0)}")` : `${lengthInches}" x ${widthInches}" x ${heightInches}"`}
              </div>
            </div>

            {/* Subcategory Picker */}
            <div>
              <label className="block text-xs font-semibold text-amber-300 mb-1.5 flex items-center justify-between">
                <span>Select Subcategory / सब-कैटेगरी चुनें *</span>
                <span className="text-[11px] text-neutral-400">
                  {currentProductItem.subCategories.find(s => s.title === productSubCategory)?.descriptionHindi}
                </span>
              </label>
              <select
                value={productSubCategory}
                onChange={(e) => setProductSubCategory(e.target.value)}
                className="w-full bg-neutral-900 border border-amber-500/40 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-medium"
              >
                {currentProductItem.subCategories.map((sub) => (
                  <option key={sub.id} value={sub.title}>
                    {sub.title} — {sub.titleHindi}
                  </option>
                ))}
              </select>
            </div>

            {/* Sizing inputs customized per product */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  {productType === 'paper_bag' ? 'Bag Height (mm) *' : productType === 'cake_base' ? 'Diameter / Side (mm) *' : 'Length (L) in mm *'}
                </label>
                <input
                  type="number"
                  min="20"
                  max="3000"
                  value={lengthMm}
                  onChange={(e) => setLengthMm(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-neutral-500">
                  {productType === 'paper_bag' ? 'खड़ा माप (Height)' : productType === 'cake_base' ? `${(lengthMm/25.4).toFixed(1)} inches` : `${lengthInches} inches`}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  {productType === 'paper_bag' ? 'Bag Width (mm) *' : productType === 'cake_base' ? 'Base Width (mm)' : 'Width (W) in mm *'}
                </label>
                <input
                  type="number"
                  min="20"
                  max="3000"
                  value={widthMm}
                  onChange={(e) => setWidthMm(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-neutral-500">
                  {productType === 'paper_bag' ? 'चौड़ाई (Face Width)' : `${widthInches} inches`}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  {productType === 'paper_bag' ? 'Bottom Gusset (mm) *' : productType === 'cake_base' ? 'Thickness (mm) *' : productType === 'plastic_container' ? 'Depth / Height (mm) *' : 'Height / Depth (H) in mm *'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="2000"
                  value={heightMm}
                  onChange={(e) => setHeightMm(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-neutral-500">
                  {productType === 'paper_bag' ? 'तली / साइड फैलाव (Gusset)' : productType === 'cake_base' ? `${heightMm} mm thickness` : `${heightInches} inches`}
                </span>
              </div>
            </div>

            {/* DYNAMIC ADDITIONAL PRODUCT REQUIREMENTS & PARAMETERS */}
            <div className="pt-2 border-t border-neutral-850 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Specialized {currentProductItem.title.split('(')[0].trim()} Technical Requirements (विशिष्ट आवश्यकताएं)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentProductItem.additionalRequirements.map((req) => {
                  const currentValue = productRequirements[req.key] ?? req.defaultValue;
                  return (
                    <div key={req.key} className="bg-neutral-900/60 p-3 rounded-lg border border-neutral-800">
                      <label className="block text-xs font-semibold text-neutral-200 mb-1 flex items-center justify-between">
                        <span>{req.label}</span>
                      </label>
                      <span className="text-[10px] text-amber-400/90 block mb-1.5 font-medium">
                        {req.labelHindi}
                      </span>

                      {req.type === 'select' && req.options ? (
                        <select
                          value={currentValue}
                          onChange={(e) => setProductRequirements({ ...productRequirements, [req.key]: e.target.value })}
                          className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                        >
                          {req.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : req.type === 'boolean' ? (
                        <label className="flex items-center gap-2 mt-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!currentValue}
                            onChange={(e) => setProductRequirements({ ...productRequirements, [req.key]: e.target.checked })}
                            className="rounded text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-xs text-neutral-300 font-medium">
                            {currentValue ? 'Enabled (लागू है)' : 'No / None (नहीं)'}
                          </span>
                        </label>
                      ) : (
                        <input
                          type={req.type}
                          value={currentValue}
                          onChange={(e) => setProductRequirements({ ...productRequirements, [req.key]: e.target.value })}
                          className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      )}

                      {req.hint && (
                        <span className="text-[10px] text-neutral-500 mt-1 block">
                          {req.hint} ({req.hintHindi})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 3: Corrugated Paper Specs (Shown for Paper Box) or Material Specs */}
          {productType === 'paper_box' ? (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    03. Paper GSM Specs (Top, Bottom, Fluting) & Bursting Factor
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-neutral-400">Total Basis Weight:</span>
                  <span className="font-mono text-cyan-400 font-semibold">{Math.round(totalCombinedGsm)} GSM</span>
                  <span className="text-neutral-500">|</span>
                  <span className="text-neutral-400">Est. BS:</span>
                  <span className="font-mono text-emerald-400 font-semibold">{estimatedBsKgCm2} kg/cm²</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-cyan-300 mb-1">
                    Top Liner GSM *
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="450"
                    value={topLinerGsm}
                    onChange={(e) => setTopLinerGsm(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-cyan-900/60 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-[10px] text-neutral-500">Outer face</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-300 mb-1">
                    Fluting Medium GSM *
                  </label>
                  <input
                    type="number"
                    min="90"
                    max="300"
                    value={flutingMediumGsm}
                    onChange={(e) => setFlutingMediumGsm(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-amber-900/60 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] text-neutral-500">Corrugated wave</span>
                </div>

                {ply !== '3-Ply' && (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Middle Liner GSM
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="350"
                      value={middleLinerGsm}
                      onChange={(e) => setMiddleLinerGsm(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-400"
                    />
                    <span className="text-[10px] text-neutral-500">Partition liner</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-cyan-300 mb-1">
                    Bottom Liner GSM *
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="450"
                    value={bottomLinerGsm}
                    onChange={(e) => setBottomLinerGsm(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-cyan-900/60 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-[10px] text-neutral-500">Inner box liner</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Paper Grade / Quality
                  </label>
                  <select
                    value={paperGrade}
                    onChange={(e) => setPaperGrade(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Golden Virgin Kraft">Golden Virgin Kraft</option>
                    <option value="White Top Bleached Kraft">White Top Bleached Kraft</option>
                    <option value="Semi-Chemical High Ring Crush">Semi-Chemical High Ring Crush</option>
                    <option value="Duplex White Back">Duplex White Back</option>
                    <option value="Natural Recycled Kraft">Natural Recycled Kraft</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-400 mb-1">
                    Bursting Factor (BF)
                  </label>
                  <select
                    value={burstingFactor}
                    onChange={(e) => setBurstingFactor(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  >
                    <option value={16}>16 BF (Standard Domestic)</option>
                    <option value={18}>18 BF (General Cargo)</option>
                    <option value={20}>20 BF (Commercial Master)</option>
                    <option value={22}>22 BF (Automotive / Spares)</option>
                    <option value={24}>24 BF (Export Quality)</option>
                    <option value={28}>28 BF (Heavy Machine Parts)</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    03. Material & Converting Summary
                  </h3>
                </div>
                <span className="text-xs font-mono text-emerald-400">
                  {currentProductItem.title}
                </span>
              </div>
              <div className="p-3 bg-neutral-900/70 rounded-lg border border-neutral-800 text-xs text-neutral-300 flex items-center justify-between">
                <span>
                  <strong>Formatted Specification:</strong>{' '}
                  {formatProductSpecsSummary({
                    productType,
                    productSubCategory,
                    productRequirements,
                    dimensions: { lengthMm, widthMm, heightMm },
                    paperSpecs: { topLinerGsm, flutingMediumGsm, bottomLinerGsm, burstingFactor },
                  } as any)}
                </span>
              </div>
            </div>
          )}

          {/* SECTION 4: Finishing, Lamination, Colour & Logo Artwork */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-pink-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  04. Finishing, Printing & Brand Logo
                </h3>
              </div>
              <span className="text-[11px] text-pink-400 bg-pink-950/40 px-2 py-0.5 rounded border border-pink-800/40 font-medium">
                Surface Finishing
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-pink-300 mb-1">
                  Lamination / Surface Finish
                </label>
                <select
                  value={lamination}
                  onChange={(e) => setLamination(e.target.value as LaminationType)}
                  className="w-full bg-neutral-900 border border-pink-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 font-medium"
                >
                  <option value="None">None (Unlaminated Plain)</option>
                  <option value="Matt Lamination">Matt Thermal Lamination</option>
                  <option value="Gloss Lamination">Gloss Thermal Lamination</option>
                  <option value="UV Varnish">Full UV Varnish Coating</option>
                  <option value="Aqueous Coating">Aqueous Food-Grade Coating</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Printing Technology / Colour Count
                </label>
                <select
                  value={colorType}
                  onChange={(e) => setColorType(e.target.value as ColorCount)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                >
                  <option value="Plain / Unprinted">Plain / Unprinted</option>
                  <option value="1-Color Flexo">1-Color Flexo / Screen Print</option>
                  <option value="2-Color Flexo">2-Color Flexo</option>
                  <option value="3-Color Flexo">3-Color Flexo</option>
                  <option value="4-Color Process CMYK">4-Color Process CMYK</option>
                  <option value="Offset Litho-Lam">High-End Offset Litho-Lam</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Printing Details / Ink Shades
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pantone Red 032C + Process Black"
                  value={printingDetails}
                  onChange={(e) => setPrintingDetails(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Logo / Branding Artwork */}
              <div className="sm:col-span-3 pt-2 border-t border-neutral-900 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasLogoCheck"
                    checked={hasLogo}
                    onChange={(e) => setHasLogo(e.target.checked)}
                    className="w-4 h-4 rounded text-pink-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="hasLogoCheck" className="text-xs font-semibold text-neutral-200 cursor-pointer">
                    Print Brand Logo / Artwork
                  </label>
                </div>

                {hasLogo && (
                  <>
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-0.5">Logo Brand Name</label>
                      <input
                        type="text"
                        placeholder="e.g. APEX GENUINE"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-0.5">Logo Placement</label>
                      <select
                        value={logoPlacement}
                        onChange={(e) => setLogoPlacement(e.target.value as any)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="Front & Back Panels">Front & Back Panels</option>
                        <option value="All 4 Panels">All 4 Outer Panels</option>
                        <option value="Top Flap & Side Panels">Top Flap & Side Panels</option>
                        <option value="Single Panel Center">Single Panel Center</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-0.5">Artwork / Stereo Status</label>
                      <select
                        value={artworkStatus}
                        onChange={(e) => setArtworkStatus(e.target.value as any)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="Approved & Stereo Ready">Approved & Stereo Ready</option>
                        <option value="Stereo Under Preparation">Stereo Under Preparation</option>
                        <option value="Proof Pending Client Approval">Proof Pending Approval</option>
                        <option value="Repeat Stereo Job">Repeat Stereo Job</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 5: Commercials, Machine Line & Delivery Schedule */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  05. Production Batch & Commercials
                </h3>
              </div>
              <div className="text-xs font-bold text-emerald-400">
                Total Value: {formatCurrency(totalAmount)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Quantity ({currentProductItem.defaultUnitName}s) *
                </label>
                <input
                  type="number"
                  required
                  min="50"
                  step="50"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-neutral-500">~{bundlesCount} bundles / packing units</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Rate / {currentProductItem.defaultUnitName} (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0.5"
                  step="0.5"
                  value={ratePerBox}
                  onChange={(e) => setRatePerBox(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className={`w-full bg-neutral-900 border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                    priority === 'Emergency Batch'
                      ? 'border-rose-500 text-rose-400 font-bold'
                      : priority === 'High / Urgent'
                      ? 'border-amber-500 text-amber-400 font-semibold'
                      : 'border-neutral-700 text-white'
                  }`}
                >
                  <option value="Normal">Normal Production</option>
                  <option value="High / Urgent">High / Urgent (Rush)</option>
                  <option value="Emergency Batch">Emergency Batch (Plant Priority)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Assigned Machine Line
                </label>
                <input
                  type="text"
                  value={assignedLine}
                  onChange={(e) => setAssignedLine(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-amber-300 mb-1 flex items-center justify-between">
                  <span>Committed Dispatch Date & Time *</span>
                  <div className="flex gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setQuickDeliveryHours(24)}
                      className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                    >
                      +24h
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDeliveryHours(48)}
                      className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                    >
                      +48h
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDeliveryHours(72)}
                      className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                    >
                      +3 days
                    </button>
                  </div>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs text-neutral-400 mb-1 flex items-center justify-between">
                  <span>Operator / Shift In-Charge (Morning, Evening, Night Shifts)</span>
                  <span className="text-[10px] text-cyan-400">Configured in Settings → Daily Shifts</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const [opLabel, lineLabel] = val.split('||');
                      setOperatorInCharge(opLabel);
                      if (lineLabel) setAssignedLine(lineLabel);
                    }}
                    className="w-full bg-neutral-900 border border-cyan-500/40 rounded-lg px-2.5 py-2 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">⚡ Select Operator by Shift...</option>
                    {(settings.productionShifts || []).map((sh) => (
                      <optgroup
                        key={sh.id}
                        label={`${sh.type} Shift (${sh.startTime}–${sh.endTime})`}
                        className="bg-neutral-950 text-amber-300"
                      >
                        {(sh.operators || []).map((op) => (
                          <option
                            key={op.id}
                            value={`${op.name} (${sh.type} Shift)||${op.machineLine}`}
                            className="bg-neutral-900 text-white"
                          >
                            👷 {op.name} — {op.role} ({sh.type})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="e.g. Ramesh Sharma (Morning Shift)"
                    value={operatorInCharge}
                    onChange={(e) => setOperatorInCharge(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 6: Multi-Party Automated WhatsApp Notifications & Production Head Hindi Support */}
          <div className="bg-neutral-950 border border-emerald-900/40 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  06. WhatsApp Notifications & Production Head Language
                </h3>
              </div>
              <span className="text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 font-semibold">
                Multi-Party Auto Dispatch
              </span>
            </div>

            {/* SPECIAL HINDI READING ASSISTANCE FOR PRODUCTION HEAD */}
            <div className="p-3.5 bg-gradient-to-r from-amber-950/30 to-neutral-900 rounded-xl border border-amber-500/30 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">
                    Production Head Reading Assistance (उत्पादन प्रमुख के लिए भाषा)
                  </span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  🇮🇳 Hindi (हिन्दी) Enabled
                </span>
              </div>

              <p className="text-[11px] text-neutral-300 leading-relaxed">
                If your production head has difficulty reading English, select <strong>हिन्दी (Hindi)</strong> below. The complete job card, dimensions, paper GSM, quantity, and deadlines will be formatted in clean, easy-to-read Hindi on WhatsApp!
              </p>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setProductionHeadLang('hi')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    productionHeadLang === 'hi'
                      ? 'bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/20'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-750'
                  }`}
                >
                  <span>🇮🇳 हिन्दी (Hindi - Devanagari)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProductionHeadLang('hinglish')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    productionHeadLang === 'hinglish'
                      ? 'bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/20'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-750'
                  }`}
                >
                  <span>💬 Hinglish (Roman Script)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProductionHeadLang('en')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    productionHeadLang === 'en'
                      ? 'bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/20'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-750'
                  }`}
                >
                  <span>🇬🇧 English</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <label className="flex items-center gap-2 bg-neutral-900 p-2.5 rounded-lg border border-neutral-800 cursor-pointer hover:border-emerald-500/40">
                <input
                  type="checkbox"
                  checked={notifyCustomer}
                  onChange={(e) => setNotifyCustomer(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-semibold text-white">1. Customer</div>
                  <div className="text-[10px] text-neutral-400">Order & Tracking Link</div>
                </div>
              </label>

              <label className="flex items-center gap-2 bg-neutral-900 p-2.5 rounded-lg border border-neutral-800 cursor-pointer hover:border-purple-500/40">
                <input
                  type="checkbox"
                  checked={notifySalesPerson}
                  onChange={(e) => setNotifySalesPerson(e.target.checked)}
                  className="rounded text-purple-500 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-semibold text-white">2. Sales Rep</div>
                  <div className="text-[10px] text-neutral-400">{selectedSalesPerson.name}</div>
                </div>
              </label>

              <label className="flex items-center gap-2 bg-neutral-900 p-2.5 rounded-lg border border-neutral-800 cursor-pointer hover:border-amber-500/40">
                <input
                  type="checkbox"
                  checked={notifyProductionHead}
                  onChange={(e) => setNotifyProductionHead(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-semibold text-white">
                    3. Plant Head ({productionHeadLang === 'hi' ? 'हिन्दी' : productionHeadLang.toUpperCase()})
                  </div>
                  <div className="text-[10px] text-amber-400/90 font-mono">Job Card Specs</div>
                </div>
              </label>

              <label className="flex items-center gap-2 bg-neutral-900 p-2.5 rounded-lg border border-neutral-800 cursor-pointer hover:border-blue-500/40">
                <input
                  type="checkbox"
                  checked={notifyOwner}
                  onChange={(e) => setNotifyOwner(e.target.checked)}
                  className="rounded text-blue-500 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-semibold text-white">4. Owner / MD</div>
                  <div className="text-[10px] text-neutral-400">Commercial Summary</div>
                </div>
              </label>
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Book Order & Generate Job Card</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
