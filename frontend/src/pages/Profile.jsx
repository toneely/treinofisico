import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  User, Shield, Save, Scale, Ruler, Activity,
  LogOut, Mail, ChevronLeft, Camera
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const Profile = () => {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coringaWorkouts, setCoringaWorkouts] = useState([]);
  const [formData, setFormData] = useState({
    nome: '',
    massa_corporea_atual: 0,
    foco_treino: '',
    atividade_alternativa: 'Capoeira',
    medidas: {
      pescoco: 0,
      torax: 0,
      braco_dir: 0,
      braco_esq: 0,
      antebraco_dir: 0,
      antebraco_esq: 0,
      cintura: 0,
      abdomen: 0,
      quadril: 0,
      coxa_dir: 0,
      coxa_esq: 0,
      panturrilha_dir: 0,
      panturrilha_esq: 0
    }
  });

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchCoringaStatus();
    }
  }, [user]);

  const fetchUserData = async () => {
    setLoading(true);
    // Fetch data using the authenticated user's ID
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      showToast('Erro ao buscar perfil: ' + error.message, 'error');
    } else if (data) {
      setFormData({
        nome: data.nome || user.user_metadata?.full_name || '',
        massa_corporea_atual: data.massa_corporea_atual || 0,
        foco_treino: data.foco_treino || '',
        atividade_alternativa: data.atividade_alternativa || 'Capoeira',
        medidas: {
          pescoco: 0, torax: 0, braco_dir: 0, braco_esq: 0,
          antebraco_dir: 0, antebraco_esq: 0, cintura: 0, abdomen: 0,
          quadril: 0, coxa_dir: 0, coxa_esq: 0, panturrilha_dir: 0, panturrilha_esq: 0,
          ...(data.medidas || {})
        }
      });
    } else {
        // If no user record exists yet in 'usuarios' table, initialize it
        setFormData(prev => ({
            ...prev,
            nome: user.user_metadata?.full_name || ''
        }));
    }
    setLoading(false);
  };

  const fetchCoringaStatus = async () => {
    // Note: blocks are now user-specific
    const { data } = await supabase
      .from('blocos_treino')
      .select('letra_treino, is_coringa')
      .eq('user_id', user.id);

    if (data) {
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
      .eq('letra_treino', letra)
      .eq('user_id', user.id);

    if (!error) {
      setCoringaWorkouts(prev => ({ ...prev, [letra]: newValue }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    // upsert since the record might not exist yet for this new auth user
    const { error } = await supabase
      .from('usuarios')
      .upsert({
        id: user.id,
        nome: formData.nome,
        massa_corporea_atual: parseFloat(formData.massa_corporea_atual),
        foco_treino: formData.foco_treino,
        atividade_alternativa: formData.atividade_alternativa,
        medidas: formData.medidas,
        data_atualizacao_peso: new Date().toISOString()
      });

    if (error) showToast('Erro ao salvar: ' + error.message, 'error');
    else showToast('Perfil atualizado!', 'success');
    setSaving(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
    showToast('Sessão encerrada', 'info');
  };

  if (loading) return <div className="p-10 text-center text-slate-400">Carregando perfil...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto bg-slate-50 min-h-screen pb-24">
      <header className="mb-8 flex justify-between items-center">
        <Link to="/" className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 transition">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-black text-slate-800">Meu Perfil</h1>
        <button
          onClick={handleLogout}
          className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition"
          title="Sair"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Account Info Card */}
      <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200 mb-6 flex flex-col items-center">
        <div className="relative mb-4">
            <div className="w-24 h-24 bg-indigo-100 rounded-3xl flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <User size={40} className="text-indigo-600" />
                )}
            </div>
            <button className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 border-2 border-white">
                <Camera size={14} />
            </button>
        </div>
        <h2 className="text-xl font-bold text-slate-800">{formData.nome || 'Atleta'}</h2>
        <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
            <Mail size={14} />
            {user.email}
        </div>
      </section>

      <div className="space-y-6">
        {/* Biometria */}
        <section className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                <Scale className="text-indigo-600" size={18} />
                <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Biometria e Foco</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome de Exibição</label>
                        <input
                            type="text"
                            name="nome"
                            value={formData.nome}
                            onChange={handleInputChange}
                            className="p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Massa Corpórea (kg)</label>
                        <input
                            type="number"
                            name="massa_corporea_atual"
                            value={formData.massa_corporea_atual}
                            onChange={handleInputChange}
                            className="p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Atividade Alternativa</label>
                        <input
                            type="text"
                            name="atividade_alternativa"
                            value={formData.atividade_alternativa}
                            onChange={handleInputChange}
                            className="p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                        />
                    </div>
                </div>

                <div className="bg-indigo-50/30 p-6 rounded-2xl border border-indigo-100">
                    <h4 className="text-xs font-black text-indigo-900 mb-4 flex items-center gap-2 tracking-widest uppercase">
                        <Ruler size={16} /> Medidas (cm)
                    </h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        {Object.keys(formData.medidas).map(key => (
                            <div key={key} className="flex flex-col gap-0.5">
                                <label className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">{key.replace('_', ' ')}</label>
                                <input
                                    type="number"
                                    name={key}
                                    value={formData.medidas[key]}
                                    onChange={handleMedidaChange}
                                    className="p-1.5 bg-white border-none rounded-lg text-xs font-bold text-indigo-900 shadow-sm"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>

        {/* Configurações de Treino */}
        <section className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                <Shield className="text-indigo-600" size={18} />
                <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Configuração de Treinos</h3>
            </div>
            <div className="p-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Definir Treinos Coringa (Complementares)</p>
                <div className="grid grid-cols-4 gap-3">
                    {['A', 'B', 'C', 'D'].map(letra => (
                        <button
                            key={letra}
                            onClick={() => toggleCoringa(letra)}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${
                                coringaWorkouts[letra]
                                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                                    : 'border-slate-50 bg-slate-50 text-slate-300'
                            }`}
                        >
                            <span className="text-lg font-black">{letra}</span>
                        </button>
                    ))}
                </div>
            </div>
        </section>

        <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-lg shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
            {saving ? 'Salvando...' : <><Save size={20} /> Salvar Alterações</>}
        </button>
      </div>
    </div>
  );
};

export default Profile;
