
import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { verifyCriticalAccessCode } from '../lib/criticalService';

interface AccessCodeModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export default function AccessCodeModal({ onSuccess, onClose }: AccessCodeModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const isValid = await verifyCriticalAccessCode(code);
    if (isValid) {
      onSuccess();
    } else {
      setError('Kode akses salah.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-slate-900 mb-2">Akses Terkunci</h2>
            <p className="text-sm text-slate-500 mb-6">Masukkan kode akses 6 digit untuk melanjutkan.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="w-full text-center text-2xl tracking-widest py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none"
            placeholder="......"
            required
          />
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-50"
          >
            {loading ? 'Memverifikasi...' : 'Buka Akses'}
          </button>
        </form>
      </div>
    </div>
  );
}
