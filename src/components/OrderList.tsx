import React from 'react';
import { CorrugatedOrder, FactorySettings } from '../types/order';
import { STAGE_CONFIG, calculateSLA, formatCurrency, formatDateTime, buildWhatsappLink, generateCustomerWhatsappMessage } from '../utils/whatsapp';
import { getProductCatalogItem } from '../utils/productCatalog';
import { Clock, Eye, Printer, ArrowRight, MessageSquare, AlertTriangle, CheckCircle2, QrCode, Sparkles, FileSearch, Edit3, Trash2 } from 'lucide-react';

interface OrderListProps {
  orders: CorrugatedOrder[];
  settings: FactorySettings;
  onOpenStageUpdate: (order: CorrugatedOrder) => void;
  onOpenJobCard: (order: CorrugatedOrder) => void;
  onOpenTracker: (orderId: string) => void;
  onOpenQR: (order: CorrugatedOrder) => void;
  onOpenWhatsAppPlugin?: (order: CorrugatedOrder) => void;
  onOpenInteractiveCard?: (order: CorrugatedOrder) => void;
  onOpenStageDelay?: (order: CorrugatedOrder) => void;
  onReviewOrder?: (order: CorrugatedOrder) => void;
  onEditOrder?: (order: CorrugatedOrder) => void;
  onDeleteOrder?: (order: CorrugatedOrder) => void;
  searchQuery: string;
  statusFilter: string;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  settings,
  onOpenStageUpdate,
  onOpenJobCard,
  onOpenTracker,
  onOpenQR,
  onOpenWhatsAppPlugin,
  onOpenInteractiveCard,
  onOpenStageDelay,
  onReviewOrder,
  onEditOrder,
  onDeleteOrder,
  searchQuery,
  statusFilter,
}) => {
  const filteredOrders = orders.filter((order) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        order.id.toLowerCase().includes(q) ||
        order.customerCompany.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.customerPhone.toLowerCase().includes(q) ||
        order.ply.toLowerCase().includes(q) ||
        order.boxStyle.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Status filter
    if (statusFilter === 'active') return order.currentStage !== 'DELIVERED';
    if (statusFilter === 'in_production') {
      return order.currentStage === 'BOARD_PROCESSING' || order.currentStage === 'PRINTING_SLOTTING';
    }
    if (statusFilter === 'out_for_delivery') return order.currentStage === 'OUT_FOR_DELIVERY';
    if (statusFilter === 'delayed') {
      const sla = calculateSLA(order);
      return (sla.isOverdue || sla.isAtRisk) && order.currentStage !== 'DELIVERED';
    }
    if (statusFilter === 'delivered') return order.currentStage === 'DELIVERED';

    return true;
  });

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-950/80 text-[11px] text-neutral-400 uppercase font-semibold border-b border-neutral-800">
            <tr>
              <th className="py-3 px-4">Order ID & Client</th>
              <th className="py-3 px-4">Box Technical Specs</th>
              <th className="py-3 px-4 text-right">Volume & Value</th>
              <th className="py-3 px-4">Current Stage</th>
              <th className="py-3 px-4">Delivery SLA & Deadline</th>
              <th className="py-3 px-4 text-right">Operator Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 text-xs">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-500">
                  No corrugated box orders found matching current filter.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const conf = STAGE_CONFIG[order.currentStage];
                const sla = calculateSLA(order);
                const isDelayed = sla.isOverdue && order.currentStage !== 'DELIVERED';

                return (
                  <tr
                    key={order.id}
                    className={`hover:bg-neutral-800/40 transition-colors ${
                      isDelayed ? 'bg-rose-950/10' : ''
                    }`}
                  >
                    {/* ID & Client */}
                    <td className="py-3.5 px-4">
                       <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenTracker(order.id)}
                          className="font-mono font-bold text-amber-400 hover:underline"
                        >
                          {order.id}
                        </button>
                        {order.productType && order.productType !== 'paper_box' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {getProductCatalogItem(order.productType).title.split('(')[0].trim()}
                          </span>
                        )}
                        {order.salesPersonName && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                            👔 {order.salesPersonName.split(' ')[0]}
                          </span>
                        )}
                        {order.priority !== 'Normal' && (
                          <span className="text-[10px] text-rose-400 font-mono font-semibold">
                            {order.priority === 'Emergency Batch' ? 'EMERGENCY' : 'RUSH'}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-white mt-0.5 truncate max-w-[200px]" title={order.customerCompany}>
                        {order.customerCompany}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono">
                        {order.customerPhone}
                      </div>
                    </td>

                    {/* Box / Product Specs */}
                    <td className="py-3.5 px-4 text-neutral-300">
                      <div className="font-medium text-white truncate max-w-[220px]">
                        {order.dimensions.lengthMm} x {order.dimensions.widthMm} x {order.dimensions.heightMm} mm
                      </div>
                      <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 flex-wrap">
                        {order.productSubCategory ? (
                          <span className="text-amber-300 font-medium truncate max-w-[130px]">{order.productSubCategory.split('(')[0].trim()}</span>
                        ) : (
                          <span>{order.ply} · {order.flute}</span>
                        )}
                        {order.lamination && order.lamination !== 'None' && (
                          <span className="text-pink-400 font-medium">· {order.lamination}</span>
                        )}
                        {(!order.productType || order.productType === 'paper_box') && (
                          <span className="text-cyan-400">· {order.paperSpecs.burstingFactor} BF</span>
                        )}
                      </div>
                    </td>

                    {/* Volume & Value */}
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      <div className="font-bold text-white">
                        {order.quantity.toLocaleString()} {order.productType ? getProductCatalogItem(order.productType).defaultUnitName : 'pcs'}
                      </div>
                      <div className="text-[11px] text-emerald-400 font-medium">
                        {formatCurrency(order.totalAmount)}
                      </div>
                    </td>

                    {/* Current Stage */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: conf.color }}
                        />
                        <span className="font-medium text-white">
                          {conf.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5 truncate max-w-[200px]">
                        Step {conf.stepNumber} of 6
                      </div>

                      {order.isStageDelayed && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-300 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-800/80 max-w-[220px] truncate" title={order.currentDelayReason}>
                          <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                          <span className="truncate">Delay +{order.currentDelayHours || 4}h: {order.currentDelayReason}</span>
                        </div>
                      )}
                    </td>

                    {/* Delivery SLA */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="text-neutral-200">
                        {formatDateTime(order.expectedDeliveryDate)}
                      </div>
                      <div className={`flex items-center gap-1 text-[11px] mt-0.5 ${sla.badgeColor}`}>
                        {sla.isOverdue ? (
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{sla.label}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Order Review Button */}
                        {onReviewOrder && (
                          <button
                            type="button"
                            onClick={() => onReviewOrder(order)}
                            title="Review Full Order Details & Stage Audit"
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 rounded border border-amber-500/30 transition-colors"
                          >
                            <FileSearch className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </button>
                        )}

                        {/* Edit Order Button */}
                        {onEditOrder && (
                          <button
                            type="button"
                            onClick={() => onEditOrder(order)}
                            title="Edit Order Specifications, Quantity, Rate & Client Details"
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-blue-300 hover:text-blue-200 bg-blue-500/15 hover:bg-blue-500/25 rounded border border-blue-500/30 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}

                        {/* Delete Order Button */}
                        {onDeleteOrder && (
                          <button
                            type="button"
                            onClick={() => onDeleteOrder(order)}
                            title="Delete Order"
                            className="p-1.5 text-rose-400 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/60 rounded border border-rose-800/50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* WhatsApp Plugin Console Launcher */}
                        {onOpenWhatsAppPlugin && (
                          <button
                            type="button"
                            onClick={() => onOpenWhatsAppPlugin(order)}
                            title="Open WhatsApp Dispatch Console & Plugin"
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 rounded border border-emerald-900/50 transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}

                        {/* Interactive WhatsApp Spec Card & Quick Reply Buttons */}
                        {onOpenInteractiveCard && (
                          <button
                            type="button"
                            onClick={() => onOpenInteractiveCard(order)}
                            title="Generate WhatsApp Interactive Spec Card & Quick Reply Buttons"
                            className="p-1.5 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/80 rounded border border-emerald-700/60 transition-colors"
                          >
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                          </button>
                        )}

                        {/* Technical Job Card Print */}
                        <button
                          onClick={() => onOpenJobCard(order)}
                          title="View & Print Job Card"
                          className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* Order QR Code */}
                        <button
                          onClick={() => onOpenQR(order)}
                          title="Order QR Code Label"
                          className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded transition-colors"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        {/* Customer Live Tracker */}
                        <button
                          onClick={() => onOpenTracker(order.id)}
                          title="Customer Live Tracker"
                          className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Advance Stage & Delay Report */}
                        {order.currentStage !== 'DELIVERED' ? (
                          <div className="flex items-center gap-1 ml-1">
                            {onOpenStageDelay && (
                              <button
                                onClick={() => onOpenStageDelay(order)}
                                title="Report Stage Delay or Bottleneck"
                                className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded border border-rose-900/50 transition-colors"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => onOpenStageUpdate(order)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors whitespace-nowrap"
                            >
                              <span>Update</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px] ml-2">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Done</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
