import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, Shield, Save, Scale, Ruler, Activity } from 'lucide-react';

const GeneralSettings = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coringaWorkouts, setCoringaWorkouts] = useState([]);
  const [formData, setFormData] = useState({
    nome: '',
    massa_corporea_atual: 0,
    foco_treino: '',
    atividade_alternativa: 'Capoeira',
    medidas: {
      braco_dir: 0,
      braco_esq: 0,
      peitoral: 0,
      cintura: 0,
      coxa_dir: 0,
      coxa_esq: 0
    }
  });

  useEffect(() => {
    fetchUserData();
    fetchCoringaStatus();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Erro ao buscar usuário:', error);
    } else if (data) {
      setUser(data);
      setFormData({
        nome: data.nome,
        massa_corporea_atual: data.massa_corporea_atual,
        foco_treino: data.foco_treino || '',
        atividade_alternativa: data.atividade_alternativa || 'Capoeira',
        medidas: data.medidas || {
          braco_dir: 0,
          braco_esq: 0,
          peitoral: 0,
          cintura: 0,
          coxa_dir: 0,
          coxa_esq: 0
        }
      });
    }
    setLoading(false);
  };

  const fetchCoringaStatus = async () => {
    const { data } = await supabase
      .from('blocos_treino')
      .select('letra_treino, is_coringa');

    if (data) {
      // Create a unique map of workout -> is_coringa
      const map = data.reduce((acc, curr) => {
        acc[curr.letra_treino] = curr.is_coringa;
        return acc;
      }, {});
      setCoringaWorkouts(map);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMedidaChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      medidas: { ...prev.medidas, [name]: parseFloat(value) || 0 }
    }));
  };

  const toggleCoringa = async (letra) => {
    const newValue = !coringaWorkouts[letra];
    const { error } = await supabase
      .from('blocos_treino')
      .update({ is_coringa: newValue })
      .eq('letra_treino', letra);

    if (!error) {
      setCoringaWorkouts(prev => ({ ...prev, [letra]: newValue }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('usuarios')
      .update({
        nome: formData.nome,
        massa_corporea_atual: parseFloat(formData.massa_corporea_atual),
        foco_treino: formData.foco_treino,
        atividade_alternativa: formData.atividade_alternativa,
        medidas: formData.medidas,
        data_atualizacao_peso: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) alert('Erro ao salvar: ' + error.message);
    else alert('Configurações salvas com sucesso!');
    setSaving(false);
  };

  if (loading) return <div className="p-10 text-center text-slate-400">Carregando configurações...</div>;

  return (
    <div className="space-y-6">
      {/* Perfil e Biometria */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <User className="text-indigo-600" size={20} />
          <h2 className="font-bold text-slate-800">Perfil e Biometria</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Nome Completo</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className="p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Massa Corpórea (kg)</label>
              <div className="relative">
                <Scale className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="number"
                  name="massa_corporea_atual"
                  value={formData.massa_corporea_atual}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Atividade Alternativa</label>
              <div className="relative">
                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="text"
                  name="atividade_alternativa"
                  value={formData.atividade_alternativa}
                  onChange={handleInputChange}
                  placeholder="Ex: Capoeira, Jiu-Jitsu..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-600 mb-4 flex items-center gap-2">
              <Ruler size={16} /> Medidas Corporais (cm)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(formData.medidas).map(key => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{key.replace('_', ' ')}</label>
                  <input
                    type="number"
                    name={key}
                    value={formData.medidas[key]}
                    onChange={handleMedidaChange}
                    className="p-1.5 border border-slate-200 rounded bg-white text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Configurações de Treino */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <Shield className="text-indigo-600" size={20} />
          <h2 className="font-bold text-slate-800">Status dos Treinos (Coringa)</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-500 mb-6">
            Marque os treinos que funcionam como rotinas complementares ou substitutas (Ex: Alongamento, Mobilidade).
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['A', 'B', 'C', 'D'].map(letra => (
              <button
                key={letra}
                onClick={() => toggleCoringa(letra)}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  coringaWorkouts[letra]
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-100 bg-white text-slate-400 grayscale'
                }`}
              >
                <span className="text-2xl font-black">{letra}</span>
                <span className="text-[10px] font-bold uppercase">{coringaWorkouts[letra] ? 'Coringa Ativo' : 'Padrão'}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? 'Salvando...' : <><Save size={20} /> Salvar Alterações</>}
        </button>
      </div>
    </div>
  );
};

export default GeneralSettings;
