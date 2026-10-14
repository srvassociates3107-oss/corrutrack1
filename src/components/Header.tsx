import React from 'react';
import { Bell, Plus, Settings, ShieldAlert, Sparkles, MessageSquare, Mail, HardDrive, Globe } from 'lucide-react';
import { NotificationLog, AppTheme } from '../types/order';
import { ThemeSwitcher } from './ThemeSwitcher';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: 'pipeline' | 'orders' | 'delay_radar' | 'tracker' | 'whatsapp_messenger' | 'notifications' | 'google_drive';
  setActiveTab: (tab: 'pipeline' | 'orders' | 'delay_radar' | 'tracker' | 'whatsapp_messenger' | 'notifications' | 'google_drive') => void;
  onOpenNewOrder: () => void;
  onOpenSettings: () => void;
  onOpenDomainSettings?: () => void;
  onOpenNotifications: () => void;
  onOpenTemplateEditor: () => void;
  onOpenInteractiveCard?: () => void;
  onOpenDailySummaryEmail?: () => void;
  recentLogs: NotificationLog[];
  delayedOrdersCount: number;
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  connectedDevicesCount?: number;
  isLiveSynced?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewOrder,
  onOpenSettings,
  onOpenDomainSettings,
  onOpenNotifications,
  onOpenTemplateEditor,
  onOpenInteractiveCard,
  onOpenDailySummaryEmail,

  recentLogs,
  delayedOrdersCount,
  currentTheme,
  onThemeChange,
  connectedDevicesCount = 1,
  isLiveSynced = true,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark adhering to constitution */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('pipeline');
            }}
            className="text-lg font-bold tracking-tight text-white hover:text-amber-400 transition-colors whitespace-nowrap"
          >
            CorruTrack
          </a>
          <span className="hidden sm:inline-block text-xs text-neutral-400 font-mono">
            / Supply Chain Transparency
          </span>
        </div>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`transition-colors whitespace-nowrap ${
              activeTab === 'pipeline'
                ? 'text-amber-400 border-b-2 border-amber-400 py-4 -mb-[2px]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Production Pipeline
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`transition-colors whitespace-nowrap ${
              activeTab === 'orders'
                ? 'text-amber-400 border-b-2 border-amber-400 py-4 -mb-[2px]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            All Work Orders
          </button>
          <button
            onClick={() => setActiveTab('delay_radar')}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'delay_radar'
                ? 'text-amber-400 border-b-2 border-amber-400 py-4 -mb-[2px]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>Delay Prevention Radar</span>
            {delayedOrdersCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('tracker')}
            className={`transition-colors whitespace-nowrap ${
              activeTab === 'tracker'
                ? 'text-amber-400 border-b-2 border-amber-400 py-4 -mb-[2px]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Customer Tracker View
          </button>
          <button
            onClick={() => setActiveTab('whatsapp_messenger')}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'whatsapp_messenger'
                ? 'text-emerald-400 border-b-2 border-emerald-400 py-4 -mb-[2px] font-bold'
                : 'text-emerald-400/90 hover:text-emerald-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>In-App WhatsApp</span>
          </button>
          <button
            onClick={() => setActiveTab('google_drive')}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'google_drive'
                ? 'text-amber-400 border-b-2 border-amber-400 py-4 -mb-[2px] font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span>Google Drive</span>
          </button>
        </nav>

        {/* Zone 3: Actions + Theme + Templates */}
        <div className="flex items-center gap-2">
          {/* Mobile App PWA Install & Real-Time Multi-Device Sync Button */}
          <PWAInstallButton
            connectedDevicesCount={connectedDevicesCount}
            isLiveSynced={isLiveSynced}
          />

          {/* Custom Domain & Publishing Status CTA */}
          {onOpenDomainSettings && (
            <button
              onClick={onOpenDomainSettings}
              title="Publish & Custom Domain Status (www.navyugtrack.in)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-blue-300 hover:text-blue-200 bg-blue-950/70 hover:bg-blue-900/80 border border-blue-600/40 rounded-lg transition-colors whitespace-nowrap shadow-sm"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden xl:inline font-semibold">www.navyugtrack.in</span>
              <span className="xl:hidden font-semibold">Domain</span>
            </button>
          )}

          {/* Theme Switcher */}
          <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />


          {/* Daily Owner Summary Email CTA */}
          {onOpenDailySummaryEmail && (
            <button
              onClick={onOpenDailySummaryEmail}
              title="Generate & Send Daily Order Summary Email to Plant Owner's Registered Email"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-blue-300 hover:text-blue-200 bg-blue-950/70 hover:bg-blue-900/80 border border-blue-600/40 rounded-lg transition-colors whitespace-nowrap"
            >
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden lg:inline font-semibold">Owner Daily Email</span>
            </button>
          )}

          {/* Customize WhatsApp Message Option */}
          <button
            onClick={onOpenTemplateEditor}
            title="Customize WhatsApp Message Templates & Variables"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-300 hover:text-emerald-300 bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/60 rounded-lg transition-colors whitespace-nowrap"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline font-medium">WhatsApp Templates</span>
          </button>

          {/* Interactive WhatsApp Catalog / Spec Card with Buttons */}
          {onOpenInteractiveCard && (
            <button
              onClick={onOpenInteractiveCard}
              title="Design WhatsApp Interactive Spec Card & Action Buttons"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-emerald-300 hover:text-emerald-200 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-600/40 rounded-lg transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline font-medium">Interactive Card</span>
            </button>
          )}

          {/* All Notifications & Audit Hub */}
          <button
            onClick={onOpenNotifications}
            title="All Notifications & Outbound WhatsApp Logs"
            className="relative p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1"
          >
            <Bell className="w-5 h-5" />
            {recentLogs.length > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-amber-400 text-neutral-950 font-mono text-[10px] font-bold flex items-center justify-center">
                {recentLogs.length > 99 ? '99+' : recentLogs.length}
              </span>
            )}
          </button>

          {/* Settings Modal */}
          <button
            onClick={onOpenSettings}
            title="Settings & Contacts"
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* New Order Primary CTA */}
          <button
            onClick={onOpenNewOrder}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Box Order</span>
          </button>
        </div>
      </div>

      {/* Mobile Touch Navigation Bar (Visible on Smartphones / Mobile PWA) */}
      <div className="md:hidden border-t border-neutral-800/80 bg-neutral-950/90 px-3 py-1.5 flex items-center gap-2 overflow-x-auto no-print">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'pipeline'
              ? 'bg-amber-400 text-neutral-950'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          Pipeline
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'orders'
              ? 'bg-amber-400 text-neutral-950'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          Work Orders
        </button>
        <button
          onClick={() => setActiveTab('delay_radar')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
            activeTab === 'delay_radar'
              ? 'bg-amber-400 text-neutral-950'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <span>Delay Radar</span>
          {delayedOrdersCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('tracker')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'tracker'
              ? 'bg-amber-400 text-neutral-950'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          Live Tracker
        </button>
        <button
          onClick={() => setActiveTab('whatsapp_messenger')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-colors ${
            activeTab === 'whatsapp_messenger'
              ? 'bg-emerald-500 text-neutral-950 font-bold'
              : 'text-emerald-400 bg-emerald-950/60 border border-emerald-700/40'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>WhatsApp</span>
        </button>
        <button
          onClick={() => setActiveTab('google_drive')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-colors ${
            activeTab === 'google_drive'
              ? 'bg-amber-400 text-neutral-950 font-bold'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5 text-amber-400" />
          <span>Drive Hub</span>
        </button>
        {onOpenDomainSettings && (
          <button
            onClick={onOpenDomainSettings}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-colors text-blue-300 bg-blue-950/60 border border-blue-700/40 hover:text-white"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Domain</span>
          </button>
        )}
      </div>
    </header>
  );
};
