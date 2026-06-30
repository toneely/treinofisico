import { AlertCircle } from 'lucide-react';

const GracePeriodBanner = () => {
  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold animate-in slide-in-from-top duration-500 sticky top-0 z-[100]">
      <AlertCircle size={18} />
      <span>Assinatura em atraso. Regularize seu pagamento para evitar interrupções.</span>
    </div>
  );
};

export default GracePeriodBanner;
