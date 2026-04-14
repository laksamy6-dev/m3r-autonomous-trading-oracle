import React, { memo } from 'react';

export const LiveStatusBanner = memo(() => {
  return (
    <div className="bg-red-950 border-b border-red-800 text-red-100 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-red-400">🔴 LIVE TRADING MODE</span>
          <span className="text-red-300/80 text-sm ml-2 hidden sm:inline">
            — All orders execute in REAL markets with REAL capital. Paper trading is DISABLED.
          </span>
        </div>
      </div>
    </div>
  );
});

LiveStatusBanner.displayName = 'LiveStatusBanner';
