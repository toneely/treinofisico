import React, { useState, useEffect, useReducer, useCallback } from "react";
import { supabase } from "../supabaseClient";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Dumbbell,
  Save,
  SkipForward,
  Flame,
  X,
  Scale,
  MoreVertical,
  Square,
  Clock,
  LayoutList,
  Zap,
} from "lucide-react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

// --- State Machine Helpers ---
const formatTime = (seconds) => {
  if (seconds === null || seconds === undefined) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const parseTime = (timeStr) => {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const [mins, secs] = timeStr.split(":").map(Number);
  return mins * 60 + (secs || 0);
};

const initialState = {
  currentBlockIndex: 0,
  currentExerciseInBlock: 0,
  currentSerie: 1,
  executionMode: "alternated",
  isTimerActive: false,
  timer: 0,
  status: "IDLE", // IDLE, EXECUTING, RESTING, COMPLETED
  exerciseTimes: {}, // { exercicio_id: [s1, s2...] }
  restTimes: {}, // { exercicio_id: [s1, s2...] }
  activeRestTimers: {}, // { exercicio_id: { seconds: number, title: string, nome: string } }
  cargas: {}, // { exercicio_id: last_used_load }
  exerciseLoads: {}, // { exercicio_id: [s1, s2...] }
  repsFeitas: {}, // { exercicio_id: current_input_reps }
  exerciseReps: {}, // { exercicio_id: [s1, s2...] }
  skippedExercises: [],
  isCatchupPhase: false,
  showCheckoutModal: false,
  blocos: [],
  originalBlocos: [],
};

function trainingReducer(state, action) {
  switch (action.type) {
    case "INIT_SESSION":
      return { ...state, ...action.payload, status: "IDLE" };

    case "TICK": {
      const nextActiveRestTimers = { ...state.activeRestTimers };
      Object.keys(nextActiveRestTimers).forEach((id) => {
        nextActiveRestTimers[id] = {
          ...nextActiveRestTimers[id],
          seconds: nextActiveRestTimers[id].seconds + 1,
        };
      });
      return {
        ...state,
        timer: state.isTimerActive ? state.timer + 1 : state.timer,
        activeRestTimers: nextActiveRestTimers,
      };
    }

    case "START_SERIES": {
      const exId = action.exercicio_id;
      const idStr = String(exId);
      const nextRestTimes = { ...state.restTimes };
      const nextActiveRestTimers = { ...state.activeRestTimers };

      if (nextActiveRestTimers[idStr]) {
        nextRestTimes[idStr] = [
          ...(nextRestTimes[idStr] || []),
          nextActiveRestTimers[idStr].seconds,
        ];
        delete nextActiveRestTimers[idStr];
      }

      return {
        ...state,
        timer: 0,
        isTimerActive: true,
        status: "EXECUTING",
        restTimes: nextRestTimes,
        activeRestTimers: nextActiveRestTimers,
      };
    }

    case "STOP_SERIES": {
      const { exId, currentInputLoad, currentInputReps, nomeEx, seriesAlvo } =
        action.payload;
      const isLastSerie = state.currentSerie >= seriesAlvo;

      const nextExerciseLoads = {
        ...state.exerciseLoads,
        [exId]: [...(state.exerciseLoads[exId] || []), currentInputLoad],
      };
      const nextExerciseReps = {
        ...state.exerciseReps,
        [exId]: [...(state.exerciseReps[exId] || []), currentInputReps],
      };
      const nextExerciseTimes = {
        ...state.exerciseTimes,
        [exId]: [...(state.exerciseTimes[exId] || []), state.timer],
      };

      const nextActiveRestTimers = { ...state.activeRestTimers };
      if (!isLastSerie) {
        nextActiveRestTimers[String(exId)] = {
          seconds: 0,
          title: `Descanso ${state.currentSerie}-${seriesAlvo}`,
          nome: nomeEx,
        };
      }

      return {
        ...state,
        isTimerActive: false,
        status: "RESTING",
        exerciseLoads: nextExerciseLoads,
        exerciseReps: nextExerciseReps,
        exerciseTimes: nextExerciseTimes,
        activeRestTimers: nextActiveRestTimers,
      };
    }

    case "ADVANCE_STEP": {
      const { currentBlock } = action.payload;
      let blockFinished = false;

      if (state.executionMode === "isolated" || currentBlock.length === 1) {
        blockFinished =
          state.currentExerciseInBlock === currentBlock.length - 1 &&
          state.currentSerie >=
            currentBlock[state.currentExerciseInBlock].series_alvo;
      } else {
        blockFinished = currentBlock.every(
          (ex) =>
            (state.exerciseTimes[ex.exercicio_id]?.length || 0) >=
            ex.series_alvo,
        );
      }

      if (blockFinished) {
        const isLastBlock = state.currentBlockIndex === state.blocos.length - 1;
        if (isLastBlock) return { ...state, status: "COMPLETED" };

        return {
          ...state,
          currentBlockIndex: state.currentBlockIndex + 1,
          currentExerciseInBlock: 0,
          currentSerie: 1,
          timer: 0,
          status: "IDLE",
        };
      }

      if (state.executionMode === "alternated" && currentBlock.length > 1) {
        let nextIdx = (state.currentExerciseInBlock + 1) % currentBlock.length;
        for (let i = 0; i < currentBlock.length; i++) {
          const candidate = currentBlock[nextIdx];
          const doneSeries =
            state.exerciseTimes[candidate.exercicio_id]?.length || 0;
          if (doneSeries < candidate.series_alvo) {
            return {
              ...state,
              currentExerciseInBlock: nextIdx,
              currentSerie: doneSeries + 1,
              timer: 0,
              status: "IDLE",
            };
          }
          nextIdx = (nextIdx + 1) % currentBlock.length;
        }
      }

      if (
        state.currentSerie <
        currentBlock[state.currentExerciseInBlock].series_alvo
      ) {
        return {
          ...state,
          currentSerie: state.currentSerie + 1,
          timer: 0,
          status: "IDLE",
        };
      } else {
        const nextIdx = state.currentExerciseInBlock + 1;
        const nextEx = currentBlock[nextIdx];
        const nextExPendingSerie =
          (state.exerciseTimes[nextEx?.exercicio_id]?.length || 0) + 1;
        return {
          ...state,
          currentExerciseInBlock: nextIdx,
          currentSerie: nextExPendingSerie,
          timer: 0,
          status: "IDLE",
        };
      }
    }

    case "SKIP_EXERCISE": {
      const { currentBlock } = action.payload;
      const exercise = currentBlock[state.currentExerciseInBlock];
      const isLastInBlock =
        state.currentExerciseInBlock === currentBlock.length - 1;

      let nextState = {
        ...state,
        isTimerActive: false,
        timer: 0,
        status: "IDLE",
      };

      if (
        state.executionMode === "alternated" &&
        currentBlock.length > 1 &&
        !isLastInBlock
      ) {
        nextState.currentExerciseInBlock += 1;
        const nextDone =
          state.exerciseTimes[
            currentBlock[nextState.currentExerciseInBlock].exercicio_id
          ]?.length || 0;
        nextState.currentSerie = nextDone + 1;
      } else {
        if (!state.isCatchupPhase) {
          const alreadySkipped = state.skippedExercises.some(
            (s) => s.exercicio_id === exercise.exercicio_id,
          );
          if (!alreadySkipped) {
            nextState.skippedExercises = [
              ...state.skippedExercises,
              { ...exercise, partialSerie: state.currentSerie },
            ];
          }
        }

        if (isLastInBlock) {
          if (state.currentBlockIndex === state.blocos.length - 1) {
            nextState.status = "COMPLETED";
          } else {
            nextState.currentBlockIndex += 1;
            nextState.currentExerciseInBlock = 0;
            const nextEx = state.blocos[nextState.currentBlockIndex][0];
            nextState.currentSerie =
              (state.exerciseTimes[nextEx.exercicio_id]?.length || 0) + 1;
          }
        } else {
          nextState.currentExerciseInBlock += 1;
          const nextEx = currentBlock[nextState.currentExerciseInBlock];
          nextState.currentSerie =
            (state.exerciseTimes[nextEx.exercicio_id]?.length || 0) + 1;
        }
      }
      return nextState;
    }

    case "MANUAL_OVERRIDE": {
      return {
        ...state,
        currentBlockIndex: action.bIdx,
        currentExerciseInBlock: action.eIdx,
        currentSerie: action.sNum,
        isTimerActive: false,
        timer: 0,
        status: "IDLE",
      };
    }

    case "SET_VALUE": {
      const { fieldType, exId, sIdx, val, part } = action;
      const targetMap = {
        load: "exerciseLoads",
        reps: "exerciseReps",
        exec: "exerciseTimes",
        rest: "restTimes",
        currentCarga: "cargas",
        currentReps: "repsFeitas",
      };

      const mapKey = targetMap[fieldType];
      if (fieldType === "currentCarga" || fieldType === "currentReps") {
        return { ...state, [mapKey]: { ...state[mapKey], [exId]: val } };
      }

      const newArr = [...(state[mapKey][exId] || [])];
      if (fieldType === "exec" || fieldType === "rest") {
        const currentSeconds = newArr[sIdx] || 0;
        const mins = Math.floor(currentSeconds / 60);
        const secs = currentSeconds % 60;
        if (part === "mins") newArr[sIdx] = (parseInt(val) || 0) * 60 + secs;
        else if (part === "secs")
          newArr[sIdx] = mins * 60 + (parseInt(val) || 0);
      } else {
        newArr[sIdx] = val;
      }
      return { ...state, [mapKey]: { ...state[mapKey], [exId]: newArr } };
    }

    case "DISMISS_REST": {
      const nextActive = { ...state.activeRestTimers };
      delete nextActive[action.exId];
      return { ...state, activeRestTimers: nextActive };
    }

    case "START_CATCHUP": {
      const catchupBlocks = state.skippedExercises.map((ex, idx) => [
        { ...ex, numero_bloco: 999 + idx },
      ]);
      const firstPartial = state.skippedExercises[0]?.partialSerie || 1;
      return {
        ...state,
        blocos: catchupBlocks,
        skippedExercises: [],
        isCatchupPhase: true,
        showCheckoutModal: false,
        currentBlockIndex: 0,
        currentExerciseInBlock: 0,
        currentSerie: firstPartial,
        timer: 0,
        isTimerActive: false,
      };
    }

    case "TOGGLE_MODE":
      return {
        ...state,
        executionMode:
          state.executionMode === "alternated" ? "isolated" : "alternated",
      };

    case "SHOW_CHECKOUT":
      return {
        ...state,
        showCheckoutModal: true,
        status: "IDLE",
        skippedExercises: action.payload || state.skippedExercises,
      };

    case "CLOSE_CHECKOUT":
      return { ...state, showCheckoutModal: false, status: "IDLE" };

    case "RESET_TIMER":
      return { ...state, timer: 0, isTimerActive: false, status: "IDLE" };

    default:
      return state;
  }
}

const Training = () => {
  const { showToast } = useToast();
  const { user: authUser } = useAuth();
  const { letra } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isResuming =
    new URLSearchParams(location.search).get("resume") === "true";

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingSession, setSavingSession] = useState(false);
  const [openMenuExId, setOpenMenuExId] = useState(null);
  const [lastExecutionTimes, setLastExecutionTimes] = useState({});
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [bpm, setBpm] = useState(60);
  const [isGuidedMode, setIsGuidedMode] = useState(
    localStorage.getItem("isGuidedMode") === "true",
  );
  const audioContextRef = React.useRef(null);

  const [state, dispatch] = useReducer(trainingReducer, initialState);
  const exerciseRefs = React.useRef({});

  const currentBlock = state.blocos[state.currentBlockIndex] || [];
  const exercise = currentBlock[state.currentExerciseInBlock] || {
    exercicios: {},
    exercicio_id: null,
    series_alvo: 0,
  };

  useEffect(() => {
    fetchData();
  }, [letra]);

  useEffect(() => {
    if (!loading && state.blocos.length > 0) {
      localStorage.setItem(
        "active_training_session",
        JSON.stringify({ ...state, letra }),
      );
    }
  }, [state, loading, letra]);

  useEffect(() => {
    localStorage.setItem("isGuidedMode", isGuidedMode);
  }, [isGuidedMode]);

  useEffect(() => {
    if (isGuidedMode) {
      const activeId = `${state.currentBlockIndex}_${state.currentExerciseInBlock}`;
      if (exerciseRefs.current[activeId]) {
        exerciseRefs.current[activeId].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [state.currentBlockIndex, state.currentExerciseInBlock, isGuidedMode]);

  useEffect(() => {
    let metronomeInterval = null;
    if (metronomeActive) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext || window.webkitAudioContext
        )();
      }

      const playClick = () => {
        if (!audioContextRef.current) return;
        const osc = audioContextRef.current.createOscillator();
        const envelope = audioContextRef.current.createGain();
        osc.type = "sine";
        osc.frequency.value = 1000;
        envelope.gain.value = 0.1;
        envelope.gain.exponentialRampToValueAtTime(
          0.001,
          audioContextRef.current.currentTime + 0.1,
        );
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
    const hasActiveTimers =
      state.isTimerActive || Object.keys(state.activeRestTimers).length > 0;
    if (!hasActiveTimers) return;

    const interval = setInterval(() => {
      dispatch({ type: "TICK" });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.isTimerActive, state.activeRestTimers]);

  const fetchData = async () => {
    setLoading(true);
    const { data: userData } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    setUser(
      userData || {
        id: authUser.id,
        nome: authUser.user_metadata?.full_name || authUser.email,
      },
    );

    if (isResuming) {
      const saved = localStorage.getItem("active_training_session");
      if (saved) {
        const stateData = JSON.parse(saved);
        dispatch({ type: "INIT_SESSION", payload: stateData });
        setLoading(false);

        const data = (stateData.originalBlocos || []).flat();
        const exerciseIds = data.map((ex) => ex.exercicio_id);
        const { data: lastHistory } = await supabase
          .from("historico_cargas")
          .select("exercicio_id, tempo_total_segundos")
          .in("exercicio_id", exerciseIds)
          .order("data_treino", { ascending: false });

        const lastTimes = {};
        if (lastHistory) {
          lastHistory.forEach((h) => {
            if (!lastTimes[h.exercicio_id])
              lastTimes[h.exercicio_id] = h.tempo_total_segundos;
          });
        }
        setLastExecutionTimes(lastTimes);
        return;
      }
    }

    const { data, error } = await supabase
      .from("blocos_treino")
      .select("*, exercicios(*)")
      .eq("letra_treino", letra)
      .eq("user_id", authUser.id)
      .order("numero_bloco", { ascending: true })
      .order("ordem_execucao", { ascending: true });

    if (error) {
      console.error("Erro ao buscar treino:", error);
    } else {
      const exerciseIds = data.map((ex) => ex.exercicio_id);
      const { data: lastHistory } = await supabase
        .from("historico_cargas")
        .select(
          "exercicio_id, tempo_total_segundos, carga, repeticoes, data_treino",
        )
        .in("exercicio_id", exerciseIds)
        .order("data_treino", { ascending: false });

      const lastTimes = {};
      const lastLoads = {};
      const lastRepsArr = {};
      if (lastHistory) {
        lastHistory.forEach((h) => {
          if (!lastTimes[h.exercicio_id]) {
            lastTimes[h.exercicio_id] = h.tempo_total_segundos;
            const loadArr = Array.isArray(h.carga) ? h.carga : [h.carga];
            lastLoads[h.exercicio_id] = loadArr[loadArr.length - 1];
            lastRepsArr[h.exercicio_id] = Array.isArray(h.repeticoes)
              ? h.repeticoes
              : [h.repeticoes];
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
      const initialCargas = {};
      const initialReps = {};
      const initialTimes = {};
      const initialRests = {};
      const initialExLoads = {};
      const initialExReps = {};

      data.forEach((ex) => {
        initialCargas[ex.exercicio_id] = lastLoads[ex.exercicio_id] ?? 0;
        const lastReps = lastRepsArr[ex.exercicio_id];
        initialReps[ex.exercicio_id] =
          lastReps && lastReps.length > 0
            ? lastReps[lastReps.length - 1]
            : ex.reps_alvo.includes("-")
              ? parseInt(ex.reps_alvo.split("-")[1])
              : parseInt(ex.reps_alvo) || 10;

        initialTimes[ex.exercicio_id] = [];
        initialRests[ex.exercicio_id] = [];
        initialExLoads[ex.exercicio_id] = [];
        initialExReps[ex.exercicio_id] = [];
      });

      dispatch({
        type: "INIT_SESSION",
        payload: {
          blocos: blocksArray,
          originalBlocos: blocksArray,
          cargas: initialCargas,
          repsFeitas: initialReps,
          exerciseTimes: initialTimes,
          restTimes: initialRests,
          exerciseLoads: initialExLoads,
          exerciseReps: initialExReps,
        },
      });
    }
    setLoading(false);
  };

  const finishWorkout = async () => {
    setSavingSession(true);
    const historyData = [];
    const workoutTimestamp = new Date().toISOString();

    state.originalBlocos.forEach((block) => {
      block.forEach((ex) => {
        const val = state.cargas[ex.exercicio_id];
        const execTimes = state.exerciseTimes[ex.exercicio_id] || [];
        const rests = state.restTimes[ex.exercicio_id] || [];
        const exLoads = state.exerciseLoads[ex.exercicio_id] || [];
        const exReps = state.exerciseReps[ex.exercicio_id] || [];

        if (
          (val !== "" && parseFloat(val) >= 0) ||
          execTimes.length > 0 ||
          rests.length > 0
        ) {
          const totalExec = execTimes.reduce((a, b) => a + b, 0);
          const totalRest = rests.reduce((a, b) => a + b, 0);

          historyData.push({
            user_id: authUser.id,
            exercicio_id: ex.exercicio_id,
            carga: exLoads.length > 0 ? exLoads : [parseFloat(val) || 0],
            repeticoes:
              exReps.length > 0
                ? exReps
                : [parseInt(state.repsFeitas[ex.exercicio_id]) || 0],
            series_executadas: execTimes.length || ex.series_alvo,
            tempo_total_segundos: totalExec + totalRest,
            tempo_execucao_segundos: execTimes,
            tempo_descanso_segundos: rests,
            letra_treino: letra,
            data_treino: workoutTimestamp,
          });
        }
      });
    });

    if (historyData.length === 0) {
      showToast("Nenhum exercício registrado.", "info");
      navigate("/inicio");
      return;
    }

    const { error } = await supabase
      .from("historico_cargas")
      .insert(historyData);
    if (error) showToast("Erro ao salvar histórico: " + error.message, "error");
    else {
      localStorage.removeItem("active_training_session");
      showToast("Treino concluído!", "success");
      navigate("/inicio");
    }
    setSavingSession(false);
  };

  useEffect(() => {
    if (state.status === "COMPLETED") {
      if (!state.isCatchupPhase) {
        const pendingExercises = [];
        state.originalBlocos.forEach((block) => {
          block.forEach((ex) => {
            const doneSeries =
              state.exerciseTimes[ex.exercicio_id]?.length || 0;
            if (doneSeries < ex.series_alvo) {
              pendingExercises.push({ ...ex, partialSerie: doneSeries + 1 });
            }
          });
        });

        if (pendingExercises.length > 0) {
          dispatch({ type: "SHOW_CHECKOUT", payload: pendingExercises });
        } else {
          finishWorkout();
        }
      } else {
        finishWorkout();
      }
    }
  }, [state.status]);

  if (loading)
    return (
      <div className="p-10 text-center text-slate-500">Iniciando treino...</div>
    );
  if (!state.blocos.length)
    return (
      <div className="p-10 text-center text-slate-500">
        Nenhum exercício encontrado.{" "}
        <Link to="/inicio" className="underline">
          Voltar
        </Link>
      </div>
    );


  const isPrimaryEx = exercise.exercicio_id === currentBlock[0]?.exercicio_id;
  const isWaitingForPlay = !state.isTimerActive && state.timer === 0;

  const dismissRestTimer = (exId) => dispatch({ type: "DISMISS_REST", exId });

  return (
    <div
      className="min-h-screen transition-colors duration-700 text-white"
      style={{ color: metronomeActive ? ("var(--text-on-secondary)") : "inherit", backgroundColor: "var(--bg-treino)" }}
    >
      <div className="p-6 max-w-md mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/inicio")}
              className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl text-white/50 hover:text-white transition"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={() => {
                showToast("Treino pausado. Seu progresso foi salvo.", "info");
                navigate("/inicio");
              }}
              className="px-4 h-12 bg-white/5 rounded-2xl text-white/50 hover:text-white transition flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-white/5"
            >
              <div className="flex gap-0.5">
                <div className="w-1 h-3 bg-current rounded-full" />
                <div className="w-1 h-3 bg-current rounded-full" />
              </div>
              Pausar
            </button>
          </div>

          <div className="text-center">
            <span
              className="text-[10px] uppercase font-black tracking-[0.3em] block mb-1 opacity-40"
              style={{ color: "var(--color-primary-safe)" }}
            >
              {state.isCatchupPhase ? "REPESCAGEM" : `Treino ${letra}`}
            </span>
            <span className="font-bold text-lg text-white">
              {isGuidedMode ? `Bloco ${state.currentBlockIndex + 1} de ${state.blocos.length}` : "Visão Geral"}
            </span>
          </div>

          <div className="flex gap-2">
            <div
              className={`flex items-center gap-3 h-12 px-4 rounded-2xl border transition-all ${metronomeActive ? "bg-white/10 border-white/20" : "bg-white/5 border-white/5 opacity-50"}`}
            >
              <button
                onClick={() => setMetronomeActive(!metronomeActive)}
                className="text-white"
              >
                {metronomeActive ? (
                  <Pause size={18} fill="currentColor" />
                ) : (
                  <Play size={18} fill="currentColor" />
                )}
              </button>
              <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                <input
                  type="number"
                  value={bpm}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setBpm(
                      Math.max(
                        30,
                        Math.min(240, parseInt(e.target.value) || 60),
                      ),
                    )
                  }
                  className="bg-transparent w-8 text-center text-sm font-black outline-none text-white"
                />
                <span className="text-[8px] font-black opacity-30 tracking-tighter">BPM</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex bg-black/40 border border-white/5 rounded-3xl p-1.5 mb-10 shadow-2xl">
          <button
            onClick={() => setIsGuidedMode(false)}
            className={`flex-1 py-4 rounded-2xl text-[10px] uppercase font-black tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${!isGuidedMode ? "bg-white/10 text-white border border-white/10 shadow-xl" : "text-white/20 hover:text-white/40"}`}
          >
            <LayoutList size={16} /> Modo Manual
          </button>
          <button
            onClick={() => setIsGuidedMode(true)}
            className={`flex-1 py-4 rounded-2xl text-[10px] uppercase font-black tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${isGuidedMode ? "bg-white/10 text-white border border-white/10 shadow-xl" : "text-white/20 hover:text-white/40"}`}
          >
            <Zap size={16} /> Modo Guiado
          </button>
        </div>

        <div className="space-y-8 pb-32">
          {state.blocos.map((block, bIdx) => (
            <div key={bIdx} className="space-y-4">
              <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] px-2">
                Bloco {bIdx + 1}
              </h3>
              {block.map((ex, eIdx) => {
                const isDone =
                  bIdx < state.currentBlockIndex ||
                  (bIdx === state.currentBlockIndex &&
                    state.currentExerciseInBlock > eIdx) ||
                  (bIdx === state.currentBlockIndex &&
                    state.currentExerciseInBlock === eIdx &&
                    state.currentSerie > ex.series_alvo);
                const isCurrent =
                  bIdx === state.currentBlockIndex &&
                  state.currentExerciseInBlock === eIdx;
                const isSkipped = state.skippedExercises.some(
                  (s) => s.exercicio_id === ex.exercicio_id,
                );
                const currentExSerie = isCurrent
                  ? state.currentSerie
                  : isDone
                    ? ex.series_alvo
                    : isSkipped
                      ? state.skippedExercises.find(
                          (s) => s.exercicio_id === ex.exercicio_id,
                        )?.partialSerie || 0
                      : 0;

                const isExpanded = !isGuidedMode || isCurrent;

                return (
                  <div
                    key={`${bIdx}_${eIdx}`}
                    ref={(el) => (exerciseRefs.current[`${bIdx}_${eIdx}`] = el)}
                    className={`relative rounded-3xl transition-all duration-500 overflow-hidden border ${isCurrent && isGuidedMode ? "border-primary shadow-2xl scale-[1.02] z-10" : "border-white/10"}`}
                    style={{
                      backgroundColor:
                        isCurrent && isGuidedMode
                          ? "rgba(255, 255, 255, 0.08)"
                          : isDone
                            ? "rgba(16, 185, 129, 0.05)"
                            : isGuidedMode
                              ? "rgba(255, 255, 255, 0.02)"
                              : "rgba(255, 255, 255, 0.03)",
                      borderColor:
                        isCurrent && isGuidedMode
                          ? "var(--color-primary)"
                          : "rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    {/* Header do Card */}
                    <div
                      className={`flex justify-between items-center transition-all ${isGuidedMode ? "p-5" : "p-4 border-b border-white/5"} ${!isExpanded ? "opacity-40" : ""}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`rounded-2xl flex items-center justify-center transition-colors ${isGuidedMode ? "w-10 h-10" : "w-8 h-8"} ${isCurrent && isGuidedMode ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white/5 text-white/30"}`}
                          style={{
                            backgroundColor:
                              isCurrent && isGuidedMode
                                ? "var(--color-primary)"
                                : undefined,
                          }}
                        >
                          {isDone ? (
                            <CheckCircle2 size={isGuidedMode ? 20 : 16} className="text-emerald-500" />
                          ) : (
                            <Dumbbell size={isGuidedMode ? 20 : 16} />
                          )}
                        </div>
                        <div>
                          <h4 className={`font-bold text-white leading-tight ${isGuidedMode ? "text-base" : "text-sm"}`}>
                            {ex.exercicios.nome}
                          </h4>
                          <div className="flex gap-3 items-center mt-0.5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                              {currentExSerie}/{ex.series_alvo} Séries
                            </span>
                            {!isGuidedMode && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                                  {ex.reps_alvo} Reps
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {isGuidedMode && !isCurrent && (
                        <button
                          onClick={() =>
                            dispatch({
                              type: "MANUAL_OVERRIDE",
                              bIdx,
                              eIdx,
                              sNum: currentExSerie || 1,
                            })
                          }
                          className="text-[9px] font-black uppercase tracking-[0.1em] px-4 py-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition border border-white/5"
                        >
                          Focar
                        </button>
                      )}
                    </div>

                    {/* Conteúdo Expandido */}
                    {isExpanded && (
                      <div className={`animate-in slide-in-from-top-2 duration-300 ${isGuidedMode ? "px-5 pb-5" : "p-3 bg-black/20"}`}>
                        {/* Timers e Controles (Só no Guided Mode Ativo) */}
                        {isGuidedMode && isCurrent && (
                          <div className="space-y-4 mb-6">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-black/40 rounded-2xl p-4 flex flex-col items-center justify-center border border-white/5 shadow-inner">
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">
                                  Execução
                                </span>
                                <span className="text-2xl font-mono font-black text-white tracking-tighter">
                                  {formatTime(state.timer)}
                                </span>
                              </div>
                              <div className="bg-black/40 rounded-2xl p-4 flex flex-col items-center justify-center border border-white/5 shadow-inner">
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">
                                  Descanso
                                </span>
                                <span className="text-2xl font-mono font-black text-white/40 tracking-tighter">
                                  {state.activeRestTimers[ex.exercicio_id]
                                    ? formatTime(
                                        state.activeRestTimers[ex.exercicio_id]
                                          .seconds,
                                      )
                                    : "0:00"}
                                </span>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {!state.isTimerActive ? (
                                <button
                                  onClick={() =>
                                    dispatch({
                                      type: "START_SERIES",
                                      exercicio_id: ex.exercicio_id,
                                    })
                                  }
                                  className="flex-1 py-4.5 rounded-2xl bg-primary text-white font-black text-[11px] uppercase tracking-[0.15em] shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
                                  style={{
                                    backgroundColor: "var(--color-primary)",
                                  }}
                                >
                                  Iniciar Série {state.currentSerie}
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    dispatch({
                                      type: "STOP_SERIES",
                                      payload: {
                                        exId: ex.exercicio_id,
                                        currentInputLoad:
                                          parseFloat(
                                            state.cargas[ex.exercicio_id],
                                          ) || 0,
                                        currentInputReps:
                                          parseInt(
                                            state.repsFeitas[ex.exercicio_id],
                                          ) || 0,
                                        nomeEx: ex.exercicios.nome,
                                        seriesAlvo: ex.series_alvo,
                                      },
                                    })
                                  }
                                  className="flex-1 py-4.5 rounded-2xl bg-white text-black font-black text-[11px] uppercase tracking-[0.15em] shadow-xl active:scale-[0.98] transition-all"
                                >
                                  Finalizar Série {state.currentSerie}
                                </button>
                              )}
                              <button
                                onClick={() => dispatch({ type: "RESET_TIMER" })}
                                className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 text-white/30 hover:text-white transition-all border border-white/5 active:bg-white/10"
                              >
                                <RotateCcw size={20} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Grade de Séries / Inputs */}
                        <div
                          className={`grid gap-1.5 ${isGuidedMode ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}
                        >
                          {[...Array(ex.series_alvo)].map((_, sIdx) => {
                            const sNum = sIdx + 1;
                            const isCurrentS =
                              isCurrent && sNum === state.currentSerie;
                            const isExecuted =
                              state.exerciseTimes[ex.exercicio_id]?.length > sIdx;

                            return (
                              <div
                                key={sIdx}
                                className={`flex items-center gap-3 transition-all ${isGuidedMode ? (isCurrentS ? "bg-white/10 ring-1 ring-white/10 p-3.5 rounded-2xl shadow-inner" : "bg-black/20 p-3 rounded-2xl opacity-60") : "bg-white/5 p-2 rounded-xl border border-white/5"}`}
                              >
                                <div
                                  className={`rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${isGuidedMode ? "w-8 h-8" : "w-6 h-6"} ${isExecuted ? "bg-emerald-500 text-white" : isCurrentS && isGuidedMode ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white/5 text-white/20"}`}
                                  style={{
                                    backgroundColor:
                                      isExecuted ? "#10b981" : (isCurrentS && isGuidedMode
                                        ? "var(--color-primary)"
                                        : undefined),
                                  }}
                                >
                                  {isExecuted ? <CheckCircle2 size={isGuidedMode ? 14 : 12} /> : sNum}
                                </div>

                                <div className="flex-1 grid grid-cols-2 gap-3">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      value={
                                        (isGuidedMode && isCurrentS
                                          ? state.cargas[ex.exercicio_id]
                                          : state.exerciseLoads[
                                              ex.exercicio_id
                                            ]?.[sIdx]) ?? ""
                                      }
                                      placeholder="0"
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) =>
                                        dispatch({
                                          type: "SET_VALUE",
                                          fieldType:
                                            isGuidedMode && isCurrentS
                                              ? "currentCarga"
                                              : "load",
                                          exId: ex.exercicio_id,
                                          sIdx,
                                          val: e.target.value,
                                        })
                                      }
                                      className={`bg-transparent w-full text-right font-mono font-black outline-none text-white ${isGuidedMode ? "text-base" : "text-sm"}`}
                                    />
                                    <span className="text-[8px] font-black text-white/20 uppercase tracking-tighter">
                                      kg
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-end gap-1.5 border-l border-white/5 pl-3">
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      value={
                                        (isGuidedMode && isCurrentS
                                          ? state.repsFeitas[ex.exercicio_id]
                                          : state.exerciseReps[
                                              ex.exercicio_id
                                            ]?.[sIdx]) ?? ""
                                      }
                                      placeholder="0"
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) =>
                                        dispatch({
                                          type: "SET_VALUE",
                                          fieldType:
                                            isGuidedMode && isCurrentS
                                              ? "currentReps"
                                              : "reps",
                                          exId: ex.exercicio_id,
                                          sIdx,
                                          val: e.target.value,
                                        })
                                      }
                                      className={`bg-transparent w-full text-right font-mono font-black outline-none text-white ${isGuidedMode ? "text-base" : "text-sm"}`}
                                    />
                                    <span className="text-[8px] font-black text-white/20 uppercase tracking-tighter">
                                      reps
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Footer do Card (Guided Mode Ativo) */}
                        {isGuidedMode && isCurrent && (
                          <div className="mt-6 pt-6 border-t border-white/5 flex flex-col gap-3">
                            <button
                              onClick={() =>
                                dispatch({
                                  type: "ADVANCE_STEP",
                                  payload: { currentBlock },
                                })
                              }
                              className="w-full py-5 bg-emerald-500 text-white rounded-[20px] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                              {(() => {
                                const isLastBlock =
                                  state.currentBlockIndex ===
                                  state.blocos.length - 1;
                                const isLastInBlock =
                                  state.executionMode === "isolated"
                                    ? state.currentExerciseInBlock ===
                                        currentBlock.length - 1 &&
                                      state.currentSerie === ex.series_alvo
                                    : currentBlock.every(
                                        (e) =>
                                          (state.exerciseTimes[
                                            e.exercicio_id
                                          ]?.length || 0) >= e.series_alvo,
                                      );
                                if (isLastInBlock) {
                                  if (isLastBlock) return "Finalizar Treino";
                                  return "Próximo Bloco";
                                }
                                return (
                                  <>
                                    Próximo Exercício <ChevronRight size={16} />
                                  </>
                                );
                              })()}
                            </button>
                            <button
                              onClick={() =>
                                dispatch({
                                  type: "SKIP_EXERCISE",
                                  payload: { currentBlock },
                                })
                              }
                              className="w-full py-3 text-white/20 hover:text-white/50 font-black text-[9px] uppercase tracking-[0.25em] transition-all"
                            >
                              Pular Exercício
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Botão Finalizar Treino (Apenas no Modo Manual ou ao fim do Guided) */}
          {!isGuidedMode && (
            <button
              onClick={finishWorkout}
              disabled={savingSession}
              className="w-full py-6 bg-emerald-500 text-white rounded-[32px] font-black text-lg uppercase tracking-widest shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all mt-8"
            >
              {savingSession ? "Salvando..." : "Finalizar Treino"}
            </button>
          )}
        </div>

        {state.showCheckoutModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-black border border-slate-800 w-full max-w-sm rounded-[32px] p-8 shadow-2xl">
              <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Flame size={40} />
              </div>
              <h2 className="text-2xl font-black text-white text-center mb-2">
                Fim de Treino?
              </h2>
              <p className="text-slate-400 text-center text-sm mb-6">
                Você possui <strong>{state.skippedExercises.length}</strong>{" "}
                exercícios pendentes. Deseja realizá-los agora na repescagem?
              </p>
              <div className="space-y-2 mb-8 max-h-32 overflow-y-auto scrollbar-hide">
                {state.skippedExercises.map((ex, i) => (
                  <div
                    key={i}
                    className="px-4 py-2 bg-white/5 rounded-xl text-xs font-bold text-slate-300 border border-white/5 italic"
                  >
                    {ex.exercicios.nome}
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => dispatch({ type: "START_CATCHUP" })}
                  className="w-full py-4 text-white rounded-2xl font-black shadow-lg bg-amber-500 hover:bg-amber-600 transition"
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

      {isGuidedMode && (
        <footer
          className="fixed bottom-0 left-0 right-0 p-6 border-t backdrop-blur-xl z-50"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <div className="max-w-md mx-auto">
          {Object.keys(state.activeRestTimers).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(state.activeRestTimers).map(([exId, data]) => {
                const isPrimary =
                  parseInt(exId) === currentBlock[0]?.exercicio_id;
                return (
                  <div
                    key={exId}
                    className="flex-1 min-w-[140px] p-2.5 px-4 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom duration-500 border border-white/10 text-white"
                    style={{
                      backgroundColor: isPrimary ? "var(--color-primary)" : "var(--color-secondary)",
                      color: isPrimary ? "var(--text-on-primary)" : "var(--text-on-secondary)"
                    }}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-[6px] font-black uppercase tracking-widest opacity-70 truncate">
                        {data.nome || "Exercício"}
                      </span>
                      <span className="text-sm font-mono font-black leading-tight">
                        {formatTime(data.seconds)}
                      </span>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[8px] font-bold uppercase opacity-60 tracking-tighter">
                        {data.title}
                      </span>
                      <button
                        onClick={() => dismissRestTimer(exId)}
                        data-testid={`dismiss-rest-${exId}`}
                        className="p-1 hover:bg-black/10 rounded-md"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-3 text-white">
            <span>Progresso Geral</span>
            <span>
              {(() => {
                const totalEx = state.blocos.reduce(
                  (acc, b) => acc + b.length,
                  0,
                );
                const doneEx =
                  state.blocos
                    .slice(0, state.currentBlockIndex)
                    .reduce((acc, b) => acc + b.length, 0) +
                  state.currentExerciseInBlock;
                return totalEx > 0 ? Math.round((doneEx / totalEx) * 100) : 0;
              })()}
              %
            </span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-1000"
              style={{
                width: `${(() => {
                  const totalEx = state.blocos.reduce(
                    (acc, b) => acc + b.length,
                    0,
                  );
                  const doneEx =
                    state.blocos
                      .slice(0, state.currentBlockIndex)
                      .reduce((acc, b) => acc + b.length, 0) +
                    state.currentExerciseInBlock;
                  return totalEx > 0 ? Math.round((doneEx / totalEx) * 100) : 0;
                })()}%`,
                backgroundColor: false
                  ? "var(--color-primary)"
                  : "var(--color-secondary)",
              }}
            ></div>
          </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Training;
