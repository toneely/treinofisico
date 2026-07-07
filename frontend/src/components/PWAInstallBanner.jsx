import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, X, Share } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PWAInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('pwa_banner_dismissed') === 'true';
  });
  const location = useLocation();
  const { isPremium } = useAuth();

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
    if (isStandalone) {
      setIsVisible(false);
      return;
    }

    if (isInternalRoute && !isDismissed) {
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

  // Ajuste de posicionamento baseado no Banner de Anúncio e Bottom Nav
  // .resilient-bottom-spacing-nav tem 152px + safe area
  const bottomOffset = isPremium ? "bottom-24" : "bottom-[160px]";

  return (
    <div className={`fixed ${bottomOffset} left-4 right-4 z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-700`}>
      <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/5 p-4 flex flex-col backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500 flex-shrink-0">
              <Download size={18} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate uppercase tracking-wider">
                Instalar Aplicativo
              </h4>
              <p className="text-[10px] text-zinc-500 font-medium line-clamp-1">
                Melhor experiência e acesso rápido
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {!isIOS && (
              <button
                onClick={handleInstallClick}
                className="px-3 py-1.5 bg-orange-500 text-white text-[11px] font-black uppercase tracking-tight rounded-lg shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
              >
                Instalar
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {isIOS && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="p-1.5 bg-white/5 rounded-lg text-zinc-400 flex-shrink-0">
              <Share size={12} />
            </div>
            <p className="text-[10px] text-zinc-400 leading-normal">
              Toque no botão de <strong>Compartilhar</strong> do Safari e selecione <strong>'Adicionar à Tela de Início'</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PWAInstallBanner;
