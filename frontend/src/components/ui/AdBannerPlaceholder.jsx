import React from "react";

const AdBannerPlaceholder = () => {
  return (
    <div className="fixed bottom-[72px] left-0 right-0 z-40 px-6 max-w-md mx-auto pointer-events-none">
      <div
        className="h-[60px] w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-[24px] flex items-center justify-center mb-2 pointer-events-auto"
        style={{ backgroundColor: "var(--bg-gestao)", borderColor: "var(--color-primary-dark)" }}
      >
        <span
          className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40"
          style={{ color: "var(--text-on-gestao)" }}
        >
          Espaço Publicitário
        </span>
      </div>
    </div>
  );
};

export default AdBannerPlaceholder;
