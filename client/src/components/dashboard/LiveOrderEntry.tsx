import React, { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

interface LiveOrderEntryProps {
  compact?: boolean;
}

export const LiveOrderEntry = React.memo<LiveOrderEntryProps>(({ compact }) => {
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{success: boolean; message: string} | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !quantity || loading) return;
    
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/orders/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.toUpperCase().trim(),
          side,
          quantity: parseFloat(quantity),
          type: 'MARKET'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult({
          success: true,
          message: `✅ LIVE ORDER EXECUTED: ${side} ${quantity} ${symbol.toUpperCase()} @ ${data.fillPrice || 'MARKET'}`
        });
        setSymbol('');
        setQuantity('');
      } else {
        throw new Error(data.error || 'Order execution failed');
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: `❌ ERROR: ${err.message}`
      });
    } finally {
      setLoading(false);
    }
  }, [symbol, quantity, side, loading]);

  return (
    <Card className={compact ? '' : 'border-2 border-red-600/50'}>
      {!compact && (
        <CardHeader className="bg-red-950/30 border-b border-red-900/50 pb-4">
          <Alert variant="destructive" className="border-red-600 bg-red-950/50 text-red-100">
            <AlertTitle className="text-red-400 font-bold flex items-center gap-2">
              ⚠️ LIVE MARKET EXECUTION
            </AlertTitle>
            <AlertDescription className="text-red-300/90 text-sm">
              Orders execute <strong>immediately</strong> in real markets with real capital.
            </AlertDescription>
          </Alert>
        </CardHeader>
      )}
      
      <CardContent className={compact ? 'p-4' : 'pt-6'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={side === 'BUY' ? 'default' : 'outline'}
              onClick={() => setSide('BUY')}
              className={side === 'BUY' ? 'flex-1 bg-green-600 hover:bg-green-700' : 'flex-1 border-slate-600'}
              disabled={loading}
            >
              BUY
            </Button>
            <Button
              type="button"
              variant={side === 'SELL' ? 'default' : 'outline'}
              onClick={() => setSide('SELL')}
              className={side === 'SELL' ? 'flex-1 bg-red-600 hover:bg-red-700' : 'flex-1 border-slate-600'}
              disabled={loading}
            >
              SELL
            </Button>
          </div>

          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Symbol (e.g. BTC-USD)"
            className="uppercase bg-slate-950 border-slate-600"
            required
            disabled={loading}
          />

          <Input
            type="number"
            step="0.0001"
            min="0.0001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantity"
            className="bg-slate-950 border-slate-600"
            required
            disabled={loading}
          />

          <Button 
            type="submit" 
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
            disabled={loading || !symbol || !quantity}
          >
            {loading ? '⏳ EXECUTING...' : `🔴 EXECUTE LIVE ${side}`}
          </Button>
        </form>

        {result && (
          <div className={`mt-3 p-3 rounded text-sm ${result.success ? 'bg-green-950/50 text-green-400 border border-green-600/50' : 'bg-red-950/50 text-red-400 border border-red-600/50'}`}>
            {result.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

LiveOrderEntry.displayName = 'LiveOrderEntry';
