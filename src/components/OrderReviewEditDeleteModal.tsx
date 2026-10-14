import React, { useState, useEffect } from 'react';
import {
  CorrugatedOrder,
  FactorySettings,
  BoxStyle,
  PlyCount,
  FluteType,
  JointType,
  LaminationType,
  ColorCount,
  OrderStage,
} from '../types/order';
import {
  ORDER_STAGES,
  STAGE_CONFIG,
  calculateSLA,
  calculateStageDwellTime,
  formatCurrency,
  formatDateTime,
} from '../utils/whatsapp';
import { getProductCatalogItem } from '../utils/productCatalog';
import { soundManager } from '../utils/audio';
import {
  X,
  FileSearch,
  Edit3,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  MapPin,
  Package,
  Printer,
  QrCode,
  Send,
  Truck,
  UserCheck,
  Briefcase,
  Layers,
  Camera,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

interface OrderReviewEditDeleteModalProps {
  isOpen: boolean;
  order: CorrugatedOrder | null;
  settings: FactorySettings;
  initialMode?: 'review' | 'edit' | 'delete';
  onClose: () => void;
  onUpdateOrder: (updatedOrder: CorrugatedOrder) => void;
  onDeleteOrder: (orderId: string) => void;
  onOpenStageUpdate?: (order: CorrugatedOrder) => void;
  onOpenWhatsAppPlugin?: (order: CorrugatedOrder) => void;
  onOpenJobCard?: (order: CorrugatedOrder) => void;
  onOpenQR?: (order: CorrugatedOrder) => void;
}

export const OrderReviewEditDeleteModal: React.FC<OrderReviewEditDeleteModalProps> = ({
  isOpen,
  order,
  settings,
  initialMode = 'review',
  onClose,
  onUpdateOrder,
  onDeleteOrder,
  onOpenStageUpdate,
  onOpenWhatsAppPlugin,
  onOpenJobCard,
  onOpenQR,
}) => {
  const [activeMode, setActiveMode] = useState<'review' | 'edit' | 'delete'>(initialMode);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  // Editable form state
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [salesPersonId, setSalesPersonId] = useState('');
  const [priority, setPriority] = useState<'Normal' | 'High / Urgent' | 'Emergency Batch'>('Normal');
  const [currentStage, setCurrentStage] = useState<OrderStage>('ORDER_PLACED');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');

  // Technical & Box Specs
  const [productSubCategory, setProductSubCategory] = useState('');
  const [boxStyle, setBoxStyle] = useState<BoxStyle>('RSC (Regular Slotted Carton)');
  const [lengthMm, setLengthMm] = useState<number>(400);
  const [widthMm, setWidthMm] = useState<number>(300);
  const [heightMm, setHeightMm] = useState<number>(250);
  const [ply, setPly] = useState<PlyCount>('5-Ply');
  const [flute, setFlute] = useState<FluteType>('C-Flute (4.0mm)');
  const [topLinerGsm, setTopLinerGsm] = useState<number>(200);
  const [flutingMediumGsm, setFlutingMediumGsm] = useState<number>(140);
  const [bottomLinerGsm, setBottomLinerGsm] = useState<number>(180);
  const [middleLinerGsm, setMiddleLinerGsm] = useState<number>(150);
  const [paperGrade, setPaperGrade] = useState<string>('Golden Virgin Kraft');
  const [burstingFactor, setBurstingFactor] = useState<number>(22);
  const [lamination, setLamination] = useState<LaminationType>('None');
  const [colorType, setColorType] = useState<ColorCount>('2-Color Flexo');
  const [printingDetails, setPrintingDetails] = useState('');
  const [jointType, setJointType] = useState<JointType>('Stitched');

  // Commercials & Machine Line
  const [quantity, setQuantity] = useState<number>(1000);
  const [ratePerBox, setRatePerBox] = useState<number>(30);
  const [assignedLine, setAssignedLine] = useState('');
  const [operatorInCharge, setOperatorInCharge] = useState('');

  // Logistics
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [transporterName, setTransporterName] = useState('');

  useEffect(() => {
    setActiveMode(initialMode);
    setDeleteConfirmInput('');
    setSavedBanner(null);
  }, [initialMode, order?.id, isOpen]);

  useEffect(() => {
    if (!order) return;
    setCustomerCompany(order.customerCompany || '');
    setCustomerName(order.customerName || '');
    setCustomerPhone(order.customerPhone || '');
    setCustomerEmail(order.customerEmail || '');
    setDeliveryAddress(order.deliveryAddress || '');
    setSalesPersonId(order.salesPersonId || settings.salesTeam?.[0]?.id || '');
    setPriority(order.priority || 'Normal');
    setCurrentStage(order.currentStage || 'ORDER_PLACED');
    setExpectedDeliveryDate(
      order.expectedDeliveryDate
        ? new Date(order.expectedDeliveryDate).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16)
    );

    setProductSubCategory(order.productSubCategory || '');
    setBoxStyle(order.boxStyle || 'RSC (Regular Slotted Carton)');
    setLengthMm(order.dimensions?.lengthMm || 400);
    setWidthMm(order.dimensions?.widthMm || 300);
    setHeightMm(order.dimensions?.heightMm || 250);
    setPly(order.ply || '5-Ply');
    setFlute(order.flute || 'C-Flute (4.0mm)');
    setTopLinerGsm(order.paperSpecs?.topLinerGsm || 200);
    setFlutingMediumGsm(order.paperSpecs?.flutingMediumGsm || 140);
    setBottomLinerGsm(order.paperSpecs?.bottomLinerGsm || 180);
    setMiddleLinerGsm(order.paperSpecs?.middleLinerGsm || 150);
    setPaperGrade(order.paperSpecs?.paperGrade || 'Golden Virgin Kraft');
    setBurstingFactor(order.paperSpecs?.burstingFactor || 22);
    setLamination(order.lamination || 'None');
    setColorType(order.colorType || '2-Color Flexo');
    setPrintingDetails(order.printingDetails || '');
    setJointType(order.jointType || 'Stitched');

    setQuantity(order.quantity || 1000);
    setRatePerBox(order.ratePerBox || 30);
    setAssignedLine(order.assignedLine || '');
    setOperatorInCharge(order.operatorInCharge || '');

    setDriverName(order.logistics?.driverName || '');
    setDriverPhone(order.logistics?.driverPhone || '');
    setVehicleNumber(order.logistics?.vehicleNumber || '');
    setTransporterName(order.logistics?.transporterName || '');
  }, [order, settings.salesTeam]);

  if (!isOpen || !order) return null;

  const sla = calculateSLA(order);
  const dwell = calculateStageDwellTime(order);
  const currentStageConf = STAGE_CONFIG[order.currentStage];
  const productCat = getProductCatalogItem(order.productType || 'paper_box');
  const latestStagePhoto = order.stageHistory?.[order.stageHistory.length - 1]?.photoUrl;

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedSales = settings.salesTeam?.find((s) => s.id === salesPersonId);
    const computedTotal = Math.round(Number(quantity) * Number(ratePerBox));
    const computedBundles = Math.max(1, Math.ceil(Number(quantity) / 25));

    // If stage was changed during edit, append to stageHistory
    const updatedStageHistory = [...(order.stageHistory || [])];
    if (currentStage !== order.currentStage) {
      updatedStageHistory.push({
        stage: currentStage,
        timestamp: new Date().toISOString(),
        notes: `Stage updated via Order Edit (${STAGE_CONFIG[currentStage]?.title})`,
        updatedBy: operatorInCharge || 'Plant Admin',
        photoUrl: latestStagePhoto,
        notificationsSent: {
          customerWhatsapp: false,
          ownerWhatsapp: false,
          teamWhatsapp: false,
          smsWebhook: false,
        },
      });
    }

    const updatedOrder: CorrugatedOrder = {
      ...order,
      customerCompany: customerCompany.trim() || order.customerCompany,
      customerName: customerName.trim() || order.customerName,
      customerPhone: customerPhone.trim() || order.customerPhone,
      customerEmail: customerEmail.trim() || undefined,
      deliveryAddress: deliveryAddress.trim() || order.deliveryAddress,
      salesPersonId: matchedSales?.id || order.salesPersonId,
      salesPersonName: matchedSales?.name || order.salesPersonName,
      salesPersonPhone: matchedSales?.phone || order.salesPersonPhone,
      priority,
      currentStage,
      stageHistory: updatedStageHistory,
      expectedDeliveryDate: expectedDeliveryDate
        ? new Date(expectedDeliveryDate).toISOString()
        : order.expectedDeliveryDate,
      productSubCategory: productSubCategory.trim() || order.productSubCategory,
      boxStyle,
      dimensions: {
        lengthMm: Number(lengthMm) || 400,
        widthMm: Number(widthMm) || 300,
        heightMm: Number(heightMm) || 250,
      },
      ply,
      flute,
      paperSpecs: {
        topLinerGsm: Number(topLinerGsm) || 180,
        flutingMediumGsm: Number(flutingMediumGsm) || 120,
        bottomLinerGsm: Number(bottomLinerGsm) || 150,
        middleLinerGsm: Number(middleLinerGsm) || 140,
        paperGrade,
        burstingFactor: Number(burstingFactor) || 20,
      },
      lamination,
      colorType,
      printingDetails: printingDetails.trim(),
      jointType,
      quantity: Number(quantity) || 100,
      bundlesCount: computedBundles,
      ratePerBox: Number(ratePerBox) || 10,
      totalAmount: computedTotal,
      assignedLine: assignedLine.trim(),
      operatorInCharge: operatorInCharge.trim(),
      logistics: {
        driverName: driverName.trim() || order.logistics?.driverName || '',
        driverPhone: driverPhone.trim() || order.logistics?.driverPhone || '',
        vehicleNumber: vehicleNumber.trim() || order.logistics?.vehicleNumber || '',
        dispatchChallanNo: order.logistics?.dispatchChallanNo || '',
        transporterName: transporterName.trim() || order.logistics?.transporterName,
        dispatchedAt: order.logistics?.dispatchedAt,
        deliveredAt: order.logistics?.deliveredAt,
        receiverName: order.logistics?.receiverName,
        receiverSignatureNote: order.logistics?.receiverSignatureNote,
      },
    };

    onUpdateOrder(updatedOrder);
    if (settings.enableSoundAlerts) {
      soundManager.playStageUpdateSound();
    }
    setSavedBanner(`✓ Order #${order.id} updated & saved successfully!`);
    setTimeout(() => {
      setSavedBanner(null);
      setActiveMode('review');
    }, 1500);
  };

  const handleConfirmDelete = () => {
    onDeleteOrder(order.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl my-auto max-h-[94vh] flex flex-col">
        {/* Top Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-400 font-mono font-black text-sm">
              {order.id}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                  Work Order Inspector
                </span>
                <span className="text-xs text-neutral-500">•</span>
                <span className="text-xs font-semibold text-emerald-400">
                  {currentStageConf?.title} (Step {currentStageConf?.stepNumber} of {ORDER_STAGES.length})
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-white leading-tight">
                {order.customerCompany} — {order.customerName}
              </h2>
            </div>
          </div>

          {/* Mode Switcher Tabs: Review | Edit Order | Delete Order */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveMode('review')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeMode === 'review'
                    ? 'bg-amber-400 text-neutral-950 shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <FileSearch className="w-3.5 h-3.5" />
                <span>Review Order</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('edit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeMode === 'edit'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Order</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('delete')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeMode === 'delete'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/40'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
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

        {savedBanner && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-xs text-emerald-300 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{savedBanner}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* =================================================================
              MODE 1: COMPREHENSIVE ORDER REVIEW DOSSIER
             ================================================================= */}
          {activeMode === 'review' && (
            <div className="space-y-6">
              {/* Top Summary KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[11px] text-neutral-400">Order Volume</div>
                  <div className="text-base font-extrabold text-white font-mono mt-0.5">
                    {order.quantity.toLocaleString()} {productCat.defaultUnitName}
                  </div>
                  <div className="text-[11px] text-amber-400 mt-0.5">
                    {order.bundlesCount} Bundles • ₹{order.ratePerBox}/{productCat.defaultUnitName}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[11px] text-neutral-400">Total Commercial Value</div>
                  <div className="text-base font-extrabold text-emerald-400 font-mono mt-0.5">
                    {formatCurrency(order.totalAmount)}
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Priority: <strong className="text-white">{order.priority}</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[11px] text-neutral-400">Current Stage & Dwell</div>
                  <div className="text-sm font-bold text-white mt-0.5 truncate">
                    {currentStageConf?.title}
                  </div>
                  <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                    In stage: {dwell.durationText} ({dwell.statusLabel})
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[11px] text-neutral-400">Delivery Deadline & SLA</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">
                    {formatDateTime(order.expectedDeliveryDate)}
                  </div>
                  <div className={`text-[11px] font-mono mt-0.5 ${sla.badgeColor}`}>
                    {sla.label}
                  </div>
                </div>
              </div>

              {/* 2-Column Detailed Breakdown: Client/Commercials vs Box Technical Specs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Client, Sales Rep & Delivery Logistics */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-amber-400" />
                      <span>Client, Sales Executive & Delivery Info</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveMode('edit')}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit Details</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-neutral-500 block">Client Company:</span>
                      <span className="text-white font-bold">{order.customerCompany}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Contact Person:</span>
                      <span className="text-white font-semibold">{order.customerName}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">WhatsApp Phone:</span>
                      <span className="text-emerald-400 font-mono">{order.customerPhone}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Booked By Sales Executive:</span>
                      <span className="text-purple-300 font-semibold">
                        {order.salesPersonName || 'Direct Factory Order'} ({order.salesPersonPhone || 'N/A'})
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                    <span className="text-neutral-500 block text-[11px]">Delivery Consignee Address:</span>
                    <span className="text-neutral-200">{order.deliveryAddress}</span>
                  </div>

                  {(order.logistics?.driverName || order.logistics?.vehicleNumber) && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-emerald-400 font-bold block">
                          🚚 Assigned Dispatch Vehicle & Driver
                        </span>
                        <span className="text-white">
                          {order.logistics.vehicleNumber || 'Truck'} • {order.logistics.driverName || 'Driver'} (
                          {order.logistics.driverPhone || 'No phone'})
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Box Technical Specifications & Machine Line */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>Technical Box & Paper Specifications</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                      {productCat.title}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-neutral-500 block">Dimensions (L×W×H):</span>
                      <span className="text-white font-mono font-bold">
                        {order.dimensions.lengthMm} × {order.dimensions.widthMm} × {order.dimensions.heightMm} mm
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Box Style / Category:</span>
                      <span className="text-white font-semibold">
                        {order.productSubCategory || order.boxStyle}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Ply & Flute Profile:</span>
                      <span className="text-amber-300 font-semibold">
                        {order.ply} • {order.flute}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Paper GSM Recipe:</span>
                      <span className="text-cyan-300 font-mono">
                        T:{order.paperSpecs.topLinerGsm} / F:{order.paperSpecs.flutingMediumGsm} / B:{order.paperSpecs.bottomLinerGsm}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Bursting Factor & Grade:</span>
                      <span className="text-white">
                        {order.paperSpecs.burstingFactor} BF ({order.paperSpecs.paperGrade || 'Kraft'})
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Finish & Printing:</span>
                      <span className="text-pink-400 font-semibold">
                        {order.lamination || 'None'} • {order.colorType}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-neutral-500 text-[11px] block">Assigned Machine Line & Operator:</span>
                      <span className="text-white font-semibold">
                        ⚙️ {order.assignedLine || 'Main Corrugator Line'} — Operator: {order.operatorInCharge || 'Shift Lead'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage Progression Timeline & Photo Proof */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Stage Progression Audit Log ({order.stageHistory?.length || 0} Stages Completed)</span>
                  </h3>
                  {onOpenStageUpdate && order.currentStage !== 'DELIVERED' && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenStageUpdate(order);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs"
                    >
                      <span>Advance Stage</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {(order.stageHistory || []).map((hist, idx) => {
                    const stConf = STAGE_CONFIG[hist.stage];
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="font-bold text-white">{stConf?.title || hist.stage}</span>
                            <span className="text-[11px] text-neutral-400 font-mono">
                              • {formatDateTime(hist.timestamp)}
                            </span>
                            <span className="text-[11px] text-amber-400">
                              by {hist.updatedBy}
                            </span>
                          </div>
                          {hist.notes && (
                            <div className="text-neutral-300 pl-4">{hist.notes}</div>
                          )}
                        </div>

                        {hist.photoUrl && (
                          <img
                            src={hist.photoUrl}
                            alt={stConf?.title}
                            className="w-20 h-14 object-cover rounded-lg border border-neutral-700 shrink-0"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Action Bar at bottom of Review */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800">
                <div className="flex flex-wrap items-center gap-2">
                  {onOpenWhatsAppPlugin && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenWhatsAppPlugin(order);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send In-App WhatsApp</span>
                    </button>
                  )}

                  {onOpenJobCard && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenJobCard(order);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs border border-neutral-700"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Job Card</span>
                    </button>
                  )}

                  {onOpenQR && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenQR(order);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-semibold text-xs border border-neutral-700"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QR Label</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveMode('edit')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit This Order</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode('delete')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-700/50 font-bold text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Order</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              MODE 2: FULL ORDER EDIT FORM
             ================================================================= */}
          {activeMode === 'edit' && (
            <form onSubmit={handleSaveChanges} className="space-y-5">
              {/* Section 1: Client & Commercial Priority */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  1. Client, Sales Rep & Stage Status
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-neutral-400 mb-1">Client Company Name *</label>
                    <input
                      type="text"
                      required
                      value={customerCompany}
                      onChange={(e) => setCustomerCompany(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">Contact Person Name *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">Customer WhatsApp Phone *</label>
                    <input
                      type="text"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">Sales Executive</label>
                    <select
                      value={salesPersonId}
                      onChange={(e) => setSalesPersonId(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      {(settings.salesTeam || []).map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          {sp.name} ({sp.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">Current Production Stage</label>
                    <select
                      value={currentStage}
                      onChange={(e) => setCurrentStage(e.target.value as OrderStage)}
                      className="w-full bg-neutral-900 border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
                    >
                      {ORDER_STAGES.map((st) => (
                        <option key={st} value={st}>
                          Step {STAGE_CONFIG[st].stepNumber}: {STAGE_CONFIG[st].title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">Order Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High / Urgent">High / Urgent</option>
                      <option value="Emergency Batch">Emergency Batch</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-neutral-400 mb-1">Delivery Address</label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">Expected Delivery Date & Time</label>
                    <input
                      type="datetime-local"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Dimensions, Ply, GSM & Finishing */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  2. Box Dimensions, Ply, Paper GSM & Finishing
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-neutral-400 mb-1">Length (mm)</label>
                    <input
                      type="number"
                      value={lengthMm}
                      onChange={(e) => setLengthMm(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Width (mm)</label>
                    <input
                      type="number"
                      value={widthMm}
                      onChange={(e) => setWidthMm(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Height (mm)</label>
                    <input
                      type="number"
                      value={heightMm}
                      onChange={(e) => setHeightMm(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Ply Rating</label>
                    <select
                      value={ply}
                      onChange={(e) => setPly(e.target.value as PlyCount)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="3-Ply">3-Ply</option>
                      <option value="5-Ply">5-Ply</option>
                      <option value="7-Ply">7-Ply</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Flute Type</label>
                    <select
                      value={flute}
                      onChange={(e) => setFlute(e.target.value as FluteType)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="A-Flute (4.8mm)">A-Flute (4.8mm)</option>
                      <option value="B-Flute (3.2mm)">B-Flute (3.2mm)</option>
                      <option value="C-Flute (4.0mm)">C-Flute (4.0mm)</option>
                      <option value="E-Flute (1.6mm)">E-Flute (1.6mm)</option>
                      <option value="BC-Duplex (7.2mm)">BC-Duplex (7.2mm)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Bursting Factor (BF)</label>
                    <input
                      type="number"
                      value={burstingFactor}
                      onChange={(e) => setBurstingFactor(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-neutral-400 mb-1">Top Liner GSM</label>
                    <input
                      type="number"
                      value={topLinerGsm}
                      onChange={(e) => setTopLinerGsm(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Fluting GSM</label>
                    <input
                      type="number"
                      value={flutingMediumGsm}
                      onChange={(e) => setFlutingMediumGsm(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Bottom Liner GSM</label>
                    <input
                      type="number"
                      value={bottomLinerGsm}
                      onChange={(e) => setBottomLinerGsm(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Lamination</label>
                    <select
                      value={lamination}
                      onChange={(e) => setLamination(e.target.value as LaminationType)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="None">None</option>
                      <option value="Gloss Lamination">Gloss Lamination</option>
                      <option value="Matt Lamination">Matt Lamination</option>
                      <option value="BOPP Lamination">BOPP Lamination</option>
                      <option value="UV Coated">UV Coated</option>
                      <option value="Aqueous Varnish">Aqueous Varnish</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Quantity, Rate, Machine Line & Dispatch Logistics */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  3. Quantity, Pricing, Machine Line & Dispatch Vehicle
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-neutral-400 mb-1">Order Quantity *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">Rate per Unit (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={ratePerBox}
                      onChange={(e) => setRatePerBox(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">Assigned Machine Line</label>
                    <input
                      type="text"
                      value={assignedLine}
                      onChange={(e) => setAssignedLine(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">Operator In-Charge (By Shift)</label>
                    <div className="space-y-1.5">
                      <select
                        value=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const [opLabel, lineLabel] = val.split('||');
                          setOperatorInCharge(opLabel);
                          if (lineLabel) setAssignedLine(lineLabel);
                        }}
                        className="w-full bg-neutral-900 border border-cyan-500/40 rounded-xl px-2.5 py-1.5 text-[11px] text-cyan-300"
                      >
                        <option value="">⚡ Pick Shift Operator...</option>
                        {(settings.productionShifts || []).map((sh) => (
                          <optgroup key={sh.id} label={`${sh.type} Shift (${sh.startTime}–${sh.endTime})`}>
                            {(sh.operators || []).map((op) => (
                              <option
                                key={op.id}
                                value={`${op.name} (${sh.type} Shift)||${op.machineLine}`}
                              >
                                👷 {op.name} ({sh.type}) — {op.role}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={operatorInCharge}
                        onChange={(e) => setOperatorInCharge(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">Dispatch Vehicle No.</label>
                    <input
                      type="text"
                      placeholder="TN-21-AX-4099"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">Driver Name</label>
                    <input
                      type="text"
                      placeholder="Driver Name"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">Driver Phone</label>
                    <input
                      type="text"
                      placeholder="+91 98401 00000"
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-right">
                      <span className="text-[10px] text-neutral-400 block">Recalculated Total Value:</span>
                      <span className="text-sm font-extrabold text-emerald-400 font-mono">
                        {formatCurrency(Math.round(Number(quantity) * Number(ratePerBox)))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setActiveMode('review')}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs"
                >
                  Cancel Edit
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-950/50"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Updated Order (#{order.id})</span>
                </button>
              </div>
            </form>
          )}

          {/* =================================================================
              MODE 3: SAFE ORDER DELETE CONFIRMATION
             ================================================================= */}
          {activeMode === 'delete' && (
            <div className="max-w-xl mx-auto my-6 p-6 rounded-2xl bg-rose-950/20 border-2 border-rose-600/50 space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
                <Trash2 className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-white">
                  Delete Work Order #{order.id} ({order.customerCompany})?
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  This will permanently remove <strong>Order #{order.id}</strong> ({order.quantity.toLocaleString()} {productCat.defaultUnitName} • {formatCurrency(order.totalAmount)}) from the Production Pipeline and All Work Orders list.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-left space-y-2">
                <label className="block text-[11px] text-neutral-400">
                  Optional: Type <strong className="text-rose-400 font-mono">{order.id}</strong> or click <strong>Confirm Permanent Delete</strong> below:
                </label>
                <input
                  type="text"
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  placeholder={`Type ${order.id} (optional)`}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveMode('review')}
                  className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs"
                >
                  Keep Order (Cancel)
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-950/60"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm Permanent Delete</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
