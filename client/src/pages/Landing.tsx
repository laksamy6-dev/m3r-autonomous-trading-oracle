import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Zap, Brain, Shield, Activity, LucideIcon } from 'lucide-react';

interface SystemStatus {
  backend: boolean;
  database: boolean;
  neural: boolean;
  marketOpen: boolean;
}

interface StatusCardProps {
  icon: LucideIcon;
  label: string;
  status: boolean;
}

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    backend: false, database: false, neural: false, marketOpen: false
  });

  useEffect(() => {
    const checkSystems = async () => {
      try {
        const health = await fetch('/api/health').then(r => r.json()).catch(() => ({ status: 'error' }));
        const autonomy = await fetch('/api/lamy/autonomy-status').then(r => r.json()).catch(() => ({}));
        setSystemStatus({
          backend: health.status === 'ok',
          database: autonomy.checks?.find((c: any) => c.id === 'upstox_keys')?.ok || false,
          neural: autonomy.gemini || false,
          marketOpen: autonomy.marketOpen || false
        });
      } catch (e) { console.error('System check failed:', e); }
    };
    checkSystems();
    const interval = setInterval(checkSystems, 30000);
    return () => clearInterval(interval);
  }, []);

  const allSystemsGo = systemStatus.backend && systemStatus.database && systemStatus.neural;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="border-b border-slate-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-500" />
            <span className="text-xl font-bold">M3R TRADING ORACLE</span>
          </div>
          <Badge className={allSystemsGo ? "bg-green-600" : "bg-red-600"}>
            {allSystemsGo ? "🟢 OPERATIONAL" : "🟡 DEGRADED"}
          </Badge>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full text-center space-y-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            LAMY Neural Brain v3.0
          </h1>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <StatusCard icon={Activity} label="Backend" status={systemStatus.backend} />
            <StatusCard icon={Shield} label="VAULT" status={systemStatus.database} />
            <StatusCard icon={Brain} label="Neural" status={systemStatus.neural} />
            <StatusCard icon={Zap} label="Market" status={systemStatus.marketOpen} />
          </div>

          <div className="bg-red-950/50 border border-red-600 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-red-400 font-semibold">🔴 LIVE TRADING MODE</p>
            <p className="text-red-300/80 text-sm">Real trades in LIVE markets. Paper trading DISABLED.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8" onClick={() => navigate('/dashboard')} disabled={!allSystemsGo}>
              Enter Dashboard
            </Button>
            <Button size="lg" variant="outline" className="border-slate-600 text-lg px-8" onClick={() => navigate('/settings')}>
              VAULT Settings
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

const StatusCard: React.FC<StatusCardProps> = ({ icon: Icon, label, status }) => (
  <div className={`p-4 rounded-lg border ${status ? 'border-green-600 bg-green-950/30' : 'border-red-600 bg-red-950/30'}`}>
    <Icon className={`h-6 w-6 mx-auto mb-2 ${status ? 'text-green-500' : 'text-red-500'}`} />
    <div className="text-xs font-medium text-slate-300">{label}</div>
    <div className={`text-xs font-bold ${status ? 'text-green-400' : 'text-red-400'}`}>{status ? 'ONLINE' : 'OFFLINE'}</div>
  </div>
);
