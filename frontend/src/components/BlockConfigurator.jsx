import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Plus, Trash2, GripVertical, Save, X, AlertCircle } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import ExerciseSelector from "./ExerciseSelector";

const BlockConfigurator = ({ overrideUserId = null, isCompact = false }) => {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
  const [workouts, setWorkouts] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchWorkouts = useCallback(async () => {
    let query = supabase.from("treinos").select("*").order("letra");

    if (overrideUserId === null) {
      query = query.is("user_id", null);
    } else {
      query = query.eq("user_id", overrideUserId || authUser?.id);
    }

    const { data } = await query;

    if (data && data.length > 0) {
      setWorkouts(data);
      if (!selectedWorkout) setSelectedWorkout(data[0].letra);
    }
  }, [authUser?.id, overrideUserId, selectedWorkout]);

  const fetchExercises = useCallback(async () => {
    const { data } = await supabase
      .from("exercicios")
      .select("id, nome, descanso_passivo_segundos")
      .order("nome");
    setExercises(data || []);
  }, []);

  const fetchBlocks = useCallback(async (letra) => {
    setLoading(true);
    let query = supabase
      .from("blocos_treino")
      .select("*")
      .eq("letra_treino", letra)
      .order("numero_bloco", { ascending: true })
      .order("ordem_execucao", { ascending: true });

    if (overrideUserId === null) {
      query = query.is("user_id", null);
    } else {
      query = query.eq("user_id", overrideUserId || authUser?.id);
    }

    const { data, error } = await query;

    if (error) console.error(error);
    else {
      const grouped = data.reduce((acc, curr) => {
        if (!acc[curr.numero_bloco]) acc[curr.numero_bloco] = [];
        acc[curr.numero_bloco].push(curr);
        return acc;
      }, {});

      const blocksArray = Object.keys(grouped)
        .sort((a, b) => a - b)
        .map((num) => ({
          numero: parseInt(num),
          exercicios: grouped[num],
        }));
      setBlocks(blocksArray);
    }
    setLoading(false);
  }, [authUser?.id, overrideUserId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExercises();
      fetchWorkouts();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchExercises, fetchWorkouts]);

  useEffect(() => {
    if (selectedWorkout) {
      const timer = setTimeout(() => {
        fetchBlocks(selectedWorkout);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedWorkout, fetchBlocks]);

  const handleExerciseSelect = async (blockIndex, exerciseIndex, exerciseData) => {
    const newId = parseInt(exerciseData.id);
    const userId = overrideUserId === null ? (authUser?.id || null) : overrideUserId;

    console.log("Configurando herança para Exercício ID:", newId, "Usuário:", userId);

    let seriesAlvo = 3;
    let repsAlvo = "10";

    if (userId && newId) {
      try {
        // Use the new optimized RPC
        const { data: history, error } = await supabase.rpc('get_ultima_performance', {
          p_exercicio_id: newId,
          p_user_id: userId
        });

        if (error) throw error;

        // history returns a table, get the first row
        const lastPerf = history?.[0];

        if (lastPerf && lastPerf.repeticoes && lastPerf.repeticoes.length > 0) {
          seriesAlvo = lastPerf.repeticoes.length;
          const reps = lastPerf.repeticoes;
          const min = Math.min(...reps);
          const max = Math.max(...reps);
          repsAlvo = min === max ? String(min) : `${min}-${max}`;

          console.log("Dados herdados com sucesso:", { seriesAlvo, repsAlvo });
          showToast("Dados herdados do histórico!", "info");
        } else {
          console.log("Nenhum histórico encontrado para herança.");
        }
      } catch (err) {
        console.error("Erro ao buscar histórico para herança:", err);
      }
    }

    const newBlocks = [...blocks];
    newBlocks[blockIndex].exercicios[exerciseIndex] = {
      ...newBlocks[blockIndex].exercicios[exerciseIndex],
      exercicio_id: newId,
      series_alvo: seriesAlvo,
      reps_alvo: repsAlvo
    };
    setBlocks(newBlocks);
  };

  const addBlock = () => {
    const nextNumber =
      blocks.length > 0 ? Math.max(...blocks.map((b) => b.numero)) + 1 : 1;
    setBlocks([
      ...blocks,
      {
        numero: nextNumber,
        exercicios: [
          {
            exercicio_id: null,
            ordem_execucao: 1,
            series_alvo: 3,
            reps_alvo: "10",
            letra_treino: selectedWorkout,
            numero_bloco: nextNumber,
          },
        ],
      },
    ]);
  };

  const addExerciseToBlock = (blockIndex) => {
    const newBlocks = [...blocks];
    const block = newBlocks[blockIndex];
    block.exercicios.push({
      exercicio_id: null,
      ordem_execucao: block.exercicios.length + 1,
      series_alvo: 3,
      reps_alvo: "10",
      letra_treino: selectedWorkout,
      numero_bloco: block.numero,
    });
    setBlocks(newBlocks);
  };

  const removeExerciseFromBlock = (blockIndex, exerciseIndex) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].exercicios.splice(exerciseIndex, 1);
    if (newBlocks[blockIndex].exercicios.length === 0) {
      newBlocks.splice(blockIndex, 1);
    } else {
      newBlocks[blockIndex].exercicios.forEach((ex, idx) => {
        ex.ordem_execucao = idx + 1;
      });
    }
    setBlocks(newBlocks);
  };

  const updateExerciseField = (blockIndex, exerciseIndex, field, value) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].exercicios[exerciseIndex][field] = value;
    setBlocks(newBlocks);
  };

  const handleSave = async () => {
    setSaving(true);
    const userId = overrideUserId === null ? null : (overrideUserId || authUser?.id);

    const query = supabase
      .from("blocos_treino")
      .delete()
      .eq("letra_treino", selectedWorkout);

    if (userId === null) {
      query.is("user_id", null);
    } else {
      query.eq("user_id", userId);
    }

    const { error: deleteError } = await query;

    if (deleteError) {
      showToast(
        "Erro ao limpar blocos antigos: " + deleteError.message,
        "error",
      );
      setSaving(false);
      return;
    }

    const toInsert = blocks.flatMap((b) =>
      b.exercicios
        .filter(ex => ex.exercicio_id) // Safety filter
        .map((ex, idx) => ({
          user_id: userId,
          letra_treino: selectedWorkout,
          numero_bloco: b.numero,
          exercicio_id: ex.exercicio_id,
          ordem_execucao: idx + 1, // Recalculate order on save
          series_alvo: parseInt(ex.series_alvo),
          reps_alvo: ex.reps_alvo,
        })),
    );

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("blocos_treino")
        .insert(toInsert);

      if (insertError)
        showToast(
          "Erro ao salvar novos blocos: " + insertError.message,
          "error",
        );
      else
        showToast(
          "Treino " + selectedWorkout + " salvo com sucesso!",
          "success",
        );
    } else {
      showToast("Treino " + selectedWorkout + " limpo com sucesso!", "info");
    }
    setSaving(false);
    fetchBlocks(selectedWorkout);
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ${isCompact ? 'text-xs' : ''}`}>
      <div className={`${isCompact ? 'p-3' : 'p-6'} border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:justify-between md:items-center gap-4`}>
        {!isCompact && (
          <h2 className="text-xl font-bold  flex items-center gap-2">
            <GripVertical size={20} style={{ color: "var(--color-primary)" }} />{" "}
            Configurador de Blocos
          </h2>
        )}
        <div className="flex flex-wrap gap-1.5">
          {workouts.map((w) => (
            <button
              key={w.letra}
              onClick={() => setSelectedWorkout(w.letra)}
              className={`${isCompact ? 'w-8 h-8 text-sm' : 'w-10 h-10'} rounded-lg font-bold transition ${
                selectedWorkout === w.letra
                  ? "text-white"
                  : "bg-white text-slate-500 border border-slate-200"
              }`}
              style={
                selectedWorkout === w.letra
                  ? { backgroundColor: "var(--color-primary)" }
                  : {}
              }
            >
              {w.letra}
            </button>
          ))}
        </div>
      </div>

      <div className={isCompact ? "p-3" : "p-6"}>
        {loading ? (
          <div className="text-center py-10 text-slate-400">
            Carregando estrutura...
          </div>
        ) : (
          <div className={isCompact ? "space-y-3" : "space-y-6"}>
            {blocks.map((block, bIdx) => (
              <div
                key={bIdx}
                className={`border border-slate-200 rounded-2xl ${isCompact ? 'p-2.5' : 'p-4'} bg-slate-50/50`}
              >
                <div className={`flex justify-between items-center ${isCompact ? 'mb-2' : 'mb-4'}`}>
                  <h3 className="font-bold">
                    {block.exercicios.length > 1 ? "Conjugado" : "Bloco"} {block.numero}
                  </h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => addExerciseToBlock(bIdx)}
                      className={`${isCompact ? 'text-[9px] px-2 py-1' : 'text-xs px-3 py-1.5'} font-bold rounded-lg transition flex items-center gap-1`}
                      style={{
                        color: "var(--color-primary)",
                        backgroundColor: "var(--color-primary)10",
                      }}
                    >
                      <Plus size={isCompact ? 12 : 14} /> {isCompact ? "Conjugado" : "Adicionar Exercício Conjugado"}
                    </button>
                    <button
                      onClick={() => {
                        const newBlocks = [...blocks];
                        newBlocks.splice(bIdx, 1);
                        setBlocks(newBlocks);
                      }}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 size={isCompact ? 14 : 18} />
                    </button>
                  </div>
                </div>

                <div className={isCompact ? "space-y-2" : "space-y-3"}>
                  {block.exercicios.map((ex, eIdx) => (
                    <div
                      key={eIdx}
                      className={`bg-white ${isCompact ? 'p-2.5' : 'p-4'} rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-end`}
                    >
                      <div className="flex-1 w-full flex flex-col gap-1 text-[10px]">
                        <label className={`${isCompact ? 'text-[8px]' : 'text-[10px]'} font-bold text-slate-400 uppercase tracking-wider`}>
                          Ex {eIdx + 1}
                        </label>
                        <ExerciseSelector
                          context="admin"
                          isAdminContext={overrideUserId === null}
                          currentExerciseId={ex.exercicio_id}
                          onSelect={(exerciseData) =>
                            handleExerciseSelect(bIdx, eIdx, exerciseData)
                          }
                          overrideUserId={overrideUserId}
                        />
                      </div>
                      <div className={`${isCompact ? 'w-16' : 'w-20'} flex flex-col gap-1`}>
                        <label className={`${isCompact ? 'text-[8px]' : 'text-[10px]'} font-bold text-slate-400 uppercase`}>
                          Séries
                        </label>
                        <input
                          type="number"
                          value={ex.series_alvo}
                          onChange={(e) =>
                            updateExerciseField(
                              bIdx,
                              eIdx,
                              "series_alvo",
                              e.target.value,
                            )
                          }
                          className={`w-full ${isCompact ? 'p-1.5' : 'p-2'} border border-slate-200 rounded-lg text-xs`}
                        />
                      </div>
                      <div className={`${isCompact ? 'w-16' : 'w-24'} flex flex-col gap-1`}>
                        <label className={`${isCompact ? 'text-[8px]' : 'text-[10px]'} font-bold text-slate-400 uppercase`}>
                          Reps
                        </label>
                        <input
                          type="text"
                          value={ex.reps_alvo}
                          onChange={(e) =>
                            updateExerciseField(
                              bIdx,
                              eIdx,
                              "reps_alvo",
                              e.target.value,
                            )
                          }
                          className={`w-full ${isCompact ? 'p-1.5' : 'p-2'} border border-slate-200 rounded-lg text-xs`}
                          placeholder="8-10"
                        />
                      </div>
                      <div className={`${isCompact ? 'w-16' : 'w-20'} flex flex-col gap-1`}>
                        <label className={`${isCompact ? 'text-[8px]' : 'text-[10px]'} font-bold text-slate-400 uppercase`}>
                          Desc (s)
                        </label>
                        <input
                          type="number"
                          value={
                            exercises.find((e) => e.id == ex.exercicio_id)
                              ?.descanso_passivo_segundos || 60
                          }
                          onChange={async (e) => {
                            const newVal = parseInt(e.target.value);
                            setExercises((prev) =>
                              prev.map((item) =>
                                item.id == ex.exercicio_id
                                  ? {
                                      ...item,
                                      descanso_passivo_segundos: newVal,
                                    }
                                  : item,
                              ),
                            );
                            await supabase
                              .from("exercicios")
                              .update({ descanso_passivo_segundos: newVal })
                              .eq("id", ex.exercicio_id);
                          }}
                          className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                      <button
                        onClick={() => removeExerciseFromBlock(bIdx, eIdx)}
                        className="p-2 text-slate-300 hover:text-red-500 transition"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={addBlock}
              className={`w-full ${isCompact ? 'py-2.5' : 'py-4'} border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold transition flex items-center justify-center gap-2`}
              style={{ color: "var(--color-primary)" }}
            >
              <Plus size={isCompact ? 16 : 20} /> Novo Bloco
            </button>

            <div className={`flex justify-end ${isCompact ? 'pt-2' : 'pt-4'}`}>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`${isCompact ? 'px-4 py-2 text-xs' : 'px-8 py-3'} rounded-xl font-bold transition flex items-center gap-2 disabled:opacity-50 shadow-lg`}
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "var(--text-on-primary)",
                }}
              >
                {saving ? (
                  "Salvando..."
                ) : (
                  <>
                    <Save size={isCompact ? 16 : 20} /> Salvar {selectedWorkout}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t flex gap-3 bg-slate-50 text-slate-600">
        <AlertCircle className="shrink-0" size={20} />
        <p className="text-xs">
          <strong>Atenção:</strong> Ao salvar, a estrutura atual do Treino{" "}
          {selectedWorkout} será substituída. Certifique-se de que todos os
          blocos estão corretos.
        </p>
      </div>
    </div>
  );
};

export default BlockConfigurator;
