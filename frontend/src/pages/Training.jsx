import React, { useState, useEffect, useReducer, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import PageTransition from "../components/PageTransition";
import { motion, useMotionValue, useTransform } from "framer-motion";
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
  Flame,
  X,
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
  Loader2,
} from "lucide-react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { useAppearance } from "../context/AppearanceContext";
import { getContrastColor, getSafeColor } from "../utils/colors";
import ExerciseSelector from "../components/ExerciseSelector";
import ConfirmationModal from "../components/ConfirmationModal";
import LoadingScreen from "../components/LoadingScreen";
import AdInterstitial from "../components/ui/AdInterstitial";
import AdBanner from "../components/ui/AdBanner";

// --- State Machine Helpers ---
const formatTime = (seconds) => {
  if (seconds === null || seconds === undefined) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const ensureExecutionData = (state, sessionId, targetSNum) => {
  const nextExerciseLoads = { ...state.exerciseLoads };
  const nextExerciseReps = { ...state.exerciseReps };

  const loads = [...(nextExerciseLoads[sessionId] || [])];
  const repsArr = [...(nextExerciseReps[sessionId] || [])];

  const targetEx = state.blocos.flat().find(ex => ex.sessionId === sessionId);
  if (!targetEx) return state;

  const cargaMeta = state.cargas[sessionId] || 0;
  const repsMetaStr = targetEx.reps_alvo;
  const repsMeta = repsMetaStr.includes("-") ? parseInt(repsMetaStr.split("-")[1]) : (parseInt(repsMetaStr) || 10);

  // Populate up to targetSNum (1-indexed, so up to targetSNum - 1 index)
  for (let i = 0; i < targetSNum; i++) {
    if (loads[i] === undefined || loads[i] === null) {
      loads[i] = state.historyLoads[sessionId]?.[i] ?? cargaMeta;
    }
    if (repsArr[i] === undefined || repsArr[i] === null) {
      repsArr[i] = state.historyReps[sessionId]?.[i] ?? state.repsFeitas[sessionId] ?? repsMeta;
    }
  }

  return {
    ...state,
    exerciseLoads: { ...state.exerciseLoads, [sessionId]: loads },
    exerciseReps: { ...state.exerciseReps, [sessionId]: repsArr }
  };
};

const truncateExecutionData = (state, sessionId, targetSNum) => {
  const nextExerciseTimes = { ...state.exerciseTimes };
  const nextExerciseLoads = { ...state.exerciseLoads };
  const nextExerciseReps = { ...state.exerciseReps };

  if (nextExerciseTimes[sessionId]) {
    nextExerciseTimes[sessionId] = nextExerciseTimes[sessionId].slice(0, targetSNum);
  }
  if (nextExerciseLoads[sessionId]) {
    nextExerciseLoads[sessionId] = nextExerciseLoads[sessionId].slice(0, targetSNum);
  }
  if (nextExerciseReps[sessionId]) {
    nextExerciseReps[sessionId] = nextExerciseReps[sessionId].slice(0, targetSNum);
  }

  return {
    ...state,
    exerciseTimes: nextExerciseTimes,
    exerciseLoads: nextExerciseLoads,
    exerciseReps: nextExerciseReps
  };
};

const generateUUID = () => {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const initialState = {
  sessaoTreinoId: null,
  currentBlockIndex: 0,
  currentExerciseInBlock: 0,
  currentSerie: 1,
  executionMode: "alternated",
  isTimerActive: false,
  timer: 0,
  timerStartedAt: null,
  status: "IDLE", // IDLE, EXECUTING, RESTING, COMPLETED
  exerciseTimes: {}, // { sessionId: [s1, s2...] }
  restTimes: {}, // { sessionId: [s1, s2...] }
  activeRestTimers: {}, // { sessionId: { seconds: number, title: string, nome: string } }
  cargas: {}, // { sessionId: last_used_load }
  exerciseLoads: {}, // { sessionId: [s1, s2...] }
  historyLoads: {}, // { sessionId: [s1, s2...] }
  repsFeitas: {}, // { sessionId: current_input_reps }
  exerciseReps: {}, // { sessionId: [s1, s2...] }
  historyReps: {}, // { sessionId: [s1, s2...] }
  activeSeriesMap: {}, // { sessionId: activeSerieNumber }
  skippedExercises: [],
  isCatchupPhase: false,
  trainingMode: "guided", // "guided" or "manual"
  showCheckoutModal: false,
  blocos: [],
  originalBlocos: [],
};

function trainingReducer(state, action) {
  switch (action.type) {
    case "INIT_SESSION": {
      const activeSeriesMap = { ...action.payload.activeSeriesMap };
      // If not provided (initial fetch), initialize based on existing progress (Smart Default)
      if (action.payload.blocos) {
        action.payload.blocos.flat().forEach((ex) => {
          if (!activeSeriesMap[ex.sessionId]) {
            // Rule: Smart Default Selection (Last executed or Series 1)
            const doneCount =
              action.payload.exerciseTimes?.[ex.sessionId]?.length || 0;
            activeSeriesMap[ex.sessionId] = Math.max(1, doneCount);
          }
        });
      }
      let nextState = {
        ...state,
        ...action.payload,
        activeSeriesMap,
        status: "IDLE",
        sessaoTreinoId: action.payload.sessaoTreinoId || generateUUID(),
      };
      // Rule 2 & 3: Smart default focus on init, but NO data mutation (read-only transition)
      if (nextState.blocos.length > 0) {
        const firstEx = nextState.blocos[nextState.currentBlockIndex][nextState.currentExerciseInBlock];
        nextState.currentSerie = nextState.activeSeriesMap[firstEx.sessionId] || 1;
      }
      return nextState;
    }

    case "TICK": {
      const now = Date.now();
      const nextActiveRestTimers = { ...state.activeRestTimers };
      Object.keys(nextActiveRestTimers).forEach((id) => {
        if (nextActiveRestTimers[id].startedAt) {
          nextActiveRestTimers[id] = {
            ...nextActiveRestTimers[id],
            seconds: Math.floor((now - nextActiveRestTimers[id].startedAt) / 1000),
          };
        }
      });

      let nextTimer = state.timer;
      if (state.isTimerActive && state.timerStartedAt) {
        nextTimer = Math.floor((now - state.timerStartedAt) / 1000);
      }

      return {
        ...state,
        timer: nextTimer,
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
        timerStartedAt: Date.now(),
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
      const targetIdx = state.currentSerie - 1;

      const nextExerciseLoads = { ...state.exerciseLoads };
      const loads = [...(nextExerciseLoads[sessionId] || [])];
      loads[targetIdx] = currentInputLoad;
      nextExerciseLoads[sessionId] = loads;

      const nextExerciseReps = { ...state.exerciseReps };
      const reps = [...(nextExerciseReps[sessionId] || [])];
      reps[targetIdx] = currentInputReps;
      nextExerciseReps[sessionId] = reps;

      const nextExerciseTimes = { ...state.exerciseTimes };
      const times = [...(nextExerciseTimes[sessionId] || [])];
      times[targetIdx] = state.timer;
      nextExerciseTimes[sessionId] = times;

      const nextActiveRestTimers = { ...state.activeRestTimers };
      if (!isLastSerie) {
        nextActiveRestTimers[String(sessionId)] = {
          startedAt: Date.now(),
          seconds: 0,
          title: `Descanso ${state.currentSerie}-${seriesAlvo}`,
          nome: nomeEx,
        };
      }

      // Rule 1: Visual focus (currentSerie) stays on the completed series for editing.
      // We only update the data. Advancement happens in ADVANCE_STEP (Rule 2).

      let nextState = {
        ...state,
        isTimerActive: false,
        timerStartedAt: null,
        status: "RESTING",
        exerciseLoads: nextExerciseLoads,
        exerciseReps: nextExerciseReps,
        exerciseTimes: nextExerciseTimes,
        activeRestTimers: nextActiveRestTimers,
        // currentSerie and activeSeriesMap remain at currentSNum
      };
      return nextState;
    }

    case "ADVANCE_STEP": {
      const { currentBlock: cBlock } = action.payload;
      if (!cBlock || cBlock.length === 0) return state;

      let blockFinished;

      if (state.executionMode === "isolated" || cBlock.length === 1) {
        const currentEx = cBlock[state.currentExerciseInBlock];
        if (!currentEx) return state;

        blockFinished =
          state.currentExerciseInBlock === cBlock.length - 1 &&
          (state.exerciseTimes[currentEx.sessionId]?.length || 0) >=
            currentEx.series_alvo;
      } else {
        blockFinished = cBlock.every(
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
        const nextSNum = (state.exerciseTimes[firstEx.sessionId]?.length || 0) + 1;
        let nextState = {
          ...state,
          currentBlockIndex: state.currentBlockIndex + 1,
          currentExerciseInBlock: 0,
          currentSerie: nextSNum,
          activeSeriesMap: { ...state.activeSeriesMap, [firstEx.sessionId]: nextSNum },
          timer: 0,
          status: "IDLE",
          skippedExercises: state.skippedExercises.filter(s => s.sessionId !== firstEx.sessionId)
        };
        return ensureExecutionData(nextState, firstEx.sessionId, nextSNum);
      }

      // Conjugated/Circuit Flow (A->B->C->A) - Rule 3
      if (state.executionMode === "alternated" && cBlock.length > 1) {
        // Find next exercise in the circuit
        let nextExIdx = (state.currentExerciseInBlock + 1) % cBlock.length;

        for (let i = 0; i < cBlock.length; i++) {
          const candidate = cBlock[nextExIdx];
          if (!candidate) break;

          const doneCount = state.exerciseTimes[candidate.sessionId]?.length || 0;

          // Rule 3: Move to next exercise, possibly keeping same series index
          if (doneCount < candidate.series_alvo) {
            const nextSNumForCandidate = doneCount + 1;
            let nextState = {
              ...state,
              currentExerciseInBlock: nextExIdx,
              currentSerie: nextSNumForCandidate,
              activeSeriesMap: { ...state.activeSeriesMap, [candidate.sessionId]: nextSNumForCandidate },
              timer: 0,
              status: "IDLE",
              skippedExercises: state.skippedExercises.filter(s => s.sessionId !== candidate.sessionId)
            };
            return ensureExecutionData(nextState, candidate.sessionId, nextSNumForCandidate);
          }
          nextExIdx = (nextExIdx + 1) % cBlock.length;
        }
      }

      // Single Exercise Flow (Rule 2)
      // Focus advancement now happens here instead of STOP_SERIES.
      const currentEx = cBlock[state.currentExerciseInBlock];
      const nextSNum = state.currentSerie + 1;

      let nextState = {
        ...state,
        currentSerie: nextSNum,
        activeSeriesMap: { ...state.activeSeriesMap, [currentEx.sessionId]: nextSNum },
        timer: 0,
        status: "IDLE",
      };
      return ensureExecutionData(nextState, currentEx.sessionId, nextSNum);
    }

    case "SKIP_EXERCISE": {
      const { sessionId } = action.payload;
      const targetSessionId = sessionId || state.blocos[state.currentBlockIndex]?.[state.currentExerciseInBlock]?.sessionId;
      if (!targetSessionId) return state;

      // Find where this exercise is
      let targetEx = null;
      let targetBIdx = -1;
      let targetEIdx = -1;

      state.blocos.forEach((block, bIdx) => {
        const eIdx = block.findIndex(ex => ex.sessionId === targetSessionId);
        if (eIdx !== -1) {
          targetEx = block[eIdx];
          targetBIdx = bIdx;
          targetEIdx = eIdx;
        }
      });

      if (!targetEx) return state;

      const isCurrent = targetBIdx === state.currentBlockIndex && targetEIdx === state.currentExerciseInBlock;

      let nextSkipped = [...state.skippedExercises];
      if (!state.isCatchupPhase) {
        const alreadySkipped = nextSkipped.some(s => s.sessionId === targetSessionId);
        if (!alreadySkipped) {
          const doneCount = state.exerciseTimes[targetSessionId]?.length || 0;
          nextSkipped.push({ ...targetEx, partialSerie: isCurrent ? state.currentSerie : doneCount + 1 });
        }
      } else {
        // Just for linting satisfaction or logic clarity
        nextSkipped = nextSkipped.filter(s => s.sessionId !== targetSessionId);
      }

      if (!isCurrent) {
        return { ...state, skippedExercises: nextSkipped };
      }

      // If it IS current, we need to advance focus
      const currentBlock = state.blocos[state.currentBlockIndex];
      const isLastInBlock = state.currentExerciseInBlock === currentBlock.length - 1;

      let nextState = {
        ...state,
        isTimerActive: false,
        timer: 0,
        status: "IDLE",
        skippedExercises: nextSkipped
      };

      if (state.executionMode === "alternated" && currentBlock.length > 1 && !isLastInBlock) {
        nextState.currentExerciseInBlock += 1;
        const nextEx = currentBlock[nextState.currentExerciseInBlock];
        nextState.currentSerie = (state.exerciseTimes[nextEx.sessionId]?.length || 0) + 1;
        nextState.activeSeriesMap[nextEx.sessionId] = nextState.currentSerie;
      } else {
        if (isLastInBlock) {
          if (state.currentBlockIndex === state.blocos.length - 1) {
            nextState.status = "COMPLETED";
          } else {
            nextState.currentBlockIndex += 1;
            nextState.currentExerciseInBlock = 0;
            const nextBlock = state.blocos[nextState.currentBlockIndex];
            const nextEx = nextBlock ? nextBlock[0] : null;
            nextState.currentSerie = nextEx ? (state.exerciseTimes[nextEx.sessionId]?.length || 0) + 1 : 1;
            if (nextEx) {
              nextState.activeSeriesMap[nextEx.sessionId] = nextState.currentSerie;
              nextState = ensureExecutionData(nextState, nextEx.sessionId, nextState.currentSerie);
            }
          }
        } else {
          nextState.currentExerciseInBlock += 1;
          const nextEx = currentBlock[nextState.currentExerciseInBlock];
          nextState.currentSerie = nextEx ? (state.exerciseTimes[nextEx.sessionId]?.length || 0) + 1 : 1;
          if (nextEx) {
            nextState.activeSeriesMap[nextEx.sessionId] = nextState.currentSerie;
            nextState = ensureExecutionData(nextState, nextEx.sessionId, nextState.currentSerie);
          }
        }
      }
      return nextState;
    }

    case "COMPLETE_EXERCISE_MANUAL": {
      const { sessionId } = action.payload;
      if (!sessionId) return state;

      let targetEx = null;
      let targetBIdx = -1;
      let targetEIdx = -1;

      state.blocos.forEach((block, bIdx) => {
        const eIdx = block.findIndex(ex => ex.sessionId === sessionId);
        if (eIdx !== -1) {
          targetEx = block[eIdx];
          targetBIdx = bIdx;
          targetEIdx = eIdx;
        }
      });

      if (!targetEx) return state;

      const seriesAlvo = targetEx.series_alvo;
      const currentDone = state.exerciseTimes[sessionId]?.length || 0;

      // If already done, do nothing
      if (currentDone >= seriesAlvo) return state;

      const nextExerciseTimes = { ...state.exerciseTimes };
      const nextExerciseLoads = { ...state.exerciseLoads };
      const nextExerciseReps = { ...state.exerciseReps };

      const times = [...(nextExerciseTimes[sessionId] || [])];
      const loads = [...(nextExerciseLoads[sessionId] || [])];
      const repsArr = [...(nextExerciseReps[sessionId] || [])];

      const cargaMeta = state.cargas[sessionId] || 0;
      const repsMetaStr = targetEx.reps_alvo;
      const repsMeta = repsMetaStr.includes("-") ? parseInt(repsMetaStr.split("-")[1]) : (parseInt(repsMetaStr) || 10);

      for (let i = currentDone; i < seriesAlvo; i++) {
        times[i] = 0; // Manual completion sets time to 0 or some default? Let's use 0.
        // Hierarchy: edited grid value > historical index value > session meta value
        loads[i] = loads[i] ?? state.historyLoads[sessionId]?.[i] ?? cargaMeta;
        repsArr[i] = repsArr[i] ?? state.historyReps[sessionId]?.[i] ?? state.repsFeitas[sessionId] ?? repsMeta;
      }

      nextExerciseTimes[sessionId] = times;
      nextExerciseLoads[sessionId] = loads;
      nextExerciseReps[sessionId] = repsArr;

      const nextSkipped = state.skippedExercises.filter(s => s.sessionId !== sessionId);
      const isCurrent = targetBIdx === state.currentBlockIndex && targetEIdx === state.currentExerciseInBlock;

      if (!isCurrent) {
        let nextState = {
          ...state,
          exerciseTimes: nextExerciseTimes,
          exerciseLoads: nextExerciseLoads,
          exerciseReps: nextExerciseReps,
          activeSeriesMap: { ...state.activeSeriesMap, [sessionId]: seriesAlvo + 1 },
          skippedExercises: nextSkipped
        };
        return ensureExecutionData(nextState, sessionId, seriesAlvo);
      }

      // If it IS current, advance to next exercise/block
      let nextState = {
        ...state,
        exerciseTimes: nextExerciseTimes,
        exerciseLoads: nextExerciseLoads,
        exerciseReps: nextExerciseReps,
        activeSeriesMap: { ...state.activeSeriesMap, [sessionId]: seriesAlvo + 1 },
        skippedExercises: nextSkipped,
        isTimerActive: false,
        timer: 0,
        status: "IDLE"
      };
      nextState = ensureExecutionData(nextState, sessionId, seriesAlvo);

      // Reuse ADVANCE_STEP logic essentially
      const currentBlock = state.blocos[state.currentBlockIndex];
      const isLastInBlock = state.currentExerciseInBlock === currentBlock.length - 1;

      if (state.executionMode === "alternated" && currentBlock.length > 1 && !isLastInBlock) {
        // Try to find next pending in circuit
        let foundNext = false;
        let nextExIdx = (state.currentExerciseInBlock + 1) % currentBlock.length;
        for (let i = 0; i < currentBlock.length; i++) {
          const candidate = currentBlock[nextExIdx];
          const done = nextExerciseTimes[candidate.sessionId]?.length || 0;
          if (done < candidate.series_alvo) {
            nextState.currentExerciseInBlock = nextExIdx;
            nextState.currentSerie = done + 1;
            foundNext = true;
            break;
          }
          nextExIdx = (nextExIdx + 1) % currentBlock.length;
        }

        if (!foundNext) {
          // All in block done
          if (state.currentBlockIndex === state.blocos.length - 1) {
            nextState.status = "COMPLETED";
          } else {
            nextState.currentBlockIndex += 1;
            nextState.currentExerciseInBlock = 0;
            const nextBlock = state.blocos[nextState.currentBlockIndex];
            const nextEx = nextBlock ? nextBlock[0] : null;
            nextState.currentSerie = nextEx ? (nextExerciseTimes[nextEx.sessionId]?.length || 0) + 1 : 1;
            if (nextEx) {
              nextState.activeSeriesMap[nextEx.sessionId] = nextState.currentSerie;
              nextState = ensureExecutionData(nextState, nextEx.sessionId, nextState.currentSerie);
            }
          }
        } else {
          const nextEx = currentBlock[nextState.currentExerciseInBlock];
          nextState.activeSeriesMap[nextEx.sessionId] = nextState.currentSerie;
          nextState = ensureExecutionData(nextState, nextEx.sessionId, nextState.currentSerie);
        }
      } else {
        if (isLastInBlock) {
          if (state.currentBlockIndex === state.blocos.length - 1) {
            nextState.status = "COMPLETED";
          } else {
            nextState.currentBlockIndex += 1;
            nextState.currentExerciseInBlock = 0;
            const nextBlock = state.blocos[nextState.currentBlockIndex];
            const nextEx = nextBlock ? nextBlock[0] : null;
            nextState.currentSerie = nextEx ? (nextExerciseTimes[nextEx.sessionId]?.length || 0) + 1 : 1;
            if (nextEx) {
              nextState.activeSeriesMap[nextEx.sessionId] = nextState.currentSerie;
              nextState = ensureExecutionData(nextState, nextEx.sessionId, nextState.currentSerie);
            }
          }
        } else {
          nextState.currentExerciseInBlock += 1;
          const nextEx = currentBlock[nextState.currentExerciseInBlock];
          nextState.currentSerie = nextEx ? (nextExerciseTimes[nextEx.sessionId]?.length || 0) + 1 : 1;
          if (nextEx) {
            nextState.activeSeriesMap[nextEx.sessionId] = nextState.currentSerie;
            nextState = ensureExecutionData(nextState, nextEx.sessionId, nextState.currentSerie);
          }
        }
      }

      return nextState;
    }

    case "MANUAL_OVERRIDE": {
      const { bIdx, eIdx, sNum } = action;
      if (!state.blocos[bIdx] || !state.blocos[bIdx][eIdx]) return state;

      const targetEx = state.blocos[bIdx][eIdx];
      const currentPersistedSNum = state.activeSeriesMap[targetEx.sessionId] || 1;

      // Rule 3: Smart Default Selection (when sNum is null)
      // Logic: Pick the last executed series index (length of exerciseTimes), or 1 if unstarted.
      const executedCount = (state.exerciseTimes[targetEx.sessionId]?.length || 0);
      const smartDefault = Math.max(1, executedCount);

      const restoredSNum = sNum ?? smartDefault;

      let nextState = {
        ...state,
        currentBlockIndex: bIdx,
        currentExerciseInBlock: eIdx,
        currentSerie: restoredSNum,
        activeSeriesMap: { ...state.activeSeriesMap, [targetEx.sessionId]: restoredSNum },
        isTimerActive: false,
        timer: 0,
        status: "IDLE",
        skippedExercises: state.skippedExercises.filter(s => s.sessionId !== targetEx.sessionId)
      };

      // Rule 1: Retrocession (Reset current and Posterior series)
      // When explicitly tapping an earlier series, remove data for it and all series after it.
      if (sNum !== null && sNum < currentPersistedSNum) {
        nextState = truncateExecutionData(nextState, targetEx.sessionId, sNum - 1);
      }

      // Rule 2: Preservation (No mutation on focus switch)
      // If action.sNum is null (exercise card tap), update focus but don't populate data.
      // This makes the transition strictly visual/navegacional.
      if (sNum === null) {
        return nextState;
      }

      // If action.sNum was provided (direct series tap), ensure data for it (Focus = Execution).
      return ensureExecutionData(nextState, targetEx.sessionId, restoredSNum);
    }
    case "UNDO_SERIES": {
      const { sessionId } = action;
      const doneCount = state.exerciseTimes[sessionId]?.length || 0;
      const currentActiveS = state.activeSeriesMap[sessionId] || 1;
      if (doneCount === 0 && currentActiveS === 1) return state;

      const nextExerciseTimes = { ...state.exerciseTimes };
      const nextExerciseLoads = { ...state.exerciseLoads };
      const nextExerciseReps = { ...state.exerciseReps };

      // Revert the last entry if we are "undoing" a completed series,
      // or just move focus back if we are undoing a focused but not yet timed series.
      const targetIdx = Math.max(0, state.currentSerie - 2);

      if (nextExerciseTimes[sessionId]) {
        const times = [...nextExerciseTimes[sessionId]];
        times.splice(targetIdx, 1);
        nextExerciseTimes[sessionId] = times;
      }
      if (nextExerciseLoads[sessionId]) {
        const loads = [...nextExerciseLoads[sessionId]];
        loads.splice(targetIdx, 1);
        nextExerciseLoads[sessionId] = loads;
      }
      if (nextExerciseReps[sessionId]) {
        const reps = [...nextExerciseReps[sessionId]];
        reps.splice(targetIdx, 1);
        nextExerciseReps[sessionId] = reps;
      }

      const nextSNum = Math.max(1, currentActiveS - 1);
      let nextState = {
        ...state,
        exerciseTimes: nextExerciseTimes,
        exerciseLoads: nextExerciseLoads,
        exerciseReps: nextExerciseReps,
        currentSerie: nextSNum,
        activeSeriesMap: { ...state.activeSeriesMap, [sessionId]: nextSNum },
        status: "IDLE",
        isTimerActive: false,
        timer: 0
      };
      // We step focus back, and because "Focus = Execution", we ensure the NEW active series (nextSNum)
      // has its data. (ensureExecutionData is idempotent for already existing data).
      return ensureExecutionData(nextState, sessionId, nextSNum);
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
      if (!mapKey) return state;

      let nextState = { ...state };

      if (fieldType === "currentCarga" || fieldType === "currentReps") {
        // 1. Update the summary state (top input)
        nextState = { ...nextState, [mapKey]: { ...nextState[mapKey], [sessionId]: val } };

        // 2. Mirror to the active series in performance arrays (grid)
        const activeSIdx = (state.activeSeriesMap[sessionId] || 1) - 1;
        const mirrorGridMap = { currentCarga: "exerciseLoads", currentReps: "exerciseReps" };
        const gridKey = mirrorGridMap[fieldType];

        if (gridKey) {
          const perfArr = [...(state[gridKey][sessionId] || [])];
          perfArr[activeSIdx] = val;
          nextState = { ...nextState, [gridKey]: { ...nextState[gridKey], [sessionId]: perfArr } };
        }
      } else {
        const nextMapValue = { ...state[mapKey] };
        const newArr = [...(nextMapValue[sessionId] || [])];

        if (fieldType === "exec" || fieldType === "rest") {
          const currentSeconds = newArr[sessionIdx] || 0;
          const mins = Math.floor(currentSeconds / 60);
          const secs = currentSeconds % 60;
          if (part === "mins") newArr[sessionIdx] = (parseInt(val) || 0) * 60 + secs;
          else if (part === "secs")
            newArr[sessionIdx] = mins * 60 + (parseInt(val) || 0);
        } else {
          newArr[sessionIdx] = val;

          // 1. Mirror back to summary inputs if editing the active series in the grid
          const activeSIdx = (state.activeSeriesMap[sessionId] || 1) - 1;
          if (sessionIdx === activeSIdx) {
            const mirrorSummaryMap = { load: "cargas", reps: "repsFeitas" };
            const summaryKey = mirrorSummaryMap[fieldType];
            if (summaryKey) {
              nextState = { ...nextState, [summaryKey]: { ...nextState[summaryKey], [sessionId]: val } };
            }
          }
        }

        nextMapValue[sessionId] = newArr;
        nextState = { ...nextState, [mapKey]: nextMapValue };
      }

      return nextState;
    }

    case "CONFIRM_SERIES_EDIT": {
      const { sessionId, sessionIdx } = action;
      const currentActiveS = state.activeSeriesMap[sessionId] || 1;
      const editedSNum = sessionIdx + 1;

      let nextState = { ...state };

      if (state.trainingMode === "manual") {
        const nextExerciseTimes = { ...state.exerciseTimes };
        const times = [...(nextExerciseTimes[sessionId] || [])];
        for (let i = 0; i <= sessionIdx; i++) {
          if (times[i] === undefined || times[i] === null) {
            times[i] = 0;
          }
        }
        nextExerciseTimes[sessionId] = times;
        nextState = {
          ...nextState,
          exerciseTimes: nextExerciseTimes,
        };
      }

      if (editedSNum > currentActiveS) {
        const currentEx = state.blocos[state.currentBlockIndex]?.[state.currentExerciseInBlock];
        const isTargetExFocused = currentEx?.sessionId === sessionId;

        nextState = {
          ...nextState,
          activeSeriesMap: { ...nextState.activeSeriesMap, [sessionId]: editedSNum },
          currentSerie: isTargetExFocused ? editedSNum : nextState.currentSerie,
          status: "IDLE",
          isTimerActive: false,
          timer: 0,
          skippedExercises: nextState.skippedExercises.filter(s => s.sessionId !== sessionId)
        };

        return ensureExecutionData(nextState, sessionId, editedSNum);
      }
      return nextState;
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

    case "TOGGLE_EXECUTION_MODE":
      return {
        ...state,
        executionMode:
          state.executionMode === "alternated" ? "isolated" : "alternated",
      };

    case "SET_TRAINING_MODE":
      return {
        ...state,
        trainingMode: action.payload,
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
      const { bIdx, exerciseData, series_alvo, reps_alvo, inheritedLoads, inheritedReps } = action;
      const targetBIdx = bIdx ?? (state.blocos.length > 0 ? state.blocos.length - 1 : 0);

      const sessionId = `add-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newEx = {
        sessionId,
        exercicio_id: exerciseData.id,
        ordem_execucao: state.blocos[targetBIdx]?.length + 1 || 1,
        series_alvo: series_alvo || 3,
        reps_alvo: reps_alvo || "10",
        numero_bloco: state.blocos[targetBIdx]?.[0]?.numero_bloco || targetBIdx + 1,
        exercicios: {
          nome: exerciseData.nome,
          alvo_principal: exerciseData.alvo_principal
        }
      };

      const newBlocos = [...state.blocos];
      if (newBlocos[targetBIdx]) {
        newBlocos[targetBIdx] = [...newBlocos[targetBIdx], newEx];
      } else {
        newBlocos[targetBIdx] = [newEx];
      }

      const lastLoad = inheritedLoads?.length > 0 ? inheritedLoads[inheritedLoads.length - 1] : 0;
      const lastReps = inheritedReps?.length > 0 ? inheritedReps[inheritedReps.length - 1] : 10;

      return {
        ...state,
        blocos: newBlocos,
        originalBlocos: newBlocos,
        exerciseTimes: { ...state.exerciseTimes, [sessionId]: [] },
        restTimes: { ...state.restTimes, [sessionId]: [] },
        exerciseLoads: { ...state.exerciseLoads, [sessionId]: [] },
        historyLoads: { ...state.historyLoads, [sessionId]: inheritedLoads || [] },
        exerciseReps: { ...state.exerciseReps, [sessionId]: [] },
        historyReps: { ...state.historyReps, [sessionId]: inheritedReps || [] },
        cargas: { ...state.cargas, [sessionId]: lastLoad },
        repsFeitas: { ...state.repsFeitas, [sessionId]: lastReps },
        activeSeriesMap: { ...state.activeSeriesMap, [sessionId]: 1 }
      };
    }

    case "MOVE_EXERCISE": {
      const { bIdx, eIdx, direction } = action;
      const newBlocks = [...state.blocos];
      const block = [...newBlocks[bIdx]];
      const targetIdx = eIdx + direction;

      if (targetIdx < 0 || targetIdx >= block.length) return state;

      // Stable focus preservation: remember what was focused before structural changes
      const currentActiveEx = state.blocos[state.currentBlockIndex]?.[state.currentExerciseInBlock];
      const currentSessionId = currentActiveEx?.sessionId;

      const [moved] = block.splice(eIdx, 1);
      block.splice(targetIdx, 0, moved);

      const updatedBlock = block.map((ex, idx) => ({ ...ex, ordem_execucao: idx + 1 }));
      newBlocks[bIdx] = updatedBlock;

      let nextBlockIdx = state.currentBlockIndex;
      let nextExIdx = state.currentExerciseInBlock;

      if (currentSessionId) {
        newBlocks.forEach((b, bi) => {
          const ei = b.findIndex(ex => ex.sessionId === currentSessionId);
          if (ei !== -1) {
            nextBlockIdx = bi;
            nextExIdx = ei;
          }
        });
      }

      return {
        ...state,
        blocos: newBlocks,
        originalBlocos: newBlocks,
        currentBlockIndex: nextBlockIdx,
        currentExerciseInBlock: nextExIdx
      };
    }

    case "MOVE_TO_BLOCK": {
      const { bIdx, eIdx, direction } = action;
      const newBlocks = state.blocos.map(b => [...b]);

      // Preservation coordinates
      const currentActiveEx = state.blocos[state.currentBlockIndex]?.[state.currentExerciseInBlock];
      const currentSessionId = currentActiveEx?.sessionId;

      const [exercise] = newBlocks[bIdx].splice(eIdx, 1);
      const sourceWasEmpty = newBlocks[bIdx].length === 0;

      if (sourceWasEmpty) {
        newBlocks.splice(bIdx, 1);
      }

      // Calculate target block index in the NEW array
      // If we move down (direction 1) and we removed a block before the target,
      // the target block index stays the same (bIdx + 1 became bIdx).
      // If we move up (direction -1), targetBlockIdx is just bIdx - 1.

      let finalTargetIdx = bIdx + direction;
      if (direction === 1 && sourceWasEmpty) {
        finalTargetIdx = bIdx;
      }

      if (finalTargetIdx < 0) {
        newBlocks.unshift([exercise]);
      } else if (finalTargetIdx >= newBlocks.length) {
        newBlocks.push([exercise]);
      } else {
        newBlocks[finalTargetIdx].push(exercise);
      }

      // Re-normalize everything
      const normalizedBlocks = newBlocks.map((block, idx) =>
        block.map((ex, exIdx) => ({
          ...ex,
          numero_bloco: idx + 1,
          ordem_execucao: exIdx + 1
        }))
      );

      let nextBlockIdx = 0;
      let nextExIdx = 0;
      if (currentSessionId) {
        normalizedBlocks.forEach((b, bi) => {
          const ei = b.findIndex(ex => ex.sessionId === currentSessionId);
          if (ei !== -1) {
            nextBlockIdx = bi;
            nextExIdx = ei;
          }
        });
      }

      return {
        ...state,
        blocos: normalizedBlocks,
        originalBlocos: normalizedBlocks,
        currentBlockIndex: nextBlockIdx,
        currentExerciseInBlock: nextExIdx
      };
    }

    case "REPLACE_EXERCISE": {
      const { bIdx, eIdx, exerciseData, series_alvo, reps_alvo, inheritedLoads, inheritedReps } = action;
      const newBlocks = [...state.blocos];
      const block = [...newBlocks[bIdx]];
      const oldEx = block[eIdx];
      const newSessionId = `rep-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      const updatedEx = {
        ...oldEx,
        sessionId: newSessionId,
        exercicio_id: exerciseData.id,
        series_alvo: series_alvo || oldEx.series_alvo,
        reps_alvo: reps_alvo || oldEx.reps_alvo,
        exercicios: {
          nome: exerciseData.nome,
          alvo_principal: exerciseData.alvo_principal
        }
      };

      block[eIdx] = updatedEx;
      newBlocks[bIdx] = block;

      const lastLoad = inheritedLoads?.length > 0 ? inheritedLoads[inheritedLoads.length - 1] : 0;
      const lastReps = inheritedReps?.length > 0 ? inheritedReps[inheritedReps.length - 1] : 10;

      return {
        ...state,
        blocos: newBlocks,
        originalBlocos: newBlocks,
        exerciseTimes: { ...state.exerciseTimes, [newSessionId]: [] },
        restTimes: { ...state.restTimes, [newSessionId]: [] },
        exerciseLoads: { ...state.exerciseLoads, [newSessionId]: [] },
        historyLoads: { ...state.historyLoads, [newSessionId]: inheritedLoads || [] },
        exerciseReps: { ...state.exerciseReps, [newSessionId]: [] },
        historyReps: { ...state.historyReps, [newSessionId]: inheritedReps || [] },
        cargas: { ...state.cargas, [newSessionId]: lastLoad },
        repsFeitas: { ...state.repsFeitas, [newSessionId]: lastReps },
        activeSeriesMap: { ...state.activeSeriesMap, [newSessionId]: 1 }
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

      const nextActiveS = newBlocks[nextBlockIdx][nextExIdx] ? (state.activeSeriesMap[newBlocks[nextBlockIdx][nextExIdx].sessionId] || 1) : 1;

      return {
        ...state,
        blocos: newBlocks,
        originalBlocos: newBlocks,
        currentBlockIndex: nextBlockIdx,
        currentExerciseInBlock: nextExIdx,
        currentSerie: nextActiveS,
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
        repsFeitas: { ...state.repsFeitas, [sessionId]: 10 },
        activeSeriesMap: { ...state.activeSeriesMap, [sessionId]: 1 }
      };
    }

    case "RESET_TIMER":
      return {
        ...state,
        timer: 0,
        timerStartedAt: null,
        isTimerActive: false,
        status: "IDLE",
      };

    case "CLEAR_SESSION":
      return initialState;

    default:
      return state;
  }
}


const SwipeableExerciseCard = ({ children, onSwipeRight, onSwipeLeft, isFirst, isDone, isEnabled, style }) => {
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [-100, 0, 100],
    ["#4b5563", "rgba(0, 0, 0, 0)", "#10b981"]
  );
  const opacityRight = useTransform(x, [10, 50], [0, 1]);
  const opacityLeft = useTransform(x, [-50, -10], [1, 0]);

  // Bounce animation for the first card to show discoverability
  const bounceControls = {
    x: [0, 20, 0],
    transition: { duration: 0.6, delay: 1, times: [0, 0.5, 1] }
  };

  const handleDragEnd = (event, info) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      onSwipeRight();
    } else if (info.offset.x < -threshold) {
      onSwipeLeft();
    }
  };

  if (isDone) {
    return (
      <div style={style}>
        {children}
      </div>
    );
  }

  return (
    <div className={`relative rounded-2xl ${isEnabled ? "" : "overflow-hidden"}`} style={style}>
      {/* Background Actions */}
      {isEnabled && (
        <motion.div
          style={{ background }}
          className="absolute inset-0 flex items-center justify-between px-6 rounded-2xl overflow-hidden"
        >
          <motion.div style={{ opacity: opacityRight }} className="flex items-center gap-2 text-white font-bold">
            <CheckCircle2 size={24} />
            <span>CONCLUIR</span>
          </motion.div>
          <motion.div style={{ opacity: opacityLeft }} className="flex items-center gap-2 text-white font-bold">
            <span>PULAR</span>
            <X size={24} />
          </motion.div>
        </motion.div>
      )}

      <motion.div
        drag={isEnabled ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        style={{ x }}
        animate={isFirst && !isDone && isEnabled ? bounceControls : {}}
        className="relative z-10 touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
};

const Training = () => {
  const { showToast } = useToast();
  const { user, isPremium, profile } = useAuth();
  const { settings } = useAppearance();
  const { letra } = useParams();
  const navigate = useNavigate();
  const isFreeTraining = letra === "LIVRE";
  const isPremiumUser = isPremium;

  const [loading, setLoading] = useState(true);
  const [isTimeout, setIsTimeout] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [inspectedData, setInspectedData] = useState("");
  const [savingSession, setSavingSession] = useState(false);
  const [showPageMenu, setShowPageMenu] = useState(false);
  const [openMenuExId, setOpenMenuExId] = useState(null);
  const [openSeriesMenuExId, setOpenSeriesMenuExId] = useState(null);
  const [selectorConfig, setSelectorConfig] = useState({ isOpen: false, bIdx: null, eIdx: null, mode: 'add', isFetchingHistory: false });
  const [exerciseToDelete, setExerciseToDelete] = useState(null);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [saveAsData, setSaveAsData] = useState({ letra: "", nome: "", subtitulo: "" });
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [lastExecutionTimes, setLastExecutionTimes] = useState({});
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [bpm, setBpm] = useState(60);
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    onConfirm: () => {},
    title: "",
    message: "",
    confirmText: "",
    variant: "warning"
  });

  const audioContextRef = React.useRef(null);
  const scrollContainerRef = useRef(null);
  const initialScrollDone = useRef(false);
  const location = useLocation();
  const isFromHomeRef = useRef(!!location.state?.fromHome);
  const finishedRef = useRef(false);

  const [state, dispatch] = useReducer(trainingReducer, initialState);

  useEffect(() => {
    const handleError = (event) => {
      const errorMsg = event.error?.message || event.message || "Erro desconhecido";
      setGlobalError(`Global Error: ${errorMsg}`);
    };

    const handleRejection = (event) => {
      const reason = event.reason?.message || event.reason || "Rejeição desconhecida";
      setGlobalError(`Unhandled Rejection: ${reason}`);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  const currentBlock = state.blocos[state.currentBlockIndex] || [];

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      console.warn("FetchData cancelado: User ID ausente.");
      return;
    }

    setLoading(true);
    setIsTimeout(false);

    // Chrome Mobile Safety Timeout (7 seconds)
    const safetyTimeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("Chrome Mobile Safety Timeout: Fetching data taking too long.");
          setIsTimeout(true);
          return false;
        }
        return prev;
      });
    }, 7000);

    try {
      // Robust session check
      const { data: { session }, error: sessionError } = await supabase.auth.getSession().catch(err => {
        console.error("Session check critical failure:", err);
        return { data: { session: null }, error: err };
      });

      if (sessionError) {
        console.warn("Recovering from corrupted session state...");
        // If session is problematic on mobile, we can't proceed reliably
        // but we'll try to use what we have or let the error bubble.
      }

      // Automatic restoration logic for refresh/resume
      const saved = localStorage.getItem("active_training_session");
      if (saved) {
        const stateData = JSON.parse(saved);
        if (stateData.letra === letra) {
          const now = Date.now();
          // Recalculate timer if it was active
          if (stateData.isTimerActive && stateData.timerStartedAt) {
            stateData.timer = Math.floor((now - stateData.timerStartedAt) / 1000);
          }
          // Recalculate rest timers
          if (stateData.activeRestTimers) {
            Object.keys(stateData.activeRestTimers).forEach(id => {
              if (stateData.activeRestTimers[id].startedAt) {
                stateData.activeRestTimers[id].seconds = Math.floor(
                  (now - stateData.activeRestTimers[id].startedAt) / 1000
                );
              }
            });
          }
          dispatch({ type: "INIT_SESSION", payload: stateData });

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
          setLoading(false);
          return;
        }
      }

      if (isFreeTraining) {
        dispatch({
          type: "INIT_SESSION",
          payload: {
            letra: "LIVRE",
            blocos: [],
            originalBlocos: [],
            cargas: {},
            repsFeitas: {},
            exerciseTimes: {},
            restTimes: {},
            exerciseLoads: {},
            exerciseReps: {},
          },
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("blocos_treino")
        .select("*, exercicios(*)")
        .eq("letra_treino", letra)
        .eq("user_id", user.id)
        .order("numero_bloco", { ascending: true })
        .order("ordem_execucao", { ascending: true });

      if (error) {
        throw error;
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
        const initialHistoryLoads = {};
        const initialHistoryReps = {};

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
          // Store full history arrays separately
          initialHistoryLoads[sessionId] = histLoads;
          initialHistoryReps[sessionId] = histReps;
          // Start with empty performance data; meta/history will be shown via fallbacks
          initialExLoads[sessionId] = [];
          initialExReps[sessionId] = [];
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
            historyLoads: initialHistoryLoads,
            exerciseReps: initialExReps,
            historyReps: initialHistoryReps,
          },
        });
      }
    } catch (error) {
      console.error("Erro ao buscar dados do treino:", error);
      setGlobalError(`Fetch Data Error: ${error.message || JSON.stringify(error)}`);
      showToast("Não foi possível carregar o treino. Tente novamente.", "error");
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  }, [user?.id, letra, isFreeTraining]);

  const fetchWorkoutDetails = useCallback(async () => {
    if (!isFreeTraining) {
      const { data } = await supabase
        .from("treinos")
        .select("letra, nome, subtitulo")
        .eq("letra", letra)
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setSaveAsData({
          letra: data.letra,
          nome: data.nome,
          subtitulo: data.subtitulo || "",
        });
      }
    } else {
      setSaveAsData({ letra: "", nome: "Treino Livre", subtitulo: "" });
    }
  }, [user?.id, isFreeTraining, letra]);

  const finishWorkout = useCallback(async () => {
    setSavingSession(true);
    setShowInterstitial(false); // Garante que o intersticial não seja exibido no salvamento
    try {
      const historyData = [];
      const workoutTimestamp = new Date().toISOString();
      let displayLetra = letra;

      if (profile?.is_demo) {
        // Build mock historyData from state
        state.originalBlocos.forEach((block) => {
          block.forEach((ex) => {
            const sessionId = ex.sessionId;
            const execTimes = state.exerciseTimes[sessionId] || [];
            const rests = state.restTimes[sessionId] || [];
            const exLoads = state.exerciseLoads[sessionId] || [];
            const exReps = state.exerciseReps[sessionId] || [];

            historyData.push({
              user_id: user.id,
              exercicio_id: ex.exercicio_id,
              carga: exLoads.length > 0 ? exLoads : [60],
              repeticoes: exReps.length > 0 ? exReps : [12],
              series_executadas: Math.max(execTimes.length, exLoads.length, exReps.length, 1),
              tempo_total_segundos: 120,
              tempo_execucao_segundos: execTimes.length > 0 ? execTimes : [60],
              tempo_descanso_segundos: rests.length > 0 ? rests : [60],
              letra_treino: displayLetra,
              data_treino: workoutTimestamp,
              sessao_treino_id: state.sessaoTreinoId,
            });
          });
        });

        localStorage.removeItem("active_training_session");
        localStorage.removeItem("treino_em_andamento");
        finishedRef.current = true;
        showToast("Treino concluído (modo demonstração)!", "success");

        // Calculate immediate metrics 1 to 8:
        let totalSeconds = 0;
        historyData.forEach(h => {
          totalSeconds += Number(h.tempo_total_segundos) || 0;
        });
        const durationMin = Math.floor(totalSeconds / 60);
        const durationSec = totalSeconds % 60;
        const formattedDuration = `${durationMin} min${durationSec > 0 ? ` ${durationSec}s` : ""}`;
        const exerciseCount = historyData.length;
        const totalSets = historyData.reduce((acc, h) => acc + (Number(h.series_executadas) || 0), 0);

        let totalReps = 0;
        historyData.forEach(h => {
          const repsArr = Array.isArray(h.repeticoes) ? h.repeticoes : (h.repeticoes ? [h.repeticoes] : []);
          repsArr.forEach(r => {
            totalReps += (Number(r) || 0);
          });
        });

        let totalVolume = 0;
        historyData.forEach(h => {
          const repsArr = Array.isArray(h.repeticoes) ? h.repeticoes : (h.repeticoes ? [h.repeticoes] : []);
          const loadsArr = Array.isArray(h.carga) ? h.carga : (h.carga ? [h.carga] : []);
          repsArr.forEach((r, idx) => {
            const rep = Number(r) || 0;
            const ld = Number(loadsArr[idx]) || 0;
            totalVolume += (rep * ld);
          });
        });

        let totalExecSec = 0;
        let totalRestSec = 0;
        historyData.forEach(h => {
          const execs = Array.isArray(h.tempo_execucao_segundos) ? h.tempo_execucao_segundos : (h.tempo_execucao_segundos ? [h.tempo_execucao_segundos] : []);
          const rests = Array.isArray(h.tempo_descanso_segundos) ? h.tempo_descanso_segundos : (h.tempo_descanso_segundos ? [h.tempo_descanso_segundos] : []);
          totalExecSec += execs.reduce((sum, s) => sum + (Number(s) || 0), 0);
          totalRestSec += rests.reduce((sum, s) => sum + (Number(s) || 0), 0);
        });

        let maxLoad = 0;
        historyData.forEach(h => {
          const loadsArr = Array.isArray(h.carga) ? h.carga : (h.carga ? [h.carga] : []);
          loadsArr.forEach(l => {
            const loadVal = Number(l) || 0;
            if (loadVal > maxLoad) {
              maxLoad = loadVal;
            }
          });
        });

        let maxExerciseVolume = 0;
        let maxVolumeExerciseName = "";
        historyData.forEach(h => {
          const repsArr = Array.isArray(h.repeticoes) ? h.repeticoes : (h.repeticoes ? [h.repeticoes] : []);
          const loadsArr = Array.isArray(h.carga) ? h.carga : (h.carga ? [h.carga] : []);
          const exerciseVolume = repsArr.reduce((sum, r, idx) => {
            const rep = Number(r) || 0;
            const ld = Number(loadsArr[idx]) || 0;
            return sum + (rep * ld);
          }, 0);

          let name = "Supino Reto";
          if (h.exercicio_id === "ex2") name = "Voador";

          if (exerciseVolume > maxExerciseVolume) {
            maxExerciseVolume = exerciseVolume;
            maxVolumeExerciseName = name;
          }
        });

        setSummaryData({
          duration: formattedDuration || "15 min",
          exerciseCount,
          totalSets,
          totalReps,
          totalVolume,
          totalExecSec,
          totalRestSec,
          maxLoad,
          maxVolumeExerciseName,
          maxExerciseVolume,
          loadingAsync: true,
          personalRecords: [],
          volumeComparison: null,
          weeklyDaysCount: 3,
          streak: 4
        });
        setShowSummary(true);

        setTimeout(() => {
          setSummaryData(prev => ({
            ...prev,
            loadingAsync: false,
            personalRecords: [
              { name: "Supino Reto", prevMax: 50, todayMax: maxLoad || 60 }
            ],
            volumeComparison: {
              prevVolume: 550,
              todayVolume: totalVolume,
              percentDiff: "31"
            },
            weeklyDaysCount: 3,
            streak: 4
          }));
        }, 1000);

        finishedRef.current = true;
        setSavingSession(false);
        return;
      }

      if (letra === "LIVRE") {
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("contador_treino_livre")
          .eq("id", user.id)
          .single();

        if (userError) throw userError;

        const novoContador = (userData.contador_treino_livre || 0) + 1;

        const { error: updateError } = await supabase
          .from("usuarios")
          .update({ contador_treino_livre: novoContador })
          .eq("id", user.id);

        if (updateError) throw updateError;

        displayLetra = `Livre ${novoContador}`;
      }

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
              user_id: user.id,
              exercicio_id: ex.exercicio_id,
              carga: exLoads,
              repeticoes: exReps,
              series_executadas: Math.max(
                execTimes.length,
                exLoads.length,
                exReps.length
              ),
              tempo_total_segundos: totalExec + totalRest,
              tempo_execucao_segundos: execTimes,
              tempo_descanso_segundos: rests,
              letra_treino: displayLetra,
              data_treino: workoutTimestamp,
              sessao_treino_id: state.sessaoTreinoId,
            });
          }
        });
      });

      if (historyData.length === 0) {
        localStorage.removeItem("active_training_session");
        finishedRef.current = true;
        showToast("Nenhum exercício registrado.", "info");
        navigate("/app");
        return;
      }

      const { error } = await supabase
        .from("historico_cargas")
        .insert(historyData);
      if (error) {
        throw error;
      } else {
        localStorage.removeItem("active_training_session");
        localStorage.removeItem("treino_em_andamento");
        finishedRef.current = true;
        showToast("Treino concluído!", "success");

        // 1. Duracao total do treino
        let totalSeconds = 0;
        historyData.forEach(h => {
          totalSeconds += Number(h.tempo_total_segundos) || 0;
        });
        const durationMin = Math.floor(totalSeconds / 60);
        const durationSec = totalSeconds % 60;
        const formattedDuration = `${durationMin} min${durationSec > 0 ? ` ${durationSec}s` : ""}`;

        // 2. Quantidade de exercicios realizados
        const exerciseCount = historyData.length;

        // 3. Total de series executadas
        const totalSets = historyData.reduce((acc, h) => acc + (Number(h.series_executadas) || 0), 0);

        // 4. Total de repeticoes
        let totalReps = 0;
        historyData.forEach(h => {
          const repsArr = Array.isArray(h.repeticoes) ? h.repeticoes : (h.repeticoes ? [h.repeticoes] : []);
          repsArr.forEach(r => {
            totalReps += (Number(r) || 0);
          });
        });

        // 5. Volume total de treino
        let totalVolume = 0;
        historyData.forEach(h => {
          const repsArr = Array.isArray(h.repeticoes) ? h.repeticoes : (h.repeticoes ? [h.repeticoes] : []);
          const loadsArr = Array.isArray(h.carga) ? h.carga : (h.carga ? [h.carga] : []);
          repsArr.forEach((r, idx) => {
            const rep = Number(r) || 0;
            const ld = Number(loadsArr[idx]) || 0;
            totalVolume += (rep * ld);
          });
        });

        // 6. Tempo total de execucao versus tempo total de descanso
        let totalExecSec = 0;
        let totalRestSec = 0;
        historyData.forEach(h => {
          const execs = Array.isArray(h.tempo_execucao_segundos) ? h.tempo_execucao_segundos : (h.tempo_execucao_segundos ? [h.tempo_execucao_segundos] : []);
          const rests = Array.isArray(h.tempo_descanso_segundos) ? h.tempo_descanso_segundos : (h.tempo_descanso_segundos ? [h.tempo_descanso_segundos] : []);
          totalExecSec += execs.reduce((sum, s) => sum + (Number(s) || 0), 0);
          totalRestSec += rests.reduce((sum, s) => sum + (Number(s) || 0), 0);
        });

        // 7. Carga maxima levantada no treino
        let maxLoad = 0;
        historyData.forEach(h => {
          const loadsArr = Array.isArray(h.carga) ? h.carga : (h.carga ? [h.carga] : []);
          loadsArr.forEach(l => {
            const loadVal = Number(l) || 0;
            if (loadVal > maxLoad) {
              maxLoad = loadVal;
            }
          });
        });

        // 8. Exercicio com maior volume
        let maxExerciseVolume = 0;
        let maxVolumeExerciseName = "";
        historyData.forEach(h => {
          const repsArr = Array.isArray(h.repeticoes) ? h.repeticoes : (h.repeticoes ? [h.repeticoes] : []);
          const loadsArr = Array.isArray(h.carga) ? h.carga : (h.carga ? [h.carga] : []);
          const exerciseVolume = repsArr.reduce((sum, r, idx) => {
            const rep = Number(r) || 0;
            const ld = Number(loadsArr[idx]) || 0;
            return sum + (rep * ld);
          }, 0);

          let name = "Exercício";
          state.originalBlocos.forEach(block => {
            const match = block.find(ex => ex.exercicio_id === h.exercicio_id);
            if (match && match.exercicios?.nome) {
              name = match.exercicios.nome;
            }
          });

          if (exerciseVolume > maxExerciseVolume) {
            maxExerciseVolume = exerciseVolume;
            maxVolumeExerciseName = name;
          }
        });

        setSummaryData({
          duration: formattedDuration,
          exerciseCount,
          totalSets,
          totalReps,
          totalVolume,
          totalExecSec,
          totalRestSec,
          maxLoad,
          maxVolumeExerciseName,
          maxExerciseVolume,
          loadingAsync: true,
          personalRecords: [],
          volumeComparison: null,
          weeklyDaysCount: 1,
          streak: 1
        });
        setShowSummary(true);

        // Fetch metrics 9 to 12 asynchronously
        const fetchAsyncSummaryMetrics = async () => {
          try {
            const exerciseIds = historyData.map(h => h.exercicio_id);

            // 9. Recorde pessoal
            const { data: prevLoads } = await supabase
              .from("historico_cargas")
              .select("exercicio_id, carga")
              .eq("user_id", user.id)
              .in("exercicio_id", exerciseIds)
              .lt("data_treino", workoutTimestamp);

            const maxPrevLoads = {};
            if (prevLoads) {
              prevLoads.forEach(row => {
                const arr = Array.isArray(row.carga) ? row.carga : (row.carga ? [row.carga] : []);
                arr.forEach(val => {
                  const num = Number(val) || 0;
                  if (!maxPrevLoads[row.exercicio_id] || num > maxPrevLoads[row.exercicio_id]) {
                    maxPrevLoads[row.exercicio_id] = num;
                  }
                });
              });
            }

            const todayMaxLoads = {};
            historyData.forEach(h => {
              const arr = Array.isArray(h.carga) ? h.carga : (h.carga ? [h.carga] : []);
              arr.forEach(val => {
                const num = Number(val) || 0;
                if (!todayMaxLoads[h.exercicio_id] || num > todayMaxLoads[h.exercicio_id]) {
                  todayMaxLoads[h.exercicio_id] = num;
                }
              });
            });

            const personalRecords = [];
            historyData.forEach(h => {
              const prevMax = maxPrevLoads[h.exercicio_id];
              const todayMax = todayMaxLoads[h.exercicio_id] || 0;
              if (prevMax !== undefined && todayMax > prevMax) {
                let name = "Exercício";
                state.originalBlocos.forEach(block => {
                  const match = block.find(ex => ex.exercicio_id === h.exercicio_id);
                  if (match && match.exercicios?.nome) {
                    name = match.exercicios.nome;
                  }
                });
                personalRecords.push({
                  name,
                  prevMax,
                  todayMax
                });
              }
            });

            // 10. Comparacao de volume com o treino anterior de mesma letra
            const { data: lastWorkoutWithLetter } = await supabase
              .from("historico_cargas")
              .select("sessao_treino_id, data_treino, carga, repeticoes")
              .eq("user_id", user.id)
              .eq("letra_treino", displayLetra)
              .lt("data_treino", workoutTimestamp)
              .order("data_treino", { ascending: false });

            let volumeComparison = null;
            if (lastWorkoutWithLetter && lastWorkoutWithLetter.length > 0) {
              const lastSessionId = lastWorkoutWithLetter[0].sessao_treino_id;
              const lastSessionRows = lastWorkoutWithLetter.filter(r => r.sessao_treino_id === lastSessionId);

              let prevVolume = 0;
              lastSessionRows.forEach(row => {
                const reps = Array.isArray(row.repeticoes) ? row.repeticoes : (row.repeticoes ? [row.repeticoes] : []);
                const loads = Array.isArray(row.carga) ? row.carga : (row.carga ? [row.carga] : []);
                reps.forEach((r, idx) => {
                  const rep = Number(r) || 0;
                  const ld = Number(loads[idx]) || 0;
                  prevVolume += (rep * ld);
                });
              });

              if (prevVolume > 0) {
                const percentDiff = ((totalVolume - prevVolume) / prevVolume) * 100;
                volumeComparison = {
                  prevVolume,
                  todayVolume: totalVolume,
                  percentDiff: percentDiff.toFixed(0)
                };
              }
            }

            // 11. Frequencia semanal
            const sevenDaysAgo = new Date(new Date(workoutTimestamp).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const { data: weeklyLoads } = await supabase
              .from("historico_cargas")
              .select("data_treino")
              .eq("user_id", user.id)
              .gte("data_treino", sevenDaysAgo);

            let weeklyDaysCount = 1;
            if (weeklyLoads) {
              const distinctDays = new Set(weeklyLoads.map(r => r.data_treino ? r.data_treino.split("T")[0] : null).filter(Boolean));
              distinctDays.add(workoutTimestamp.split("T")[0]);
              weeklyDaysCount = distinctDays.size;
            }

            // 12. Sequencia de dias consecutivos treinando (streak)
            const thirtyDaysAgo = new Date(new Date(workoutTimestamp).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const { data: streakLoads } = await supabase
              .from("historico_cargas")
              .select("data_treino")
              .eq("user_id", user.id)
              .gte("data_treino", thirtyDaysAgo)
              .order("data_treino", { ascending: false });

            let streak = 1;
            if (streakLoads) {
              const distinctDatesSet = new Set(streakLoads.map(r => r.data_treino ? r.data_treino.split("T")[0] : null).filter(Boolean));
              const todayStr = workoutTimestamp.split("T")[0];
              distinctDatesSet.add(todayStr);

              let currentCheck = new Date(todayStr);
              let count = 0;
              while (true) {
                const year = currentCheck.getFullYear();
                const month = String(currentCheck.getMonth() + 1).padStart(2, "0");
                const day = String(currentCheck.getDate()).padStart(2, "0");
                const checkStr = `${year}-${month}-${day}`;
                if (distinctDatesSet.has(checkStr)) {
                  count++;
                  currentCheck.setDate(currentCheck.getDate() - 1);
                } else {
                  break;
                }
              }
              streak = count;
            }

            setSummaryData(prev => ({
              ...prev,
              loadingAsync: false,
              personalRecords,
              volumeComparison,
              weeklyDaysCount,
              streak
            }));
          } catch (err) {
            console.error("Erro ao carregar dados adicionais:", err);
            setSummaryData(prev => ({
              ...prev,
              loadingAsync: false
            }));
          }
        };

        fetchAsyncSummaryMetrics();
      }
    } catch (error) {
      console.error("Erro ao salvar treino:", error);
      showToast("Erro ao salvar histórico: " + error.message, "error");
    } finally {
      setSavingSession(false);
    }
  }, [user?.id, letra, isPremium, showToast, state.originalBlocos, state.cargas, state.exerciseTimes, state.restTimes, state.exerciseLoads, state.exerciseReps, state.sessaoTreinoId, navigate]);

  // 1. Hook de Busca de Dados - Depende apenas da função memoizada
  useEffect(() => {
    const t = setTimeout(() => fetchData(), 0);
    return () => clearTimeout(t);
  }, [fetchData]);

  // 2. Hook do Painel de Diagnóstico - Monitora o estado de carregamento
  useEffect(() => {
    if (!loading) {
      setShowDiagnostic(false);
      return;
    }

    const diagnosticTimer = setTimeout(() => {
      setShowDiagnostic(true);
    }, 3000);

    return () => clearTimeout(diagnosticTimer);
  }, [loading]);


  useEffect(() => {
    if (showSaveAsModal) {
      const t = setTimeout(() => fetchWorkoutDetails(), 0);
      return () => clearTimeout(t);
    }
  }, [showSaveAsModal, fetchWorkoutDetails]);

  useEffect(() => {
    if (showSummary || finishedRef.current) return;
    if (!loading && state.blocos.length > 0) {
      localStorage.setItem(
        "active_training_session",
        JSON.stringify({ ...state, letra, user_id: user.id }),
      );
    }
  }, [state, loading, letra, showSummary]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (showSummary || finishedRef.current) return;
      if (document.visibilityState === "hidden" && state.blocos.length > 0) {
        localStorage.setItem(
          "active_training_session",
          JSON.stringify({ ...state, letra, user_id: user.id }),
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [state, letra, showSummary]);

  useEffect(() => {
    if (showSummary) return;
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
    if (showSummary) return;
    const hasActiveTimers =
      state.isTimerActive || Object.keys(state.activeRestTimers).length > 0;
    if (!hasActiveTimers) return;

    const interval = setInterval(() => {
      dispatch({ type: "TICK" });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.isTimerActive, state.activeRestTimers, showSummary]);

  const prevExerciseRef = useRef({
    blockIndex: state.currentBlockIndex,
    exerciseIndex: state.currentExerciseInBlock,
  });

  useEffect(() => {
    if (loading || state.blocos.length === 0) return;

    if (!initialScrollDone.current) {
      if (isFromHomeRef.current) {
        // Did just open coming from home screen, so do not scroll to the active card.
        // We keep scroll at the top. We just mark initialScrollDone as true so subsequent actions work.
        initialScrollDone.current = true;
      } else {
        const timer = setTimeout(() => {
          const activeCard = document.getElementById("active-exercise");
          if (activeCard) {
            activeCard.scrollIntoView({ behavior: 'instant', block: 'center' });
            initialScrollDone.current = true;
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    } else {
      // Subsequent changes in active/selected exercise (only in guided mode)
      const currentBlockIdx = state.currentBlockIndex;
      const currentExIdx = state.currentExerciseInBlock;
      const prevBlockIdx = prevExerciseRef.current.blockIndex;
      const prevExIdx = prevExerciseRef.current.exerciseIndex;

      if (currentBlockIdx !== prevBlockIdx || currentExIdx !== prevExIdx) {
        if (state.trainingMode === "guided") {
          const timer = setTimeout(() => {
            const activeCard = document.getElementById("active-exercise");
            if (activeCard) {
              activeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
          prevExerciseRef.current = { blockIndex: currentBlockIdx, exerciseIndex: currentExIdx };
          return () => clearTimeout(timer);
        } else {
          // Just update ref so we don't scroll when switching modes or other actions
          prevExerciseRef.current = { blockIndex: currentBlockIdx, exerciseIndex: currentExIdx };
        }
      }
    }
  }, [
    loading,
    state.currentBlockIndex,
    state.currentExerciseInBlock,
    state.blocos.length,
    state.trainingMode,
  ]);

  // Click-outside and Scroll-to-close logic
  useEffect(() => {
    const handleScroll = () => {
      if (showPageMenu) setShowPageMenu(false);
      if (openMenuExId) setOpenMenuExId(null);
      if (openSeriesMenuExId) setOpenSeriesMenuExId(null);
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (container) container.removeEventListener("scroll", handleScroll);
    };
  }, [showPageMenu, openMenuExId, openSeriesMenuExId]);



  const handleSaveAs = async () => {
    if (profile?.is_demo) {
      showToast("Esta é uma conta de demonstração. Crie uma conta real para gerenciar seus treinos!", "info");
      setShowSaveAsModal(false);
      return;
    }
    if (!saveAsData.letra) {
      showToast("Por favor, informe a letra do treino.", "info");
      return;
    }

    setSavingSession(true);
    try {
      const targetLetra = saveAsData.letra.toUpperCase();
      // 1. Check if training already exists (multitenancy aware)
      const { data: existing } = await supabase
        .from("treinos")
        .select("id")
        .eq("user_id", user.id)
        .eq("letra", targetLetra)
        .maybeSingle();

      if (existing) {
        setConfirmationModal({
          isOpen: true,
          title: "Sobrescrever Treino?",
          message: `O treino ${targetLetra} já existe. Deseja sobrescrevê-lo?`,
          confirmText: "Sim, Sobrescrever",
          variant: "warning",
          onConfirm: async () => {
            // Delete existing blocks if overwriting
            await supabase
              .from("blocos_treino")
              .delete()
              .eq("user_id", user.id)
              .eq("letra_treino", targetLetra);

            // Update the training entry
            const { error: updateError } = await supabase
              .from("treinos")
              .update({
                nome: saveAsData.nome,
                subtitulo: saveAsData.subtitulo
              })
              .eq("id", existing.id);
            if (updateError) throw updateError;

            await performSaveBlocks(targetLetra);
          }
        });
        setSavingSession(false);
        return;
      } else {
        // Create the training entry if it doesn't exist
        const { error: insertError } = await supabase
          .from("treinos")
          .insert([{
            user_id: user.id,
            letra: targetLetra,
            nome: saveAsData.nome || `Treino ${targetLetra}`,
            subtitulo: saveAsData.subtitulo || "Treino personalizado"
          }]);
        if (insertError) throw insertError;

        await performSaveBlocks(targetLetra);
      }
    } catch (err) {
      showToast("Erro ao salvar: " + err.message, "error");
      setSavingSession(false);
    }
  };

  const performSaveBlocks = async (targetLetra) => {
    const newBlocks = [];
    state.blocos.forEach((block, bIdx) => {
      block.forEach((ex, eIdx) => {
        newBlocks.push({
          user_id: user.id,
          letra_treino: targetLetra,
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

    showToast(`Treino salvo como ${targetLetra}!`, "success");
    setShowSaveAsModal(false);
    setSavingSession(false);
  };

  const handleDiscardTraining = () => {
    setConfirmationModal({
      isOpen: true,
      title: "Descartar Treino?",
      message: "Tem certeza? Todo o progresso desta sessão será perdido.",
      confirmText: "Descartar",
      variant: "danger",
      onConfirm: () => {
        localStorage.removeItem("active_training_session");
        navigate("/app");
        showToast("Treino descartado.", "info");
      }
    });
  };

  const handleGoBack = () => {
    navigate("/app");
  };

  const promptFinishWorkout = () => {
    setConfirmationModal({
      isOpen: true,
      title: "Finalizar Treino?",
      message: "Deseja finalizar a sessão e salvar o histórico?",
      confirmText: "Sim, Finalizar",
      variant: "success",
      onConfirm: finishWorkout
    });
  };

  useEffect(() => {
    if (state.status === "COMPLETED") {
      setShowInterstitial(false); // Limpa manipuladores de anúncios para evitar chamadas acidentais no encerramento do treino
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
          setTimeout(() => finishWorkout(), 0);
        }
      } else {
        setTimeout(() => finishWorkout(), 0);
      }
    }
  }, [state.status, state.isCatchupPhase, state.originalBlocos, state.exerciseTimes, finishWorkout]);

  if (globalError) {
    return (
      <div className="fixed inset-0 z-[9999] bg-red-600 text-white p-6 overflow-auto font-mono text-xs flex flex-col items-center justify-center text-center">
        <AlertTriangle size={48} className="mb-4" />
        <h1 className="text-lg font-black mb-4 uppercase">Erro Crítico (Mobile Diagnostic)</h1>
        <div className="bg-black/20 p-4 rounded-xl border border-white/20 mb-6 w-full text-left">
          {globalError}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-4 bg-white text-red-600 rounded-2xl font-black uppercase shadow-xl active:scale-95 transition-all"
        >
          Recarregar App
        </button>
      </div>
    );
  }

  if (isTimeout) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#121212] flex flex-col items-center justify-center p-8 text-center">
        <Clock size={64} className="text-amber-500 mb-6 animate-pulse" />
        <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">O servidor demorou a responder</h2>
        <p className="text-slate-400 mb-8 text-sm">A conexão parece lenta ou instável no momento.</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => fetchData()}
            className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            Tentar Novamente
          </button>
          <button
            onClick={() => navigate("/app")}
            className="w-full py-4 bg-white/5 text-slate-400 rounded-2xl font-bold active:scale-95 transition-all"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  if (!isFreeTraining && !state.blocos.length && !loading)
    return (
      <div className="p-10 text-center text-slate-500">
        Nenhum exercício encontrado.{" "}
        <Link to="/app" className="underline">
          Voltar
        </Link>
      </div>
    );


  const dismissRestTimer = (sessionId) => dispatch({ type: "DISMISS_REST", sessionId });

  const handleInspectCache = () => {
    let output = "=== LOCAL CACHE INSPECTION ===\n\n";
    const targetKeys = ["active_training_session", "treino_em_andamento"];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("sb-") || targetKeys.includes(key))) {
        const val = localStorage.getItem(key);
        output += `[${key}]:\n${val}\n\n`;
      }
    }

    if (output === "=== LOCAL CACHE INSPECTION ===\n\n") {
      output += "No relevant keys found in localStorage.";
    }

    setInspectedData(output);
  };

  const handleForceClear = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <PageTransition bgClass="bg-slate-900">
      {loading ? (
        <div className="min-h-screen w-full bg-slate-900 p-4 flex flex-col gap-4">
          <div className="w-full h-16 bg-white/10 rounded-2xl animate-pulse" />
          <div className="w-full h-32 bg-white/10 rounded-3xl animate-pulse" />
          <div className="w-full h-32 bg-white/10 rounded-3xl animate-pulse" />
          <div className="w-full h-32 bg-white/10 rounded-3xl animate-pulse" />

          {showDiagnostic && (
            <div className="fixed bottom-10 left-0 right-0 z-[110] p-6 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-500">
              <div className="flex gap-3">
                <button
                  onClick={handleInspectCache}
                  className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg active:scale-95 transition-all"
                >
                  Inspecionar Cache Local
                </button>
                <button
                  onClick={handleForceClear}
                  className="px-4 py-2 bg-red-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg active:scale-95 transition-all"
                >
                  Forçar Limpeza e Desconectar
                </button>
              </div>
              {inspectedData && (
                <textarea
                  readOnly
                  value={inspectedData}
                  className="w-full max-w-md h-40 bg-black/80 border border-white/20 rounded-xl p-4 text-[9px] font-mono text-emerald-400 outline-none"
                />
              )}
            </div>
          )}
        </div>
      ) : showSummary && summaryData ? (
        <div className="fixed inset-0 w-full bg-[#0a0f1d] text-white flex flex-col p-6 overflow-y-auto select-none z-[120]">
          <div className="w-full max-w-md mx-auto space-y-6 flex-grow pb-12">
            {/* Header */}
            <div className="flex flex-col items-center text-center pt-4 space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 size={36} />
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-white">
                Treino Concluído!
              </h1>
              <p className="text-slate-400 text-xs px-4">
                Excelente trabalho! Veja abaixo os números da sua sessão de hoje.
              </p>
            </div>

            {/* Grid de Métricas Principais (1 a 8) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Duração */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between min-h-[90px]">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Clock size={16} className="text-slate-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Duração</span>
                </div>
                <span className="text-lg font-black text-white">{summaryData.duration}</span>
              </div>

              {/* Exercícios */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between min-h-[90px]">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Dumbbell size={16} className="text-slate-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Exercícios</span>
                </div>
                <span className="text-lg font-black text-white">{summaryData.exerciseCount}</span>
              </div>

              {/* Séries */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between min-h-[90px]">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Layers size={16} className="text-slate-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Séries</span>
                </div>
                <span className="text-lg font-black text-white">{summaryData.totalSets}</span>
              </div>

              {/* Repetições */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between min-h-[90px]">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <RotateCcw size={16} className="text-slate-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Repetições</span>
                </div>
                <span className="text-lg font-black text-white">{summaryData.totalReps}</span>
              </div>

              {/* Volume */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between min-h-[90px]">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Flame size={16} className="text-slate-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Volume Total</span>
                </div>
                <span className="text-lg font-black text-white">{summaryData.totalVolume} kg</span>
              </div>

              {/* Carga Máxima */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between min-h-[90px]">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <ArrowUp size={16} className="text-slate-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Carga Máxima</span>
                </div>
                <span className="text-lg font-black text-white">{summaryData.maxLoad} kg</span>
              </div>
            </div>

            {/* Exercício com Maior Volume e Proporção Exec/Desc */}
            <div className="space-y-3">
              {summaryData.maxVolumeExerciseName && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Exercício de Maior Volume
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-bold text-white line-clamp-1">{summaryData.maxVolumeExerciseName}</span>
                    <span className="text-xs font-black text-emerald-400 ml-2 shrink-0">{summaryData.maxExerciseVolume} kg</span>
                  </div>
                </div>
              )}

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  Execução vs Descanso
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <div>Execução: <span className="text-white">{Math.floor(summaryData.totalExecSec / 60)}m {summaryData.totalExecSec % 60}s</span></div>
                  <div className="border-r border-white/10 mx-2" />
                  <div>Descanso: <span className="text-white">{Math.floor(summaryData.totalRestSec / 60)}m {summaryData.totalRestSec % 60}s</span></div>
                </div>
              </div>
            </div>

            {/* Seção de Métricas de Histórico (9 a 12) */}
            <div className="border-t border-white/5 pt-4 space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Conquistas e Histórico
              </h3>

              {summaryData.loadingAsync ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-center gap-3 text-xs text-slate-400 min-h-[60px]">
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                  <span>Analisando histórico e recordes pessoais...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {/* Frequência Semanal */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Frequência Semanal
                    </div>
                    <span className="text-sm font-black text-white">
                      📅 {summaryData.weeklyDaysCount} {summaryData.weeklyDaysCount === 1 ? "dia" : "dias"} / 7
                    </span>
                  </div>

                  {/* Streak */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Sequência (Streak)
                    </div>
                    <span className="text-sm font-black text-white">
                      🔥 {summaryData.streak} {summaryData.streak === 1 ? "dia" : "dias"}
                    </span>
                  </div>

                  {/* Comparação de Volume */}
                  {summaryData.volumeComparison && (
                    <div className="col-span-2 bg-white/5 border border-white/10 rounded-2xl p-4">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Comparação de Volume
                      </div>
                      <div className="text-sm font-bold text-white">
                        Volume{" "}
                        <span className={Number(summaryData.volumeComparison.percentDiff) >= 0 ? "text-emerald-400 font-black" : "text-amber-400 font-black"}>
                          {Number(summaryData.volumeComparison.percentDiff) >= 0 ? "+" : ""}
                          {summaryData.volumeComparison.percentDiff}%
                        </span>{" "}
                        em relação ao último treino {letra !== "LIVRE" ? letra : ""}
                      </div>
                    </div>
                  )}

                  {/* Recordes Pessoais */}
                  {summaryData.personalRecords && summaryData.personalRecords.length > 0 && (
                    <div className="col-span-2 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
                      <div className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                        ⭐️ Novos Recordes Pessoais!
                      </div>
                      <div className="space-y-1">
                        {summaryData.personalRecords.map((rec, idx) => (
                          <div key={idx} className="text-xs font-bold text-slate-200">
                            Novo recorde no <span className="text-white">{rec.name}</span>:{" "}
                            <span className="text-emerald-400 font-black">{rec.todayMax} kg</span> (anterior: {rec.prevMax} kg)
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Banner de Anúncio maior na tela de resumo */}
            <div className="w-full flex justify-center py-2">
              <AdBanner isPremium={isPremiumUser} variant="inline" />
            </div>

            {/* CTA Button */}
            <div className="pt-2 pb-6">
              <button
                onClick={() => {
                  dispatch({ type: "CLEAR_SESSION" });
                  navigate("/app");
                }}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
              >
                Concluir e Voltar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col transition-colors duration-700 text-white overflow-hidden"
          style={{
            color: metronomeActive ? "var(--text-on-secondary)" : "inherit",
            backgroundColor: "var(--bg-treino)",
            height: 'var(--app-height, 100dvh)',
          }}
        >
        <header className="flex justify-between items-center py-3 px-6 max-w-md mx-auto w-full">
        <div className="flex gap-2">
          <button
            onClick={handleGoBack}
            className="p-2 bg-white/5 rounded-xl opacity-50 hover:opacity-100 transition"
          >
            <ChevronLeft />
          </button>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
             <span
              className="text-[10px] uppercase font-black tracking-[0.2em]"
              style={{ color: "var(--color-primary-safe)" }}
            >
              {state.isCatchupPhase ? "REPESCAGEM" : `Sessão de Treino`}{" "}
            </span>
            <div className="h-1 w-1 rounded-full bg-white/20" />
            <div className="flex bg-white/5 rounded-full p-0.5 border border-white/10 relative">
              <button
                onClick={() => dispatch({ type: "SET_TRAINING_MODE", payload: "guided" })}
                className={`relative z-10 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter transition-all duration-300 ${state.trainingMode === "guided" ? "text-white" : "text-white/30"}`}
              >
                Guiado
                {state.trainingMode === "guided" && (
                  <motion.div
                    layoutId="activeMode"
                    className="absolute inset-0 bg-white/10 rounded-full -z-10 shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
              <button
                onClick={() => dispatch({ type: "SET_TRAINING_MODE", payload: "manual" })}
                className={`relative z-10 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter transition-all duration-300 ${state.trainingMode === "manual" ? "text-amber-500" : "text-white/30"}`}
              >
                Manual
                {state.trainingMode === "manual" && (
                  <motion.div
                    layoutId="activeMode"
                    className="absolute inset-0 bg-amber-500/10 rounded-full -z-10 shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            </div>
          </div>
          <span className="font-bold text-lg text-white uppercase tracking-tighter">
            {isFreeTraining ? "Treino Livre" : `Treino ${letra}`}
          </span>
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPageMenu(!showPageMenu);
            }}
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
                { label: 'Finalizar Treino', icon: <CheckCircle2 size={14} />, onClick: promptFinishWorkout },
                { label: 'Descartar Treino', icon: <Trash2 size={14} />, onClick: handleDiscardTraining },
                { label: 'Salvar como Novo', icon: <PlusCircle size={14} />, onClick: () => setShowSaveAsModal(true) },
                { label: 'Gerenciar treinos', icon: <Layers size={14} />, onClick: () => navigate('/gerenciar-treinos') },
              ].filter(opt => !opt.hidden).map((opt, i) => (
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
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-6 pt-0 relative"
        onClick={() => {
          setOpenMenuExId(null);
          setOpenSeriesMenuExId(null);
          setShowPageMenu(false);
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
                          : doneCount;

                    const baseThemeColor = eIdx % 2 === 0 ? settings.color_ex_a : settings.color_ex_b;
                    const safeThemeColor = getSafeColor(baseThemeColor, settings.bg_treino);
                    const activeColor = eIdx % 2 === 0 ? "var(--color-primary)" : "var(--color-secondary)";
                    const textOnActive = getContrastColor(safeThemeColor);
                    const isStarted = doneCount > 0;
                    const isAbandoned = bIdx < state.currentBlockIndex && !isDone;
                    const isManual = state.trainingMode === "manual";
                    const isGuided = state.trainingMode === "guided";
                    const shouldExpand = isManual ? true : (isGuided && (isCurrent || isStarted));

                    return (
                      <SwipeableExerciseCard
                        key={`${bIdx}_${eIdx}`}
                        isCurrent={isCurrent}
                        isDone={isDone}
                        isFirst={bIdx === 0 && eIdx === 0}
                        onSwipeRight={() => dispatch({ type: "COMPLETE_EXERCISE_MANUAL", payload: { sessionId } })}
                        onSwipeLeft={() => dispatch({ type: "SKIP_EXERCISE", payload: { sessionId } })}
                        isEnabled={state.trainingMode === "manual"}
                        style={{
                          zIndex: state.trainingMode === "manual" && openMenuExId === sessionId ? 50 : undefined
                        }}
                      >
                      <div
                        id={isCurrent ? "active-exercise" : undefined}
                        className={`relative rounded-2xl border transition-all duration-300 ${shouldExpand ? "p-4 scale-[1.02]" : "p-2.5 py-2 cursor-pointer"}`}
                        style={{
                          backgroundColor: shouldExpand
                            ? (isCurrent && isGuided ? activeColor : isManual ? (isCurrent ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.05)") : `${activeColor}20`)
                            : isAbandoned
                              ? "rgba(239, 68, 68, 0.15)"
                              : (isSkipped && !isCurrent)
                                ? "rgba(239, 68, 68, 0.15)"
                                : isDone
                                  ? "rgba(16, 185, 129, 0.1)"
                                  : "rgba(255, 255, 255, 0.05)",
                          color: shouldExpand && isCurrent && isGuided
                            ? textOnActive
                            : (isSkipped && !isCurrent) || isAbandoned
                              ? "#fca5a5"
                              : "white",
                          borderColor: shouldExpand
                            ? isManual ? (isCurrent ? safeThemeColor : "rgba(255, 255, 255, 0.1)") : "transparent"
                            : (isSkipped && !isCurrent) || isAbandoned
                              ? "rgba(239, 68, 68, 0.6)"
                              : isDone
                                ? "#10b98140"
                                : "rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        {!isCurrent && (
                          <div
                            className="absolute inset-0 z-50 bg-transparent cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch({
                                type: "MANUAL_OVERRIDE",
                                bIdx,
                                eIdx,
                                sNum: null,
                              });
                            }}
                          />
                        )}
                  <div className="flex justify-between items-center relative">
                    {/* Discoverability Chevrons */}
                    {!shouldExpand && !isDone && (
                      <>
                        <div className="absolute -left-1 opacity-20 text-[10px] font-black animate-pulse">»»</div>
                        <div className="absolute -right-1 opacity-20 text-[10px] font-black animate-pulse">««</div>
                      </>
                    )}
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-lg flex items-center justify-center transition-all ${shouldExpand && isCurrent ? "w-8 h-8 bg-black/10" : isAbandoned ? "bg-red-500/20 text-red-400 w-8 h-8" : isDone ? "w-8 h-8 bg-white/5 text-white/40" : (isSkipped && !isCurrent) ? "w-8 h-8 bg-red-500/20 text-red-400" : "w-6 h-6 bg-white/5 text-white/40"}`}
                      >
                        {(isSkipped && !isCurrent) ? (
                          <CircleX size={!isStarted && !isCurrent && !isSkipped ? 12 : 16} />
                        ) : isAbandoned ? (
                          <AlertTriangle size={16} />
                        ) : isDone ? (
                          <CheckCircle2 size={16} className={shouldExpand && isCurrent ? "" : "text-emerald-500"} />
                        ) : (
                          <Dumbbell size={12} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <p className={`font-bold leading-tight ${shouldExpand && isCurrent ? "text-inherit text-sm" : (isSkipped && !isCurrent) ? "text-red-300 text-sm" : "text-white text-xs"}`}>
                            {ex.exercicios.nome}
                          </p>
                        </div>
                        {!shouldExpand && (
                          <div className="flex gap-3 items-center">
                            <p className={`font-medium ${(isSkipped && !isCurrent) ? "text-red-400/80" : "opacity-60"} text-[9px]`}>
                              Séries: {currentExSerie}/{ex.series_alvo}
                            </p>
                            {(state.cargas[sessionId] > 0 || !isStarted) && (
                              <span className={`font-black flex items-center gap-1 ${(isSkipped && !isCurrent) ? "text-red-400" : "opacity-80"} text-[9px]`}>
                                <Dumbbell size={9} />{" "}
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
                        className={`p-2 rounded-lg transition ${isCurrent ? "hover:bg-black/10" : "hover:bg-white/10"}`}
                      >
                        <MoreVertical size={16} className={isCurrent ? "text-inherit" : "text-white/40"} />
                      </button>
                      {openMenuExId === ex.sessionId && (
                        <div
                          className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-100 p-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              dispatch({ type: "MOVE_EXERCISE", bIdx, eIdx, direction: -1 });
                              setOpenMenuExId(null);
                            }}
                            disabled={eIdx === 0}
                            className="w-full p-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-white/5 disabled:opacity-20 flex items-center gap-3 text-white transition-colors"
                          >
                            <ArrowUp size={14} className="text-white/40" /> Mover para cima
                          </button>

                          <button
                            onClick={() => {
                              dispatch({ type: "MOVE_EXERCISE", bIdx, eIdx, direction: 1 });
                              setOpenMenuExId(null);
                            }}
                            disabled={eIdx === block.length - 1}
                            className="w-full p-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-white/5 disabled:opacity-20 flex items-center gap-3 text-white transition-colors"
                          >
                            <ArrowDown size={14} className="text-white/40" /> Mover para baixo
                          </button>

                          <div className="h-px bg-white/5 my-1" />

                          <button
                            onClick={() => {
                              dispatch({ type: "MOVE_TO_BLOCK", bIdx, eIdx, direction: -1 });
                              setOpenMenuExId(null);
                              showToast("Exercício movido para o bloco acima", "info");
                            }}
                            className="w-full p-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-white/5 flex items-center gap-3 text-white transition-colors"
                          >
                            <Layers size={14} className="text-white/40 rotate-180" /> Mover para bloco acima
                          </button>

                          <button
                            onClick={() => {
                              dispatch({ type: "MOVE_TO_BLOCK", bIdx, eIdx, direction: 1 });
                              setOpenMenuExId(null);
                              showToast("Exercício movido para o bloco abaixo", "info");
                            }}
                            className="w-full p-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-white/5 flex items-center gap-3 text-white transition-colors"
                          >
                            <Layers size={14} className="text-white/40" /> Mover para bloco abaixo
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

                  {shouldExpand ? (
                    <div className={`mt-4 space-y-3 transition-all duration-500 ${shouldExpand && isCurrent && isGuided ? "animate-in fade-in slide-in-from-top-4" : ""}`}>
                      {isCurrent && isGuided && (
                        <>
                      {/* Integrated Timer */}
                      <div
                        className={`rounded-2xl p-3 flex items-center justify-between transition-all ${state.isTimerActive ? "bg-black/20 ring-1 ring-white/20" : "bg-black/10"}`}
                      >
                        <div className="flex flex-col">
                          <p className="text-[10px] font-bold uppercase mb-1 opacity-70">Tempo de Execução</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-mono font-black">{formatTime(state.timer)}</p>
                            {lastExecutionTimes[ex.exercicio_id] > 0 && (
                              <span className="text-[10px] font-bold opacity-50">
                                Ref: {formatTime(lastExecutionTimes[ex.exercicio_id])}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); dispatch({ type: "RESET_TIMER" }); }}
                            className="p-2 opacity-40 hover:opacity-100 transition"
                          >
                            <RotateCcw size={16} />
                          </button>
                          <div className="flex flex-col items-center gap-2">
                            {!state.isTimerActive && state.timer === 0 ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dispatch({ type: "START_SERIES", sessionId: sessionId });
                                }}
                                className="w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-lg active:scale-95 transition-transform"
                              >
                                <Play fill="black" size={20} className="ml-1" />
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
                                className="w-12 h-12 rounded-full flex items-center justify-center bg-black/20 active:scale-95 transition-transform"
                              >
                                <Square fill="currentColor" size={18} />
                              </button>
                            ) : (
                               <div className="w-12 h-12" /> // Placeholder to maintain spacing if timer is stopped but not zero
                            )}

                            {/* Relocated Metronome Player */}
                            <div
                              className={`flex items-center gap-1.5 p-1 px-2 rounded-lg border transition-all ${metronomeActive ? "bg-black/20 border-current/20" : "bg-black/5 border-transparent opacity-40 hover:opacity-100"}`}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMetronomeActive(!metronomeActive);
                                }}
                                className="hover:scale-110 transition"
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
                                  className="bg-transparent w-6 text-center text-[10px] font-black outline-none placeholder:text-inherit"
                                />
                                <span className="text-[7px] font-black opacity-70">BPM</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Integrated Inputs */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-black/20 p-3 rounded-2xl">
                          <label className="text-[10px] font-bold opacity-70 uppercase block mb-1">Carga (kg)</label>
                          <input
                            type="number"
                            value={state.cargas[sessionId] ?? ""}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => dispatch({ type: "SET_VALUE", fieldType: "currentCarga", sessionId: sessionId, val: e.target.value })}
                            className="bg-transparent text-2xl font-mono font-bold outline-none w-full placeholder:text-inherit"
                          />
                        </div>
                        <div className="bg-black/20 p-3 rounded-2xl">
                          <label className="text-[10px] font-bold opacity-70 uppercase block mb-1">Reps ({ex.reps_alvo})</label>
                          <input
                            type="number"
                            value={state.repsFeitas[sessionId] ?? ""}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => dispatch({ type: "SET_VALUE", fieldType: "currentReps", sessionId: sessionId, val: e.target.value })}
                            className="bg-transparent text-2xl font-mono font-bold outline-none w-full placeholder:text-inherit"
                          />
                        </div>
                      </div>

                      {/* Integrated Action Button */}
                      {!state.isTimerActive && state.timer > 0 && isGuided && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch({ type: "ADVANCE_STEP", payload: { currentBlock: state.blocos[state.currentBlockIndex] } });
                          }}
                          disabled={savingSession}
                          className="w-full py-3 rounded-2xl font-black text-lg flex items-center justify-center gap-3 bg-white shadow-lg active:scale-95 transition-all"
                          style={{ color: activeColor }}
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

                        </>
                      )}

                      {(!isCurrent && isStarted) && (
                        <div className="h-px bg-white/5 my-2" />
                      )}

                      <div className={`${isCurrent && isGuided ? "mt-6 pt-6" : ""} border-transparent`}>
                        {isCurrent && isGuided && (
                        <div className="flex justify-between items-center w-full mb-2">
                          <p className="text-xs uppercase tracking-wider font-semibold opacity-70 text-inherit">SÉRIES</p>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenSeriesMenuExId(openSeriesMenuExId === sessionId ? null : sessionId);
                              }}
                              className={`p-1 rounded-md opacity-40 hover:opacity-100 transition ${isCurrent ? "hover:bg-black/10" : "hover:bg-white/10"}`}
                            >
                              <MoreHorizontal size={14} className="text-inherit" />
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
                        )}
                        <div className={`flex overflow-x-auto gap-2 max-w-full scrollbar-none ${isCurrent ? "py-3 px-2" : "py-1"}`}>
                          {[...Array(ex.series_alvo)].map((_, sessionIdx) => {
                            const sNum = sessionIdx + 1;
                            const execTime =
                              state.exerciseTimes[sessionId]?.[sessionIdx];
                            const restTime = state.restTimes[sessionId]?.[sessionIdx];
                            const load = state.exerciseLoads[sessionId]?.[sessionIdx];
                            const reps = state.exerciseReps[sessionId]?.[sessionIdx];
                            const persistedActiveSNum = state.activeSeriesMap[sessionId] || 1;
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
                                  isCurrentS && isCurrent
                                    ? "scale-[1.08] z-20 shadow-xl"
                                    : isSkipped
                                      ? isExecuted
                                        ? "bg-red-950/60 border-red-500/10"
                                        : isNextPending
                                          ? "bg-red-500/10 border-red-500/40"
                                          : "bg-red-950/20 border-transparent"
                                      : isExecuted
                                        ? "bg-white/5 border-white/10"
                                        : "bg-white/5 border-white/10"
                                }`}
                                style={{
                                  backgroundColor: isCurrentS && isCurrent ? "rgba(0,0,0,0.3)" : undefined,
                                  borderWidth: isCurrentS && isCurrent ? "2px" : "1px",
                                  borderColor: isCurrentS && isCurrent
                                      ? safeThemeColor // Cenário B: Série Ativa
                                    : (isExecuted || sNum < persistedActiveSNum)
                                      ? "rgba(255, 255, 255, 0.7)" // Cenário A: Séries Anteriores ou Concluídas (Persistido)
                                    : (isCurrent && sNum > state.currentSerie)
                                      ? "rgba(255, 255, 255, 0.1)" // Cenário C: Séries Futuras
                                    : "rgba(255, 255, 255, 0.1)", // Pendentes fora de foco
                                  boxShadow: isCurrentS && isCurrent ? `inset 0 0 0 1px white` : undefined
                                }}
                              >
                                <button
                                  onClick={() => {
                                    if (isCurrentS && isCurrent) {
                                      dispatch({ type: "UNDO_SERIES", sessionId });
                                    } else {
                                      dispatch({
                                        type: "MANUAL_OVERRIDE",
                                        bIdx,
                                        eIdx,
                                        sNum,
                                      });
                                    }
                                  }}
                                  className={`font-black text-[9px] uppercase mb-2 px-2 py-1 rounded-md transition-all`}
                                  style={{
                                    backgroundColor:
                                      (isCurrentS && isCurrent) || (isNextPending && isGuided)
                                        ? safeThemeColor
                                        : isCurrent
                                          ? textOnActive === "#FFFFFF"
                                            ? "rgba(255, 255, 255, 0.1)"
                                            : "rgba(0, 0, 0, 0.1)"
                                          : isManual
                                            ? `color-mix(in srgb, ${safeThemeColor} 15%, black)`
                                            : `${safeThemeColor}30`,
                                    color:
                                      (isCurrentS && isCurrent) || (isNextPending && isGuided)
                                        ? getContrastColor(safeThemeColor)
                                        : isCurrent
                                          ? textOnActive
                                          : safeThemeColor,
                                    opacity: isManual || isCurrentS || isNextPending ? 1 : 0.9,
                                  }}
                                >
                                  {sNum}
                                </button>
                                <div
                                  className={`flex flex-col items-center gap-1 mb-2`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center gap-0.5">
                                    {(isGuided && isCurrent) || isManual ? (
                                    <input
                                      type="number"
                                      value={load ?? state.historyLoads[sessionId]?.[sessionIdx] ?? state.cargas[sessionId] ?? ""}
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
                                      onBlur={() => dispatch({ type: "CONFIRM_SERIES_EDIT", sessionId, sessionIdx })}
                                      className={`bg-transparent w-8 text-center font-mono font-black text-[11px] outline-none placeholder:opacity-20 transition-colors ${(load !== undefined && load !== null && load !== "") ? "text-white" : "opacity-40"}`}
                                    />
                                    ) : (
                                      <span className={`font-mono font-black text-[11px] ${load || state.historyLoads[sessionId]?.[sessionIdx] ? "" : "opacity-20"}`}>
                                        {load ?? state.historyLoads[sessionId]?.[sessionIdx] ?? "-"}
                                      </span>
                                    )}
                                    <span className={`text-[8px] font-bold opacity-40 ${(isGuided && isCurrent) || isManual ? "text-inherit" : isSkipped ? "text-red-300" : "text-white"}`}>
                                      kg
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-0.5">
                                    {(isGuided && isCurrent) || isManual ? (
                                    <input
                                      type="number"
                                      value={reps ?? state.historyReps[sessionId]?.[sessionIdx] ?? (ex.reps_alvo.includes("-") ? ex.reps_alvo.split("-")[1] : ex.reps_alvo)}
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
                                      onBlur={() => dispatch({ type: "CONFIRM_SERIES_EDIT", sessionId, sessionIdx })}
                                      className={`bg-transparent w-6 text-center font-bold text-[10px] outline-none placeholder:opacity-20 transition-colors ${(reps !== undefined && reps !== null && reps !== "") ? "text-white" : "opacity-40"}`}
                                    />
                                    ) : (
                                      <span className={`font-bold text-[10px] ${reps || state.historyReps[sessionId]?.[sessionIdx] ? "opacity-100" : "opacity-20"}`}>
                                        {reps ?? state.historyReps[sessionId]?.[sessionIdx] ?? "-"}
                                      </span>
                                    )}
                                    <span className={`text-[7px] font-bold opacity-30 uppercase ${(isGuided && isCurrent) || isManual ? "text-inherit" : isSkipped ? "text-red-300" : "text-white"}`}>
                                      reps
                                    </span>
                                  </div>
                                </div>
                                <div
                                  className={`flex flex-col items-center w-full pt-2 border-t border-current gap-1`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center gap-1">
                                    <Clock
                                      size={8}
                                      className={`opacity-30 ${isCurrent ? "text-inherit" : isSkipped ? "text-red-400" : "text-white"}`}
                                    />
                                    {liveExec !== null ? (
                                      <span className="font-mono font-bold text-[9px] text-inherit">
                                        {" "}
                                        {formatTime(liveExec)}{" "}
                                      </span>
                                    ) : (
                                      <div className="flex items-center gap-0.5">
                                        {isCurrent ? (
                                        <>
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
                                            className={`bg-transparent w-4 text-right font-mono font-bold text-[9px] outline-none placeholder:opacity-20 text-inherit`}
                                          />
                                          <span className={`text-[9px] font-bold opacity-30 text-inherit`}>
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
                                            className={`bg-transparent w-5 text-left font-mono font-bold text-[9px] outline-none placeholder:opacity-20 text-inherit`}
                                          />
                                        </>
                                        ) : (
                                          <span className={`font-mono font-bold text-[9px] ${execTime !== null ? "" : "opacity-20"}`}>
                                            {execTime !== null ? formatTime(execTime) : "0:00"}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div
                                    className={`flex items-center gap-1 ${liveRest !== null ? " animate-pulse" : "opacity-30"}`}
                                  >
                                    {liveRest !== null ? (
                                      <span className="font-mono text-[8px] font-bold text-inherit">
                                        {" "}
                                        {formatTime(liveRest)}{" "}
                                      </span>
                                    ) : (
                                      <div className="flex items-center gap-0.5">
                                        {isCurrent ? (
                                        <>
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
                                            className={`bg-transparent w-4 text-right font-mono font-bold text-[8px] outline-none placeholder:opacity-20 text-inherit`}
                                          />
                                          <span className={`text-[8px] font-bold opacity-30 text-inherit`}>
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
                                            className={`bg-transparent w-5 text-left font-mono font-bold text-[8px] outline-none placeholder:opacity-20 text-inherit`}
                                          />
                                        </>
                                        ) : (
                                          <span className={`font-mono font-bold text-[8px] ${restTime !== null ? "" : "opacity-20"}`}>
                                            {restTime !== null ? formatTime(restTime) : "0:00"}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {isCurrent && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch({ type: "UPDATE_SERIES_ALVO", sessionId, newAlvo: ex.series_alvo + 1 });
                            }}
                            className={`p-2.5 py-3 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed transition-all opacity-40 hover:opacity-100 min-h-[80px] shrink-0 min-w-[60px] border-current/20 bg-black/5 hover:bg-black/10`}
                          >
                            <Plus size={20} className="opacity-60 text-inherit" />
                          </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                </SwipeableExerciseCard>
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

          <div className="pt-8 pb-12 space-y-4">
            <button
              onClick={() => setSelectorConfig({ isOpen: true, bIdx: null, mode: 'add' })}
              className="w-full py-6 bg-white/5 border-2 border-dashed border-white/10 rounded-[32px] text-white/60 font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-3"
            >
              <PlusCircle size={24} />
              Adicionar Exercício
            </button>

            <button
              onClick={() => dispatch({ type: "ADD_BLOCK" })}
              className="w-full py-6 bg-white/5 border-2 border-dashed border-white/10 rounded-[32px] text-white/60 font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-3"
            >
              <Layers size={24} />
              Novo Bloco Conjugado
            </button>
          </div>
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
                    className="flex-1 min-w-[140px] p-2.5 px-4 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom duration-500 border border-white/10"
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
                const allEx = state.blocos.flat();
                const totalSeries = allEx.reduce((acc, ex) => acc + (ex.series_alvo || 0), 0);
                const doneSeries = allEx.reduce((acc, ex) => {
                  // Percentage calculation: strictly Count actual execution data entries
                  const executedCount = state.exerciseTimes[ex.sessionId]?.length || 0;
                  return acc + executedCount;
                }, 0);
                return totalSeries > 0 ? Math.round((doneSeries / totalSeries) * 100) : 0;
              })()}
              %
            </span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-1000"
              style={{
                width: `${(() => {
                  const allEx = state.blocos.flat();
                  const totalSeries = allEx.reduce((acc, ex) => acc + (ex.series_alvo || 0), 0);
                  const doneSeries = allEx.reduce((acc, ex) => {
                    const executedCount = state.exerciseTimes[ex.sessionId]?.length || 0;
                    return acc + executedCount;
                  }, 0);
                  return totalSeries > 0 ? Math.round((doneSeries / totalSeries) * 100) : 0;
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
              {selectorConfig.isFetchingHistory ? (
                <div className="py-10 text-center">
                  <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Herdando histórico...</p>
                </div>
              ) : (
                <ExerciseSelector
                  context="training"
                  currentExerciseId={
                    selectorConfig.mode === 'replace'
                      ? state.blocos?.[selectorConfig.bIdx]?.[selectorConfig.eIdx]?.exercicio_id || null
                      : null
                  }
                  onSelect={async (exerciseData) => {
                    setSelectorConfig(prev => ({ ...prev, isFetchingHistory: true }));

                    let seriesAlvo = null;
                    let repsAlvo = null;
                    let inheritedLoads = null;
                    let inheritedReps = null;

                    try {
                      const { data: history } = await supabase.rpc('get_ultima_performance', {
                        p_exercicio_id: exerciseData.id,
                        p_user_id: user.id
                      });

                      const lastPerf = history?.[0];
                      if (lastPerf && lastPerf.repeticoes && lastPerf.repeticoes.length > 0) {
                        seriesAlvo = lastPerf.repeticoes.length;
                        inheritedReps = lastPerf.repeticoes;
                        inheritedLoads = lastPerf.carga;

                        const min = Math.min(...inheritedReps);
                        const max = Math.max(...inheritedReps);
                        repsAlvo = min === max ? String(min) : `${min}-${max}`;
                        showToast("Dados herdados do histórico!", "info");
                      }
                    } catch (err) {
                      console.error("Erro ao buscar herança no treino ativo:", err);
                    }

                    if (selectorConfig.mode === 'add') {
                      dispatch({
                        type: "ADD_EXERCISE_TO_BLOCK",
                        bIdx: selectorConfig.bIdx,
                        exerciseData,
                        series_alvo: seriesAlvo,
                        reps_alvo: repsAlvo,
                        inheritedLoads,
                        inheritedReps
                      });
                    } else {
                      dispatch({
                        type: "REPLACE_EXERCISE",
                        bIdx: selectorConfig.bIdx,
                        eIdx: selectorConfig.eIdx,
                        exerciseData,
                        series_alvo: seriesAlvo,
                        reps_alvo: repsAlvo,
                        inheritedLoads,
                        inheritedReps
                      });
                    }
                    setSelectorConfig({ ...selectorConfig, isOpen: false, isFetchingHistory: false });
                    showToast(selectorConfig.mode === 'add' ? "Exercício adicionado!" : "Exercício alterado!", "success");
                  }}
                />
              )}
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
          <div className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-[32px] p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-black text-white text-center mb-6 uppercase tracking-widest">
              Salvar como Novo
            </h2>
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1 ml-2">Letra</label>
                <input
                  type="text"
                  value={saveAsData.letra}
                  onChange={(e) => setSaveAsData({ ...saveAsData, letra: e.target.value.toUpperCase().slice(0, 2) })}
                  placeholder="EX: D"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white font-bold outline-none focus:border-white/40 transition-all uppercase"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1 ml-2">Nome do Treino</label>
                <input
                  type="text"
                  value={saveAsData.nome}
                  onChange={(e) => setSaveAsData({ ...saveAsData, nome: e.target.value })}
                  placeholder="Nome do Treino"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white font-bold outline-none focus:border-white/40 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1 ml-2">Subtítulo / Descrição</label>
                <input
                  type="text"
                  value={saveAsData.subtitulo}
                  onChange={(e) => setSaveAsData({ ...saveAsData, subtitulo: e.target.value })}
                  placeholder="Opcional"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white font-bold outline-none focus:border-white/40 transition-all"
                />
              </div>
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

      <ConfirmationModal
        {...confirmationModal}
        onClose={() => setConfirmationModal({ ...confirmationModal, isOpen: false })}
      />

      <AdInterstitial
        show={showInterstitial}
        onClose={() => navigate("/app")}
        isPremium={isPremium}
      />
        </div>
      )}
    </PageTransition>
  );
};

export default Training;
