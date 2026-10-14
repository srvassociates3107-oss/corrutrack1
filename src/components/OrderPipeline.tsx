import React, { useState, useEffect } from 'react';
import { CorrugatedOrder, OrderStage, FactorySettings } from '../types/order';
import { 
  ORDER_STAGES, 
  STAGE_CONFIG, 
  calculateSLA, 
  calculateStageDwellTime,
  buildWhatsappLink, 
  generateCustomerWhatsappMessage, 
  generateStalledProcessAlertWhatsappMessage,
  formatDateTime 
} from '../utils/whatsapp';
import { OrderQRCode } from './OrderQRCode';
import { getProductCatalogItem } from '../utils/productCatalog';
import { 
  ArrowRight, 
  Clock, 
  MessageSquare, 
  Printer, 
  Eye, 
  AlertTriangle, 
  AlertOctagon,
  CheckCircle, 
  Truck, 
  Package, 
  Layers, 
  QrCode,
  Timer,
  Hourglass,
  Send,
  Briefcase,
  Camera,
  CheckSquare,
  Square,
  Users,
  Cpu,
  Check,
  Sparkles,
  FileSearch,
  Edit3,
  Trash2,
  GripVertical,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ArrowDown,
  Filter,
  Flame,
  HelpCircle,
  X
} from 'lucide-react';

interface OrderPipelineProps {
  orders: CorrugatedOrder[];
  settings: FactorySettings;
  onOpenStageUpdate: (order: CorrugatedOrder) => void;
  onOpenJobCard: (order: CorrugatedOrder) => void;
  onOpenTracker: (orderId: string) => void;
  onOpenQR: (order: CorrugatedOrder) => void;
  onOpenWhatsAppPlugin: (order: CorrugatedOrder) => void;
  onOpenInteractiveCard?: (order: CorrugatedOrder) => void;
  onBulkAssign: (orderIds: string[], assignedLine: string, operator: string) => void;
  onOpenStageDelay?: (order: CorrugatedOrder) => void;
  onReviewOrder?: (order: CorrugatedOrder) => void;
  onEditOrder?: (order: CorrugatedOrder) => void;
  onDeleteOrder?: (order: CorrugatedOrder) => void;
  onReorderOrders?: (reorderedOrders: CorrugatedOrder[]) => void;
  searchQuery: string;
}

