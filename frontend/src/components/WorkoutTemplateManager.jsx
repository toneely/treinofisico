import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient";
import {
  X, Plus, Trash2, Edit2, Copy, Check, RefreshCw,
  LayoutGrid, AlertTriangle, ArrowUp, ArrowDown, PlayCircle
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const WorkoutTemplateManager = ({
  isOpen,
  onClose,
  currentLetra,
  hasActiveProgress = false,
  hasUnsavedChanges = false,
  onFinishCurrent,
  onDiscardCurrent
}) => {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [formData, setFormData] = useState({
    letra: "",
    nome: "",
    subtitulo: "",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [conflictConfig, setConflictModal] = useState({ isOpen: false, targetLetra: null, type: null });

  const scrollRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchWorkouts();
    }
  }, [isOpen]);

  const fetchWorkouts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("treinos")
      .select("*")
      .eq("user_id", authUser.id)
      .order("ordem_exibicao", { ascending: true })
      .order("letra", { ascending: true });

    if (error) {
      showToast("Erro ao buscar treinos: " + error.message, "error");
    } else {
      setWorkouts(data);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ letra: "", nome: "", subtitulo: "" });
    setIsEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.letra || !formData.nome) return;

    setSaving(true);
    const targetLetra = formData.letra.toUpperCase();

    try {
      if (isEditing) {
        const { error } = await supabase
          .from("treinos")
          .update({ ...formData, letra: targetLetra })
          .eq("id", isEditing)
          .eq("user_id", authUser.id);

        if (error) throw error;
        showToast("Treino atualizado!", "success");
      } else {
        const { error } = await supabase
          .from("treinos")
          .insert([{
            ...formData,
            letra: targetLetra,
            user_id: authUser.id,
            ordem_exibicao: workouts.length
          }]);

        if (error) throw error;
        showToast("Treino criado!", "success");
      }
      resetForm();
      fetchWorkouts();
    } catch (error) {
      showToast("Erro: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (workout) => {
    setIsEditing(workout.id);
    setFormData({
      letra: workout.letra,
      nome: workout.nome,
      subtitulo: workout.subtitulo || "",
    });
    // Smooth scroll to top
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDuplicate = async (workout) => {
    setSaving(true);
    try {
      const usedLetras = workouts.map(w => w.letra);
      let newLetra = "";
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      for (let char of alphabet) {
        if (!usedLetras.includes(char)) {
          newLetra = char;
          break;
        }
      }
      if (!newLetra) newLetra = workout.letra + "2";

      const { data: newWorkout, error: wError } = await supabase
        .from("treinos")
        .insert([{
          user_id: authUser.id,
          letra: newLetra,
          nome: `${workout.nome} (Cópia)`,
          subtitulo: workout.subtitulo,
          ordem_exibicao: workouts.length
        }])
        .select()
        .single();

      if (wError) throw wError;

      const { data: blocks } = await supabase
        .from("blocos_treino")
        .select("*")
        .eq("letra_treino", workout.letra)
        .eq("user_id", authUser.id);

      if (blocks && blocks.length > 0) {
        const newBlocks = blocks.map(({ id, created_at, ...rest }) => ({
          ...rest,
          letra_treino: newLetra,
          user_id: authUser.id
        }));
        const { error: bError } = await supabase.from("blocos_treino").insert(newBlocks);
        if (bError) throw bError;
      }

      showToast(`Treino duplicado como ${newLetra}!`, "success");
      fetchWorkouts();
    } catch (error) {
      showToast("Erro ao duplicar: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("treinos")
        .delete()
        .eq("id", id)
        .eq("user_id", authUser.id);

      if (error) throw error;
      showToast("Treino excluído!", "success");
      fetchWorkouts();
      setShowDeleteConfirm(null);
    } catch (error) {
      showToast("Erro ao excluir: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (index, direction) => {
    const newWorkouts = [...workouts];
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= newWorkouts.length) return;

    const [moved] = newWorkouts.splice(index, 1);
    newWorkouts.splice(targetIndex, 0, moved);

    const updated = newWorkouts.map((w, idx) => ({ ...w, ordem_exibicao: idx }));
    setWorkouts(updated);

    try {
      const updates = updated.map(w =>
        supabase.from("treinos").update({ ordem_exibicao: w.ordem_exibicao }).eq("id", w.id).eq("user_id", authUser.id)
      );
      await Promise.all(updates);
    } catch (err) {
      showToast("Erro ao salvar ordem", "error");
    }
  };

  const handlePlay = (letra) => {
    if (hasActiveProgress) {
      setConflictModal({ isOpen: true, targetLetra: letra, type: 'active' });
    } else if (hasUnsavedChanges) {
      setConflictModal({ isOpen: true, targetLetra: letra, type: 'unsaved' });
    } else {
      startNewTraining(letra);
    }
  };

  const startNewTraining = (letra) => {
    onClose();
    if (letra === currentLetra) {
      showToast("Você já está neste treino.", "info");
    } else {
      navigate(`/treino/${letra}`);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-start justify-center animate-in fade-in duration-300">
      <div
        ref={scrollRef}
        className="bg-zinc-950 w-full max-w-2xl h-[100dvh] flex flex-col overflow-y-auto shadow-2xl animate-in slide-in-from-top-10 duration-500 border-x border-white/5"
      >

        {/* Header */}
        <div className="p-4 px-6 border-b border-white/5 flex justify-between items-center sticky top-0 bg-zinc-950/80 backdrop-blur-xl z-20">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-white">
              <LayoutGrid size={20} style={{ color: "var(--color-primary)" }} />
              Gerenciar Treinos
            </h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase opacity-60">Templates & Ordem</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors"
          >
            <X size={20} className="text-zinc-500" />
          </button>
        </div>

        {/* Form Area */}
        <div className="p-6 border-b border-white/5 bg-zinc-900/30">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-1">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1 ml-1">Letra</label>
                <input
                  type="text"
                  value={formData.letra}
                  onChange={(e) => setFormData({ ...formData, letra: e.target.value.toUpperCase().slice(0, 2) })}
                  placeholder="EX: A"
                  required
                  className="w-full p-2.5 bg-zinc-900 border border-white/5 text-white rounded-xl font-bold focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all"
                />
              </div>
              <div className="col-span-3">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1 ml-1">Nome do Treino</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do Treino"
                  required
                  className="w-full p-2.5 bg-zinc-900 border border-white/5 text-white rounded-xl font-bold focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1 ml-1">Subtítulo / Descrição</label>
              <input
                type="text"
                value={formData.subtitulo}
                onChange={(e) => setFormData({ ...formData, subtitulo: e.target.value })}
                placeholder="Ex: Foco em membros superiores"
                className="w-full p-2.5 bg-zinc-900 border border-white/5 text-white rounded-xl font-bold focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                style={{ backgroundColor: "var(--color-primary)", color: "var(--text-on-primary)" }}
              >
                {isEditing ? <Check size={18} /> : <Plus size={18} />}
                {isEditing ? "Atualizar" : "Salvar Template"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3.5 bg-white/5 text-zinc-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Limpar
              </button>
            </div>
          </form>
        </div>

        {/* List Area */}
        <div className="flex-1 p-6 space-y-3">
          <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">Biblioteca de Treinos</h3>

          {loading ? (
            <div className="py-20 text-center animate-pulse">
              <RefreshCw className="mx-auto mb-2 text-zinc-700 animate-spin" />
              <p className="text-[10px] font-bold text-zinc-600 uppercase">Carregando...</p>
            </div>
          ) : workouts.length === 0 ? (
            <div className="py-20 text-center opacity-20">
              <LayoutGrid size={48} className="mx-auto mb-4 text-white" />
              <p className="font-bold text-white">Nenhum template encontrado.</p>
            </div>
          ) : (
            workouts.map((workout, idx) => {
              const isCurrent = workout.letra === currentLetra;
              return (
                <div
                  key={workout.id}
                  className={`bg-zinc-900/50 p-3.5 rounded-2xl border transition-all flex items-center justify-between group ${
                    isCurrent ? "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5" : "border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1 mr-1">
                       <button
                        onClick={() => handleReorder(idx, -1)}
                        className="p-1 hover:bg-white/5 rounded-md text-zinc-600 hover:text-white transition"
                        disabled={idx === 0}
                       >
                         <ArrowUp size={12} />
                       </button>
                       <button
                        onClick={() => handleReorder(idx, 1)}
                        className="p-1 hover:bg-white/5 rounded-md text-zinc-600 hover:text-white transition"
                        disabled={idx === workouts.length - 1}
                       >
                         <ArrowDown size={12} />
                       </button>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${isCurrent ? "bg-[var(--color-primary)] text-[var(--text-on-primary)]" : "bg-white/5 text-[var(--color-secondary)]"}`}>
                      {workout.letra}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white leading-tight">{workout.nome}</h4>
                      <p className="text-[10px] text-zinc-500 font-medium">{workout.subtitulo || 'Treino sem descrição'}</p>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handlePlay(workout.letra)}
                      className="p-2 text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                      title="Iniciar Treino"
                    >
                      <PlayCircle size={18} />
                    </button>
                    <button
                      onClick={() => handleEdit(workout)}
                      className="p-2 text-zinc-500 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg transition-all"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(workout)}
                      className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                      title="Duplicar"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(workout)}
                      className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Internal Modals */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-white/10 w-full max-w-xs rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-center text-white mb-2">Excluir Template?</h2>
            <p className="text-zinc-500 text-center text-sm mb-8">
              Tem certeza que deseja apagar o template <strong>{showDeleteConfirm.letra}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleDelete(showDeleteConfirm.id)}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 active:scale-95 transition-all"
              >
                Confirmar Exclusão
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="w-full py-4 bg-white/5 text-zinc-500 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {conflictConfig.isOpen && (
        <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-white/10 w-full max-w-xs rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-center text-white mb-2">
              {conflictConfig.type === 'active' ? 'Treino em Andamento' : 'Edições Pendentes'}
            </h2>
            <p className="text-zinc-500 text-center text-sm mb-8">
              {conflictConfig.type === 'active'
                ? 'Você já tem uma sessão iniciada. Deseja salvar o progresso atual ou descartar antes de mudar?'
                : 'O treino atual possui alterações não salvas. Deseja descartar as edições e abrir o novo treino?'}
            </p>
            <div className="flex flex-col gap-2">
              {conflictConfig.type === 'active' ? (
                <>
                  <button
                    onClick={() => { onFinishCurrent(); startNewTraining(conflictConfig.targetLetra); setConflictModal({ isOpen: false }); }}
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 active:scale-95 transition-all"
                  >
                    Finalizar e Abrir
                  </button>
                  <button
                    onClick={() => { onDiscardCurrent(); startNewTraining(conflictConfig.targetLetra); setConflictModal({ isOpen: false }); }}
                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 active:scale-95 transition-all"
                  >
                    Descartar e Abrir
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { startNewTraining(conflictConfig.targetLetra); setConflictModal({ isOpen: false }); }}
                  className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-amber-600 active:scale-95 transition-all"
                >
                  Descartar Edições
                </button>
              )}
              <button
                onClick={() => setConflictModal({ isOpen: false })}
                className="w-full py-4 bg-white/5 text-zinc-500 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default WorkoutTemplateManager;
