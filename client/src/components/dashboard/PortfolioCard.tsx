import React, { memo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import type { LivePortfolio } from '../../types';

interface PortfolioCardProps {
  portfolio: LivePortfolio | null;
  isConnected: boolean;
}

export const PortfolioCard = memo<PortfolioCardProps>(({ portfolio, isConnected }) => {
  if (!portfolio) {
    return (
      <Card className="border-2 border-blue-600/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-blue-500 text-2xl">$</span>
            Live Portfolio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-slate-400 animate-pulse">Loading live market data...</div>
        </CardContent>
      </Card>
    );
  }

  const isPositive = portfolio.dayPnL >= 0;
  const pnlPercent = portfolio.totalValue > 0 
    ? ((portfolio.dayPnL / portfolio.totalValue) * 100).toFixed(2) 
    : '0.00';

  return (
    <Card className="border-2 border-blue-600/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <span className="text-blue-500 text-2xl">$</span>
          Live Portfolio
        </CardTitle>
        <Badge variant={isConnected ? "default" : "destructive"} className={isConnected ? "bg-green-600" : ""}>
          {isConnected ? "● LIVE" : "○ OFFLINE"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-400 mb-1">Total Equity</p>
            <p className="text-3xl font-bold tracking-tight">
              ${portfolio.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-slate-400">Day P&L:</span>
            <span className={`text-lg font-semibold flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '▲' : '▼'}
              {isPositive ? '+' : '-'}${Math.abs(portfolio.dayPnL).toFixed(2)}
              <span className="text-sm opacity-75">({isPositive ? '+' : ''}{pnlPercent}%)</span>
            </span>
          </div>

          <div className="text-xs text-slate-500 pt-2 border-t border-slate-800">
            Positions: {portfolio.positions.length} • Updated: {new Date(portfolio.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

PortfolioCard.displayName = 'PortfolioCard';