export const OrderPipeline: React.FC<OrderPipelineProps> = ({
  orders,
  settings,
  onOpenStageUpdate,
  onOpenJobCard,
  onOpenTracker,
  onOpenQR,
  onOpenWhatsAppPlugin,
  onOpenInteractiveCard,
  onBulkAssign,
  onOpenStageDelay,
  onReviewOrder,
  onEditOrder,
  onDeleteOrder,
  onReorderOrders,
  searchQuery,
}) => {
  const [inlineQRId, setInlineQRId] = useState<string | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(Date.now());
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Bulk Assignment inputs
  const [bulkShift, setBulkShift] = useState<'Morning' | 'Evening' | 'Night'>('Morning');
  const [bulkLine, setBulkLine] = useState('Corrugator Line 1 (Heavy 5/7-Ply)');
  const [bulkOperator, setBulkOperator] = useState('Ramesh Sharma (Morning Shift)');
  const [bulkAppliedMessage, setBulkAppliedMessage] = useState<string | null>(null);

  // Drag and Drop & Queue Reorder State
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [draggedSourceStage, setDraggedSourceStage] = useState<OrderStage | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'above' | 'below' | null>(null);
  const [dragOverStage, setDragOverStage] = useState<OrderStage | null>(null);
  const [lineQueueFilter, setLineQueueFilter] = useState<string>('all');
  const [reorderNotice, setReorderNotice] = useState<{
    message: string;
    subMessage?: string;
    timestamp: number;
  } | null>(null);

  const shiftOperatorsList = (settings.productionShifts || []).flatMap((sh) =>
    (sh.operators || []).map((op) => ({
      ...op,
      shiftType: sh.type,
      shiftLabel: `${sh.type} Shift (${sh.startTime}–${sh.endTime})`,
    }))
  );

  // Keep dwell timers ticking in real time
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 25000);

    return () => clearInterval(timerInterval);
  }, []);

  // Auto-dismiss reorder notice after 5 seconds
  useEffect(() => {
    if (!reorderNotice) return;
    const timer = setTimeout(() => {
      setReorderNotice(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [reorderNotice]);

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      order.id.toLowerCase().includes(q) ||
      order.customerCompany.toLowerCase().includes(q) ||
      order.customerName.toLowerCase().includes(q) ||
      order.customerPhone.toLowerCase().includes(q) ||
      order.ply.toLowerCase().includes(q) ||
      (order.salesPersonName && order.salesPersonName.toLowerCase().includes(q)) ||
      (order.lamination && order.lamination.toLowerCase().includes(q)) ||
      (order.assignedLine && order.assignedLine.toLowerCase().includes(q)) ||
      order.boxStyle.toLowerCase().includes(q)
    );
  });

  // Returns ordered list of orders for a stage, respecting queuePriority for In-Progress stages
  const getStageOrders = (stage: OrderStage): CorrugatedOrder[] => {
    const stageItems = filteredOrders.filter((o) => o.currentStage === stage);

    // Apply equipment line filter specifically for In-Progress column if selected
    const filteredByLine = (stage === 'BOARD_PROCESSING' && lineQueueFilter !== 'all')
      ? stageItems.filter((o) => o.assignedLine === lineQueueFilter)
      : stageItems;

    // For In-Progress stages (BOARD_PROCESSING & PRINTING_SLOTTING), sort by queuePriority if present
    if (stage === 'BOARD_PROCESSING' || stage === 'PRINTING_SLOTTING') {
      return [...filteredByLine].sort((a, b) => {
        const pA = typeof a.queuePriority === 'number' ? a.queuePriority : 9999;
        const pB = typeof b.queuePriority === 'number' ? b.queuePriority : 9999;
        return pA - pB;
      });
    }

    return filteredByLine;
  };

  const toggleSelectOrder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedOrderIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedOrderIds(next);
  };

  const handleSelectAllActive = () => {
    const activeIds = filteredOrders
      .filter((o) => o.currentStage !== 'DELIVERED')
      .map((o) => o.id);
    setSelectedOrderIds(new Set(activeIds));
  };

  const handleClearSelection = () => {
    setSelectedOrderIds(new Set());
  };

  const handleApplyBulkAssignment = () => {
    if (selectedOrderIds.size === 0) return;
    onBulkAssign(Array.from(selectedOrderIds), bulkLine, bulkOperator);
    setBulkAppliedMessage(`Assigned ${selectedOrderIds.size} orders to ${bulkLine}!`);
    setTimeout(() => {
      setBulkAppliedMessage(null);
      setSelectedOrderIds(new Set());
    }, 2500);
  };

  // =========================================================================
  // QUEUE REORDERING ENGINE (Drag-and-Drop & Shop-Floor Equipment Availability)
  // =========================================================================
  const clearDragState = () => {
    setDraggedOrderId(null);
    setDraggedSourceStage(null);
    setDragOverTargetId(null);
    setDragOverPosition(null);
    setDragOverStage(null);
  };

  const executeReorder = (
    activeOrderId: string,
    targetStage: OrderStage,
    targetOrderId?: string,
    position: 'above' | 'below' = 'above'
  ) => {
    const draggedOrder = orders.find((o) => o.id === activeOrderId);
    if (!draggedOrder) return;

    const sourceStage = draggedOrder.currentStage;
    const isSameStage = sourceStage === targetStage;

    let nextOrders = [...orders];

    if (isSameStage) {
      // Reordering within the same stage
      const currentStageList = getStageOrders(targetStage);
      const fromIdx = currentStageList.findIndex((o) => o.id === activeOrderId);
      if (fromIdx === -1) return;

      const remainingList = currentStageList.filter((o) => o.id !== activeOrderId);
      let insertIdx = remainingList.length;

      if (targetOrderId) {
        const adjustedTargetIdx = remainingList.findIndex((o) => o.id === targetOrderId);
        if (adjustedTargetIdx !== -1) {
          insertIdx = position === 'above' ? adjustedTargetIdx : adjustedTargetIdx + 1;
        }
      }

      insertIdx = Math.max(0, Math.min(insertIdx, remainingList.length));

      const reorderedList = [
        ...remainingList.slice(0, insertIdx),
        draggedOrder,
        ...remainingList.slice(insertIdx),
      ].map((o, idx) => ({
        ...o,
        queuePriority: idx + 1,
      }));

      const stageMap = new Map(reorderedList.map((o) => [o.id, o]));
      nextOrders = nextOrders.map((o) => stageMap.get(o.id) || o);

      const newRank = insertIdx + 1;
      setReorderNotice({
        message: `Queue Reordered: ${draggedOrder.id} is now #${newRank} on ${draggedOrder.assignedLine || 'Shop-Floor Machine Line'}`,
        subMessage: `Sequence adjusted based on immediate equipment availability (${draggedOrder.ply} • ${draggedOrder.dimensions.lengthMm}x${draggedOrder.dimensions.widthMm}mm).`,
        timestamp: Date.now(),
      });
    } else {
      // Moving across stages (e.g. into IN-PROGRESS stage)
      const updatedOrder: CorrugatedOrder = {
        ...draggedOrder,
        currentStage: targetStage,
        stageHistory: [
          ...(draggedOrder.stageHistory || []),
          {
            stage: targetStage,
            timestamp: new Date().toISOString(),
            updatedBy: 'Plant Production Manager',
            notes: `Queued into ${STAGE_CONFIG[targetStage]?.title} via Shop-Floor Queue Drag & Drop`,
            notificationsSent: {
              customerWhatsapp: false,
              ownerWhatsapp: false,
              teamWhatsapp: false,
              smsWebhook: false,
            },
          },
        ],
      };

      const targetList = getStageOrders(targetStage);
      let insertIdx = targetList.length;
      if (targetOrderId) {
        const targetIdx = targetList.findIndex((o) => o.id === targetOrderId);
        if (targetIdx !== -1) {
          insertIdx = position === 'above' ? targetIdx : targetIdx + 1;
        }
      }
      insertIdx = Math.max(0, Math.min(insertIdx, targetList.length));

      const newTargetList = [
        ...targetList.slice(0, insertIdx),
        updatedOrder,
        ...targetList.slice(insertIdx),
      ].map((o, idx) => ({
        ...o,
        queuePriority: idx + 1,
      }));

      const targetMap = new Map(newTargetList.map((o) => [o.id, o]));
      nextOrders = nextOrders.map((o) => {
        if (o.id === activeOrderId) return targetMap.get(o.id) || updatedOrder;
        return targetMap.get(o.id) || o;
      });

      setReorderNotice({
        message: `Job Dispatched to Line: ${draggedOrder.id} entered ${STAGE_CONFIG[targetStage]?.title} at Position #${insertIdx + 1}`,
        subMessage: `Assigned to ${draggedOrder.assignedLine || 'Active Machine Line'} for immediate production`,
        timestamp: Date.now(),
      });
    }

    onReorderOrders?.(nextOrders);
  };

  // 1-Click quick queue reorder helpers (for touchscreens, mobile app, and accessibility)
  const handleMoveRank = (orderId: string, stage: OrderStage, direction: -1 | 1) => {
    const stageList = getStageOrders(stage);
    const currentIdx = stageList.findIndex((o) => o.id === orderId);
    if (currentIdx === -1) return;
    const targetIdx = currentIdx + direction;
    if (targetIdx < 0 || targetIdx >= stageList.length) return;
    const targetOrder = stageList[targetIdx];
    executeReorder(orderId, stage, targetOrder.id, direction === -1 ? 'above' : 'below');
  };

  const handleMoveToTop = (orderId: string, stage: OrderStage) => {
    const stageList = getStageOrders(stage);
    if (stageList.length === 0 || stageList[0].id === orderId) return;
    executeReorder(orderId, stage, stageList[0].id, 'above');
  };

  return (
    <div className="space-y-3 pb-8">
      {/* FLOATING REORDER CONFIRMATION TOAST */}
      {reorderNotice && (
        <div className="sticky top-2 z-50 bg-neutral-900 border-2 border-amber-400 rounded-2xl p-3 sm:p-4 shadow-2xl shadow-amber-500/20 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-bold text-sm">
              <ArrowUpDown className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                <span>{reorderNotice.message}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono border border-amber-400/40">
                  Shop-Floor Synced
                </span>
              </div>
              {reorderNotice.subMessage && (
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  {reorderNotice.subMessage}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReorderNotice(null)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FLOATING / STICKY BULK ASSIGNMENT BAR */}
      {selectedOrderIds.size > 0 && (
        <div className="sticky top-2 z-40 bg-neutral-900 border-2 border-amber-500/80 rounded-2xl p-3 sm:p-4 shadow-2xl shadow-amber-500/10 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-sm">
              {selectedOrderIds.size}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>{selectedOrderIds.size} Orders Selected for Bulk Dispatch</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">
                  Production Line Assignment
                </span>
              </div>
              <div className="text-[11px] text-neutral-400">
                Simultaneously assign selected batches to machine line and shift operator
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Machine Line Selector */}
            <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-800">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={bulkLine}
                onChange={(e) => setBulkLine(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none font-medium cursor-pointer"
              >
                <option value="Corrugator Line 1 (Heavy 5/7-Ply)">Corrugator Line 1 (Heavy 5/7-Ply)</option>
                <option value="High Speed Fluter Line 2 (3-Ply)">High Speed Fluter Line 2 (3-Ply)</option>
                <option value="Bobst Rotary Die-Cutter Line 3">Bobst Rotary Die-Cutter Line 3</option>
                <option value="Auto Slotter & 2-Color Flexo">Auto Slotter & 2-Color Flexo</option>
                <option value="Manual Converting Bed">Manual Converting Bed</option>
              </select>
            </div>

            {/* Operator Selector */}
            <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-800">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <select
                value={bulkOperator}
                onChange={(e) => {
                  const val = e.target.value;
                  setBulkOperator(val);
                  const found = shiftOperatorsList.find(
                    (op) => `${op.name} (${op.shiftType} Shift)` === val
                  );
                  if (found && found.machineLine) {
                    setBulkLine(found.machineLine);
                  }
                }}
                className="bg-transparent text-xs text-white focus:outline-none font-medium cursor-pointer"
              >
                {(settings.productionShifts || []).map((sh) => (
                  <optgroup
                    key={sh.id}
                    label={`${sh.type} Shift (${sh.startTime}–${sh.endTime})`}
                    className="bg-neutral-900 text-cyan-300"
                  >
                    {(sh.operators || []).map((op) => {
                      const optVal = `${op.name} (${sh.type} Shift)`;
                      return (
                        <option key={op.id} value={optVal} className="bg-neutral-950 text-white">
                          👷 {op.name} — {op.role} ({sh.type})
                        </option>
                      );
                    })}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Apply Button */}
            <button
              type="button"
              onClick={handleApplyBulkAssignment}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 rounded-lg text-xs font-bold transition-all shadow-md shadow-amber-500/20"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Assign {selectedOrderIds.size} Orders</span>
            </button>

            {/* Clear Selection */}
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium transition-colors"
            >
              Clear
            </button>
          </div>

          {bulkAppliedMessage && (
            <div className="w-full text-center text-xs font-semibold text-emerald-400 bg-emerald-950/60 p-1.5 rounded-lg border border-emerald-800/60">
              {bulkAppliedMessage}
            </div>
          )}
        </div>
      )}

      {/* PIPELINE COLUMNS */}
      <div className="overflow-x-auto pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 min-w-[1260px]">
          {ORDER_STAGES.map((stage) => {
            const conf = STAGE_CONFIG[stage];
            const stageOrders = getStageOrders(stage);

            // Stalled order count
            const stalledOrdersCount = stageOrders.filter((order) => {
              const dwell = calculateStageDwellTime(order, currentTimeMs);
              return dwell.isStalled;
            }).length;

            const isInProgressColumn = stage === 'BOARD_PROCESSING';
            const isFinishingInProgressColumn = stage === 'PRINTING_SLOTTING';
            const canReorderInStage = isInProgressColumn || isFinishingInProgressColumn || stage === 'ORDER_PLACED';

            const isColumnDropTarget = dragOverStage === stage;

            return (
              <div
                key={stage}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverStage !== stage) {
                    setDragOverStage(stage);
                  }
                }}
                onDragLeave={(e) => {
                  // Only reset if leaving the column boundary
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (
                    e.clientX < rect.left ||
                    e.clientX >= rect.right ||
                    e.clientY < rect.top ||
                    e.clientY >= rect.bottom
                  ) {
                    if (dragOverStage === stage) {
                      setDragOverStage(null);
                    }
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedOrderId) {
                    executeReorder(draggedOrderId, stage, undefined, 'below');
                  }
                  clearDragState();
                }}
                className={`border rounded-xl flex flex-col h-[820px] transition-all relative ${
                  isColumnDropTarget && draggedOrderId
                    ? 'ring-2 ring-amber-400/70 border-amber-400 bg-amber-950/20'
                    : stalledOrdersCount > 0
                    ? 'bg-neutral-900/90 border-rose-900/50'
                    : isInProgressColumn
                    ? 'bg-neutral-900/80 border-amber-500/40 shadow-lg shadow-amber-500/5'
                    : 'bg-neutral-900/60 border-neutral-800'
                }`}
              >
                {/* Column Header */}
                <div className={`p-3 border-b flex flex-col gap-1.5 ${
                  isInProgressColumn 
                    ? 'border-amber-500/30 bg-amber-950/30' 
                    : 'border-neutral-800 bg-neutral-900'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: conf.color }}
                      />
                      <span className="text-xs font-bold text-white truncate max-w-[125px]" title={conf.title}>
                        {isInProgressColumn ? 'Board Corrugation' : isFinishingInProgressColumn ? 'Printing & Slotting' : conf.title}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      {stalledOrdersCount > 0 && (
                        <span 
                          title={`${stalledOrdersCount} orders exceeding 150% benchmark limit`}
                          className="text-[10px] font-mono text-rose-300 bg-rose-950 border border-rose-800/80 px-1.5 py-0.5 rounded font-bold animate-pulse flex items-center gap-0.5"
                        >
                          <AlertOctagon className="w-2.5 h-2.5 text-rose-400" />
                          <span>{stalledOrdersCount} Stalled</span>
                        </span>
                      )}
                      <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                        isInProgressColumn 
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-500/30' 
                          : 'text-neutral-400 bg-neutral-800'
                      }`}>
                        {stageOrders.length}
                      </span>
                    </div>
                  </div>

                  {/* Prominent IN-PROGRESS & Drag-and-Drop Queue Badge */}
                  {isInProgressColumn && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between bg-amber-500/15 border border-amber-500/30 px-2 py-1 rounded-lg">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                          <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-amber-300">
                            In-Progress Queue
                          </span>
                        </div>
                        <span className="text-[9px] text-amber-300/80 font-mono flex items-center gap-0.5">
                          <GripVertical className="w-2.5 h-2.5 text-amber-400" />
                          <span>Drag to Reorder</span>
                        </span>
                      </div>

                      {/* Equipment Availability Filter & Status Indicator */}
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-0.5">
                        <span className="flex items-center gap-1 text-[10px] text-neutral-300 font-medium">
                          <Cpu className="w-3 h-3 text-cyan-400" />
                          <span>Machine Priority</span>
                        </span>
                        <select
                          value={lineQueueFilter}
                          onChange={(e) => setLineQueueFilter(e.target.value)}
                          aria-label="Filter in-progress equipment line"
                          className="bg-neutral-950 text-[10px] text-amber-300 border border-neutral-800 rounded px-1.5 py-0.5 focus:outline-none focus:border-amber-400"
                        >
                          <option value="all">All Lines ({filteredOrders.filter((o) => o.currentStage === 'BOARD_PROCESSING').length})</option>
                          <option value="High Speed Fluter Line 2 (3-Ply)">Fluter Line 2 (3-Ply)</option>
                          <option value="Corrugator Line 1 (Heavy 5/7-Ply)">Corrugator Line 1 (Heavy)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {isFinishingInProgressColumn && (
                    <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded text-[10px] text-purple-300 font-mono">
                      <span>Converting Queue</span>
                      <span className="text-[9px] text-neutral-400 flex items-center gap-0.5">
                        <GripVertical className="w-2.5 h-2.5 text-purple-400" />
                        <span>Reorderable</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Orders in this stage */}
                <div 
                  className={`p-2 space-y-2.5 flex-1 overflow-y-auto ${
                    isColumnDropTarget && stageOrders.length === 0 ? 'bg-amber-500/5' : ''
                  }`}
                >
                  {stageOrders.length === 0 ? (
                    <div 
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverStage(stage);
                        setDragOverTargetId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (draggedOrderId) {
                          executeReorder(draggedOrderId, stage, undefined, 'below');
                        }
                        clearDragState();
                      }}
                      className="h-44 border-2 border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center text-center p-3 text-neutral-500 text-xs transition-colors hover:border-amber-500/40 hover:bg-neutral-900/50"
                    >
                      {draggedOrderId ? (
                        <div className="space-y-1 text-amber-400 animate-pulse">
                          <ArrowDown className="w-5 h-5 mx-auto" />
                          <span className="font-bold">Drop here to queue job</span>
                        </div>
                      ) : (
                        <>
                          <Package className="w-6 h-6 mb-1 text-neutral-600" />
                          <span>No orders in this stage</span>
                          {isInProgressColumn && (
                            <span className="text-[10px] text-neutral-400 mt-1">
                              Drag orders from "Order Placed" into this column to schedule on machine lines
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    stageOrders.map((order, orderIndex) => {
                      const sla = calculateSLA(order);
                      const dwell = calculateStageDwellTime(order, currentTimeMs);
                      const isUrgent = order.priority !== 'Normal';
                      const showInlineQR = inlineQRId === order.id;
                      const isSelected = selectedOrderIds.has(order.id);
                      const isBeingDragged = draggedOrderId === order.id;
                      const queueRank = orderIndex + 1;

                      // Drop indicator states
                      const isHoveredTarget = dragOverTargetId === order.id;
                      const showInsertAbove = isHoveredTarget && dragOverPosition === 'above' && draggedOrderId !== order.id;
                      const showInsertBelow = isHoveredTarget && dragOverPosition === 'below' && draggedOrderId !== order.id;

                      // Get latest stage photo if available
                      const latestHist = order.stageHistory?.[order.stageHistory.length - 1];
                      const photoProof = latestHist?.photoUrl;

                      return (
                        <React.Fragment key={order.id}>
                          {/* DRAG-AND-DROP INSERTION INDICATOR ABOVE */}
                          {showInsertAbove && (
                            <div className="py-1 px-2.5 bg-amber-400/20 border-2 border-dashed border-amber-400 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-300 animate-pulse transition-all">
                              <ArrowDown className="w-3.5 h-3.5" />
                              <span>↓ Place at Queue Position #{queueRank} (Ahead of {order.id}) ↓</span>
                            </div>
                          )}

                          <div
                            draggable={canReorderInStage}
                            onDragStart={(e) => {
                              setDraggedOrderId(order.id);
                              setDraggedSourceStage(stage);
                              e.dataTransfer.setData('text/plain', order.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={clearDragState}
                            onDragOver={(e) => {
                              if (!canReorderInStage && draggedSourceStage !== stage) return;
                              e.preventDefault();
                              e.stopPropagation();

                              const rect = e.currentTarget.getBoundingClientRect();
                              const midpointY = rect.top + rect.height / 2;
                              const position = e.clientY < midpointY ? 'above' : 'below';

                              if (dragOverTargetId !== order.id || dragOverPosition !== position) {
                                setDragOverTargetId(order.id);
                                setDragOverPosition(position);
                                setDragOverStage(stage);
                              }
                            }}
                            onDragLeave={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              if (
                                e.clientX < rect.left ||
                                e.clientX >= rect.right ||
                                e.clientY < rect.top ||
                                e.clientY >= rect.bottom
                              ) {
                                if (dragOverTargetId === order.id) {
                                  setDragOverTargetId(null);
                                  setDragOverPosition(null);
                                }
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (draggedOrderId && draggedOrderId !== order.id) {
                                executeReorder(draggedOrderId, stage, order.id, dragOverPosition || 'above');
                              }
                              clearDragState();
                            }}
                            className={`border rounded-xl p-3 transition-all relative ${
                              isBeingDragged
                                ? 'opacity-35 scale-[0.98] border-dashed border-amber-400 ring-2 ring-amber-400/50 bg-neutral-900 shadow-2xl'
                                : isSelected
                                ? 'border-amber-400 bg-amber-950/20 shadow-lg ring-1 ring-amber-400/40'
                                : dwell.isStalled
                                ? 'border-rose-700/80 bg-rose-950/25 shadow-lg shadow-rose-950/20'
                                : dwell.isWarning
                                ? 'border-amber-700/60 bg-neutral-900/90'
                                : isInProgressColumn
                                ? 'border-amber-500/30 bg-neutral-950/90 hover:border-amber-400/80 hover:bg-neutral-950'
                                : 'border-neutral-800/90 bg-neutral-950/70 hover:bg-neutral-950 hover:border-neutral-600'
                            }`}
                          >
                            {/* Stalled Process Warning Banner */}
                            {dwell.isStalled && (
                              <div className="mb-2 p-1.5 rounded-lg bg-rose-950/80 border border-rose-800/90 flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-1 text-rose-300 font-bold">
                                  <AlertOctagon className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                                  <span>STALLED (&gt;150% LIMIT)</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onOpenWhatsAppPlugin(order)}
                                  title="1-Click In-App WhatsApp Bottleneck Alert to Plant Supervisor"
                                  className="px-1.5 py-0.5 rounded bg-rose-800 hover:bg-rose-700 text-white font-semibold flex items-center gap-1 shadow"
                                >
                                  <Send className="w-2.5 h-2.5" />
                                  <span>Supervisor Alert</span>
                                </button>
                              </div>
                            )}

                            {/* Actively Reported Stage Delay Banner */}
                            {order.isStageDelayed && (
                              <div className="mb-2 p-1.5 rounded-lg bg-rose-950/80 border border-rose-800/90 text-[10px] space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 text-rose-300 font-bold">
                                    <AlertTriangle className="w-3 h-3 text-rose-400 animate-pulse" />
                                    <span>DELAY REPORTED (+{order.currentDelayHours || 4}h)</span>
                                  </div>
                                  <span className="font-mono text-rose-400 text-[9px]">SLA Recalibrated</span>
                                </div>
                                {order.currentDelayReason && (
                                  <div className="text-neutral-300 text-[10px] truncate" title={order.currentDelayReason}>
                                    Cause: {order.currentDelayReason}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* SHOP-FLOOR EQUIPMENT QUEUE RANK & DRAG HANDLE (Visible in In-Progress column) */}
                            {isInProgressColumn && (
                              <div className="mb-2 p-1.5 bg-neutral-900 rounded-lg border border-neutral-800 flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-1.5">
                                  {/* Drag Handle */}
                                  <div
                                    title="Click & Drag to reorder queue based on shop-floor equipment availability"
                                    className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-amber-400 p-0.5 rounded hover:bg-neutral-800 transition-colors"
                                  >
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </div>

                                  {/* Queue Rank Badge */}
                                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                    queueRank === 1
                                      ? 'bg-amber-400 text-neutral-950 shadow-sm shadow-amber-500/30 font-extrabold animate-pulse'
                                      : queueRank === 2
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                      : 'bg-neutral-800 text-neutral-300'
                                  }`}>
                                    {queueRank === 1 ? '👑 #1 NEXT ON MACHINE' : `#${queueRank} In Line Queue`}
                                  </span>
                                </div>

                                {/* Accessible 1-Click Move Up / Down Buttons for Mobile & Keyboard Users */}
                                <div className="flex items-center gap-0.5 no-print">
                                  <button
                                    type="button"
                                    disabled={queueRank === 1}
                                    onClick={() => handleMoveRank(order.id, stage, -1)}
                                    title="Move up in queue"
                                    className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={queueRank === stageOrders.length}
                                    onClick={() => handleMoveRank(order.id, stage, 1)}
                                    title="Move down in queue"
                                    className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                  {queueRank > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleMoveToTop(order.id, stage)}
                                      title="Jump to Position #1 (Immediate Machine Setup)"
                                      className="px-1.5 py-0.5 text-[9px] rounded font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-400 hover:text-neutral-950 transition-colors"
                                    >
                                      Top #1
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Card Top Row: Checkbox, Order ID & Priority */}
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                {/* Selection Checkbox */}
                                <button
                                  type="button"
                                  onClick={(e) => toggleSelectOrder(order.id, e)}
                                  title={isSelected ? 'Deselect order' : 'Select order for bulk machine assignment'}
                                  className="text-neutral-400 hover:text-amber-400 transition-colors"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-amber-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-neutral-600 hover:text-neutral-400" />
                                  )}
                                </button>

                                <span className="font-mono text-xs font-bold text-amber-400 tracking-wider">
                                  {order.id}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                {/* Sales Person Badge */}
                                {order.salesPersonName && (
                                  <span 
                                    className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-purple-950/60 text-purple-300 border border-purple-800/40 truncate max-w-[80px]"
                                    title={`Booked by Sales Rep: ${order.salesPersonName}`}
                                  >
                                    👔 {order.salesPersonName.split(' ')[0]}
                                  </span>
                                )}

                                {isUrgent && (
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                    order.priority === 'Emergency Batch'
                                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                                  }`}>
                                    {order.priority === 'Emergency Batch' ? 'Emergency' : 'Urgent'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Client Name & Volume */}
                            <div className="mb-2">
                              <div className="text-xs font-bold text-white truncate" title={order.customerCompany}>
                                {order.customerCompany}
                              </div>
                              <div className="text-[11px] text-neutral-400 truncate">
                                {order.customerName}
                              </div>
                              {order.productType && order.productType !== 'paper_box' && (
                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    {getProductCatalogItem(order.productType).title.split('(')[0].trim()}
                                  </span>
                                  {order.productSubCategory && (
                                    <span className="text-[10px] text-neutral-400 truncate max-w-[130px]">
                                      {order.productSubCategory.split('(')[0].trim()}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Shop-Floor Equipment Tag (Line & Setup Status) */}
                            {order.assignedLine && (
                              <div className="mb-2 px-2 py-1 bg-neutral-900/90 rounded border border-neutral-800 text-[10px] flex items-center justify-between">
                                <span className="flex items-center gap-1 text-cyan-300 font-medium truncate max-w-[140px]" title={order.assignedLine}>
                                  <Cpu className="w-3 h-3 text-cyan-400 shrink-0" />
                                  <span>{order.assignedLine.split('(')[0]}</span>
                                </span>
                                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                  {order.equipmentStatus || (queueRank === 1 ? 'Running Now' : 'Queued')}
                                </span>
                              </div>
                            )}

                            {/* Technical Specs & Finishing */}
                            <div className="space-y-1 p-2 bg-neutral-900/80 rounded-lg border border-neutral-800/80 text-[11px]">
                              {/* Dimensions */}
                              <div className="flex justify-between items-center text-neutral-300">
                                <span className="text-neutral-500">Size:</span>
                                <span className="font-mono text-white">
                                  {order.dimensions.lengthMm}x{order.dimensions.widthMm}x{order.dimensions.heightMm} mm
                                </span>
                              </div>

                              {/* Ply & Flute */}
                              {(!order.productType || order.productType === 'paper_box') ? (
                                <div className="flex justify-between items-center">
                                  <span className="text-neutral-500">Ply/Flute:</span>
                                  <span className="text-neutral-200 font-medium">
                                    {order.ply} · {order.flute.split(' ')[0]}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex justify-between items-center">
                                  <span className="text-neutral-500">Type:</span>
                                  <span className="text-amber-300 font-medium truncate max-w-[130px]" title={order.productSubCategory}>
                                    {order.productSubCategory || 'Custom'}
                                  </span>
                                </div>
                              )}

                              {/* Lamination Finish */}
                              {order.lamination && order.lamination !== 'None' && (
                                <div className="flex justify-between items-center">
                                  <span className="text-neutral-500">Finish:</span>
                                  <span className="text-[10px] font-semibold text-pink-400">
                                    {order.lamination}
                                  </span>
                                </div>
                              )}

                              {/* GSM Recipe */}
                              {(!order.productType || order.productType === 'paper_box') ? (
                                <div className="flex justify-between items-center">
                                  <span className="text-neutral-500">GSM:</span>
                                  <span className="font-mono text-cyan-300 text-[10px]">
                                    T:{order.paperSpecs.topLinerGsm} / F:{order.paperSpecs.flutingMediumGsm} / B:{order.paperSpecs.bottomLinerGsm}
                                  </span>
                                </div>
                              ) : order.productRequirements ? (
                                <div className="flex justify-between items-center">
                                  <span className="text-neutral-500">Spec:</span>
                                  <span className="font-mono text-cyan-300 text-[10px] truncate max-w-[140px]" title={order.productSpecsSummary}>
                                    {order.productSpecsSummary || 'Custom Recipe'}
                                  </span>
                                </div>
                              ) : null}

                              {/* Quantity & Value */}
                              <div className="flex justify-between items-center pt-1 border-t border-neutral-800/60 font-semibold">
                                <span className="text-amber-400">{order.quantity.toLocaleString()} {order.productType ? getProductCatalogItem(order.productType).defaultUnitName : 'pcs'}</span>
                                <span className="text-neutral-400 text-[10px]">₹{order.ratePerBox}/{order.productType ? getProductCatalogItem(order.productType).defaultUnitName : 'box'}</span>
                              </div>
                            </div>

                            {/* Operator In-Charge */}
                            {order.operatorInCharge && (
                              <div className="mt-1.5 flex items-center justify-between text-[10px] text-neutral-400 px-1 font-mono">
                                <span className="text-neutral-500 truncate max-w-[100px]">
                                  Operator:
                                </span>
                                <span className="truncate max-w-[100px] text-neutral-300">
                                  👷 {order.operatorInCharge.split(' ')[0]}
                                </span>
                              </div>
                            )}

                            {/* Stage Progress Photo Preview (if taken/picked) */}
                            {photoProof && (
                              <div className="mt-2 relative rounded overflow-hidden aspect-video bg-neutral-900 border border-neutral-800">
                                <img src={photoProof} alt="Proof" className="w-full h-full object-cover" />
                                <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5 text-[9px] text-white flex items-center gap-1">
                                  <Camera className="w-2.5 h-2.5 text-amber-400" />
                                  <span>Stage Proof Attached</span>
                                </div>
                              </div>
                            )}

                            {/* Stage Dwell Time & Benchmarks */}
                            <div className="mt-2 p-2 bg-neutral-950 rounded-lg border border-neutral-800/90 space-y-1.5">
                              <div className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-1 text-neutral-400">
                                  <Hourglass className="w-3 h-3 text-neutral-500" />
                                  <span>Dwell:</span>
                                  <span className="font-mono text-white font-semibold">{dwell.durationText}</span>
                                </div>
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono border ${dwell.badgeClass}`}>
                                  {dwell.statusLabel}
                                </span>
                              </div>

                              {/* Benchmark Progress Bar */}
                              {stage !== 'DELIVERED' && (
                                <div className="space-y-0.5">
                                  <div className="w-full bg-neutral-900 rounded-full h-1 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        dwell.isStalled
                                          ? 'bg-rose-500 animate-pulse'
                                          : dwell.isWarning
                                          ? 'bg-amber-400'
                                          : 'bg-blue-400'
                                      }`}
                                      style={{ width: `${Math.min(100, Math.max(8, dwell.progressPercent))}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
                                    <span>Nominal: {dwell.benchmarkHours}h</span>
                                    <span>Limit (150%): {dwell.stalledThresholdHours}h</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Inline QR Code display toggle */}
                            {showInlineQR && (
                              <div className="my-2.5 p-2 bg-neutral-950 border border-neutral-700 rounded-lg flex flex-col items-center">
                                <OrderQRCode
                                  orderId={order.id}
                                  size={84}
                                  showActions={true}
                                  lightMode={false}
                                  label="Scan to Track"
                                />
                                <button
                                  onClick={() => onOpenQR(order)}
                                  className="mt-1 text-[10px] text-amber-400 hover:underline font-mono"
                                >
                                  Enlarge Label / Print
                                </button>
                              </div>
                            )}

                            {/* SLA Countdown Badge */}
                            <div className="mt-2 pt-1.5 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                              <div className={`flex items-center gap-1 font-mono font-medium ${sla.badgeColor}`}>
                                <Clock className="w-3 h-3" />
                                <span>{sla.label}</span>
                              </div>
                            </div>

                            {/* Action Toolbar */}
                            <div className="mt-2.5 flex items-center justify-between gap-1 pt-2 border-t border-neutral-800/70">
                              <div className="flex items-center gap-1 flex-wrap">
                                {/* Order Review Button */}
                                {onReviewOrder && (
                                  <button
                                    type="button"
                                    onClick={() => onReviewOrder(order)}
                                    title="Review Order Details & Stage Audit"
                                    className="p-1 text-amber-300 hover:text-amber-200 hover:bg-amber-950/60 rounded border border-amber-500/30 transition-colors"
                                  >
                                    <FileSearch className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Edit Order Button */}
                                {onEditOrder && (
                                  <button
                                    type="button"
                                    onClick={() => onEditOrder(order)}
                                    title="Edit Order Specifications, Quantity & Client"
                                    className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-950/60 rounded border border-blue-500/30 transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Delete Order Button */}
                                {onDeleteOrder && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteOrder(order)}
                                    title="Delete Work Order"
                                    className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded border border-rose-800/40 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* WhatsApp Plugin Console Launcher */}
                                <button
                                  type="button"
                                  onClick={() => onOpenWhatsAppPlugin(order)}
                                  title="Open WhatsApp Dispatch Console & Plugin"
                                  className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 rounded border border-emerald-900/50 transition-colors"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>

                                {/* WhatsApp Interactive Card with Buttons */}
                                {onOpenInteractiveCard && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenInteractiveCard(order)}
                                    title="Generate Interactive WhatsApp Spec Card & Action Buttons"
                                    className="p-1 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/80 rounded border border-emerald-700/60 transition-colors"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                  </button>
                                )}

                                {/* QR Code trigger */}
                                <button
                                  type="button"
                                  onClick={() => setInlineQRId(showInlineQR ? null : order.id)}
                                  title={showInlineQR ? 'Hide QR Code' : 'Display Scannable QR Code'}
                                  className={`p-1 rounded transition-colors ${
                                    showInlineQR
                                      ? 'bg-amber-400 text-neutral-950 font-bold'
                                      : 'text-neutral-400 hover:text-amber-400 hover:bg-neutral-800'
                                  }`}
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                </button>

                                {/* Job Card print */}
                                <button
                                  type="button"
                                  onClick={() => onOpenJobCard(order)}
                                  title="Print Technical Corrugated Job Card"
                                  className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>

                                {/* Live tracker view */}
                                <button
                                  type="button"
                                  onClick={() => onOpenTracker(order.id)}
                                  title="View Customer Live Tracker"
                                  className="p-1 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {stage !== 'DELIVERED' ? (
                                <div className="flex items-center gap-1">
                                  {onOpenStageDelay && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenStageDelay(order)}
                                      title="Report Stage Delay or Bottleneck"
                                      className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 border border-rose-900/50 transition-colors"
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => onOpenStageUpdate(order)}
                                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap ${
                                      dwell.isStalled
                                        ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-md animate-pulse'
                                        : 'bg-amber-400 hover:bg-amber-300 text-neutral-950'
                                    }`}
                                  >
                                    <span>Advance</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Delivered</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* DRAG-AND-DROP INSERTION INDICATOR BELOW */}
                          {showInsertBelow && (
                            <div className="py-1 px-2.5 bg-amber-400/20 border-2 border-dashed border-amber-400 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-300 animate-pulse transition-all">
                              <ArrowDown className="w-3.5 h-3.5" />
                              <span>↓ Place at Queue Position #{queueRank + 1} (Behind {order.id}) ↓</span>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}

                  {/* DROP CONTAINER AT BOTTOM OF COLUMN */}
                  {draggedOrderId && stageOrders.length > 0 && (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverStage(stage);
                        setDragOverTargetId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (draggedOrderId) {
                          executeReorder(draggedOrderId, stage, undefined, 'below');
                        }
                        clearDragState();
                      }}
                      className={`p-2.5 rounded-xl border-2 border-dashed transition-all text-center text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                        dragOverStage === stage && !dragOverTargetId
                          ? 'border-amber-400 bg-amber-500/15 text-amber-300 ring-2 ring-amber-400/40 shadow-lg'
                          : 'border-neutral-800 text-neutral-500 hover:border-neutral-700 hover:text-neutral-400'
                      }`}
                    >
                      <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                      <span>Drop to place at end of line queue (Position #{stageOrders.length + 1})</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
