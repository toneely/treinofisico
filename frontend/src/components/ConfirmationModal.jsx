import React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, HelpCircle, Trash2, CheckCircle2 } from "lucide-react";

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "warning" // warning, danger, success, info
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: <Trash2 size={32} />,
          iconBg: "bg-red-100 text-red-500",
          confirmBtn: "bg-red-500 hover:bg-red-600 text-white",
        };
      case "success":
        return {
          icon: <CheckCircle2 size={32} />,
          iconBg: "bg-emerald-100 text-emerald-500",
          confirmBtn: "bg-emerald-500 hover:bg-emerald-600 text-white",
        };
      case "info":
        return {
          icon: <HelpCircle size={32} />,
          iconBg: "bg-blue-100 text-blue-500",
          confirmBtn: "bg-blue-500 hover:bg-blue-600 text-white",
        };
      default: // warning
        return {
          icon: <AlertTriangle size={32} />,
          iconBg: "bg-amber-100 text-amber-500",
          confirmBtn: "bg-amber-500 hover:bg-amber-600 text-white",
        };
    }
  };

  const styles = getVariantStyles();

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xs rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 ${styles.iconBg}`}>
          {styles.icon}
        </div>
        <h2 className="text-xl font-bold text-slate-900 text-center mb-2">
          {title}
        </h2>
        <p className="text-slate-500 text-center text-sm mb-8 leading-relaxed">
          {message}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all ${styles.confirmBtn}`}
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmationModal;
