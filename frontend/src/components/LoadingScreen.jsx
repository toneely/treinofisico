import React from 'react';

const LoadingScreen = ({ message = "Carregando..." }) => {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[var(--bg-gestao)] transition-colors duration-300">
      <div className="relative flex flex-col items-center">
        {/* Logo with Pulse Animation */}
        <div className="w-24 h-24 mb-6 animate-pulse">
          <img
            src="/logo-app.png"
            alt="Logo"
            className="w-full h-full object-contain filter drop-shadow-sm"
          />
        </div>

        {/* Supporting Text */}
        <p
          className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse opacity-40 text-center px-6"
          style={{ color: 'var(--text-on-gestao)' }}
        >
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
