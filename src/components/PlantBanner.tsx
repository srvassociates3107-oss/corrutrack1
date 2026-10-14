import React from 'react';
import { FactorySettings } from '../types/order';
import plantFloorImg from '../assets/images/corrugated_plant_floor_1790330452848.jpg';
import boxPackagingImg from '../assets/images/corrugated_boxes_packaging_1790330468180.jpg';
import flutingMacroImg from '../assets/images/box_specs_fluting_macro_1790330481444.jpg';
import { ShieldCheck, MessageSquare, Zap, Clock, Users, Mail } from 'lucide-react';

interface PlantBannerProps {
  settings: FactorySettings;
  currentRole: 'operator' | 'owner' | 'dispatch' | 'customer';
  onChangeRole: (role: 'operator' | 'owner' | 'dispatch' | 'customer') => void;
  onOpenNewOrder: () => void;
  onOpenDailySummaryEmail?: () => void;
  onOpenInAppWhatsApp?: () => void;
}

export const PlantBanner: React.FC<PlantBannerProps> = ({
  settings,
  currentRole,
  onChangeRole,
  onOpenNewOrder,
  onOpenDailySummaryEmail,
  onOpenInAppWhatsApp,
}) => {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl relative overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Business context & Transparency proposition */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
              {settings.companyName}
            </span>
            <span className="text-neutral-500">·</span>
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Automated 3-Way Notification Engine
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Zero-Delay Corrugated Packaging Supply Chain
          </h1>

          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-xl">
            When software operators log stage completion, instant WhatsApp alerts with expected delivery ETAs automatically dispatch to the customer, plant owner, and logistics crew—leaving zero orders forgotten.
          </p>

          {/* Interactive Role Switcher for testing all viewpoints */}
          <div className="pt-2">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Stakeholder Perspective:</span>
            </div>

            <div className="flex flex-wrap gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded-xl max-w-md">
              <button
                type="button"
                onClick={() => onChangeRole('operator')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  currentRole === 'operator'
                    ? 'bg-amber-400 text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                🏭 Software Operating Guy
              </button>
              <button
                type="button"
                onClick={() => onChangeRole('owner')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  currentRole === 'owner'
                    ? 'bg-amber-400 text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                👑 Business Owner / MD
              </button>
              <button
                type="button"
                onClick={() => onChangeRole('dispatch')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  currentRole === 'dispatch'
                    ? 'bg-amber-400 text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                🚚 Dispatch & Fleet
              </button>
              <button
                type="button"
                onClick={() => onChangeRole('customer')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  currentRole === 'customer'
                    ? 'bg-amber-400 text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                👤 Order Placing Client
              </button>
            </div>

            {/* Direct Quick Actions for Owner Email Summary & Embedded In-App WhatsApp */}
            <div className="flex flex-wrap items-center gap-2 pt-3">
              {onOpenDailySummaryEmail && (
                <button
                  type="button"
                  onClick={onOpenDailySummaryEmail}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span>Send Daily Summary Email to Owner ({settings.ownerEmail || settings.owners?.[0]?.email || 'sunil.verma@srvpackaging.com'})</span>
                </button>
              )}

              {onOpenInAppWhatsApp && (
                <button
                  type="button"
                  onClick={onOpenInAppWhatsApp}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Open Embedded In-App WhatsApp (No External Tab)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Visual Imagery Trio */}
        <div className="lg:col-span-5 grid grid-cols-3 gap-2 h-44 sm:h-48">
          <div className="col-span-2 relative rounded-xl overflow-hidden border border-neutral-800 group">
            <img
              src={plantFloorImg}
              alt="Corrugator machinery line"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2.5">
              <span className="text-[11px] font-medium text-white">
                Auto-Corrugation & Fluting Line
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="relative rounded-xl overflow-hidden border border-neutral-800 flex-1 group">
              <img
                src={boxPackagingImg}
                alt="Stacked corrugated cartons"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-1.5">
                <span className="text-[9px] font-medium text-neutral-200">
                  Finished RSC
                </span>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-neutral-800 flex-1 group">
              <img
                src={flutingMacroImg}
                alt="Corrugated flute structure"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-1.5">
                <span className="text-[9px] font-medium text-neutral-200">
                  Flute Matrix
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
