import React, { useState } from "react";
import { useAppearance } from "../context/AppearanceContext";
import { useToast } from "../context/ToastContext";
import { Palette, Save, RotateCcw } from "lucide-react";

const AppearanceSettings = () => {
  const { settings, updateAppearance } = useAppearance();
  const { showToast } = useToast();
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateAppearance(localSettings);
    if (error) {
      showToast("Erro ao salvar aparência: " + error.message, "error");
    } else {
      showToast("Aparência atualizada!", "success");
    }
    setSaving(false);
  };

  const handleReset = () => {
    const defaults = {
      bg_geral: "#FFFFFF",
      bg_treino: "#121212",
      color_ex_a: "#E67E22",
      color_ex_b: "#1E3A8A",
    };
    setLocalSettings(defaults);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-8">
          <div
            className="p-3 bg-amber-50 text-amber-600 rounded-2xl"
            style={{
              color: "var(--color-primary)",
              backgroundColor: "var(--color-primary)20",
            }}
          >
            <Palette size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black  uppercase tracking-widest">
              Personalizar Cores
            </h2>
            <p className="text-sm text-slate-500">
              Ajuste as cores principais do aplicativo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ColorInput
            label="Fundo Geral (Gestão)"
            value={localSettings.bg_geral}
            onChange={(val) =>
              setLocalSettings({ ...localSettings, bg_geral: val })
            }
            description="Dashboard, Histórico e Perfil"
          />
          <ColorInput
            label="Fundo do Treino (Execução)"
            value={localSettings.bg_treino}
            onChange={(val) =>
              setLocalSettings({ ...localSettings, bg_treino: val })
            }
            description="Tela de Treino Ativo"
          />
          <ColorInput
            label="Cor Primária / Exercício A"
            value={localSettings.color_ex_a}
            onChange={(val) =>
              setLocalSettings({ ...localSettings, color_ex_a: val })
            }
            description="Botões Principais e Treinos Coringa"
          />
          <ColorInput
            label="Cor Secundária / Exercício B"
            value={localSettings.color_ex_b}
            onChange={(val) =>
              setLocalSettings({ ...localSettings, color_ex_b: val })
            }
            description="Exercícios Secundários/Alternados"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-4 mt-12 border-t border-slate-100 pt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-4 text-white rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            {saving ? (
              "Salvando..."
            ) : (
              <>
                <Save size={20} /> Salvar Alterações
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={20} /> Resetar Padrão
          </button>
        </div>
      </div>

      {/* Preview Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className="p-6 rounded-[32px] border border-slate-200"
          style={{ backgroundColor: localSettings.bg_geral }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-40">
            Preview Gestão
          </p>
          <div
            className="w-full h-12 rounded-xl mb-2"
            style={{ backgroundColor: localSettings.color_ex_a }}
          ></div>
          <div
            className="w-2/3 h-12 rounded-xl"
            style={{
              backgroundColor: localSettings.color_ex_b + "20",
              border: `1px solid ${localSettings.color_ex_b}`,
            }}
          ></div>
        </div>
        <div
          className="p-6 rounded-[32px] border border-slate-700 shadow-2xl"
          style={{ backgroundColor: localSettings.bg_treino }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest mb-4 text-white opacity-40">
            Preview Treino
          </p>
          <div
            className="w-full h-12 rounded-xl mb-2"
            style={{ backgroundColor: localSettings.color_ex_a }}
          ></div>
          <div
            className="w-full h-12 rounded-xl opacity-80"
            style={{
              backgroundColor: localSettings.bg_treino,
              border: `1px dashed ${localSettings.color_ex_b}`,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

const ColorInput = ({ label, value, onChange, description }) => (
  <div className="space-y-3">
    <div className="flex justify-between items-end px-1">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {label}
      </label>
      <span className="text-[9px] font-mono font-bold text-slate-300 tracking-wider">
        {value.toUpperCase()}
      </span>
    </div>
    <div className="flex gap-2">
      <div className="relative group">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-14 h-14 rounded-2xl border-none p-0 cursor-pointer overflow-hidden bg-transparent"
        />
        <div className="absolute inset-0 rounded-2xl border-2 border-slate-100 pointer-events-none group-hover:border-slate-200 transition-colors"></div>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          if (val.startsWith("#") && val.length <= 7) {
            onChange(val);
          } else if (!val.startsWith("#") && val.length <= 6) {
            onChange("#" + val);
          }
        }}
        placeholder="#000000"
        className="flex-1 px-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none focus:border-slate-200 focus:bg-white font-mono font-bold  transition-all uppercase text-sm"
      />
    </div>
    <p className="text-[10px] text-slate-400 italic px-1">{description}</p>
  </div>
);

export default AppearanceSettings;
