import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Play, Pause, RotateCcw, ChevronLeft, ChevronRight,
  CheckCircle2, AlertCircle, Dumbbell, Shield,
  Settings2, Info, Save, SkipForward, Flame, X, Scale,
  MoreVertical, Square, Clock
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
  const [timerMode, setTimerMode] = useState('execution'); // 'execution' or 'rest'
  const [exerciseTimes, setExerciseTimes] = useState({}); // { exercicio_id: [s1, s2...] }
  const [restTimes, setRestTimes] = useState({}); // { exercicio_id: [s1, s2...] }
  const [activeRestTimers, setActiveRestTimers] = useState({}); // { exercicio_id: { seconds: number, title: string, nome: string } }
  const [lastExecutionTimes, setLastExecutionTimes] = useState({}); // { exercicio_id: seconds }

  const [cargas, setCargas] = useState({}); // { exercicio_id: current_input_value }
  const [exerciseLoads, setExerciseLoads] = useState({}); // { exercicio_id: [s1, s2...] }
  const [repsFeitas, setRepsFeitas] = useState({}); // { exercicio_id: current_input_value }
  const [exerciseReps, setExerciseReps] = useState({}); // { exercicio_id: [s1, s2...] }
  const [savingSession, setSavingSession] = useState(false);

  const [originalBlocos, setOriginalBlocos] = useState([]);
  const [skippedExercises, setSkippedExercises] = useState([]);
  const [isCatchupPhase, setIsCatchupPhase] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [openMenuExId, setOpenMenuExId] = useState(null);

  const [metronomeActive, setMetronomeActive] = useState(false);
  const [bpm, setBpm] = useState(60);
  const audioContextRef = React.useRef(null);

  const currentBlock = blocos[currentBlockIndex] || [];
  const exercise = currentBlock[currentExerciseInBlock] || { exercicios: {}, exercicio_id: null, series_alvo: 0 };

  useEffect(() => {
    fetchData();
  }, [letra]);

  useEffect(() => {
    let metronomeInterval = null;
    if (metronomeActive) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const playClick = () => {
        if (!audioContextRef.current) return;
        const osc = audioContextRef.current.createOscillator();
        const envelope = audioContextRef.current.createGain();

        osc.type = 'sine';
        osc.frequency.value = 1000;
        envelope.gain.value = 0.1;
        envelope.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.1);

        osc.connect(envelope);
        envelope.connect(audioContextRef.current.destination);

        osc.start(audioContextRef.current.currentTime);
        osc.stop(audioContextRef.current.currentTime + 0.1);
      };

      const intervalMs = (60 / bpm) * 1000;
      playClick();
      metronomeInterval = setInterval(playClick, intervalMs);
    } else {
      clearInterval(metronomeInterval);
    }

    return () => clearInterval(metronomeInterval);
  }, [metronomeActive, bpm]);

  useEffect(() => {
    let interval = null;
    if (isTimerActive) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerActive]);

  useEffect(() => {
    let interval = null;
    const activeIds = Object.keys(activeRestTimers);
    // Only run interval if there are timers AND they have content
    if (activeIds.length > 0) {
      interval = setInterval(() => {
        setActiveRestTimers(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(id => {
                next[id] = { ...next[id], seconds: next[id].seconds + 1 };
            });
            return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeRestTimers]);

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
      // Fetch last execution data (times and loads) for these exercises
      const exerciseIds = data.map(ex => ex.exercicio_id);
      const { data: lastHistory } = await supabase
        .from('historico_cargas')
        .select('exercicio_id, tempo_total_segundos, carga_utilizada, repeticoes_feitas, data_treino')
        .in('exercicio_id', exerciseIds)
        .order('data_treino', { ascending: false });

      const lastTimes = {};
      const lastLoads = {};
      const lastReps = {};

      if (lastHistory) {
        lastHistory.forEach(h => {
          if (!lastTimes[h.exercicio_id]) {
            lastTimes[h.exercicio_id] = h.tempo_total_segundos;
            // If it's an array, take the last used value to pre-fill
            const loadArr = Array.isArray(h.carga_utilizada) ? h.carga_utilizada : [h.carga_utilizada];
            lastLoads[h.exercicio_id] = loadArr[loadArr.length - 1];
            lastReps[h.exercicio_id] = h.repeticoes_feitas;
          }
        });
      }
      setLastExecutionTimes(lastTimes);

      const grouped = data.reduce((acc, curr) => {
        if (!acc[curr.numero_bloco]) acc[curr.numero_bloco] = [];
        acc[curr.numero_bloco].push(curr);
        return acc;
      }, {});
      const blocksArray = Object.values(grouped);
      setBlocos(blocksArray);
      setOriginalBlocos(blocksArray);

      // Initialize cargas and reps using exercicio_id, inheriting from last session if available
      const initialCargas = {};
      const initialReps = {};
      const initialTimes = {};
      const initialRests = {};
      const initialExLoads = {};
      const initialExReps = {};
      data.forEach((ex) => {
        initialCargas[ex.exercicio_id] = lastLoads[ex.exercicio_id] ?? 0;
        // For reps, prefer last session, otherwise parse target
        initialReps[ex.exercicio_id] = lastReps[ex.exercicio_id] ?? (ex.reps_alvo.includes('-') ? parseInt(ex.reps_alvo.split('-')[1]) : parseInt(ex.reps_alvo) || 10);
        initialTimes[ex.exercicio_id] = [];
        initialRests[ex.exercicio_id] = [];
        initialExLoads[ex.exercicio_id] = [];
        initialExReps[ex.exercicio_id] = [];
      });
      setCargas(initialCargas);
      setExerciseLoads(initialExLoads);
      setExerciseReps(initialExReps);
      setRepsFeitas(initialReps);
      setExerciseTimes(initialTimes);
      setRestTimes(initialRests);
    }
    setLoading(false);
  };

  const startTimer = (targetExerciseId = null) => {
    const exId = targetExerciseId || exercise.exercicio_id;
    if (!exId) return;

    // Reset inputs for the NEW series with current values (which serve as baseline)
    // No explicit change needed here as cargas/repsFeitas already hold the "current" view.

    const idStr = String(exId);

    // Independence Logic: Only stop and record the rest timer for THIS specific exercise.
    // Other floating timers (e.g. from an alternated exercise) should keep running.
    setActiveRestTimers(prev => {
        if (prev[idStr]) {
            const restDuration = prev[idStr].seconds;

            // Record the rest time for this exercise
            setRestTimes(rt => ({
                ...rt,
                [idStr]: [...(rt[idStr] || []), restDuration]
            }));

            const newState = { ...prev };
            delete newState[idStr];
            return newState;
        }
        return prev;
    });

    // Reset and start execution timer
    setTimer(0);
    setTimerMode('execution');
    setIsTimerActive(true);
  };

  const stopAndRecordTime = () => {
    const exId = exercise.exercicio_id;
    if (!exId) return;

    // Capture current input load and reps for this series
    const currentInputLoad = parseFloat(cargas[exId]) || 0;
    const currentInputReps = parseInt(repsFeitas[exId]) || 0;

    setExerciseLoads(prev => ({
        ...prev,
        [exId]: [...(prev[exId] || []), currentInputLoad]
    }));

    setExerciseReps(prev => ({
        ...prev,
        [exId]: [...(prev[exId] || []), currentInputReps]
    }));

    setExerciseTimes(prev => ({
        ...prev,
        [exId]: [...(prev[exId] || []), timer]
    }));
    setIsTimerActive(false);
  };

  const stopExecutionAndStartRest = () => {
    const exId = exercise.exercicio_id;
    if (!exId) return;

    // Check if it's the last series BEFORE stopAndRecordTime to prevent floating timer trigger
    const isLastSerie = currentSerie >= exercise.series_alvo;

    stopAndRecordTime();

    // Bug fix 1: Don't spawn rest timer if it's the last series of the exercise
    if (isLastSerie) {
        return;
    }

    // Spawn trigger: Start floating rest for THIS exercise automatically
    const idStr = String(exId);
    setActiveRestTimers(prev => ({
        ...prev,
        [idStr]: {
            seconds: 0,
            title: `Descanso ${currentSerie}-${exercise.series_alvo}`,
            nome: exercise.exercicios.nome
        }
    }));
  };

  const resetSeriesTimer = () => {
    const exId = exercise.exercicio_id;
    if (!exId) return;

    const idStr = String(exId);

    // Reset execution timer
    setTimer(0);
    setIsTimerActive(false);

    // Cancel any associated active rest timer if it exists (accidental stop)
    setActiveRestTimers(prev => {
        if (prev[idStr]) {
            const next = { ...prev };
            delete next[idStr];
            return next;
        }
        return prev;
    });
  };

  const completeRestTimer = (exId) => {
    const idStr = String(exId);

    setActiveRestTimers(prev => {
        if (!prev[idStr]) return prev;

        const time = prev[idStr].seconds;
        setRestTimes(rt => ({
            ...rt,
            [idStr]: [...(rt[idStr] || []), time]
        }));

        const next = { ...prev };
        delete next[idStr];
        return next;
    });
  };

  const dismissRestTimer = (exId) => {
    const idStr = String(exId);
    setActiveRestTimers(prev => {
        const next = { ...prev };
        delete next[idStr];
        return next;
    });
  };

  const handleCargaChange = (exId, val) => {
    // 1. Update the current input state
    setCargas(prev => ({ ...prev, [exId]: val }));

    // 2. If we have already finished a series (stopped timer), update the latest recorded load
    // so user can correct it during rest.
    setExerciseLoads(prev => {
        const loads = [...(prev[exId] || [])];
        if (loads.length > 0) {
            loads[loads.length - 1] = parseFloat(val) || 0;
        }
        return { ...prev, [exId]: loads };
    });
  };

  const handleRepsChange = (exId, val) => {
    // 1. Update current input state
    setRepsFeitas(prev => ({ ...prev, [exId]: val }));

    // 2. Update latest recorded reps if we finished a series
    setExerciseReps(prev => {
        const reps = [...(prev[exId] || [])];
        if (reps.length > 0) {
            reps[reps.length - 1] = parseInt(val) || 0;
        }
        return { ...prev, [exId]: reps };
    });
  };

  const skipExercise = () => {
    const currentBlock = blocos[currentBlockIndex];
    const exercise = currentBlock[currentExerciseInBlock];

    if (!isCatchupPhase) {
        // Only add if not already skipped
        setSkippedExercises(prev => {
            if (prev.find(s => s.exercicio_id === exercise.exercicio_id)) return prev;
            return [...prev, { ...exercise, partialSerie: currentSerie }];
        });
    }

    if (isTimerActive) stopAndRecordTime();

    if (currentExerciseInBlock < currentBlock.length - 1) {
        setCurrentExerciseInBlock(currentExerciseInBlock + 1);
        setCurrentSerie(1);
        setTimer(0);
        setIsTimerActive(false);
    } else {
        goToNextBlock();
    }
  };

  const nextStep = () => {
    const currentBlock = blocos[currentBlockIndex];
    const isLastExerciseInBlock = currentExerciseInBlock === currentBlock.length - 1;
    const isLastSerieOfBlock = currentSerie >= exercise.series_alvo &&
                               currentBlock.every(ex => {
                                 // Check if ALL exercises in block are done
                                 // If we are at the last exercise, we check currentSerie
                                 // If not, we'd need to know how many series they've done.
                                 // But simple logic: if executionMode is alternated,
                                 // they all follow the same series progression mostly.
                                 return true;
                               });

    // Determine if the entire BLOCK is finished
    let blockFinished = false;
    if (executionMode === 'isolated') {
        blockFinished = isLastExerciseInBlock && (currentSerie >= exercise.series_alvo);
    } else {
        // Alternated: finished when we are at the last exercise AND it's the last serie
        // AND all other exercises in block have also reached their series_alvo.
        const allExercisesDone = currentBlock.every(ex => {
            const isCurrent = ex.exercicio_id === exercise.exercicio_id;
            const doneSeries = (exerciseTimes[ex.exercicio_id]?.length || 0) + (isCurrent ? 1 : 0);
            return doneSeries >= ex.series_alvo;
        });
        blockFinished = allExercisesDone;
    }

    if (blockFinished) {
        if (currentBlockIndex === blocos.length - 1) {
            handleWorkoutEnd();
        } else {
            goToNextBlock();
        }
        return;
    }

    advanceUI(currentBlock, isLastExerciseInBlock);
    setTimer(0);
    setIsTimerActive(false);
  };

  const advanceUI = (currentBlock, isLastExerciseInBlock) => {
    if (executionMode === 'alternated') {
      if (!isLastExerciseInBlock) {
        // Try next exercise in block
        const nextIdx = currentExerciseInBlock + 1;
        const nextEx = currentBlock[nextIdx];
        const nextExDoneSeries = exerciseTimes[nextEx.exercicio_id]?.length || 0;

        if (nextExDoneSeries < nextEx.series_alvo) {
            setCurrentExerciseInBlock(nextIdx);
        } else {
            // Next is done, stay here and increment serie if not done
            setCurrentSerie(currentSerie + 1);
        }
      } else {
        // We are at the last exercise, go back to first
        const firstEx = currentBlock[0];
        const firstExDoneSeries = exerciseTimes[firstEx.exercicio_id]?.length || 0;

        if (firstExDoneSeries < firstEx.series_alvo) {
            setCurrentExerciseInBlock(0);
            setCurrentSerie(currentSerie + 1);
        } else {
            // First is done, just increment current serie
            setCurrentSerie(currentSerie + 1);
        }
      }
    } else {
      // isolated mode
      if (currentSerie < exercise.series_alvo) {
        setCurrentSerie(currentSerie + 1);
      } else {
        setCurrentExerciseInBlock(currentExerciseInBlock + 1);
        setCurrentSerie(1);
      }
    }
  };

  const goToNextBlock = () => {
    if (currentBlockIndex < blocos.length - 1) {
      setCurrentBlockIndex(currentBlockIndex + 1);
      setCurrentExerciseInBlock(0);
      setCurrentSerie(1);
      setTimer(0);
      setIsTimerActive(false);
    } else {
      handleWorkoutEnd();
    }
  };

  const handleWorkoutEnd = () => {
    if (skippedExercises.length > 0 && !isCatchupPhase) {
        setShowCheckoutModal(true);
    } else {
        finishWorkout();
    }
  };

  const startCatchup = () => {
    const catchupBlocks = skippedExercises.map((ex, idx) => ([{
        ...ex,
        numero_bloco: 999 + idx
    }]));

    const firstPartialSerie = skippedExercises[0]?.partialSerie || 1;

    setBlocos(catchupBlocks);
    setSkippedExercises([]);
    setIsCatchupPhase(true);
    setShowCheckoutModal(false);
    setCurrentBlockIndex(0);
    setCurrentExerciseInBlock(0);
    setCurrentSerie(firstPartialSerie);
    setTimer(0);
    setIsTimerActive(false);
  };

  const finishWorkout = async () => {
    setSavingSession(true);
    // Record history
    const historyData = [];

    // We iterate through originalBlocos to make sure we don't lose data even if we are in catchup phase
    originalBlocos.forEach((block) => {
      block.forEach((ex) => {
        const val = cargas[ex.exercicio_id];
        const execTimes = exerciseTimes[ex.exercicio_id] || [];
        const rests = restTimes[ex.exercicio_id] || [];

        const exLoads = exerciseLoads[ex.exercicio_id] || [];
        const exReps = exerciseReps[ex.exercicio_id] || [];

        if ((val !== '' && parseFloat(val) >= 0) || execTimes.length > 0 || rests.length > 0) {
            const totalExec = execTimes.reduce((a, b) => a + b, 0);
            const totalRest = rests.reduce((a, b) => a + b, 0);

            historyData.push({
              usuario_id: user.id,
              exercicio_id: ex.exercicio_id,
              carga: exLoads.length > 0 ? exLoads : [parseFloat(val) || 0],
              repeticoes: exReps.length > 0 ? exReps : [parseInt(repsFeitas[ex.exercicio_id]) || 0],
              series_executadas: execTimes.length || ex.series_alvo,
              tempo_total_segundos: totalExec + totalRest,
              tempo_execucao_segundos: execTimes,
              tempo_descanso_segundos: rests,
              letra_treino: letra,
              data_treino: new Date().toISOString()
            });
        }
      });
    });

    if (historyData.length === 0) {
        showToast('Nenhum exercício registrado.', 'info');
        navigate('/');
        return;
    }

    const { error } = await supabase.from('historico_cargas').insert(historyData);

    if (error) showToast('Erro ao salvar histórico: ' + error.message, 'error');
    else {
      showToast('Treino concluído!', 'success');
      navigate('/');
    }
    setSavingSession(false);
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Iniciando treino...</div>;
  if (!blocos.length) return <div className="p-10 text-center text-slate-500">Nenhum exercício encontrado. <Link to="/" className="underline">Voltar</Link></div>;

  const isCoringa = currentBlock.some(b => b.is_coringa);
  const isPrimaryEx = exercise.exercicio_id === currentBlock[0]?.exercicio_id;

  return (
    <div className={`min-h-screen transition-colors duration-700 ${isCoringa ? 'bg-amber-900 text-amber-50' : 'bg-slate-900 text-white'}`}>
      <div className="p-6 max-w-md mx-auto">
        <header className="flex justify-between items-center mb-6">
          <button onClick={() => navigate('/')} className="opacity-50 hover:opacity-100 transition"><ChevronLeft /></button>
          <div className="text-center">
            <span className={`text-[10px] uppercase font-black tracking-[0.2em] block mb-1 ${isCoringa ? 'text-amber-400' : 'text-indigo-400'}`}>
              {isCatchupPhase ? 'REPESCAGEM' : `Treino ${letra}`} {isCoringa && !isCatchupPhase && '• CORINGA'}
            </span>
            <span className="font-bold text-lg">Bloco {currentBlockIndex + 1} de {blocos.length}</span>
          </div>
          <div className="flex gap-2">
            {/* Metronome Control */}
            <div className={`flex items-center gap-2 p-1 px-2 rounded-lg border transition-all ${metronomeActive ? (isCoringa ? 'bg-amber-400 border-amber-400 text-amber-950' : 'bg-indigo-500 border-indigo-500 text-white') : (isCoringa ? 'border-amber-700 bg-amber-800' : 'border-slate-700 bg-slate-800')}`}>
                <button onClick={() => setMetronomeActive(!metronomeActive)} className="hover:scale-110 transition">
                    {metronomeActive ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>
                <div className="flex items-center gap-1">
                    <input
                        type="number"
                        value={bpm}
                        onChange={(e) => setBpm(Math.max(30, Math.min(240, parseInt(e.target.value) || 60)))}
                        className="bg-transparent w-8 text-center text-xs font-bold outline-none"
                    />
                    <span className="text-[8px] font-bold opacity-60">BPM</span>
                </div>
            </div>

          </div>
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
              <div className="flex gap-2 items-center mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase inline-block ${isCoringa ? 'bg-amber-400 text-amber-950' : 'bg-indigo-500 text-white'}`}>
                    Série {currentSerie} / {exercise.series_alvo}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase inline-block ${isCoringa ? 'bg-amber-100/20 text-amber-100' : 'bg-rose-500 text-white'}`}>
                    {exercise.exercicios.alvo_principal}
                </span>
              </div>
              <h2 className="text-2xl font-bold leading-tight">{exercise.exercicios.nome}</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className={`p-4 rounded-2xl ${isCoringa ? 'bg-amber-900/50' : 'bg-slate-900/50'}`}>
                <label className="text-[10px] font-bold opacity-50 uppercase block mb-1">Carga (kg)</label>
                <input
                  type="number"
                  value={cargas[exercise.exercicio_id] ?? ''}
                  onChange={(e) => handleCargaChange(exercise.exercicio_id, e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="bg-transparent text-2xl font-mono font-bold outline-none w-full"
                />
             </div>
             <div className={`p-4 rounded-2xl ${isCoringa ? 'bg-amber-900/50' : 'bg-slate-900/50'}`}>
                <label className="text-[10px] font-bold opacity-50 uppercase block mb-1">Reps ({exercise.reps_alvo})</label>
                <input
                  type="number"
                  value={repsFeitas[exercise.exercicio_id] ?? ''}
                  onChange={(e) => handleRepsChange(exercise.exercicio_id, e.target.value)}
                  onFocus={(e) => e.target.select()}
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

        {/* Floating Timer Widgets */}
        <div className="fixed top-24 right-4 z-[200] flex flex-col gap-3 items-end max-w-[200px]">
            {Object.entries(activeRestTimers).map(([exId, data]) => {
                const isPrimary = parseInt(exId) === (currentBlock[0]?.exercicio_id);
                return (
                    <div key={exId} className={`p-3 px-5 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right duration-500 relative group border border-white/10 ${isPrimary ? 'bg-indigo-600 text-white' : 'bg-purple-600 text-white'}`}>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[7px] font-black uppercase tracking-widest opacity-70 truncate mb-0.5">{data.nome || 'Exercício'}</span>
                            <span className="text-[9px] font-bold uppercase tracking-tighter opacity-90 mb-1">{data.title}</span>
                            <span className="text-xl font-mono font-black leading-none">
                                {Math.floor(data.seconds / 60)}:{String(data.seconds % 60).padStart(2, '0')}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Stopwatch & Reference */}
        <div className={`rounded-3xl p-6 mb-6 flex items-center justify-between transition-all duration-500 relative ${
          isTimerActive
            ? (isCoringa
                ? 'bg-amber-500 text-amber-950 scale-105 shadow-lg shadow-amber-900/50'
                : (isPrimaryEx ? 'bg-indigo-600' : 'bg-purple-600') + ' scale-105 shadow-lg ' + (isPrimaryEx ? 'shadow-indigo-900/50' : 'shadow-purple-900/50')
              )
            : (isCoringa ? 'bg-amber-800/30' : 'bg-slate-800')
        }`}>
           <div className="flex flex-col">
              <p className="text-[10px] font-bold uppercase mb-1 opacity-70">Tempo de Execução</p>
              <div className="flex items-baseline gap-3">
                <p className="text-4xl font-mono font-black">
                    {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
                </p>
                {lastExecutionTimes[exercise.exercicios.id] > 0 && (
                  <div className="text-[10px] font-bold opacity-40 flex items-center gap-1">
                    <RotateCcw size={10} />
                    Ref: {Math.floor(lastExecutionTimes[exercise.exercicios.id] / 60)}:{String(lastExecutionTimes[exercise.exercicios.id] % 60).padStart(2, '0')}
                  </div>
                )}
              </div>
           </div>

           <div className="flex items-center gap-3">
                <button
                    onClick={resetSeriesTimer}
                    className="p-2 opacity-30 hover:opacity-100 transition rounded-lg hover:bg-white/10"
                    title="Reiniciar série"
                >
                    <RotateCcw size={18} />
                </button>

                {/* Show Play only if not active AND timer is 0 (prevents resumption after Stop) */}
                {(!isTimerActive && timer === 0) && (
                    <button
                        onClick={() => startTimer()}
                        data-testid="start-timer-btn"
                        className="w-14 h-14 rounded-full flex items-center justify-center transition bg-white/10 hover:bg-white/20"
                    >
                        <Play fill="currentColor" className="ml-1" />
                    </button>
                )}

                {/* Show Stop button only if active */}
                {isTimerActive && (
                    <button
                        onClick={stopExecutionAndStartRest}
                        data-testid="stop-timer-btn"
                        className="w-14 h-14 rounded-full flex items-center justify-center transition bg-black/20"
                    >
                        <Square fill="currentColor" size={20} />
                    </button>
                )}
           </div>
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
                 <div key={idx} className="space-y-2 border-t border-white/5 pt-3 mt-3 first:border-0 first:pt-0 first:mt-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-sm truncate">{ex.exercicios.nome}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[8px] font-bold bg-white/10 px-1.5 py-0.5 rounded uppercase opacity-60">{ex.exercicios.alvo_principal}</span>
                                <span className="text-[8px] font-bold text-indigo-300 uppercase">{ex.series_alvo}x {ex.reps_alvo}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-black/20 p-2 px-3 rounded-xl">
                            <Dumbbell size={14} className="opacity-40" />
                            <input
                                type="number"
                                value={cargas[ex.exercicio_id] ?? ''}
                                onChange={(e) => handleCargaChange(ex.exercicio_id, e.target.value)}
                                onFocus={(e) => e.target.select()}
                                className="bg-transparent w-12 font-mono font-bold text-right outline-none"
                            />
                            <span className="text-[10px] opacity-40">kg</span>
                        </div>
                    </div>
                 </div>
               );
             })}
          </div>
        )}

        <div className="flex flex-col gap-3">
            {(!isTimerActive && timer > 0) && (
                <button
                    onClick={nextStep}
                    disabled={savingSession}
                    className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${
                        isCoringa ? 'bg-amber-400 text-amber-950 hover:bg-amber-300' : 'bg-emerald-500 text-white hover:bg-emerald-400'
                    }`}
                >
                    {savingSession ? 'Salvando...' : (
                        (currentBlockIndex === blocos.length - 1 && currentSerie === exercise.series_alvo && (executionMode === 'isolated' ? currentExerciseInBlock === currentBlock.length - 1 : true))
                        ? <><Save /> {isCatchupPhase ? 'Finalizar Repescagem' : 'Finalizar Treino'}</>
                        : <>{executionMode === 'alternated' && currentBlock.length > 1 && currentExerciseInBlock === 0 ? 'Ir para Alternado' : 'Próxima Série'} <ChevronRight /></>
                    )}
                </button>
            )}

            {!isCatchupPhase && (
                <button
                    onClick={skipExercise}
                    disabled={isTimerActive || savingSession}
                    className="w-full py-3 text-sm font-bold opacity-40 hover:opacity-100 transition flex items-center justify-center gap-2"
                >
                    <SkipForward size={16} /> Pular Exercício
                </button>
            )}
        </div>

        {/* Session Exercise List */}
        <div className="mt-12 space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Exercícios da Sessão</h3>
            {blocos.flatMap((block, bIdx) => block.map((ex, eIdx) => {
                const isDone = (bIdx < currentBlockIndex) ||
                               (bIdx === currentBlockIndex && currentExerciseInBlock > eIdx) ||
                               (bIdx === currentBlockIndex && currentExerciseInBlock === eIdx && currentSerie > ex.series_alvo);

                const isCurrent = bIdx === currentBlockIndex && currentExerciseInBlock === eIdx;
                const isSkipped = skippedExercises.some(s => s.exercicio_id === ex.exercicio_id);
                const currentExSerie = isCurrent ? currentSerie : (isDone ? ex.series_alvo : (isSkipped ? (skippedExercises.find(s => s.exercicio_id === ex.exercicio_id)?.partialSerie || 0) : 0));

                return (
                    <div key={`${bIdx}_${eIdx}`} className={`relative p-4 rounded-2xl border transition-all ${
                        isCurrent ? (isCoringa ? 'bg-amber-400 border-amber-400 text-amber-950 scale-[1.02]' : 'bg-indigo-600 border-indigo-600 text-white scale-[1.02]') :
                        isDone ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        isSkipped ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                        'bg-white/5 border-white/10 text-white/40'
                    }`}>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCurrent ? 'bg-black/10' : 'bg-white/5'}`}>
                                    {isDone ? <CheckCircle2 size={16}/> : <Dumbbell size={16}/>}
                                </div>
                                <div>
                                    <p className="font-bold text-sm">{ex.exercicios.nome}</p>
                                    <div className="flex gap-2 items-center">
                                        <p className="text-[10px] opacity-60 font-medium">Séries: {currentExSerie}/{ex.series_alvo}</p>
                                        {cargas[ex.exercicio_id] > 0 && (
                                            <span className="text-[10px] font-black opacity-80 flex items-center gap-1">
                                                <Dumbbell size={10} /> {cargas[ex.exercicio_id]}kg
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setOpenMenuExId(openMenuExId === ex.exercicio_id ? null : ex.exercicio_id)}
                                    className="p-2 hover:bg-black/10 rounded-lg transition"
                                >
                                    <MoreVertical size={16} />
                                </button>

                                {openMenuExId === ex.exercicio_id && (
                                    <div className="absolute right-0 bottom-full mb-2 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-100">
                                        <button
                                            onClick={() => {
                                                if (isTimerActive) stopAndRecordTime();
                                                setCurrentBlockIndex(bIdx);
                                                setCurrentExerciseInBlock(eIdx);
                                                setCurrentSerie(currentExSerie > 0 && currentExSerie <= ex.series_alvo ? currentExSerie : 1);
                                                setOpenMenuExId(null);
                                                setTimer(0);
                                                setIsTimerActive(false);
                                            }}
                                            className="w-full p-3 text-left text-xs font-bold hover:bg-white/5 flex items-center gap-2 text-white"
                                        >
                                            <RotateCcw size={14} /> Voltar ao exercício
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Series Details Grid */}
                        <div className="mt-4 grid grid-cols-4 gap-2">
                            {[...Array(ex.series_alvo)].map((_, sIdx) => {
                                const sNum = sIdx + 1;
                                const execTime = exerciseTimes[ex.exercicio_id]?.[sIdx];
                                const restTime = restTimes[ex.exercicio_id]?.[sIdx];
                                const load = exerciseLoads[ex.exercicio_id]?.[sIdx];
                                const reps = exerciseReps[ex.exercicio_id]?.[sIdx];

                                const isCurrentS = isCurrent && sNum === currentSerie;
                                const liveExec = isCurrentS && isTimerActive ? timer : null;

                                // Rest occurs AFTER the series. So Rest 1 follows Series 1.
                                const liveRest = activeRestTimers[ex.exercicio_id] && sNum === (exerciseTimes[ex.exercicio_id]?.length) ? activeRestTimers[ex.exercicio_id].seconds : null;

                                return (
                                    <div key={sIdx} className={`p-2.5 py-3 rounded-2xl flex flex-col items-center border transition-all ${
                                        isCurrentS ? 'bg-white/20 border-white/40 ring-4 ring-white/10 scale-[1.05] z-10' :
                                        (execTime ? 'bg-black/20 border-white/5' : 'bg-black/5 border-transparent opacity-30')
                                    }`}>
                                        <span className="font-black text-[9px] opacity-40 uppercase mb-2">Série {sNum}</span>

                                        <div className="flex flex-col items-center gap-1 mb-2">
                                            <span className="font-mono font-black text-[11px] leading-none text-white">
                                                {load !== undefined ? `${load} kg` : '-- kg'}
                                            </span>
                                            <span className="font-bold text-[10px] text-white opacity-60">
                                                {reps !== undefined ? `${reps} reps` : '-- reps'}
                                            </span>
                                        </div>

                                        <div className="flex flex-col items-center w-full pt-2 border-t border-white/5 gap-1">
                                            <div className="flex items-center gap-1">
                                                <Clock size={8} className="opacity-30" />
                                                <span className="font-mono font-bold text-[9px] text-white">
                                                    {execTime ? `${Math.floor(execTime/60)}:${String(execTime%60).padStart(2,'0')}` : (liveExec !== null ? `${Math.floor(liveExec/60)}:${String(liveExec%60).padStart(2,'0')}` : '--:--')}
                                                </span>
                                            </div>
                                            <span className={`font-mono text-[8px] font-bold ${liveRest !== null ? 'text-emerald-400 animate-pulse' : 'opacity-30'}`}>
                                                {restTime ? `${Math.floor(restTime/60)}:${String(restTime%60).padStart(2,'0')}` : (liveRest !== null ? `${Math.floor(liveRest/60)}:${String(liveRest%60).padStart(2,'0')}` : '--:--')}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                );
            }))}
        </div>

        {/* Checkout Modal */}
        {showCheckoutModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-[32px] p-8 shadow-2xl">
                    <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Flame size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-white text-center mb-2">Fim de Treino?</h2>
                    <p className="text-slate-400 text-center text-sm mb-6">
                        Você pulou <strong>{skippedExercises.length}</strong> exercícios durante a sessão. Deseja realizá-los agora na repescagem?
                    </p>

                    <div className="space-y-2 mb-8 max-h-32 overflow-y-auto">
                        {skippedExercises.map((ex, i) => (
                            <div key={i} className="px-4 py-2 bg-white/5 rounded-xl text-xs font-bold text-slate-300 border border-white/5 italic">
                                {ex.exercicios.nome}
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={startCatchup}
                            className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-900/20 hover:bg-emerald-400 transition"
                        >
                            Fazer Agora (Repescagem)
                        </button>
                        <button
                            onClick={finishWorkout}
                            className="w-full py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold hover:bg-slate-700 transition"
                        >
                            Encerrar mesmo assim
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>

      {/* Global Progress Footer */}
      <footer className={`fixed bottom-0 left-0 right-0 p-6 border-t backdrop-blur-xl z-50 ${isCoringa ? 'bg-amber-900/90 border-amber-800' : 'bg-slate-950/90 border-slate-800'}`}>
        <div className="max-w-md mx-auto">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-3">
                <span>Progresso Geral</span>
                <span>{Math.round(((currentBlockIndex * 2 + currentExerciseInBlock) / (blocos.length * 2)) * 100)}%</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-1000 ${isCoringa ? 'bg-amber-400' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.round(((currentBlockIndex * 2 + currentExerciseInBlock) / (blocos.length * 2)) * 100)}%` }}
                ></div>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default Training;
