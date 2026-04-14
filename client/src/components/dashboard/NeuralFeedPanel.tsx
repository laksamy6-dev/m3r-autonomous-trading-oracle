import React, { memo } from 'react';
import { useLiveData } from '../../hooks/useLiveData';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import type { NeuralSignal } from '../../types';

interface NeuralFeedPanelProps {
  compact?: boolean;
  fullHeight?: boolean;
}

export const NeuralFeedPanel = memo<NeuralFeedPanelProps>(({ compact, fullHeight }) => {
  const { data: signals, isConnected, lastUpdate } = useLiveData<NeuralSignal[]>('neural_feed', []);

  const heightClass = fullHeight ? 'h-[calc(100vh-180px)]' : compact ? 'h-[300px]' : 'h-[500px]';

  const getSignalColor = (type: string) => {
    switch(type) {
      case 'TRADE': return 'border-yellow-500 text-yellow-400';
      case 'ALERT': return 'border-red-500 text-red-400';
      case 'PREDICTION': return 'border-blue-500 text-blue-400';
      default: return 'border-green-500 text-green-400';
    }
  };

  return (
    <div className={`${heightClass} bg-slate-950 text-green-400 font-mono rounded-lg border border-green-500/30 overflow-hidden flex flex-col`}>
      <div className="p-3 border-b border-green-500/30 flex justify-between items-center bg-green-950/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="font-bold text-sm tracking-wider text-white">LAMY NEURAL BRAIN</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-green-500 text-green-400 text-xs">
            IQ: {signals?.[0]?.iq_score?.toFixed(0) || '---'}
          </Badge>
          {lastUpdate && (
            <span className="text-xs text-green-600/70">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-1.5">
          {signals?.slice(0, 100).map((signal, idx) => (
            <div 
              key={`\${signal.timestamp}-\${idx}`}
              className="flex gap-2 text-xs p-1.5 rounded hover:bg-green-900/20 border-b border-green-900/20 last:border-0 items-start"
            >
              <span className="text-slate-500 shrink-0 w-16 pt-0.5">
                {new Date(signal.timestamp).toLocaleTimeString()}
              </span>
              
              <Badge 
                variant="outline" 
                className={`shrink-0 text-[10px] h-5 ${getSignalColor(signal.type)}`}
              >
                {signal.type}
              </Badge>
              
              <span className="font-bold text-white shrink-0 w-14 truncate">
                {signal.symbol}
              </span>
              
              <span className="flex-1 text-green-300 leading-tight min-w-0 truncate">
                {signal.message}
              </span>
              
              <span className="text-slate-500 shrink-0 w-8 text-right">
                {(signal.confidence * 100).toFixed(0)}%
              </span>
            </div>
          ))}
          
          {(!signals || signals.length === 0) && (
            <div className="text-center py-12 text-slate-600">
              <div className="text-4xl mb-2">🧠</div>
              <p>Waiting for neural signals...</p>
              <p className="text-xs mt-1">Ensure LAMY brain is initialized</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
});

NeuralFeedPanel.displayName = 'NeuralFeedPanel';
