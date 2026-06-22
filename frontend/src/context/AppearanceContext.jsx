import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "./AuthContext";
import { getContrastColor, getSafeColor } from "../utils/colors";

const AppearanceContext = createContext();

export const AppearanceProvider = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    bg_geral: "#FFFFFF",
    bg_treino: "#121212",
    color_ex_a: "#E67E22", // Updated default orange
    color_ex_b: "#1E3A8A", // Updated default blue
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAppearance();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Inject CSS variables
    const root = document.documentElement;
    root.style.setProperty("--bg-gestao", settings.bg_geral);
    root.style.setProperty("--bg-treino", settings.bg_treino);
    root.style.setProperty("--color-primary", settings.color_ex_a);
    root.style.setProperty("--color-secondary", settings.color_ex_b);

    // Dynamic contrast text colors
    root.style.setProperty(
      "--text-on-gestao",
      getContrastColor(settings.bg_geral),
    );
    root.style.setProperty(
      "--text-on-treino",
      getContrastColor(settings.bg_treino),
    );
    root.style.setProperty(
      "--text-on-primary",
      getContrastColor(settings.color_ex_a),
    );
    root.style.setProperty(
      "--text-on-secondary",
      getContrastColor(settings.color_ex_b),
    );

    // Safe color variants (guaranteed contrast against background)
    root.style.setProperty(
      "--color-primary-safe",
      getSafeColor(settings.color_ex_a, settings.bg_treino),
    );
    root.style.setProperty(
      "--color-secondary-safe",
      getSafeColor(settings.color_ex_b, settings.bg_treino),
    );

    // Semi-transparent darkened variants for badges/indicators
    root.style.setProperty("--color-primary-dark", `${settings.color_ex_a}20`);
    root.style.setProperty("--color-secondary-dark", `${settings.color_ex_b}20`);
  }, [settings]);

  const fetchAppearance = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracoes_aparencia")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setSettings({
          bg_geral: data.cor_fundo_gestao,
          bg_treino: data.cor_fundo_treino,
          color_ex_a: data.cor_exercicio_a,
          color_ex_b: data.cor_exercicio_b,
        });
      }
    } catch (err) {
      console.error("Error fetching appearance:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateAppearance = async (newSettings) => {
    if (!user) return;

    setSettings(newSettings);

    const { error } = await supabase.from("configuracoes_aparencia").upsert({
      user_id: user.id,
      cor_fundo_gestao: newSettings.bg_geral,
      cor_fundo_treino: newSettings.bg_treino,
      cor_exercicio_a: newSettings.color_ex_a,
      cor_exercicio_b: newSettings.color_ex_b,
      updated_at: new Date().toISOString(),
    });

    return { error };
  };

  return (
    <AppearanceContext.Provider value={{ settings, updateAppearance, loading }}>
      {children}
    </AppearanceContext.Provider>
  );
};

export const useAppearance = () => {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearance must be used within an AppearanceProvider");
  }
  return context;
};
