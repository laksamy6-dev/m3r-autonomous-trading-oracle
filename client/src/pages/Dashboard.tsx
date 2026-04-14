import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LiveStatusBanner } from '../components/shared/LiveStatusBanner';
import { PortfolioCard } from '../components/dashboard/PortfolioCard';
import { PositionsTable } from '../components/dashboard/PositionsTable';
import { NeuralFeedPanel } from '../components/dashboard/NeuralFeedPanel';
import { LiveOrderEntry } from '../components/dashboard/LiveOrderEntry';
import { useLiveData } from '../hooks/useLiveData';
import type { LivePortfolio } from '../types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'neural' | 'orders'>('overview');
  const [iq, setIq] = useState<number>(0);
  const { data: portfolio, isConnected } = useLiveData<LivePortfolio>('portfolio_updates');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/lamy/autonomy-status');
        const data = await response.json();
        setIq(data.iq || 0);
      } catch (err) { console.error('Status fetch failed:', err); }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <LiveStatusBanner />
      
      <nav className="border-b border-slate-800 bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">M3R Trading Oracle</h1>
            <div className="flex gap-1">
              <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg text-sm ${activeTab === 'overview' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}>Overview</button>
              <button onClick={() => setActiveTab('neural')} className={`px-4 py-2 rounded-lg text-sm ${activeTab === 'neural' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}>Neural</button>
              <button onClick={() => setActiveTab('orders')} className={`px-4 py-2 rounded-lg text-sm ${activeTab === 'orders' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}>Orders</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">IQ: <span className="text-blue-400 font-mono">{iq.toFixed(0)}</span></span>
            <button onClick={() => navigate('/settings')} className="px-3 py-1 bg-slate-800 rounded hover:bg-slate-700 text-sm">Settings</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <PortfolioCard portfolio={portfolio} isConnected={isConnected} />
              <LiveOrderEntry compact={true} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PositionsTable positions={portfolio?.positions || []} />
              <NeuralFeedPanel compact={true} />
            </div>
          </div>
        )}
        {activeTab === 'neural' && <NeuralFeedPanel fullHeight={true} />}
        {activeTab === 'orders' && <div className="max-w-2xl mx-auto"><LiveOrderEntry /></div>}
      </main>
    </div>
  );
};
