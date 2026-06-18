import React, { useState, useEffect, useReducer, useCallback } from "react";
import { createPortal } from "react-dom";
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
  CircleX,
  Plus,
  MoreHorizontal,
  Trash2,
  Layers,
  PlusCircle,
  ArrowUp,
  ArrowDown,
  Edit2,
  AlertTriangle,
} from "lucide-react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import ExerciseSelector from "../components/ExerciseSelector";

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
  exerciseTimes: {}, // { sessionId: [s1, s2...] }
  restTimes: {}, // { sessionId: [s1, s2...] }
  activeRestTimers: {}, // { sessionId: { seconds: number, title: string, nome: string } }
  cargas: {}, // { sessionId: last_used_load }
  exerciseLoads: {}, // { sessionId: [s1, s2...] }
  repsFeitas: {}, // { sessionId: current_input_reps }
  exerciseReps: {}, // { sessionId: [s1, s2...] }
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
      const idStr = String(action.sessionId);
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
      const { sessionId, currentInputLoad, currentInputReps, nomeEx, seriesAlvo } =
        action.payload;
      const isLastSerie = state.currentSerie >= seriesAlvo;
      const currentDone = state.exerciseTimes[sessionId]?.length || 0;

      const nextExerciseLoads = { ...state.exerciseLoads };
      const loads = [...(nextExerciseLoads[sessionId] || [])];
      loads[currentDone] = currentInputLoad;
      nextExerciseLoads[sessionId] = loads;

      const nextExerciseReps = { ...state.exerciseReps };
      const reps = [...(nextExerciseReps[sessionId] || [])];
      reps[currentDone] = currentInputReps;
      nextExerciseReps[sessionId] = reps;

      const nextExerciseTimes = {
        ...state.exerciseTimes,
        [sessionId]: [...(state.exerciseTimes[sessionId] || []), state.timer],
      };

      const nextActiveRestTimers = { ...state.activeRestTimers };
      if (!isLastSerie) {
        nextActiveRestTimers[String(sessionId)] = {
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
      if (!currentBlock || currentBlock.length === 0) return state;

      let blockFinished = false;

      if (state.executionMode === "isolated" || currentBlock.length === 1) {
        const currentEx = currentBlock[state.currentExerciseInBlock];
        if (!currentEx) return state;

        blockFinished =
          state.currentExerciseInBlock === currentBlock.length - 1 &&
          (state.exerciseTimes[currentEx.sessionId]?.length || 0) >=
            currentEx.series_alvo;
      } else {
        blockFinished = currentBlock.every(
          (ex) =>
            (state.exerciseTimes[ex.sessionId]?.length || 0) >=
            ex.series_alvo,
        );
      }

      if (blockFinished) {
        const isLastBlock = state.currentBlockIndex === state.blocos.length - 1;
        if (isLastBlock) return { ...state, status: "COMPLETED" };

        const nextBlock = state.blocos[state.currentBlockIndex + 1];
        if (!nextBlock || nextBlock.length === 0) return { ...state, status: "COMPLETED" };

        const firstEx = nextBlock[0];
        return {
          ...state,
          currentBlockIndex: state.currentBlockIndex + 1,
          currentExerciseInBlock: 0,
          currentSerie: (state.exerciseTimes[firstEx.sessionId]?.length || 0) + 1,
          timer: 0,
          status: "IDLE",
          skippedExercises: state.skippedExercises.filter(s => s.sessionId !== firstEx.sessionId)
        };
      }

      // Conjugated/Circuit Flow (A->B->C->A)
      if (state.executionMode === "alternated" && currentBlock.length > 1) {
        let nextExIdx = (state.currentExerciseInBlock + 1) % currentBlock.length;

        // Find next exercise in the circuit that still has pending series
        for (let i = 0; i < currentBlock.length; i++) {
          const candidate = currentBlock[nextExIdx];
          if (!candidate) break;

          const doneCount = state.exerciseTimes[candidate.sessionId]?.length || 0;
          if (doneCount < candidate.series_alvo) {
            return {
              ...state,
              currentExerciseInBlock: nextExIdx,
              currentSerie: doneCount + 1,
              timer: 0,
              status: "IDLE",
              skippedExercises: state.skippedExercises.filter(s => s.sessionId !== candidate.sessionId)
            };
          }
          nextExIdx = (nextExIdx + 1) % currentBlock.length;
        }
      }

      // Single Exercise Flow
      return {
        ...state,
        currentSerie: state.currentSerie + 1,
        timer: 0,
        status: "IDLE",
        skippedExercises: state.skippedExercises // already handled by START_SERIES if needed
      };
    }

    case "SKIP_EXERCISE": {
      const { currentBlock } = action.payload;
      if (!currentBlock || currentBlock.length === 0) return state;

      const exercise = currentBlock[state.currentExerciseInBlock];
      if (!exercise) return state;

      const isLastInBlock =
        state.currentExerciseInBlock === currentBlock.length - 1;

      let nextState = {
        ...state,
        isTimerActive: false,
        timer: 0,
        status: "IDLE",
        skippedExercises: state.skippedExercises
      };

      if (
        state.executionMode === "alternated" &&
        currentBlock.length > 1 &&
        !isLastInBlock
      ) {
        nextState.currentExerciseInBlock += 1;
        const nextEx = currentBlock[nextState.currentExerciseInBlock];
        const nextDone = nextEx ? (state.exerciseTimes[nextEx.sessionId]?.length || 0) : 0;
        nextState.currentSerie = nextDone + 1;
      } else {
        if (!state.isCatchupPhase) {
          const alreadySkipped = state.skippedExercises.some(
            (s) => s.sessionId === exercise.sessionId,
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
            const nextBlock = state.blocos[nextState.currentBlockIndex];
            const nextEx = nextBlock ? nextBlock[0] : null;
            nextState.currentSerie = nextEx ? (state.exerciseTimes[nextEx.sessionId]?.length || 0) + 1 : 1;
          }
        } else {
          nextState.currentExerciseInBlock += 1;
          const nextEx = currentBlock[nextState.currentExerciseInBlock];
          nextState.currentSerie = nextEx ? (state.exerciseTimes[nextEx.sessionId]?.length || 0) + 1 : 1;
        }
      }
      return nextState;
    }

    case "MANUAL_OVERRIDE": {
      const { bIdx, eIdx, sNum } = action;
      if (!state.blocos[bIdx] || !state.blocos[bIdx][eIdx]) return state;

      const targetEx = state.blocos[bIdx][eIdx];
      return {
        ...state,
        currentBlockIndex: bIdx,
        currentExerciseInBlock: eIdx,
        currentSerie: sNum,
        isTimerActive: false,
        timer: 0,
        status: "IDLE",
        skippedExercises: state.skippedExercises.filter(s => s.sessionId !== targetEx.sessionId)
      };
    }
    case "SET_VALUE": {
      const { fieldType, sessionId, sessionIdx, val, part } = action;
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
        return { ...state, [mapKey]: { ...state[mapKey], [sessionId]: val } };
      }

      const newArr = [...(state[mapKey][sessionId] || [])];
      if (fieldType === "exec" || fieldType === "rest") {
        const currentSeconds = newArr[sessionIdx] || 0;
        const mins = Math.floor(currentSeconds / 60);
        const secs = currentSeconds % 60;
        if (part === "mins") newArr[sessionIdx] = (parseInt(val) || 0) * 60 + secs;
        else if (part === "secs")
          newArr[sessionIdx] = mins * 60 + (parseInt(val) || 0);
      } else {
        newArr[sessionIdx] = val;
      }
      return { ...state, [mapKey]: { ...state[mapKey], [sessionId]: newArr } };
    }

    case "DISMISS_REST": {
      const nextActive = { ...state.activeRestTimers };
      delete nextActive[action.sessionId];
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

    case "UPDATE_SERIES_ALVO": {
      const { sessionId, newAlvo } = action;
      const updateBlocks = (blocks) =>
        blocks.map((block) =>
          block.map((ex) =>
            ex.sessionId === sessionId ? { ...ex, series_alvo: newAlvo } : ex,
          ),
        );
      return {
        ...state,
        blocos: updateBlocks(state.blocos),
        originalBlocos: updateBlocks(state.originalBlocos),
      };
    }

    case "ADD_EXERCISE_TO_BLOCK": {
      const { bIdx, exerciseData } = action;
      const sessionId = `add-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newEx = {
        sessionId,
        exercicio_id: exerciseData.id,
        ordem_execucao: state.blocos[bIdx].length + 1,
        series_alvo: 3,
        reps_alvo: "10",
        numero_bloco: state.blocos[bIdx][0]?.numero_bloco || bIdx + 1,
        exercicios: {
          nome: exerciseData.nome,
          alvo_principal: exerciseData.alvo_principal
        }
      };

      const newBlocos = [...state.blocos];
      newBlocos[bIdx] = [...newBlocos[bIdx], newEx];

      return {
        ...state,
        blocos: newBlocos,
        originalBlocos: newBlocos,
        exerciseTimes: { ...state.exerciseTimes, [sessionId]: [] },
        restTimes: { ...state.restTimes, [sessionId]: [] },
        exerciseLoads: { ...state.exerciseLoads, [sessionId]: [] },
        exerciseReps: { ...state.exerciseReps, [sessionId]: [] },
        cargas: { ...state.cargas, [sessionId]: 0 },
        repsFeitas: { ...state.repsFeitas, [sessionId]: 10 }
      };
    }

    case "MOVE_EXERCISE": {
      const { bIdx, eIdx, direction } = action;
      const newBlocks = [...state.blocos];
      const block = [...newBlocks[bIdx]];
      const targetIdx = eIdx + direction;

      if (targetIdx < 0 || targetIdx >= block.length) return state;

      const [moved] = block.splice(eIdx, 1);
      block.splice(targetIdx, 0, moved);

      const updatedBlock = block.map((ex, idx) => ({ ...ex, ordem_execucao: idx + 1 }));
      newBlocks[bIdx] = updatedBlock;

      let nextExIdx = state.currentExerciseInBlock;
      if (state.currentBlockIndex === bIdx && state.currentExerciseInBlock === eIdx) {
        nextExIdx = targetIdx;
      }

      return {
        ...state,
        blocos: newBlocks,
        originalBlocos: newBlocks,
        currentExerciseInBlock: nextExIdx
      };
    }

    case "REPLACE_EXERCISE": {
      const { bIdx, eIdx, exerciseData } = action;
      const newBlocks = [...state.blocos];
      const block = [...newBlocks[bIdx]];
      const oldEx = block[eIdx];
      const newSessionId = `rep-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      const updatedEx = {
        ...oldEx,
        sessionId: newSessionId,
        exercicio_id: exerciseData.id,
        exercicios: {
          nome: exerciseData.nome,
          alvo_principal: exerciseData.alvo_principal
        }
      };

      block[eIdx] = updatedEx;
      newBlocks[bIdx] = block;

      return {
        ...state,
        blocos: newBlocks,
        originalBlocos: newBlocks,
        exerciseTimes: { ...state.exerciseTimes, [newSessionId]: [] },
        restTimes: { ...state.restTimes, [newSessionId]: [] },
        exerciseLoads: { ...state.exerciseLoads, [newSessionId]: [] },
        exerciseReps: { ...state.exerciseReps, [newSessionId]: [] },
        cargas: { ...state.cargas, [newSessionId]: 0 },
        repsFeitas: { ...state.repsFeitas, [newSessionId]: 10 }
      };
    }

    case "REMOVE_EXERCISE": {
      const { bIdx, eIdx } = action;
      const newBlocks = [...state.blocos];
      const block = [...newBlocks[bIdx]];
      const removedEx = block[eIdx];

      block.splice(eIdx, 1);

      if (block.length === 0) {
        newBlocks.splice(bIdx, 1);
      } else {
        newBlocks[bIdx] = block.map((ex, idx) => ({ ...ex, ordem_execucao: idx + 1 }));
      }

      let nextBlockIdx = state.currentBlockIndex;
      let nextExIdx = state.currentExerciseInBlock;

      if (newBlocks.length === 0) return { ...initialState, blocos: [], originalBlocos: [] };

      if (nextBlockIdx >= newBlocks.length) {
        nextBlockIdx = newBlocks.length - 1;
        nextExIdx = 0;
      } else if (bIdx === nextBlockIdx) {
        if (nextExIdx >= newBlocks[nextBlockIdx].length) {
          nextExIdx = Math.max(0, newBlocks[nextBlockIdx].length - 1);
        }
      }

      return {
        ...state,
        blocos: newBlocks,
        originalBlocos: newBlocks,
        currentBlockIndex: nextBlockIdx,
        currentExerciseInBlock: nextExIdx,
        skippedExercises: state.skippedExercises.filter(s => s.sessionId !== removedEx.sessionId)
      };
    }

    case "ADD_BLOCK": {
      const nextNum = state.blocos.length + 1;
      const sessionId = `block-${Date.now()}`;
      const newEx = {
        sessionId,
        exercicio_id: Date.now(),
        ordem_execucao: 1,
        series_alvo: 3,
        reps_alvo: "10",
        numero_bloco: nextNum,
        exercicios: { nome: "Novo Exercício", alvo_principal: "Treino" }
      };
      const newBlock = [newEx];
      const newBlocos = [...state.blocos, newBlock];

      return {
        ...state,
        blocos: newBlocos,
        originalBlocos: newBlocos,
        exerciseTimes: { ...state.exerciseTimes, [sessionId]: [] },
        restTimes: { ...state.restTimes, [sessionId]: [] },
        exerciseLoads: { ...state.exerciseLoads, [sessionId]: [] },
        exerciseReps: { ...state.exerciseReps, [sessionId]: [] },
        cargas: { ...state.cargas, [sessionId]: 0 },
        repsFeitas: { ...state.repsFeitas, [sessionId]: 10 }
      };
    }

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
  const [showPageMenu, setShowPageMenu] = useState(false);
  const [openMenuExId, setOpenMenuExId] = useState(null);
  const [openSeriesMenuExId, setOpenSeriesMenuExId] = useState(null);
  const [selectorConfig, setSelectorConfig] = useState({ isOpen: false, bIdx: null, eIdx: null, mode: 'add' });
  const [exerciseToDelete, setExerciseToDelete] = useState(null);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [saveAsLetter, setSaveAsLetter] = useState("");
  const [lastExecutionTimes, setLastExecutionTimes] = useState({});
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [bpm, setBpm] = useState(60);
  const audioContextRef = React.useRef(null);

  const [state, dispatch] = useReducer(trainingReducer, initialState);

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

  useEffect(() => {
    if (loading || state.blocos.length === 0) return;

    const timer = setTimeout(() => {
      const container = document.getElementById("scroll-container");
      const activeCard = document.getElementById("active-exercise");

      if (container && activeCard) {
        const containerHeight = container.clientHeight;
        const cardTop = activeCard.offsetTop;
        const cardHeight = activeCard.offsetHeight;

        // Calcula a rolagem exata para centralizar o card verticalmente no contêiner
        const scrollTo = cardTop - containerHeight / 2 + cardHeight / 2;

        container.scrollTo({
          top: scrollTo,
          behavior: "smooth",
        });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [
    loading,
    state.currentBlockIndex,
    state.currentExerciseInBlock,
    state.currentSerie,
    Object.keys(state.activeRestTimers).length,
  ]);

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

    // Automatic restoration logic for refresh/resume
    const saved = localStorage.getItem("active_training_session");
    if (saved) {
      const stateData = JSON.parse(saved);
      if (stateData.letra === letra) {
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
      const exerciseIds = [...new Set(data.map((ex) => ex.exercicio_id))];
      const { data: lastHistory } = await supabase
        .from("historico_cargas")
        .select(
          "exercicio_id, tempo_total_segundos, carga, repeticoes, data_treino",
        )
        .in("exercicio_id", exerciseIds)
        .order("data_treino", { ascending: false });

      const lastTimes = {};
      const lastLoadsArr = {};
      const lastRepsArr = {};
      if (lastHistory) {
        lastHistory.forEach((h) => {
          if (!lastTimes[h.exercicio_id]) {
            lastTimes[h.exercicio_id] = h.tempo_total_segundos;
            lastLoadsArr[h.exercicio_id] = Array.isArray(h.carga) ? h.carga : [h.carga];
            lastRepsArr[h.exercicio_id] = Array.isArray(h.repeticoes) ? h.repeticoes : [h.repeticoes];
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
        const sessionId = ex.sessionId || String(ex.id) || `init-${ex.exercicio_id}-${Math.random().toString(36).substr(2, 5)}`;
        ex.sessionId = sessionId;

        const histLoads = lastLoadsArr[ex.exercicio_id] || [];
        const histReps = lastRepsArr[ex.exercicio_id] || [];

        // Pre-fill the input fields with the last value from history
        initialCargas[sessionId] = histLoads.length > 0 ? histLoads[histLoads.length - 1] : 0;
        initialReps[sessionId] = histReps.length > 0
          ? histReps[histReps.length - 1]
          : ex.reps_alvo.includes("-")
            ? parseInt(ex.reps_alvo.split("-")[1])
            : parseInt(ex.reps_alvo) || 10;

        initialTimes[sessionId] = [];
        initialRests[sessionId] = [];
        // Pre-fill the series grid with historical data
        initialExLoads[sessionId] = histLoads;
        initialExReps[sessionId] = histReps;
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
        const sessionId = ex.sessionId;
        const val = state.cargas[sessionId];
        const execTimes = state.exerciseTimes[sessionId] || [];
        const rests = state.restTimes[sessionId] || [];
        const exLoads = state.exerciseLoads[sessionId] || [];
        const exReps = state.exerciseReps[sessionId] || [];

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
                : [parseInt(state.repsFeitas[sessionId]) || 0],
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

  const handleSaveAs = async () => {
    if (!saveAsLetter) {
      showToast("Por favor, informe a letra do treino.", "info");
      return;
    }

    setSavingSession(true);
    try {
      // 1. Check if training already exists
      const { data: existing } = await supabase
        .from("treinos")
        .select("id")
        .eq("user_id", authUser.id)
        .eq("letra", saveAsLetter.toUpperCase())
        .maybeSingle();

      if (existing) {
        if (!window.confirm(`O treino ${saveAsLetter.toUpperCase()} já existe. Deseja sobrescrevê-lo?`)) {
          setSavingSession(false);
          return;
        }
        // Delete existing blocks if overwriting
        await supabase
          .from("blocos_treino")
          .delete()
          .eq("user_id", authUser.id)
          .eq("letra_treino", saveAsLetter.toUpperCase());
      } else {
        // Create the training entry if it doesn't exist
        await supabase
          .from("treinos")
          .insert([{
            user_id: authUser.id,
            letra: saveAsLetter.toUpperCase(),
            nome: `Treino ${saveAsLetter.toUpperCase()}`,
            subtitulo: "Treino personalizado"
          }]);
      }

      // 2. Prepare new blocks
      const newBlocks = [];
      state.blocos.forEach((block, bIdx) => {
        block.forEach((ex, eIdx) => {
          newBlocks.push({
            user_id: authUser.id,
            letra_treino: saveAsLetter.toUpperCase(),
            exercicio_id: ex.exercicio_id,
            numero_bloco: bIdx + 1,
            ordem_execucao: eIdx + 1,
            series_alvo: ex.series_alvo,
            reps_alvo: ex.reps_alvo
          });
        });
      });

      const { error } = await supabase
        .from("blocos_treino")
        .insert(newBlocks);

      if (error) throw error;

      showToast(`Treino salvo como ${saveAsLetter.toUpperCase()}!`, "success");
      setShowSaveAsModal(false);
    } catch (err) {
      showToast("Erro ao salvar: " + err.message, "error");
    } finally {
      setSavingSession(false);
    }
  };

  const handleNewTraining = () => {
    if (window.confirm("Deseja iniciar um novo treino? O progresso atual não salvo será perdido.")) {
      localStorage.removeItem("active_training_session");
      window.location.reload();
    }
  };

  useEffect(() => {
    if (state.status === "COMPLETED") {
      if (!state.isCatchupPhase) {
        const pendingExercises = [];
        state.originalBlocos.forEach((block) => {
          block.forEach((ex) => {
            const sessionId = ex.sessionId;
            const doneSeries =
              state.exerciseTimes[sessionId]?.length || 0;
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


  const dismissRestTimer = (sessionId) => dispatch({ type: "DISMISS_REST", sessionId });

  return (
    <div
      className="h-[100dvh] flex flex-col transition-colors duration-700 text-white overflow-hidden"
      style={{
        color: metronomeActive ? "var(--text-on-secondary)" : "inherit",
        backgroundColor: "var(--bg-treino)",
      }}
    >
      <header className="flex justify-between items-center py-3 px-6 max-w-md mx-auto w-full">
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/inicio")}
            className="p-2 bg-white/5 rounded-xl opacity-50 hover:opacity-100 transition"
          >
            <ChevronLeft />
          </button>
        </div>
        <div className="text-center">
          <span
            className="text-[10px] uppercase font-black tracking-[0.2em] block mb-1"
            style={{ color: "var(--color-primary-safe)" }}
          >
            {state.isCatchupPhase ? "REPESCAGEM" : `Sessão de Treino`}{" "}
          </span>
          <span className="font-bold text-lg text-white uppercase tracking-tighter">
            Treino {letra}
          </span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowPageMenu(!showPageMenu)}
            className="p-2 bg-white/5 rounded-xl opacity-50 hover:opacity-100 transition"
          >
            <MoreHorizontal />
          </button>
          {showPageMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-100 p-1"
              onClick={(e) => e.stopPropagation()}
            >
              {[
                { label: 'Salvar treino', icon: <Save size={14} />, onClick: finishWorkout },
                { label: 'Salvar como', icon: <PlusCircle size={14} />, onClick: () => setShowSaveAsModal(true) },
                { label: 'Gerenciar treinos', icon: <Layers size={14} />, onClick: () => navigate('/admin') },
                { label: 'Novo treino', icon: <RotateCcw size={14} />, onClick: handleNewTraining },
              ].map((opt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    opt.onClick?.();
                    setShowPageMenu(false);
                  }}
                  className="w-full p-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-white/5 flex items-center gap-3 text-white transition-colors"
                >
                  <span className="text-white/40">{opt.icon}</span> {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div
        id="scroll-container"
        className="flex-1 overflow-y-auto p-6 pt-0 relative"
        onClick={() => {
          setOpenMenuExId(null);
          setOpenSeriesMenuExId(null);
        }}
      >
        <div className="space-y-4 max-w-md mx-auto">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 text-white">
            Exercícios da Sessão
          </h3>
          {state.blocos.map((block, bIdx) => {
            const alvos = [...new Set(block.map(ex => ex.exercicios?.alvo_principal).filter(Boolean))];
            const assistencia = alvos.length > 0 ? alvos.join(" / ") : "Treino";

            // Map assistencia to a color variable or fallback
            const blockColor = assistencia.toLowerCase().includes("quadríceps") ? "var(--color-primary)" :
                               assistencia.toLowerCase().includes("dorsal") ? "var(--color-secondary)" :
                               "var(--color-primary)";

            return (
              <div
                key={bIdx}
                className="rounded-[32px] p-5 mb-8 border border-white/5"
                style={{ backgroundColor: `${blockColor}10` }}
              >
                <div className="flex items-center gap-2 mb-4 px-1">
                  <Layers size={14} className="opacity-40" style={{ color: blockColor }} />
                  <h4 className="text-xs font-bold uppercase tracking-widest opacity-90" style={{ color: blockColor }}>
                    {block.length > 1 ? "Conjugado" : "Bloco"} {bIdx + 1} de {state.blocos.length} — {assistencia}
                  </h4>
                </div>

                <div className="flex flex-col gap-3">
                  {block.map((ex, eIdx) => {
                    const sessionId = ex.sessionId;
                    const doneCount = state.exerciseTimes[sessionId]?.length || 0;
                    const isDone = doneCount >= ex.series_alvo;
                    const isCurrent =
                      bIdx === state.currentBlockIndex &&
                      state.currentExerciseInBlock === eIdx;
                    const isSkipped = state.skippedExercises.some(
                      (s) => s.sessionId === ex.sessionId,
                    );
                    const currentExSerie = isCurrent
                      ? state.currentSerie
                      : isDone
                        ? ex.series_alvo
                        : isSkipped
                          ? state.skippedExercises.find(
                              (s) => s.sessionId === ex.sessionId,
                            )?.partialSerie || 0
                          : 0;

                    const activeColor = eIdx % 2 === 0 ? "var(--color-primary)" : "var(--color-secondary)";
                    const textOnActive = eIdx % 2 === 0 ? "var(--text-on-primary)" : "var(--text-on-secondary)";

                    return (
                      <div
                        key={`${bIdx}_${eIdx}`}
                        id={isCurrent ? "active-exercise" : undefined}
                        onClick={() => {
                          if (!isCurrent) {
                            dispatch({
                              type: "MANUAL_OVERRIDE",
                              bIdx,
                              eIdx,
                              sNum: (state.exerciseTimes[sessionId]?.length || 0) + 1,
                            });
                          }
                        }}
                        className={`relative p-4 rounded-2xl border transition-all ${isCurrent ? "scale-[1.02] text-white" : "cursor-pointer"}`}
                        style={{
                          backgroundColor: isCurrent
                            ? activeColor
                            : (isSkipped && !isCurrent)
                              ? "rgba(239, 68, 68, 0.15)"
                              : isDone
                                ? "rgba(16, 185, 129, 0.1)"
                                : "rgba(255, 255, 255, 0.05)",
                          color: isCurrent
                            ? textOnActive
                            : (isSkipped && !isCurrent)
                              ? "#fca5a5"
                              : "white",
                          borderColor: isCurrent
                            ? "transparent"
                            : (isSkipped && !isCurrent)
                              ? "rgba(239, 68, 68, 0.6)"
                              : isDone
                                ? "#10b98140"
                                : "rgba(255, 255, 255, 0.1)",
                        }}
                      >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCurrent ? "bg-black/10 text-white" : (isSkipped && !isCurrent) ? "bg-red-500/20 text-red-400" : "bg-white/5 text-white/40"}`}
                      >
                        {(isSkipped && !isCurrent) ? (
                          <CircleX size={16} />
                        ) : isDone ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <Dumbbell size={16} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`font-bold text-sm leading-tight ${isCurrent ? "text-white" : (isSkipped && !isCurrent) ? "text-red-300" : "text-white"}`}>
                            {ex.exercicios.nome}
                          </p>
                        </div>
                        {!isCurrent && (
                          <div className="flex gap-2 items-center">
                            <p className={`text-[10px] font-medium ${(isSkipped && !isCurrent) ? "text-red-400/80" : "opacity-60 text-white"}`}>
                              Séries: {currentExSerie}/{ex.series_alvo}
                            </p>
                            {state.cargas[sessionId] > 0 && (
                              <span className={`text-[10px] font-black flex items-center gap-1 ${(isSkipped && !isCurrent) ? "text-red-400" : "opacity-80 text-white"}`}>
                                <Dumbbell size={10} />{" "}
                                {state.cargas[sessionId]}kg
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuExId(
                            openMenuExId === ex.sessionId
                              ? null
                              : ex.sessionId,
                          );
                        }}
                        className="p-2 hover:bg-black/10 rounded-lg transition"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenuExId === ex.sessionId && (
                        <div
                          className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-100 p-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              dispatch({
                                type: "MANUAL_OVERRIDE",
                                bIdx,
                                eIdx,
                                sNum: currentExSerie > 0 && currentExSerie <= ex.series_alvo ? currentExSerie : 1,
                              });
                              setOpenMenuExId(null);
                            }}
                            className="w-full p-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-white/5 flex items-center gap-3 text-white transition-colors"
                          >
                            <RotateCcw size={14} className="text-white/40" /> Focar Exercício
                          </button>

                          <div className="h-px bg-white/5 my-1" />

                          <button
                            onClick={() => dispatch({ type: "MOVE_EXERCISE", bIdx, eIdx, direction: -1 })}
                            disabled={eIdx === 0}
                            className="w-full p-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-white/5 disabled:opacity-20 flex items-center gap-3 text-white transition-colors"
                          >
                            <ArrowUp size={14} className="text-white/40" /> Mover para cima
                          </button>

                          <button
                            onClick={() => dispatch({ type: "MOVE_EXERCISE", bIdx, eIdx, direction: 1 })}
                            disabled={eIdx === block.length - 1}
                            className="w-full p-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-white/5 disabled:opacity-20 flex items-center gap-3 text-white transition-colors"
                          >
                            <ArrowDown size={14} className="text-white/40" /> Mover para baixo
                          </button>

                          <div className="h-px bg-white/5 my-1" />

                          <button
                            onClick={() => {
                              setSelectorConfig({ isOpen: true, bIdx, eIdx, mode: 'replace' });
                              setOpenMenuExId(null);
                            }}
                            className="w-full p-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-white/5 flex items-center gap-3 text-white transition-colors"
                          >
                            <Edit2 size={14} className="text-white/40" /> Alterar Exercício
                          </button>

                          <button
                            onClick={() => {
                              setExerciseToDelete({ ...ex, bIdx, eIdx });
                              setOpenMenuExId(null);
                            }}
                            className="w-full p-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 flex items-center gap-3 text-red-400 transition-colors"
                          >
                            <Trash2 size={14} className="opacity-60" /> Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isCurrent ? (
                    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                      {/* Integrated Timer */}
                      <div
                        className={`rounded-2xl p-3 flex items-center justify-between transition-all ${state.isTimerActive ? "bg-black/20 ring-1 ring-white/20" : "bg-black/10"}`}
                      >
                        <div className="flex flex-col">
                          <p className="text-[10px] font-bold uppercase mb-1 opacity-60">Tempo de Execução</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-mono font-black">{formatTime(state.timer)}</p>
                            {lastExecutionTimes[ex.exercicio_id] > 0 && (
                              <span className="text-[10px] font-bold opacity-30">
                                Ref: {formatTime(lastExecutionTimes[ex.exercicio_id])}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex items-center gap-1.5 p-1 px-2 rounded-lg border transition-all ${metronomeActive ? "bg-black/20 border-white/20" : "bg-black/5 border-transparent opacity-40 hover:opacity-100"}`}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMetronomeActive(!metronomeActive);
                              }}
                              className="hover:scale-110 transition text-white"
                            >
                              {metronomeActive ? (
                                <Pause size={12} fill="currentColor" />
                              ) : (
                                <Play size={12} fill="currentColor" />
                              )}
                            </button>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={bpm}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) =>
                                  setBpm(
                                    Math.max(30, Math.min(240, parseInt(e.target.value) || 60)),
                                  )
                                }
                                className="bg-transparent w-6 text-center text-[10px] font-black outline-none text-white"
                              />
                              <span className="text-[7px] font-black opacity-60">BPM</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); dispatch({ type: "RESET_TIMER" }); }}
                            className="p-2 opacity-40 hover:opacity-100 transition"
                          >
                            <RotateCcw size={16} />
                          </button>
                          {!state.isTimerActive && state.timer === 0 ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                dispatch({ type: "START_SERIES", sessionId: sessionId });
                              }}
                              className="w-12 h-12 rounded-full flex items-center justify-center bg-white text-black shadow-lg"
                            >
                              <Play fill="currentColor" size={20} className="ml-1" />
                            </button>
                          ) : state.isTimerActive ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                dispatch({
                                  type: "STOP_SERIES",
                                  payload: {
                                    sessionId: sessionId,
                                    currentInputLoad: parseFloat(state.cargas[sessionId]) || 0,
                                    currentInputReps: parseInt(state.repsFeitas[sessionId]) || 0,
                                    nomeEx: ex.exercicios.nome,
                                    seriesAlvo: ex.series_alvo,
                                  },
                                });
                              }}
                              className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20"
                            >
                              <Square fill="currentColor" size={18} />
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {/* Integrated Inputs */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-black/20 p-3 rounded-2xl">
                          <label className="text-[10px] font-bold opacity-50 uppercase block mb-1">Carga (kg)</label>
                          <input
                            type="number"
                            value={state.cargas[sessionId] ?? ""}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => dispatch({ type: "SET_VALUE", fieldType: "currentCarga", sessionId: sessionId, val: e.target.value })}
                            className="bg-transparent text-2xl font-mono font-bold outline-none w-full text-white"
                          />
                        </div>
                        <div className="bg-black/20 p-3 rounded-2xl">
                          <label className="text-[10px] font-bold opacity-50 uppercase block mb-1">Reps ({ex.reps_alvo})</label>
                          <input
                            type="number"
                            value={state.repsFeitas[sessionId] ?? ""}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => dispatch({ type: "SET_VALUE", fieldType: "currentReps", sessionId: sessionId, val: e.target.value })}
                            className="bg-transparent text-2xl font-mono font-bold outline-none w-full text-white"
                          />
                        </div>
                      </div>

                      {/* Integrated Action Button */}
                      {!state.isTimerActive && state.timer > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch({ type: "ADVANCE_STEP", payload: { currentBlock: state.blocos[state.currentBlockIndex] } });
                          }}
                          disabled={savingSession}
                          className="w-full py-3 rounded-2xl font-black text-lg flex items-center justify-center gap-3 bg-emerald-500 text-white shadow-lg active:scale-95 transition-all"
                        >
                          {savingSession ? "Salvando..." : (() => {
                            const isLastBlock = state.currentBlockIndex === state.blocos.length - 1;
                            const isLastInBlock = state.executionMode === "isolated" || block.length === 1
                              ? state.currentExerciseInBlock === block.length - 1 && state.currentSerie >= ex.series_alvo
                              : block.every(candidate => (state.exerciseTimes[candidate.sessionId]?.length || 0) >= candidate.series_alvo);

                            if (isLastInBlock) {
                              if (isLastBlock) return <><Save /> Finalizar Treino</>;
                              return <><ChevronRight /> Próximo Bloco</>;
                            }
                            return <><ChevronRight /> Próxima Série</>;
                          })()}
                        </button>
                      )}

                      {!state.isCatchupPhase && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch({ type: "SKIP_EXERCISE", payload: { currentBlock: state.blocos[state.currentBlockIndex] } });
                          }}
                          disabled={state.isTimerActive || savingSession}
                          className="w-full py-1 text-[10px] font-bold opacity-40 hover:opacity-100 transition flex items-center justify-center gap-2"
                        >
                          <SkipForward size={12} /> Pular Exercício
                        </button>
                      )}

                      <div className="mt-6 pt-6 border-t border-white/10">
                        <div className="flex justify-between items-center w-full mb-2">
                          <p className="text-xs uppercase tracking-wider font-semibold opacity-60">SÉRIES</p>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenSeriesMenuExId(openSeriesMenuExId === sessionId ? null : sessionId);
                              }}
                              className="p-1 hover:bg-white/10 rounded-md opacity-40 hover:opacity-100 transition"
                            >
                              <MoreHorizontal size={14} />
                            </button>

                            {openSeriesMenuExId === sessionId && (
                              <div
                                className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[100] p-4 animate-in fade-in zoom-in-95 duration-200"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <p className="text-[10px] font-black uppercase opacity-40 mb-3 tracking-widest">Alterar Séries</p>
                                <div className="grid grid-cols-4 gap-2 mb-4">
                                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                                    <button
                                      key={n}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch({ type: "UPDATE_SERIES_ALVO", sessionId, newAlvo: n });
                                        setOpenSeriesMenuExId(null);
                                      }}
                                      className={`aspect-square rounded-lg font-black text-xs transition-all ${ex.series_alvo === n ? "bg-white text-black" : "bg-white/5 hover:bg-white/10 text-white"}`}
                                    >
                                      {n}
                                    </button>
                                  ))}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dispatch({ type: "UPDATE_SERIES_ALVO", sessionId, newAlvo: Math.max(1, ex.series_alvo - 1) });
                                    setOpenSeriesMenuExId(null);
                                  }}
                                  className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                                >
                                  <Trash2 size={12} /> Remover Última
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex overflow-x-auto gap-2 py-3 px-2 max-w-full scrollbar-none">
                          {[...Array(ex.series_alvo)].map((_, sessionIdx) => {
                            const sNum = sessionIdx + 1;
                            const execTime =
                              state.exerciseTimes[sessionId]?.[sessionIdx];
                            const restTime = state.restTimes[sessionId]?.[sessionIdx];
                            const load = state.exerciseLoads[sessionId]?.[sessionIdx];
                            const reps = state.exerciseReps[sessionId]?.[sessionIdx];
                            const isCurrentS =
                              isCurrent && sNum === state.currentSerie;
                            const liveExec =
                              isCurrentS && state.isTimerActive ? state.timer : null;
                            const liveRest =
                              state.activeRestTimers[sessionId] &&
                              sNum === state.exerciseTimes[sessionId]?.length
                                ? state.activeRestTimers[sessionId].seconds
                                : null;
                            const nextPendingSNum =
                              (state.exerciseTimes[sessionId]?.length || 0) + 1;
                            const isNextPending = sNum === nextPendingSNum;
                            const isExecuted = sNum < nextPendingSNum;

                            return (
                              <div
                                key={sessionIdx}
                                className={`p-2.5 py-3 rounded-2xl flex flex-col items-center border transition-all shrink-0 min-w-[70px] ${
                                  isCurrentS
                                    ? "bg-white/20 border-white/40 ring-4 ring-white/10 scale-[1.05] z-10"
                                    : isSkipped
                                      ? isExecuted
                                        ? "bg-red-950/60 border-red-500/10"
                                        : isNextPending
                                          ? "bg-red-500/10 border-red-500/40"
                                          : "bg-red-950/20 border-transparent"
                                      : isExecuted
                                        ? "bg-black/20 border-white/5"
                                        : "bg-black/5 border-transparent"
                                }`}
                              >
                                <button
                                  onClick={() => {
                                    if (isNextPending && !isCurrentS) {
                                      dispatch({
                                        type: "MANUAL_OVERRIDE",
                                        bIdx,
                                        eIdx,
                                        sNum,
                                      });
                                      showToast(
                                        `Foco alterado para Série ${sNum}`,
                                        "info",
                                      );
                                    }
                                  }}
                                  className="font-black text-[9px] uppercase mb-2 px-2 py-1 rounded-md transition-all text-white"
                                  style={{
                                    backgroundColor: isCurrentS
                                      ? "rgba(255,255,255,0.2)"
                                      : isNextPending
                                        ? "var(--color-secondary)"
                                        : "transparent",
                                    opacity: isCurrentS || isNextPending ? 1 : 0.4,
                                  }}
                                >
                                  {sNum}
                                </button>
                                <div
                                  className={`flex flex-col items-center gap-1 mb-2 transition-opacity ${!isExecuted && !isCurrentS ? "opacity-30" : "opacity-100"}`}
                                >
                                  <div className="flex items-center gap-0.5">
                                    <input
                                      type="number"
                                      value={load || ""}
                                      placeholder="-"
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) =>
                                        dispatch({
                                          type: "SET_VALUE",
                                          fieldType: "load",
                                          sessionId,
                                          sessionIdx,
                                          val: e.target.value,
                                        })
                                      }
                                      className={`bg-transparent w-8 text-center font-mono font-black text-[11px] outline-none placeholder:opacity-20 ${isSkipped ? "text-red-200 placeholder:text-red-200" : "text-white placeholder:text-white"}`}
                                    />
                                    <span className={`text-[8px] font-bold opacity-40 ${isSkipped ? "text-red-300" : "text-white"}`}>
                                      kg
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-0.5">
                                    <input
                                      type="number"
                                      value={reps || ""}
                                      placeholder="-"
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) =>
                                        dispatch({
                                          type: "SET_VALUE",
                                          fieldType: "reps",
                                          sessionId,
                                          sessionIdx,
                                          val: e.target.value,
                                        })
                                      }
                                      className={`bg-transparent w-6 text-center font-bold text-[10px] outline-none opacity-60 placeholder:opacity-20 ${isSkipped ? "text-red-200 placeholder:text-red-200" : "text-white placeholder:text-white"}`}
                                    />
                                    <span className={`text-[7px] font-bold opacity-30 uppercase ${isSkipped ? "text-red-300" : "text-white"}`}>
                                      reps
                                    </span>
                                  </div>
                                </div>
                                <div
                                  className={`flex flex-col items-center w-full pt-2 border-t border-white/5 gap-1 transition-opacity ${!isExecuted && !isCurrentS ? "opacity-30" : "opacity-100"}`}
                                >
                                  <div className="flex items-center gap-1">
                                    <Clock
                                      size={8}
                                      className={`opacity-30 ${isSkipped ? "text-red-400" : "text-white"}`}
                                    />
                                    {liveExec !== null ? (
                                      <span className="font-mono font-bold text-[9px] text-white">
                                        {" "}
                                        {formatTime(liveExec)}{" "}
                                      </span>
                                    ) : (
                                      <div className="flex items-center gap-0.5">
                                        <input
                                          type="number"
                                          value={
                                            execTime !== null &&
                                            execTime !== undefined
                                              ? Math.floor(execTime / 60)
                                              : ""
                                          }
                                          placeholder="0"
                                          readOnly={!execTime && execTime !== 0}
                                          onFocus={(e) => e.target.select()}
                                          onChange={(e) =>
                                            dispatch({
                                              type: "SET_VALUE",
                                              fieldType: "exec",
                                              sessionId,
                                              sessionIdx,
                                              val: e.target.value,
                                              part: "mins",
                                            })
                                          }
                                          className={`bg-transparent w-4 text-right font-mono font-bold text-[9px] outline-none placeholder:opacity-20 ${isSkipped ? "text-red-200 placeholder:text-red-200" : "text-white placeholder:text-white"}`}
                                        />
                                        <span className={`text-[9px] font-bold opacity-30 ${isSkipped ? "text-red-400" : "text-white"}`}>
                                          :
                                        </span>
                                        <input
                                          type="number"
                                          value={
                                            execTime !== null &&
                                            execTime !== undefined
                                              ? String(execTime % 60).padStart(2, "0")
                                              : ""
                                          }
                                          placeholder="00"
                                          readOnly={!execTime && execTime !== 0}
                                    onFocus={(e) => e.target.select()}
                                          onChange={(e) =>
                                            dispatch({
                                              type: "SET_VALUE",
                                              fieldType: "exec",
                                              sessionId,
                                              sessionIdx,
                                              val: e.target.value,
                                              part: "secs",
                                            })
                                          }
                                          className={`bg-transparent w-5 text-left font-mono font-bold text-[9px] outline-none placeholder:opacity-20 ${isSkipped ? "text-red-200 placeholder:text-red-200" : "text-white placeholder:text-white"}`}
                                        />
                                      </div>
                                    )}
                                  </div>
                                  <div
                                    className={`flex items-center gap-1 ${liveRest !== null ? " animate-pulse" : "opacity-30"}`}
                                  >
                                    {liveRest !== null ? (
                                      <span className="font-mono text-[8px] font-bold">
                                        {" "}
                                        {formatTime(liveRest)}{" "}
                                      </span>
                                    ) : (
                                      <div className="flex items-center gap-0.5">
                                        <input
                                          type="number"
                                          value={
                                            restTime !== null &&
                                            restTime !== undefined
                                              ? Math.floor(restTime / 60)
                                              : ""
                                          }
                                          placeholder="0"
                                          readOnly={!restTime && restTime !== 0}
                                          onFocus={(e) => e.target.select()}
                                          onChange={(e) =>
                                            dispatch({
                                              type: "SET_VALUE",
                                              fieldType: "rest",
                                              sessionId,
                                              sessionIdx,
                                              val: e.target.value,
                                              part: "mins",
                                            })
                                          }
                                          className={`bg-transparent w-4 text-right font-mono font-bold text-[8px] outline-none placeholder:opacity-20 ${isSkipped ? "text-red-200 placeholder:text-red-200" : "text-white placeholder:text-white"}`}
                                        />
                                        <span className={`text-[8px] font-bold opacity-30 ${isSkipped ? "text-red-400" : "text-white"}`}>
                                          :
                                        </span>
                                        <input
                                          type="number"
                                          value={
                                            restTime !== null &&
                                            restTime !== undefined
                                              ? String(restTime % 60).padStart(2, "0")
                                              : ""
                                          }
                                          placeholder="00"
                                          readOnly={!restTime && restTime !== 0}
                                    onFocus={(e) => e.target.select()}
                                          onChange={(e) =>
                                            dispatch({
                                              type: "SET_VALUE",
                                              fieldType: "rest",
                                              sessionId,
                                              sessionIdx,
                                              val: e.target.value,
                                              part: "secs",
                                            })
                                          }
                                          className={`bg-transparent w-5 text-left font-mono font-bold text-[8px] outline-none placeholder:opacity-20 ${isSkipped ? "text-red-200 placeholder:text-red-200" : "text-white placeholder:text-white"}`}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch({ type: "UPDATE_SERIES_ALVO", sessionId, newAlvo: ex.series_alvo + 1 });
                            }}
                            className="p-2.5 py-3 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-white/10 bg-white/5 hover:bg-white/10 transition-all opacity-40 hover:opacity-100 min-h-[80px] shrink-0 min-w-[60px]"
                          >
                            <Plus size={20} className="text-white/60" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                    );
                  })}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectorConfig({ isOpen: true, bIdx, eIdx: null, mode: 'add' });
                  }}
                  className="w-full mt-4 py-2 border border-dashed border-white/10 rounded-xl text-[10px] font-black uppercase text-white/40 hover:text-white/80 hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Adicionar Exercício
                </button>
              </div>
            );
          })}

          <button
            onClick={() => dispatch({ type: "ADD_BLOCK" })}
            className="w-full py-8 border-2 border-dashed border-white/10 rounded-[32px] text-white/40 font-black uppercase tracking-[0.2em] text-xs hover:text-white/80 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-3 mb-12"
          >
            <PlusCircle size={32} className="opacity-40" />
            Novo Bloco Conjugado
          </button>
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

      <footer
        className="py-3 px-6 border-t backdrop-blur-xl z-50"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <div className="max-w-md mx-auto">
          {Object.keys(state.activeRestTimers).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {Object.entries(state.activeRestTimers).map(([sessionId, data]) => {
                const isPrimary =
                  sessionId === currentBlock[state.currentExerciseInBlock]?.sessionId;
                return (
                  <div
                    key={sessionId}
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
                        onClick={() => dismissRestTimer(sessionId)}
                        data-testid={`dismiss-rest-${sessionId}`}
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
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2 text-white">
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
                backgroundColor: letra === "A"
                  ? "var(--color-primary)"
                  : "var(--color-secondary)",
              }}
            ></div>
          </div>
        </div>
      </footer>

      {selectorConfig.isOpen && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-start justify-center p-6 pt-4 h-[100svh]">
          <div className="bg-[#121212] border border-white/10 w-full max-w-md rounded-[32px] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 min-h-[400px] max-h-[calc(100svh-32px)]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 rounded-t-[32px]">
              <h3 className="text-lg font-black uppercase tracking-widest text-white">
                {selectorConfig.mode === 'add' ? 'Adicionar Exercício' : 'Alterar Exercício'}
              </h3>
              <button
                onClick={() => setSelectorConfig({ ...selectorConfig, isOpen: false })}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} className="text-white/60" />
              </button>
            </div>
            <div className="p-6">
              <ExerciseSelector
                onSelect={(exerciseData) => {
                  if (selectorConfig.mode === 'add') {
                    dispatch({ type: "ADD_EXERCISE_TO_BLOCK", bIdx: selectorConfig.bIdx, exerciseData });
                  } else {
                    dispatch({ type: "REPLACE_EXERCISE", bIdx: selectorConfig.bIdx, eIdx: selectorConfig.eIdx, exerciseData });
                  }
                  setSelectorConfig({ ...selectorConfig, isOpen: false });
                  showToast(selectorConfig.mode === 'add' ? "Exercício adicionado!" : "Exercício alterado!", "success");
                }}
              />
            </div>
          </div>
        </div>
      )}

      {exerciseToDelete && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-[32px] p-8 shadow-2xl">
            <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-2xl font-black text-white text-center mb-2">
              Excluir Exercício?
            </h2>
            <p className="text-slate-400 text-center text-sm mb-8">
              Tem certeza que deseja remover <strong>{exerciseToDelete.exercicios?.nome}</strong> deste treino? Esta ação não pode ser desfeita.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  dispatch({ type: "REMOVE_EXERCISE", bIdx: exerciseToDelete.bIdx, eIdx: exerciseToDelete.eIdx });
                  setExerciseToDelete(null);
                  showToast("Exercício removido", "info");
                }}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg hover:bg-red-700 transition"
              >
                Sim, Excluir
              </button>
              <button
                onClick={() => setExerciseToDelete(null)}
                className="w-full py-4 bg-white/5 text-slate-400 rounded-2xl font-bold hover:bg-white/10 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showSaveAsModal && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-[32px] p-8 shadow-2xl">
            <h2 className="text-2xl font-black text-white text-center mb-6 uppercase tracking-widest">
              Salvar como
            </h2>
            <div className="mb-8">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Letra do Treino (Ex: D, E, F)</label>
              <input
                type="text"
                value={saveAsLetter}
                onChange={(e) => setSaveAsLetter(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="Letra"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-black text-center text-2xl outline-none focus:border-white/40 transition-all uppercase"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleSaveAs}
                disabled={savingSession}
                className="w-full py-4 bg-white text-black rounded-2xl font-black shadow-lg hover:bg-slate-200 transition disabled:opacity-50"
              >
                {savingSession ? "Salvando..." : "Confirmar e Salvar"}
              </button>
              <button
                onClick={() => setShowSaveAsModal(false)}
                className="w-full py-4 bg-white/5 text-slate-400 rounded-2xl font-bold hover:bg-white/10 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Training;
