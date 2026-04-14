import React, { memo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import type { Position } from '../../types';

interface PositionsTableProps {
  positions: Position[];
}

export const PositionsTable = memo<PositionsTableProps>(({ positions }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Positions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {positions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-800 rounded-lg">
              <p>No active positions</p>
              <p className="text-sm mt-1">Use Order Entry to open positions</p>
            </div>
          ) : (
            positions.map((pos) => (
              <div 
                key={pos.symbol} 
                className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="space-y-1">
                  <div className="font-bold text-lg text-white">{pos.symbol}</div>
                  <div className="text-sm text-slate-400">
                    {pos.quantity} units @ ${pos.avgCost.toFixed(2)} avg
                  </div>
                </div>
                
                <div className="text-right space-y-1">
                  <div className="text-xl font-bold text-white">
                    ${pos.currentPrice.toFixed(2)}
                  </div>
                  <div className={`text-sm font-medium ${pos.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pos.unrealizedPnL >= 0 ? '+' : ''}${pos.unrealizedPnL.toFixed(2)}
                    <span className="text-xs ml-1 opacity-75">
                      ({pos.unrealizedPnLPercent.toFixed(2)}%)
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Value: ${pos.marketValue.toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
});

PositionsTable.displayName = 'PositionsTable';
