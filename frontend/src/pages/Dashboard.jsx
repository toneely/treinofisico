import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Dumbbell, List, RotateCcw, Bike, Shield,
  AlertCircle, ChevronRight, Settings, History as HistoryIcon,
  User as UserIcon, Zap, Check, X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

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

  const recordActivity = async () => {
    setIsRecording(true);
    const { error } = await supabase.from('registro_atividades').insert([{
        usuario_id: user.id,
        nome_atividade: atividadeAlt,
        data: new Date().toISOString()
    }]);

    // Re-checking field name from my previous SQL
    // CREATE TABLE IF NOT EXISTS registro_atividades (..., nome_atividade TEXT NOT NULL, ...)

    setIsRecording(false);
    if (error) {
        showToast('Erro ao registrar atividade: ' + error.message, 'error');
    } else {
        showToast(`${atividadeAlt} registrada com sucesso!`, 'success');
        setShowActivityModal(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400">Carregando painel...</div>;

  const atividadeAlt = user?.atividade_alternativa || 'Capoeira';
  const coringaWorkout = workouts.find(w => w.is_coringa);

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

      {/* Catálogo de Treinos */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Treinos Disponíveis</h3>

        {/* Treinos Normais */}
        {workouts.filter(w => !w.is_coringa).map(workout => (
            <WorkoutCard
                key={workout.id}
                title={workout.nome}
                subtitle={workout.subtitulo}
                icon={workout.letra === 'A' ? <Dumbbell /> : workout.letra === 'B' ? <List /> : workout.letra === 'C' ? <RotateCcw /> : <Bike />}
                onClick={() => startTraining(workout.letra)}
            />
        ))}

        {/* Treino Coringa */}
        {coringaWorkout && (
            <WorkoutCard
                title={coringaWorkout.nome}
                subtitle={coringaWorkout.subtitulo}
                icon={<Zap size={24} fill="currentColor" />}
                onClick={() => startTraining(coringaWorkout.letra)}
                variant="amber"
            />
        )}

        {/* Atividade Alternativa */}
        <WorkoutCard
            title={atividadeAlt}
            subtitle="Registrar atividade de hoje"
            icon={<Shield size={24} />}
            onClick={() => setShowActivityModal(true)}
            variant="indigo"
        />
      </div>

      {/* Modal de Atividade Alternativa */}
      {showActivityModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-xs rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Shield size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 text-center mb-2">Registrar Atividade</h2>
                <p className="text-slate-500 text-center text-sm mb-8">
                    Deseja registrar a execução de <strong>{atividadeAlt}</strong> hoje no seu histórico?
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowActivityModal(false)}
                        className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition"
                    >
                        Não
                    </button>
                    <button
                        onClick={recordActivity}
                        disabled={isRecording}
                        className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                    >
                        {isRecording ? '...' : <><Check size={18} /> Sim</>}
                    </button>
                </div>
            </div>
        </div>
      )}

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

const WorkoutCard = ({ title, subtitle, icon, onClick, variant }) => {
  const getStyles = () => {
    switch (variant) {
      case 'amber':
        return {
          card: 'bg-amber-50 border-amber-100 text-amber-900',
          iconBg: 'bg-amber-400 text-amber-950 shadow-sm',
          chevron: 'text-amber-400'
        };
      case 'indigo':
        return {
          card: 'bg-indigo-50 border-indigo-100 text-indigo-900',
          iconBg: 'bg-indigo-600 text-white shadow-sm',
          chevron: 'text-indigo-400'
        };
      default:
        return {
          card: 'bg-white border-slate-200 text-slate-800',
          iconBg: 'bg-slate-100 text-indigo-600',
          chevron: 'text-slate-300'
        };
    }
  };

  const styles = getStyles();

  return (
    <button
      onClick={onClick}
      className={`w-full p-5 rounded-3xl shadow-sm border flex items-center justify-between hover:shadow-md transition-all active:scale-[0.98] text-left ${styles.card}`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${styles.iconBg}`}>
          {icon}
        </div>
        <div>
          <h4 className="font-bold text-lg">{title}</h4>
          <p className="text-sm opacity-60 font-medium">{subtitle}</p>
        </div>
      </div>
      <ChevronRight className={styles.chevron} size={20} />
    </button>
  );
};

export default Dashboard;
