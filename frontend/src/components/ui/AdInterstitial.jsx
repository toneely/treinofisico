import React, { useEffect } from 'react';
import { X, ShieldAlert } from 'lucide-react';

const AdInterstitial = ({ show, onClose, isPremium }) => {
  useEffect(() => {
    if (show && isPremium) {
      onClose();
    }
  }, [show, isPremium, onClose]);

  if (!show || isPremium) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950 animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm flex flex-col items-center text-center">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6 border border-white/10">
          <ShieldAlert size={40} className="text-white/20" />
        </div>

        <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">
          Anúncio de Teste
        </h2>

        <p className="text-slate-400 text-sm mb-8 font-medium">
          Esta é uma simulação do intersticial do AdSense. Em produção, este espaço será ocupado por anúncios reais.
        </p>

        <div className="w-full aspect-square bg-white/5 rounded-[40px] border border-white/5 flex items-center justify-center mb-8">
           <div className="text-[10px] font-black text-white/10 uppercase tracking-[0.5em] rotate-12">
             Espaço Publicitário
           </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-4 bg-white text-black rounded-2xl font-bold active:scale-95 transition-all shadow-xl"
        >
          Fechar Anúncio
        </button>

        <p className="mt-4 text-[8px] font-bold text-slate-600 uppercase tracking-widest">
          Modo Debug • Intersticial Fallback
        </p>
      </div>
    </div>
  );
};

export default AdInterstitial;
