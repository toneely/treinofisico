import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const AppearanceContext = createContext();

export const AppearanceProvider = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    bg_geral: '#FFFFFF',
    bg_treino: '#121212',
    color_ex_a: '#fbbf24', // Default amber-400 equivalent
    color_ex_b: '#94a3b8', // Default slate-400 equivalent
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
    root.style.setProperty('--bg-geral', settings.bg_geral);
    root.style.setProperty('--bg-treino', settings.bg_treino);
    root.style.setProperty('--color-alternado-a', settings.color_ex_a);
    root.style.setProperty('--color-alternado-b', settings.color_ex_b);
  }, [settings]);

  const fetchAppearance = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_aparencia')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setSettings({
          bg_geral: data.bg_geral,
          bg_treino: data.bg_treino,
          color_ex_a: data.color_ex_a,
          color_ex_b: data.color_ex_b,
        });
      }
    } catch (err) {
      console.error('Error fetching appearance:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateAppearance = async (newSettings) => {
    if (!user) return;

    setSettings(newSettings);

    const { error } = await supabase
      .from('configuracoes_aparencia')
      .upsert({
        user_id: user.id,
        ...newSettings,
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
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }
  return context;
};
