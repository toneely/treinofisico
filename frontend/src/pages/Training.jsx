import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Play, Pause, RotateCcw, ChevronLeft, ChevronRight,
  CheckCircle2, AlertCircle, Dumbbell, Shield,
  Settings2, Info, Save
} from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const Training = () => {
  const { showToast } = useToast();
  const { letra } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [blocos, setBlocos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [currentExerciseInBlock, setCurrentExerciseInBlock] = useState(0);
  const [currentSerie, setCurrentSerie] = useState(1);
  const [executionMode, setExecutionMode] = useState('alternated'); // 'alternated' or 'isolated'

  const [timer, setTimer] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const [cargas, setCargas] = useState({}); // { blockIndex_exIndex: value }
  const [repsFeitas, setRepsFeitas] = useState({});
  const [savingSession, setSavingSession] = useState(false);

  useEffect(() => {
    fetchData();
  }, [letra]);

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

  const fetchData = async () => {
    setLoading(true);

    // Fetch User
    const { data: userData } = await supabase.from('usuarios').select('*').single();
    setUser(userData);

    // Fetch Blocks
    const { data, error } = await supabase
      .from('blocos_treino')
      .select('*, exercicios(*)')
      .eq('letra_treino', letra)
      .order('numero_bloco', { ascending: true })
      .order('ordem_execucao', { ascending: true });

    if (error) {
      console.error('Erro ao buscar treino:', error);
    } else {
      const grouped = data.reduce((acc, curr) => {
        if (!acc[curr.numero_bloco]) acc[curr.numero_bloco] = [];
        acc[curr.numero_bloco].push(curr);
        return acc;
      }, {});
      const blocksArray = Object.values(grouped);
      setBlocos(blocksArray);

      // Initialize cargas and reps
      const initialCargas = {};
      const initialReps = {};
      blocksArray.forEach((block, bIdx) => {
        block.forEach((ex, eIdx) => {
          initialCargas[`${bIdx}_${eIdx}`] = 0;
          initialReps[`${bIdx}_${eIdx}`] = ex.reps_alvo.includes('-') ? parseInt(ex.reps_alvo.split('-')[1]) : parseInt(ex.reps_alvo) || 10;
        });
      });
      setCargas(initialCargas);
      setRepsFeitas(initialReps);
    }
    setLoading(false);
  };

  const startTimer = (seconds) => {
    setTimer(seconds);
    setIsTimerActive(true);
  };

  const handleCargaChange = (bIdx, eIdx, val) => {
    setCargas(prev => ({ ...prev, [`${bIdx}_${eIdx}`]: val }));
  };

  const handleRepsChange = (bIdx, eIdx, val) => {
    setRepsFeitas(prev => ({ ...prev, [`${bIdx}_${eIdx}`]: val }));
  };

  const nextStep = () => {
    const currentBlock = blocos[currentBlockIndex];
    const isLastExerciseInBlock = currentExerciseInBlock === currentBlock.length - 1;
    const isLastSerie = currentSerie === currentBlock[0].series_alvo;

    if (executionMode === 'alternated') {
      if (!isLastExerciseInBlock) {
        // Go to next exercise in same block
        setCurrentExerciseInBlock(currentExerciseInBlock + 1);
        startTimer(currentBlock[currentExerciseInBlock].exercicios.descanso_passivo_segundos || 60);
      } else {
        if (!isLastSerie) {
          // Go back to first exercise, next serie
          setCurrentExerciseInBlock(0);
          setCurrentSerie(currentSerie + 1);
          startTimer(currentBlock[currentExerciseInBlock].exercicios.descanso_passivo_segundos || 60);
        } else {
          // Go to next block
          goToNextBlock();
        }
      }
    } else {
      // isolated mode
      if (!isLastSerie) {
        setCurrentSerie(currentSerie + 1);
        startTimer(currentBlock[currentExerciseInBlock].exercicios.descanso_passivo_segundos || 60);
      } else {
        if (!isLastExerciseInBlock) {
          setCurrentExerciseInBlock(currentExerciseInBlock + 1);
          setCurrentSerie(1);
          startTimer(currentBlock[currentExerciseInBlock].exercicios.descanso_passivo_segundos || 60);
        } else {
          goToNextBlock();
        }
      }
    }
  };

  const goToNextBlock = () => {
    if (currentBlockIndex < blocos.length - 1) {
      setCurrentBlockIndex(currentBlockIndex + 1);
      setCurrentExerciseInBlock(0);
      setCurrentSerie(1);
      startTimer(120); // Longer rest between blocks
    } else {
      finishWorkout();
    }
  };

  const finishWorkout = async () => {
    setSavingSession(true);
    // Record history
    const historyData = [];
    blocos.forEach((block, bIdx) => {
      block.forEach((ex, eIdx) => {
        historyData.push({
          usuario_id: user.id,
          exercicio_id: ex.exercicio_id,
          carga_utilizada: parseFloat(cargas[`${bIdx}_${eIdx}`] || 0),
          repeticoes_feitas: parseInt(repsFeitas[`${bIdx}_${eIdx}`] || 0),
          series_executadas: ex.series_alvo,
          letra_treino: letra,
          data_treino: new Date().toISOString()
        });
      });
    });

    const { error } = await supabase.from('historico_cargas').insert(historyData);

    if (error) showToast('Erro ao salvar histórico: ' + error.message, 'error');
    else {
      showToast('Treino concluído e registrado!', 'success');
      navigate('/');
    }
    setSavingSession(false);
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Iniciando treino...</div>;
  if (!blocos.length) return <div className="p-10 text-center text-slate-500">Nenhum exercício encontrado. <Link to="/" className="underline">Voltar</Link></div>;

  const currentBlock = blocos[currentBlockIndex];
  const exercise = currentBlock[currentExerciseInBlock];
  const isCoringa = currentBlock.some(b => b.is_coringa);

  return (
    <div className={`min-h-screen transition-colors duration-700 ${isCoringa ? 'bg-amber-900 text-amber-50' : 'bg-slate-900 text-white'}`}>
      <div className="p-6 max-w-md mx-auto">
        <header className="flex justify-between items-center mb-6">
          <button onClick={() => navigate('/')} className="opacity-50 hover:opacity-100 transition"><ChevronLeft /></button>
          <div className="text-center">
            <span className={`text-[10px] uppercase font-black tracking-[0.2em] block mb-1 ${isCoringa ? 'text-amber-400' : 'text-indigo-400'}`}>
              Treino {letra} {isCoringa && '• CORINGA'}
            </span>
            <span className="font-bold text-lg">Bloco {currentBlockIndex + 1} de {blocos.length}</span>
          </div>
          <button
            onClick={() => setExecutionMode(prev => prev === 'alternated' ? 'isolated' : 'alternated')}
            className={`p-2 rounded-lg border ${isCoringa ? 'border-amber-700 bg-amber-800' : 'border-slate-700 bg-slate-800'}`}
          >
            <Settings2 size={20} />
          </button>
        </header>

        {/* Progression */}
        <div className="flex gap-2 mb-8">
           {[...Array(exercise.series_alvo)].map((_, i) => (
             <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
               (i + 1) < currentSerie ? 'bg-emerald-500' :
               (i + 1) === currentSerie ? (isCoringa ? 'bg-amber-400 animate-pulse' : 'bg-indigo-500 animate-pulse') :
               (isCoringa ? 'bg-amber-800' : 'bg-slate-800')
             }`}></div>
           ))}
        </div>

        {/* Active Block View */}
        <div className={`rounded-3xl p-6 mb-6 shadow-2xl relative overflow-hidden ${isCoringa ? 'bg-amber-800/50 border border-amber-700' : 'bg-slate-800 border border-slate-700'}`}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mb-2 inline-block ${isCoringa ? 'bg-amber-400 text-amber-950' : 'bg-indigo-500 text-white'}`}>
                Série {currentSerie} / {exercise.series_alvo}
              </span>
              <h2 className="text-2xl font-bold leading-tight">{exercise.exercicios.nome}</h2>
              <p className="text-sm opacity-60 flex items-center gap-1"><Info size={14} /> {exercise.exercicios.alvo_principal}</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black opacity-10 italic">#{exercise.exercicios.tipo_fibra}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className={`p-4 rounded-2xl ${isCoringa ? 'bg-amber-900/50' : 'bg-slate-900/50'}`}>
                <label className="text-[10px] font-bold opacity-50 uppercase block mb-1">Carga (kg)</label>
                <input
                  type="number"
                  value={cargas[`${currentBlockIndex}_${currentExerciseInBlock}`]}
                  onChange={(e) => handleCargaChange(currentBlockIndex, currentExerciseInBlock, e.target.value)}
                  className="bg-transparent text-2xl font-mono font-bold outline-none w-full"
                />
             </div>
             <div className={`p-4 rounded-2xl ${isCoringa ? 'bg-amber-900/50' : 'bg-slate-900/50'}`}>
                <label className="text-[10px] font-bold opacity-50 uppercase block mb-1">Reps ({exercise.reps_alvo})</label>
                <input
                  type="number"
                  value={repsFeitas[`${currentBlockIndex}_${currentExerciseInBlock}`]}
                  onChange={(e) => handleRepsChange(currentBlockIndex, currentExerciseInBlock, e.target.value)}
                  className="bg-transparent text-2xl font-mono font-bold outline-none w-full"
                />
             </div>
          </div>

          {exercise.exercicios.depende_peso_corporal && (
            <div className="mt-4 flex items-center gap-2 text-xs font-medium opacity-70">
              <Scale size={14} /> Peso Corporal ({user?.massa_corporea_atual}kg) + Carga Adicional
            </div>
          )}
        </div>

        {/* Rest Timer */}
        <div className={`rounded-3xl p-6 mb-6 flex items-center justify-between transition-all duration-500 ${isTimerActive ? (isCoringa ? 'bg-amber-500 text-amber-950 scale-105 shadow-lg shadow-amber-900/50' : 'bg-indigo-600 scale-105 shadow-lg shadow-indigo-900/50') : (isCoringa ? 'bg-amber-800/30' : 'bg-slate-800')}`}>
           <div>
              <p className="text-[10px] font-bold uppercase mb-1 opacity-70">Descanso Passivo</p>
              <p className="text-4xl font-mono font-black">
                {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
              </p>
           </div>
           <button
             onClick={() => isTimerActive ? setIsTimerActive(false) : timer > 0 ? setIsTimerActive(true) : startTimer(60)}
             className={`w-14 h-14 rounded-full flex items-center justify-center transition ${isTimerActive ? 'bg-black/20' : 'bg-white/10 hover:bg-white/20'}`}
           >
             {isTimerActive ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1" />}
           </button>
        </div>

        {/* Simultaneous Loads (if alternated) */}
        {currentBlock.length > 1 && (
          <div className={`p-4 rounded-2xl mb-6 border border-dashed ${isCoringa ? 'border-amber-700 bg-amber-800/20' : 'border-slate-700 bg-slate-800/50'}`}>
             <div className="flex justify-between items-center mb-3">
               <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Carga Alternada</span>
               <div className="px-2 py-0.5 bg-white/10 rounded text-[9px] font-bold uppercase tracking-tighter">Modo: {executionMode === 'alternated' ? 'Alternado' : 'Isolado'}</div>
             </div>
             {currentBlock.map((ex, idx) => {
               if (idx === currentExerciseInBlock) return null;
               return (
                 <div key={idx} className="flex items-center justify-between">
                    <p className="font-bold text-sm truncate mr-4">{ex.exercicios.nome}</p>
                    <div className="flex items-center gap-2 bg-black/20 p-1 px-3 rounded-xl">
                       <Dumbbell size={14} className="opacity-40" />
                       <input
                         type="number"
                         value={cargas[`${currentBlockIndex}_${idx}`]}
                         onChange={(e) => handleCargaChange(currentBlockIndex, idx, e.target.value)}
                         className="bg-transparent w-12 font-mono font-bold text-right outline-none"
                       />
                       <span className="text-[10px] opacity-40">kg</span>
                    </div>
                 </div>
               );
             })}
          </div>
        )}

        <button
          onClick={nextStep}
          disabled={isTimerActive || savingSession}
          className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${
            isTimerActive ? 'bg-slate-800 text-slate-600 grayscale cursor-not-allowed' :
            isCoringa ? 'bg-amber-400 text-amber-950 hover:bg-amber-300' : 'bg-emerald-500 text-white hover:bg-emerald-400'
          }`}
        >
          {savingSession ? 'Salvando...' : (
             currentBlockIndex === blocos.length - 1 && currentSerie === exercise.series_alvo && (executionMode === 'isolated' ? currentExerciseInBlock === currentBlock.length - 1 : true)
             ? <><Save /> Finalizar Treino</>
             : <>{executionMode === 'alternated' ? (currentExerciseInBlock === 0 && currentBlock.length > 1 ? 'Ir para Alternado' : 'Concluir Série') : 'Concluir Série'} <ChevronRight /></>
          )}
        </button>

        <p className="text-center mt-6 text-[10px] font-bold opacity-30 uppercase tracking-[0.3em]">SmartTraining Architecture V2.0</p>
      </div>
    </div>
  );
};

export default Training;
