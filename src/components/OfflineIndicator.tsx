import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-neutral-950 shadow-xl border border-amber-300 no-print">
      <span className="h-2.5 w-2.5 rounded-full bg-neutral-950 animate-pulse" />
      <span>Offline Mode — Cached plant data is active; changes will sync when reconnected.</span>
    </div>
  );
};
