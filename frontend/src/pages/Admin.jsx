import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Dumbbell, LayoutGrid, Settings, Users, CreditCard, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ExerciseManager from '../components/ExerciseManager';
import BlockConfigurator from '../components/BlockConfigurator';
import WorkoutManager from '../components/WorkoutManager';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('onboarding');
  const [moldeUserId, setMoldeUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMoldeUser();
  }, []);

  const fetchMoldeUser = async () => {
    setLoading(true);
    // Note: In a real scenario with Supabase Auth, we can't search auth.users by email from the client
    // unless we use a custom Edge Function or a public mapping table.
    // For now, we assume the 'usuarios' table has the entry for the molde user.
    const { data } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email_referencia', 'molde@treinofisico.com.br')
      .maybeSingle();

    setMoldeUserId(data?.id);
    setLoading(false);
  };

  if (loading) return <div className="p-10 text-center text-slate-400">Carregando Admin...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto bg-slate-50 min-h-screen">
      <header className="mb-8">
        <Link to="/" className="text-slate-500 flex items-center gap-1 mb-4 hover:text-slate-800 transition w-fit">
          <ChevronLeft size={20} />
          Voltar para Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Painel Administrativo</h1>
        <p className="text-slate-500">Gestão da plataforma e conteúdo padrão de onboarding.</p>
      </header>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <TabButton
          active={activeTab === 'onboarding'}
          onClick={() => setActiveTab('onboarding')}
          icon={<Sparkles size={18} />}
          label="Treinos Padrão (Molde)"
        />
        <TabButton
          active={activeTab === 'users'}
          onClick={() => setActiveTab('users')}
          icon={<Users size={18} />}
          label="Usuários Cadastrados"
        />
        <TabButton
          active={activeTab === 'billing'}
          onClick={() => setActiveTab('billing')}
          icon={<CreditCard size={18} />}
          label="Faturamento"
        />
      </div>

      <main className="animate-in fade-in duration-500">
        {activeTab === 'onboarding' && (
            <div className="space-y-6">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit mb-8">
                    <button
                        onClick={() => setSubTab('workouts')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${subTab === 'workouts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Treinos Padrão
                    </button>
                    <button
                        onClick={() => setSubTab('blocks')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${subTab === 'blocks' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Blocos Padrão
                    </button>
                    <button
                        onClick={() => setSubTab('exercises')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${subTab === 'exercises' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Exercícios Globais
                    </button>
                </div>

                {subTab === 'workouts' && (
                    <section className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-6">
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <LayoutGrid className="text-indigo-600" size={24} />
                                Categorias de Treino Padrão
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">Defina os treinos que serão copiados para novos usuários.</p>
                        </div>
                        <WorkoutManager overrideUserId={moldeUserId} />
                    </section>
                )}

                {subTab === 'exercises' && (
                    <section className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-6">
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Dumbbell className="text-indigo-600" size={24} />
                                Catálogo de Exercícios Padrão
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">Biblioteca Global de exercícios disponíveis para todos os usuários.</p>
                        </div>
                        <ExerciseManager targetTable="exercicios_padrao" />
                    </section>
                )}

                {subTab === 'blocks' && (
                    <section className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-6">
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Settings className="text-indigo-600" size={24} />
                                Estrutura de Blocos (Molde)
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">Configure as séries e repetições padrão.</p>
                        </div>
                        <BlockConfigurator overrideUserId={moldeUserId} />
                    </section>
                )}
            </div>
        )}
        {activeTab === 'users' && (
            <div className="p-20 text-center border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400">
                <Users size={48} className="mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-bold">Módulo de Usuários</h3>
                <p>Em breve: Gestão e acompanhamento de atletas.</p>
            </div>
        )}
        {activeTab === 'billing' && (
            <div className="p-20 text-center border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400">
                <CreditCard size={48} className="mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-bold">Módulo de Faturamento</h3>
                <p>Em breve: Integração com Stripe/Gateway de pagamentos.</p>
            </div>
        )}
      </main>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
      active
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
        : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
    }`}
  >
    {icon}
    {label}
  </button>
);

export default Admin;
