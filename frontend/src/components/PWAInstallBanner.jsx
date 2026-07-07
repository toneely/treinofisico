import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, X } from 'lucide-react';

const PWAInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handler = (e) => {
      // Impede o Chrome 67 e versões anteriores de exibir automaticamente o prompt
      e.preventDefault();
      // Salva o evento para ser acionado posteriormente.
      setDeferredPrompt(e);
      console.log('Evento beforeinstallprompt capturado');
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Verifica se o app já foi instalado
    window.addEventListener('appinstalled', () => {
      console.log('PWA instalado com sucesso');
      setDeferredPrompt(null);
      setIsVisible(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const publicRoutes = ['/', '/login', '/privacy', '/terms'];
  const isInternalRoute = !publicRoutes.includes(location.pathname);

  useEffect(() => {
    // Só mostra se tiver o evento, estiver em rota interna e não foi dispensado nesta sessão
    if (deferredPrompt && isInternalRoute && !isDismissed) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [deferredPrompt, location.pathname, isInternalRoute, isDismissed]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Mostra o prompt de instalação
    deferredPrompt.prompt();

    // Aguarda a resposta do usuário
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Resposta do usuário para a instalação: ${outcome}`);

    // Limpa o evento, pois só pode ser usado uma vez
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[9999] animate-in slide-in-from-top-full duration-500">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0">
            <Download size={20} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900 truncate">
              Instalar Aplicativo
            </h4>
            <p className="text-[10px] text-slate-500 font-medium line-clamp-1">
              Melhor experiência e acesso rápido
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
          <button
            onClick={handleInstallClick}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-100 active:scale-95 transition-all"
          >
            Instalar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
