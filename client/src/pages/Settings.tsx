import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Shield, Key, Save, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

interface VaultKey {
  id: string;
  label: string;
  category: string;
  hasValue: boolean;
  maskedValue: string;
}

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [keys, setKeys] = useState<VaultKey[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const response = await fetch('/api/vault/keys');
      const data = await response.json();
      if (data.keys) setKeys(data.keys);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load keys' });
    }
  };

  const handleSave = async (keyId: string) => {
    if (!values[keyId]) return;
    setSaving(true);
    try {
      const response = await fetch('/api/vault/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId, value: values[keyId] })
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: `${keyId} updated` });
        setValues(prev => ({ ...prev, [keyId]: '' }));
        fetchKeys();
      } else {
        throw new Error(data.error || 'Failed');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const grouped = keys.reduce((acc: Record<string, VaultKey[]>, key) => {
    if (!acc[key.category]) acc[key.category] = [];
    acc[key.category].push(key);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-blue-500" />VAULT Configuration</h1>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-950 border-green-600 text-green-400' : 'bg-red-950 border-red-600 text-red-400'}`}>
            {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            {message.text}
          </div>
        )}

        {Object.entries(grouped).map(([category, items]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-white text-lg font-bold capitalize flex items-center gap-2"><Key className="h-5 w-5 text-blue-500" />{category} Keys</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((key) => (
                <div key={key.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-slate-800/50 rounded-lg">
                  <div>
                    <div className="font-medium text-white">{key.label}</div>
                    <div className="text-xs text-slate-400 font-mono">{key.id}</div>
                  </div>
                  <Badge className={key.hasValue ? "bg-green-600" : "bg-red-600"}>
                    {key.hasValue ? 'Configured' : 'Missing'}
                  </Badge>
                  <div className="flex gap-2">
                    <Input type="password" placeholder={key.hasValue ? 'Update...' : 'Enter...'} value={values[key.id] || ''} onChange={(e) => setValues(prev => ({ ...prev, [key.id]: e.target.value }))} />
                    <Button onClick={() => handleSave(key.id)} disabled={!values[key.id] || saving} className="bg-blue-600 hover:bg-blue-700"><Save className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
