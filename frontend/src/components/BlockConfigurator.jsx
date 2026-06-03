import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Trash2, GripVertical, Save, AlertCircle, X } from 'lucide-react';

const BlockConfigurator = () => {
  const [workouts, setWorkouts] = useState(['A', 'B', 'C', 'D']);
  const [selectedWorkout, setSelectedWorkout] = useState('A');
  const [blocks, setBlocks] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchExercises();
    fetchBlocks(selectedWorkout);
  }, [selectedWorkout]);

  const fetchExercises = async () => {
    const { data } = await supabase.from('exercicios').select('id, nome, descanso_passivo_segundos').order('nome');
    setExercises(data || []);
  };

  const fetchBlocks = async (letra) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blocos_treino')
      .select('*')
      .eq('letra_treino', letra)
      .order('numero_bloco', { ascending: true })
      .order('ordem_execucao', { ascending: true });

    if (error) console.error(error);
    else {
      // Group by numero_bloco
      const grouped = data.reduce((acc, curr) => {
        if (!acc[curr.numero_bloco]) acc[curr.numero_bloco] = [];
        acc[curr.numero_bloco].push(curr);
        return acc;
      }, {});

      const blocksArray = Object.keys(grouped).sort((a, b) => a - b).map(num => ({
        numero: parseInt(num),
        exercicios: grouped[num]
      }));
      setBlocks(blocksArray);
    }
    setLoading(false);
  };

  const addBlock = () => {
    const nextNumber = blocks.length > 0 ? Math.max(...blocks.map(b => b.numero)) + 1 : 1;
    setBlocks([...blocks, {
      numero: nextNumber,
      exercicios: [
        { exercicio_id: exercises[0]?.id, ordem_execucao: 1, series_alvo: 3, reps_alvo: '10', letra_treino: selectedWorkout, numero_bloco: nextNumber }
      ]
    }]);
  };

  const addExerciseToBlock = (blockIndex) => {
    const newBlocks = [...blocks];
    const block = newBlocks[blockIndex];
    if (block.exercicios.length < 2) {
      block.exercicios.push({
        exercicio_id: exercises[0]?.id,
        ordem_execucao: 2,
        series_alvo: 3,
        reps_alvo: '10',
        letra_treino: selectedWorkout,
        numero_bloco: block.numero
      });
      setBlocks(newBlocks);
    }
  };

  const removeExerciseFromBlock = (blockIndex, exerciseIndex) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].exercicios.splice(exerciseIndex, 1);

    // Se o bloco ficar vazio, remove o bloco
    if (newBlocks[blockIndex].exercicios.length === 0) {
      newBlocks.splice(blockIndex, 1);
    } else {
      // Reordena execucao
      newBlocks[blockIndex].exercicios.forEach((ex, idx) => {
        ex.ordem_execucao = idx + 1;
      });
    }
    setBlocks(newBlocks);
  };

  const updateExercise = (blockIndex, exerciseIndex, field, value) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].exercicios[exerciseIndex][field] = value;
    setBlocks(newBlocks);
  };

  const handleSave = async () => {
    setSaving(true);
    // 1. Delete all existing for this workout
    const { error: deleteError } = await supabase
      .from('blocos_treino')
      .delete()
      .eq('letra_treino', selectedWorkout);

    if (deleteError) {
      alert('Erro ao limpar blocos antigos: ' + deleteError.message);
      setSaving(false);
      return;
    }

    // 2. Insert new blocks
    const toInsert = blocks.flatMap(b => b.exercicios.map(ex => ({
      letra_treino: selectedWorkout,
      numero_bloco: b.numero,
      exercicio_id: ex.exercicio_id,
      ordem_execucao: ex.ordem_execucao,
      series_alvo: parseInt(ex.series_alvo),
      reps_alvo: ex.reps_alvo
    })));

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('blocos_treino')
        .insert(toInsert);

      if (insertError) alert('Erro ao salvar novos blocos: ' + insertError.message);
      else alert('Treino ' + selectedWorkout + ' salvo com sucesso!');
    } else {
        alert('Treino ' + selectedWorkout + ' limpo com sucesso!');
    }

    setSaving(false);
    fetchBlocks(selectedWorkout);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <GripVertical size={20} className="text-indigo-600" />
          Configurador de Blocos
        </h2>
        <div className="flex gap-2">
          {workouts.map(w => (
            <button
              key={w}
              onClick={() => setSelectedWorkout(w)}
              className={`w-10 h-10 rounded-lg font-bold transition ${
                selectedWorkout === w ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center py-10 text-slate-400">Carregando estrutura...</div>
        ) : (
          <div className="space-y-6">
            {blocks.map((block, bIdx) => (
              <div key={bIdx} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-700">Bloco {block.numero}</h3>
                  <div className="flex gap-2">
                    {block.exercicios.length < 2 && (
                      <button
                        onClick={() => addExerciseToBlock(bIdx)}
                        className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition flex items-center gap-1"
                      >
                        <Plus size={14} /> Adicionar Alternado
                      </button>
                    )}
                    <button
                       onClick={() => {
                         const newBlocks = [...blocks];
                         newBlocks.splice(bIdx, 1);
                         setBlocks(newBlocks);
                       }}
                       className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {block.exercicios.map((ex, eIdx) => (
                    <div key={eIdx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1 w-full flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {eIdx === 0 ? 'Exercício Principal' : 'Exercício Alternado'}
                        </label>
                        <select
                          value={ex.exercicio_id}
                          onChange={(e) => updateExercise(bIdx, eIdx, 'exercicio_id', e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        >
                          {exercises.map(item => (
                            <option key={item.id} value={item.id}>{item.nome}</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-20 flex flex-col gap-1">
                         <label className="text-[10px] font-bold text-slate-400 uppercase">Séries</label>
                         <input
                            type="number"
                            value={ex.series_alvo}
                            onChange={(e) => updateExercise(bIdx, eIdx, 'series_alvo', e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                         />
                      </div>

                      <div className="w-24 flex flex-col gap-1">
                         <label className="text-[10px] font-bold text-slate-400 uppercase">Reps</label>
                         <input
                            type="text"
                            value={ex.reps_alvo}
                            onChange={(e) => updateExercise(bIdx, eIdx, 'reps_alvo', e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                            placeholder="Ex: 8-10"
                         />
                      </div>

                      <div className="w-20 flex flex-col gap-1">
                         <label className="text-[10px] font-bold text-slate-400 uppercase">Desc (s)</label>
                         <input
                            type="number"
                            value={exercises.find(e => e.id == ex.exercicio_id)?.descanso_passivo_segundos || 60}
                            onChange={async (e) => {
                               const newVal = parseInt(e.target.value);
                               // Update local exercises state for immediate UI feedback
                               setExercises(prev => prev.map(item => item.id == ex.exercicio_id ? {...item, descanso_passivo_segundos: newVal} : item));
                               // Persist to DB
                               await supabase.from('exercicios').update({descanso_passivo_segundos: newVal}).eq('id', ex.exercicio_id);
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
              className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-indigo-300 hover:text-indigo-600 transition flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Novo Bloco
            </button>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-600 transition flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : <><Save size={20} /> Salvar Treino {selectedWorkout}</>}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-amber-50 border-t border-amber-100 flex gap-3">
        <AlertCircle className="text-amber-500 shrink-0" size={20} />
        <p className="text-xs text-amber-700">
          <strong>Atenção:</strong> Ao salvar, a estrutura atual do Treino {selectedWorkout} será substituída. Certifique-se de que todos os blocos estão corretos.
        </p>
      </div>
    </div>
  );
};

export default BlockConfigurator;
