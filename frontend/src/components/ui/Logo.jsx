import React from 'react';

const Logo = ({ size = "w-12 h-12", className = "" }) => {
  return (
    <div className={`${size} bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 overflow-hidden shrink-0 ${className}`}>
      <img src="/logo-app.png" alt="Logo" className="w-full h-full object-cover" />
    </div>
  );
};

export default Logo;
