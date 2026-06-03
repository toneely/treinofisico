import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Dumbbell, List, RotateCcw, Bike, Shield,
  AlertCircle, ChevronRight, Settings, History as HistoryIcon,
  User as UserIcon
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [vaiACapoeira, setVaiACapoeira] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Fetch User
    const { data: userData } = await supabase.from('usuarios').select('*').single();
    setUser(userData);

    // Fetch Workouts
    const { data: workoutsData } = await supabase.from('treinos').select('*').order('letra');
    if (workoutsData) {
        setWorkouts(workoutsData);
    }
    setLoading(false);
  };

  const startTraining = (letra) => {
    navigate(`/treino/${letra}`);
  };

  if (loading) return <div className="p-10 text-center text-slate-400">Carregando painel...</div>;

  const atividadeAlt = user?.atividade_alternativa || 'Capoeira';

  return (
    <div className="p-6 max-w-md mx-auto bg-slate-50 min-h-screen pb-20">
      <header className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Olá, {user?.nome?.split(' ')[0]}</h1>
          <p className="text-slate-500">Pronto para superar seus limites?</p>
        </div>
        <Link to="/admin" className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-400 hover:text-indigo-600 transition">
          <Settings size={20} />
        </Link>
      </header>

      {/* Status da Atividade Alternativa */}
      {vaiACapoeira === null ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="text-amber-500" />
            Vais à {atividadeAlt} hoje?
          </h2>
          <div className="flex gap-4">
            <button
              onClick={() => setVaiACapoeira(true)}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
            >
              Sim
            </button>
            <button
              onClick={() => setVaiACapoeira(false)}
              className="flex-1 py-3 bg-slate-200 text-slate-800 rounded-xl font-medium hover:bg-slate-300 transition"
            >
              Não
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-8 flex items-center justify-between bg-indigo-50 p-4 rounded-xl border border-indigo-100">
          <div className="flex items-center gap-3">
            <Shield className="text-indigo-600" />
            <span className="font-medium text-indigo-900">
              {vaiACapoeira ? `Filtro ${atividadeAlt}: Ativado` : `Filtro ${atividadeAlt}: Desativado`}
            </span>
          </div>
          <button onClick={() => setVaiACapoeira(null)} className="text-xs text-indigo-600 underline">Alterar</button>
        </div>
      )}

      {/* Catálogo de Treinos */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sessão de Hoje</h3>

        {workouts.map(workout => {
            const isTreinoC = workout.letra === 'C';
            if (isTreinoC && vaiACapoeira) {
                return (
                    <div key={workout.id} className="p-4 bg-slate-100 rounded-xl border border-dashed border-slate-300 opacity-60">
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-slate-400 text-lg">{workout.nome}</h4>
                                <p className="text-xs text-slate-400">Bloqueado p/ proteção ({atividadeAlt})</p>
                            </div>
                            <Shield size={24} className="text-slate-300" />
                        </div>
                    </div>
                );
            }

            return (
                <WorkoutCard
                    key={workout.id}
                    title={workout.nome}
                    subtitle={workout.subtitulo}
                    icon={workout.letra === 'A' ? <Dumbbell /> : workout.letra === 'B' ? <List /> : workout.letra === 'C' ? <RotateCcw /> : <Bike />}
                    onClick={() => startTraining(workout.letra)}
                    isCoringa={workout.is_coringa}
                />
            );
        })}
      </div>

      {/* Menu Inferior Fixo */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-around items-center">
        <Link to="/" className="text-indigo-600 flex flex-col items-center gap-1">
          <Dumbbell size={24} />
          <span className="text-[10px] font-bold uppercase">Treinos</span>
        </Link>
        <Link to="/historico" className="text-slate-400 hover:text-indigo-600 flex flex-col items-center gap-1">
          <HistoryIcon size={24} />
          <span className="text-[10px] font-bold uppercase">Histórico</span>
        </Link>
        <Link to="/admin" className="text-slate-400 hover:text-indigo-600 flex flex-col items-center gap-1">
          <UserIcon size={24} />
          <span className="text-[10px] font-bold uppercase">Perfil</span>
        </Link>
      </nav>
    </div>
  );
};

const WorkoutCard = ({ title, subtitle, icon, onClick, isCoringa }) => (
  <button
    onClick={onClick}
    className={`w-full p-5 rounded-2xl shadow-sm border flex items-center justify-between hover:shadow-md transition-all active:scale-[0.98] text-left ${
      isCoringa
        ? 'bg-amber-100 border-amber-200 text-amber-900'
        : 'bg-white border-slate-200 text-slate-800'
    }`}
  >
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isCoringa ? 'bg-amber-200 text-amber-700' : 'bg-slate-100 text-indigo-600'}`}>
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2">
            <h4 className="font-bold text-lg">{title}</h4>
            {isCoringa && <span className="text-[9px] font-bold bg-amber-400 px-1.5 py-0.5 rounded uppercase">Coringa</span>}
        </div>
        <p className="text-sm opacity-60">{subtitle}</p>
      </div>
    </div>
    <ChevronRight className={isCoringa ? 'text-amber-400' : 'text-slate-300'} />
  </button>
);

export default Dashboard;
