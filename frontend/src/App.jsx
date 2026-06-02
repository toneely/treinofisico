import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Play, Pause, RotateCcw, Dumbbell, Bike, Shield, List, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';

const TrainingApp = () => {
  const [view, setView] = useState('dashboard'); // 'dashboard', 'training'
  const [vaiACapoeira, setVaiACapoeira] = useState(null);
  const [selectedTreino, setSelectedTreino] = useState(null);
  const [blocos, setBlocos] = useState([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [currentExerciseInBlock, setCurrentExerciseInBlock] = useState(0); // 0 or 1
  const [currentSerie, setCurrentSerie] = useState(1);
  const [timer, setTimer] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [loading, setLoading] = useState(false);

  // Business Rules Context
  const userMassaCorporea = 45.0;

  useEffect(() => {
    let interval = null;
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsTimerActive(false);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timer]);

  const fetchTreino = async (letra) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blocos_treino')
      .select(`
        *,
        exercicios (*)
      `)
      .eq('letra_treino', letra)
      .order('numero_bloco', { ascending: true })
      .order('ordem_execucao', { ascending: true });

    if (error) {
      console.error('Erro ao buscar treino:', error);
    } else {
      // Group by numero_bloco
      const grouped = data.reduce((acc, curr) => {
        if (!acc[curr.numero_bloco]) acc[curr.numero_bloco] = [];
        acc[curr.numero_bloco].push(curr);
        return acc;
      }, {});
      setBlocos(Object.values(grouped));
      setSelectedTreino(letra);
      setView('training');
      setCurrentBlockIndex(0);
      setCurrentExerciseInBlock(0);
      setCurrentSerie(1);
    }
    setLoading(false);
  };

  const startTimer = (seconds) => {
    setTimer(seconds);
    setIsTimerActive(true);
  };

  const nextStep = () => {
    const currentBlock = blocos[currentBlockIndex];

    // Logic for Interleaved Blocks
    if (currentExerciseInBlock === 0) {
      // Finished exercise 1 of block
      setCurrentExerciseInBlock(1);
      startTimer(60); // Standard rest
    } else {
      // Finished exercise 2 of block
      if (currentSerie < 3) {
        setCurrentSerie(currentSerie + 1);
        setCurrentExerciseInBlock(0);
        startTimer(60);
      } else {
        // Finished block
        if (currentBlockIndex < blocos.length - 1) {
          setCurrentBlockIndex(currentBlockIndex + 1);
          setCurrentExerciseInBlock(0);
          setCurrentSerie(1);
          startTimer(120); // Longer rest between blocks
        } else {
          // Finished workout
          setView('dashboard');
          alert('Treino concluído com sucesso!');
        }
      }
    }
  };

  const renderDashboard = () => (
    <div className="p-6 max-w-md mx-auto bg-slate-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Olá, Tone</h1>
        <p className="text-slate-500">Pronto para o treino de hoje?</p>
      </header>

      {vaiACapoeira === null ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="text-amber-500" />
            Vais à Capoeira hoje à noite?
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
              {vaiACapoeira ? 'Filtro Capoeira: Ativado' : 'Filtro Capoeira: Desativado'}
            </span>
          </div>
          <button onClick={() => setVaiACapoeira(null)} className="text-xs text-indigo-600 underline">Alterar</button>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Treinos Disponíveis</h3>

        <WorkoutCard title="Treino A" subtitle="Empurrar (Peito/Ombro/Tríceps)" icon={<Dumbbell />} onClick={() => fetchTreino('A')} />
        <WorkoutCard title="Treino B" subtitle="Puxar (Costas/Bíceps)" icon={<List />} onClick={() => fetchTreino('B')} />

        {(!vaiACapoeira || vaiACapoeira === null) && (
          <WorkoutCard title="Treino C" subtitle="Pernas (Coringa)" icon={<RotateCcw />} onClick={() => fetchTreino('C')} color="bg-amber-100 text-amber-700" />
        )}

        {vaiACapoeira && (
          <div className="p-4 bg-slate-100 rounded-xl border border-dashed border-slate-300 opacity-60">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-400 text-lg">Treino C</h4>
                <p className="text-xs text-slate-400">Bloqueado para proteção articular</p>
              </div>
              <Shield size={24} className="text-slate-300" />
            </div>
          </div>
        )}

        <WorkoutCard title="Treino D" subtitle="Sábado (Postural/Mobilidade)" icon={<Bike />} onClick={() => fetchTreino('D')} />
      </div>
    </div>
  );

  const renderTraining = () => {
    if (loading) return <div className="p-10 text-center">Carregando blocos...</div>;
    if (!blocos.length) return (
        <div className="p-10 text-center">
            <p className="mb-4">Nenhum bloco encontrado para este treino.</p>
            <button onClick={() => setView('dashboard')} className="text-indigo-600 underline">Voltar</button>
        </div>
    );

    const currentBlock = blocos[currentBlockIndex];
    const exercise = currentBlock[currentExerciseInBlock];
    const nextExercise = currentBlock[currentExerciseInBlock === 0 ? 1 : 0];

    return (
      <div className="p-6 max-w-md mx-auto bg-slate-900 min-h-screen text-white">
        <header className="flex justify-between items-center mb-8">
          <button onClick={() => setView('dashboard')} className="text-slate-400">Voltar</button>
          <div className="text-center">
            <span className="text-xs text-slate-500 uppercase tracking-tighter block">Treino {selectedTreino}</span>
            <span className="font-bold">Bloco {currentBlockIndex + 1} de {blocos.length}</span>
          </div>
          <div className="w-10"></div>
        </header>

        {/* Interleaved Block Progress */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s < currentSerie ? 'bg-emerald-500' : s === currentSerie ? 'bg-indigo-500' : 'bg-slate-700'}`}></div>
          ))}
        </div>

        <div className="bg-slate-800 p-6 rounded-3xl shadow-xl mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
             <span className="text-3xl font-black text-slate-700 opacity-20">#{exercise.exercicios.tipo_fibra}</span>
          </div>

          <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold mb-4 uppercase tracking-widest">
             Série {currentSerie} de 3
          </span>

          <h2 className="text-2xl font-bold mb-2 leading-tight">{exercise.exercicios.nome}</h2>
          <p className="text-slate-400 mb-6 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            Alvo: {exercise.exercicios.alvo_principal}
          </p>

          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs text-slate-500 uppercase">Objetivo</p>
              <p className="text-2xl font-mono font-bold text-indigo-400">{exercise.reps_alvo} <span className="text-sm font-normal text-slate-400">reps</span></p>
            </div>

            {exercise.exercicios.depende_peso_corporal && (
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase">Carga Total</p>
                <p className="text-lg font-bold">{userMassaCorporea}kg + carga</p>
              </div>
            )}
          </div>
        </div>

        {/* Timer Section */}
        <div className={`p-6 rounded-3xl mb-6 transition-all duration-500 flex items-center justify-between ${isTimerActive ? 'bg-indigo-600 scale-105' : 'bg-slate-800'}`}>
          <div>
            <p className="text-xs opacity-70 uppercase font-bold mb-1">Descanso Passivo</p>
            <p className="text-4xl font-mono font-bold tracking-tighter">
              {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
            </p>
          </div>
          <button
            onClick={() => isTimerActive ? setIsTimerActive(false) : timer > 0 ? setIsTimerActive(true) : startTimer(60)}
            className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition"
          >
            {isTimerActive ? <Pause fill="white" /> : <Play fill="white" className="ml-1" />}
          </button>
        </div>

        <button
          onClick={nextStep}
          disabled={isTimerActive}
          className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${isTimerActive ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'}`}
        >
          {currentExerciseInBlock === 0 ? 'Concluir & Ir para Alternado' : 'Concluir Série'}
          <ChevronRight size={20} />
        </button>

        <div className="mt-8">
           <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Próximo no Bloco</h4>
           <div className="bg-slate-800/50 p-4 rounded-2xl flex items-center justify-between border border-slate-700/50">
              <div>
                <p className="font-medium">{nextExercise ? nextExercise.exercicios.nome : 'Fim do Bloco'}</p>
                <p className="text-xs text-slate-500">{nextExercise ? nextExercise.reps_alvo : '-'} repetições</p>
              </div>
              <div className="px-3 py-1 bg-slate-700 rounded-lg text-[10px] font-bold text-slate-400">#ALTERNADO</div>
           </div>
        </div>

        {exercise.exercicios.nome.includes('Abdução') && (
          <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <p className="text-xs text-amber-200 flex gap-2">
              <AlertCircle size={28} className="shrink-0" />
              <span><strong>Nota Técnica:</strong> Não ultrapassar 45º de amplitude lateral. Mantenha o vetor focado nos glúteos.</span>
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="font-sans antialiased text-slate-900">
      {view === 'dashboard' ? renderDashboard() : renderTraining()}
    </div>
  );
};

const WorkoutCard = ({ title, subtitle, icon, onClick, color = "bg-white text-slate-800" }) => (
  <button
    onClick={onClick}
    className={`${color} w-full p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98] text-left`}
  >
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-indigo-600">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-lg">{title}</h4>
        <p className="text-sm opacity-60">{subtitle}</p>
      </div>
    </div>
    <ChevronRight className="text-slate-300" />
  </button>
);

export default TrainingApp;