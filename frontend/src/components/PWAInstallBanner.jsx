import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, X, Share } from 'lucide-react';

const PWAInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('pwa_banner_dismissed') === 'true';
  });
  const location = useLocation();

  // Detecção de iOS e Standalone
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('Evento beforeinstallprompt capturado');
    };

    window.addEventListener('beforeinstallprompt', handler);

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
    // Não mostra se já estiver instalado (Standalone)
    if (isStandalone) {
      setIsVisible(false);
      return;
    }

    // Só mostra se estiver em rota interna e não foi dispensado nesta sessão
    if (isInternalRoute && !isDismissed) {
      // Para Android/Chrome: precisa do deferredPrompt
      // Para iOS: mostra as instruções pois o evento não existe
      if (deferredPrompt || isIOS) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    } else {
      setIsVisible(false);
    }
  }, [deferredPrompt, location.pathname, isInternalRoute, isDismissed, isIOS, isStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Resposta do usuário para a instalação: ${outcome}`);

    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[9999] animate-in slide-in-from-top-full duration-500">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 flex flex-col">
        <div className="flex items-center justify-between gap-4">
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
            {!isIOS && (
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-100 active:scale-95 transition-all"
              >
                Instalar
              </button>
            )}
          </div>
        </div>

        {isIOS && (
          <div className="mt-3 pt-3 border-t border-slate-50 flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600 flex-shrink-0">
              <Share size={14} />
            </div>
            <p className="text-[10px] text-slate-600 leading-normal">
              Para instalar no seu iPhone, toque no botão de <strong>Compartilhar</strong> do Safari e selecione <strong>'Adicionar à Tela de Início'</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PWAInstallBanner;
