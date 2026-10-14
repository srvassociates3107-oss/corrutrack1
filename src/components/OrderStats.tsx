import React, { useState } from 'react';
import { CorrugatedOrder } from '../types/order';
import { calculateSLA, formatCurrency } from '../utils/whatsapp';
import { 
  AlertTriangle, 
  Boxes, 
  Clock, 
  CheckCircle2, 
  Truck, 
  PackageCheck, 
  BarChart3, 
  Layers, 
  Activity, 
  ChevronDown, 
  ChevronUp, 
  Info 
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';

interface OrderStatsProps {
  orders: CorrugatedOrder[];
  onSelectFilter: (filter: string) => void;
}

export const OrderStats: React.FC<OrderStatsProps> = ({ orders, onSelectFilter }) => {
  const [metricMode, setMetricMode] = useState<'orders' | 'volume'>('orders');
  const [showChart, setShowChart] = useState(true);

  const activeOrders = orders.filter((o) => o.currentStage !== 'DELIVERED');
  const inProduction = orders.filter(
    (o) => o.currentStage === 'BOARD_PROCESSING' || o.currentStage === 'PRINTING_SLOTTING'
  );
  const outForDelivery = orders.filter((o) => o.currentStage === 'OUT_FOR_DELIVERY');
  const delivered = orders.filter((o) => o.currentStage === 'DELIVERED');

  const delayedOrAtRisk = activeOrders.filter((o) => {
    const sla = calculateSLA(o);
    return sla.isOverdue || sla.isAtRisk;
  });

  const totalBoxesInPipeline = activeOrders.reduce((sum, o) => sum + o.quantity, 0);
  const totalPipelineValue = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  // Calculate daily output capacity based on orders marked as 'DELIVERED' for the current day
  const todayStr = new Date().toDateString();
  const deliveredTodayOrders = orders.filter((o) => {
    if (o.currentStage !== 'DELIVERED') return false;

    // Check logistics delivered timestamp
    if (o.logistics?.deliveredAt) {
      const dDate = new Date(o.logistics.deliveredAt);
      if (dDate.toDateString() === todayStr) return true;
      if (Date.now() - dDate.getTime() <= 24 * 3600 * 1000 && dDate.getDate() === new Date().getDate()) {
        return true;
      }
    }

    // Check stageHistory for DELIVERED stage
    const deliveredStep = o.stageHistory?.find((s) => s.stage === 'DELIVERED');
    if (deliveredStep) {
      const sDate = new Date(deliveredStep.timestamp);
      if (sDate.toDateString() === todayStr) return true;
      if (Date.now() - sDate.getTime() <= 24 * 3600 * 1000 && sDate.getDate() === new Date().getDate()) {
        return true;
      }
    }

    return false;
  });

  const dailyOutputBoxes = deliveredTodayOrders.reduce((sum, o) => sum + o.quantity, 0);
  const dailyOutputValue = deliveredTodayOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  // Stage workload & bottleneck data distribution for Recharts
  const stageData = [
    {
      stageKey: 'ORDER_PLACED',
      name: 'Order Placed',
      shortName: 'Placed',
      color: '#3B82F6', // Blue
    },
    {
      stageKey: 'BOARD_PROCESSING',
      name: 'Board Corrugation',
      shortName: 'Corrugation',
      color: '#EAB308', // Amber
    },
    {
      stageKey: 'PRINTING_SLOTTING',
      name: 'Printing & Finishing',
      shortName: 'Finishing',
      color: '#8B5CF6', // Purple
    },
    {
      stageKey: 'READY_FOR_DISPATCH',
      name: 'Ready for Dispatch',
      shortName: 'Bundled',
      color: '#06B6D4', // Cyan
    },
    {
      stageKey: 'OUT_FOR_DELIVERY',
      name: 'Out for Delivery',
      shortName: 'In Transit',
      color: '#F97316', // Orange
    },
    {
      stageKey: 'DELIVERED',
      name: 'Delivered',
      shortName: 'Delivered',
      color: '#10B981', // Emerald
    },
  ].map((st) => {
    const stageOrders = orders.filter((o) => o.currentStage === st.stageKey);
    const boxCount = stageOrders.reduce((sum, o) => sum + o.quantity, 0);
    const value = stageOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const stageDelayedCount = stageOrders.filter((o) => {
      const sla = calculateSLA(o);
      return sla.isOverdue || sla.isAtRisk;
    }).length;

    return {
      ...st,
      ordersCount: stageOrders.length,
      boxVolume: boxCount,
      totalValue: value,
      delayedCount: stageDelayedCount,
    };
  });

  // Identify bottleneck stage
  const activeStages = stageData.filter((s) => s.stageKey !== 'DELIVERED');
  const bottleneckStage = [...activeStages].sort((a, b) => {
    if (b.delayedCount !== a.delayedCount) return b.delayedCount - a.delayedCount;
    return b.boxVolume - a.boxVolume;
  })[0];

  // Custom Dark Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof stageData[0] }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-neutral-900 border border-neutral-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[210px] z-50">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
              <span>{data.name}</span>
            </div>
            <span className="font-mono text-neutral-300 font-bold">
              {data.ordersCount} {data.ordersCount === 1 ? 'batch' : 'batches'}
            </span>
          </div>

          <div className="flex justify-between text-neutral-300">
            <span className="text-neutral-500">Box Units:</span>
            <span className="font-mono font-bold text-white">{data.boxVolume.toLocaleString()} pcs</span>
          </div>

          <div className="flex justify-between text-neutral-300">
            <span className="text-neutral-500">Stage Value:</span>
            <span className="font-mono text-emerald-400 font-medium">{formatCurrency(data.totalValue)}</span>
          </div>

          {data.delayedCount > 0 ? (
            <div className="flex items-center gap-1 text-rose-400 font-medium pt-1 border-t border-neutral-800">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>{data.delayedCount} batch(es) at SLA risk!</span>
            </div>
          ) : (
            <div className="text-[11px] text-emerald-400/80 pt-0.5 font-mono">
              On Schedule
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-3 mb-6">
      {/* 6 Key Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Active Work Orders */}
        <div 
          onClick={() => onSelectFilter('active')}
          className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 p-4 rounded-xl cursor-pointer transition-all hover:bg-neutral-800/40"
        >
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
            <span>Active Orders</span>
            <Boxes className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            {activeOrders.length}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            {totalBoxesInPipeline.toLocaleString()} boxes running
          </div>
        </div>

        {/* In Corrugation & Finishing */}
        <div 
          onClick={() => onSelectFilter('in_production')}
          className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 p-4 rounded-xl cursor-pointer transition-all hover:bg-neutral-800/40"
        >
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
            <span>On Machines</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-blue-400">
            {inProduction.length}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            Fluting & Flexo lines
          </div>
        </div>

        {/* Out for Delivery */}
        <div 
          onClick={() => onSelectFilter('out_for_delivery')}
          className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 p-4 rounded-xl cursor-pointer transition-all hover:bg-neutral-800/40"
        >
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
            <span>In Transit</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-400">
            {outForDelivery.length}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            En route to docks
          </div>
        </div>

        {/* Delayed or At Risk (Anti-Delay Watch) */}
        <div 
          onClick={() => onSelectFilter('delayed')}
          className={`border p-4 rounded-xl cursor-pointer transition-all ${
            delayedOrAtRisk.length > 0
              ? 'bg-rose-950/20 border-rose-900/60 hover:border-rose-700'
              : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
            <span className={delayedOrAtRisk.length > 0 ? 'text-rose-400 font-semibold' : ''}>
              SLA Risk / Delayed
            </span>
            <AlertTriangle className={`w-4 h-4 ${delayedOrAtRisk.length > 0 ? 'text-rose-400' : 'text-neutral-500'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono tabular-nums ${delayedOrAtRisk.length > 0 ? 'text-rose-400' : 'text-neutral-300'}`}>
            {delayedOrAtRisk.length}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            {delayedOrAtRisk.length > 0 ? 'Needs immediate push' : 'Zero delayed orders'}
          </div>
        </div>

        {/* Total Daily Output Capacity (Delivered Today) */}
        <div 
          onClick={() => onSelectFilter('delivered')}
          className="bg-neutral-900 border border-neutral-800 hover:border-emerald-700/60 p-4 rounded-xl cursor-pointer transition-all hover:bg-emerald-950/15 group"
        >
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
            <span className="text-emerald-400 font-semibold">Daily Output (Today)</span>
            <PackageCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
            {dailyOutputBoxes.toLocaleString()}
            <span className="text-xs font-normal text-neutral-400 ml-1">pcs</span>
          </div>
          <div className="text-xs text-neutral-300 font-mono mt-1 truncate" title={formatCurrency(dailyOutputValue)}>
            {formatCurrency(dailyOutputValue)} <span className="text-neutral-500">· {deliveredTodayOrders.length} {deliveredTodayOrders.length === 1 ? 'order' : 'orders'}</span>
          </div>
        </div>

        {/* Total Active Pipeline Valuation */}
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
            <span>Active Pipeline</span>
            <span className="text-neutral-400 text-xs font-mono font-medium">In Queue</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-white truncate" title={formatCurrency(totalPipelineValue)}>
            {formatCurrency(totalPipelineValue)}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            {activeOrders.length} orders in factory
          </div>
        </div>
      </div>

      {/* RECHARTS DATA VISUALIZATION PANEL: Production Stage Distribution & Bottleneck Analysis */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400/10 text-amber-400 rounded-lg">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Stage Workload & Production Bottleneck Distribution
                </h3>
                {bottleneckStage && bottleneckStage.ordersCount > 0 && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                    bottleneckStage.delayedCount > 0
                      ? 'bg-rose-950/60 text-rose-400 border border-rose-900/60'
                      : 'bg-amber-950/60 text-amber-400 border border-amber-900/60'
                  }`}>
                    Highest Queue: {bottleneckStage.name} ({bottleneckStage.ordersCount} {bottleneckStage.ordersCount === 1 ? 'job' : 'jobs'})
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Real-time batch distribution across converting lines to prevent machine starvation and shipping delays
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Metric Mode Toggle */}
            <div className="flex items-center p-0.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setMetricMode('orders')}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                  metricMode === 'orders'
                    ? 'bg-neutral-800 text-amber-400 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Work Order Batches
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('volume')}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                  metricMode === 'volume'
                    ? 'bg-neutral-800 text-amber-400 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Box Volume (Units)
              </button>
            </div>

            {/* Toggle show/hide */}
            <button
              type="button"
              onClick={() => setShowChart(!showChart)}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              title={showChart ? 'Collapse Chart' : 'Expand Chart'}
            >
              {showChart ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Bar Chart Visualization */}
        {showChart && (
          <div className="pt-4">
            <div className="h-60 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stageData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="shortName"
                    stroke="#737373"
                    tick={{ fill: '#a3a3a3', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#404040' }}
                  />
                  <YAxis
                    stroke="#737373"
                    tick={{ fill: '#a3a3a3', fontSize: 10, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={{ stroke: '#404040' }}
                    tickFormatter={(val) =>
                      metricMode === 'volume'
                        ? val >= 1000
                          ? `${(val / 1000).toFixed(0)}k`
                          : String(val)
                        : String(val)
                    }
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                  />
                  <Bar
                    dataKey={metricMode === 'orders' ? 'ordersCount' : 'boxVolume'}
                    radius={[6, 6, 0, 0]}
                    animationDuration={600}
                    onClick={(entry: unknown) => {
                      const data = entry as { stageKey?: string; payload?: { stageKey?: string } } | undefined;
                      const stageKey = data?.stageKey || data?.payload?.stageKey;
                      if (stageKey) {
                        if (stageKey === 'DELIVERED') {
                          onSelectFilter('delivered');
                        } else if (stageKey === 'OUT_FOR_DELIVERY') {
                          onSelectFilter('out_for_delivery');
                        } else if (
                          stageKey === 'BOARD_PROCESSING' ||
                          stageKey === 'PRINTING_SLOTTING'
                        ) {
                          onSelectFilter('in_production');
                        } else {
                          onSelectFilter('active');
                        }
                      }
                    }}
                    cursor="pointer"
                  >
                    {stageData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        opacity={entry.delayedCount > 0 ? 1 : 0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Stage Legend & Bottleneck Health Checklist */}
            <div className="pt-3 border-t border-neutral-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              {stageData.map((st) => (
                <div
                  key={st.stageKey}
                  onClick={() => {
                    if (st.stageKey === 'DELIVERED') onSelectFilter('delivered');
                    else if (st.stageKey === 'OUT_FOR_DELIVERY') onSelectFilter('out_for_delivery');
                    else if (st.stageKey === 'BOARD_PROCESSING' || st.stageKey === 'PRINTING_SLOTTING')
                      onSelectFilter('in_production');
                    else onSelectFilter('active');
                  }}
                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                    st.delayedCount > 0
                      ? 'bg-rose-950/20 border-rose-900/60 hover:border-rose-700'
                      : 'bg-neutral-950 border-neutral-800/80 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white truncate max-w-[90px]" title={st.name}>
                      {st.shortName}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: st.color }}
                    />
                  </div>
                  <div className="flex items-baseline justify-between text-neutral-400 font-mono">
                    <span className="text-sm font-bold text-white">
                      {st.ordersCount} <span className="text-[10px] font-normal text-neutral-500">batches</span>
                    </span>
                    <span className="text-[10px] text-neutral-400 truncate">
                      {st.boxVolume.toLocaleString()} pcs
                    </span>
                  </div>
                  {st.delayedCount > 0 && (
                    <div className="text-[10px] text-rose-400 font-medium mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                      <span>{st.delayedCount} delayed</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
