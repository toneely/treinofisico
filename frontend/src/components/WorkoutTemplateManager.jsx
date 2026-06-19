import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient";
import {
  X, Plus, Trash2, Edit2, Copy, Check, RefreshCw,
  LayoutGrid, AlertTriangle
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

const WorkoutTemplateManager = ({ isOpen, onClose }) => {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
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
          .insert([{ ...formData, letra: targetLetra, user_id: authUser.id }]);

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
  };

  const handleDuplicate = async (workout) => {
    setSaving(true);
    try {
      // Find unused letra
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
          subtitulo: workout.subtitulo
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

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl h-[95dvh] sm:h-[80vh] sm:rounded-[40px] rounded-t-[40px] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-500">

        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <LayoutGrid size={24} style={{ color: "var(--color-primary)" }} />
              Gerenciar Treinos
            </h2>
            <p className="text-xs text-slate-500 font-bold uppercase opacity-60">Central de Templates</p>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-slate-200 rounded-2xl transition-colors"
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        {/* Form Area */}
        <div className="p-6 border-b">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Letra</label>
                <input
                  type="text"
                  value={formData.letra}
                  onChange={(e) => setFormData({ ...formData, letra: e.target.value.toUpperCase().slice(0, 2) })}
                  placeholder="EX: A"
                  required
                  className="w-full p-3 bg-slate-100 border-none rounded-2xl font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all"
                />
              </div>
              <div className="col-span-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Nome do Treino</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do Treino"
                  required
                  className="w-full p-3 bg-slate-100 border-none rounded-2xl font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Subtítulo / Descrição</label>
              <input
                type="text"
                value={formData.subtitulo}
                onChange={(e) => setFormData({ ...formData, subtitulo: e.target.value })}
                placeholder="Ex: Foco em membros superiores"
                className="w-full p-3 bg-slate-100 border-none rounded-2xl font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                style={{ backgroundColor: "var(--color-primary)", color: "var(--text-on-primary)" }}
              >
                {isEditing ? <Check size={20} /> : <Plus size={20} />}
                {isEditing ? "Atualizar" : "Salvar Template"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Limpar
              </button>
            </div>
          </form>
        </div>

        {/* List Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Seus Templates Salvos</h3>

          {loading ? (
            <div className="py-10 text-center animate-pulse">
              <RefreshCw className="mx-auto mb-2 text-slate-300 animate-spin" />
              <p className="text-xs font-bold text-slate-400 uppercase">Carregando...</p>
            </div>
          ) : workouts.length === 0 ? (
            <div className="py-20 text-center opacity-40">
              <LayoutGrid size={48} className="mx-auto mb-4" />
              <p className="font-bold text-slate-500">Nenhum template encontrado.</p>
            </div>
          ) : (
            workouts.map((workout) => (
              <div
                key={workout.id}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-[var(--color-primary)]/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-xl text-[var(--color-secondary)] group-hover:bg-[var(--color-secondary)] group-hover:text-[var(--text-on-secondary)] transition-all">
                    {workout.letra}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg leading-tight">{workout.nome}</h4>
                    <p className="text-xs text-slate-500 font-medium">{workout.subtitulo || 'Sem descrição'}</p>
                  </div>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(workout)}
                    className="p-2.5 text-slate-400 hover:text-[var(--color-primary)] hover:bg-slate-50 rounded-xl transition-all"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDuplicate(workout)}
                    className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                    title="Duplicar"
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(workout)}
                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Internal Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-center mb-2">Excluir Template?</h2>
            <p className="text-slate-500 text-center text-sm mb-8">
              Tem certeza que deseja apagar o template <strong>{showDeleteConfirm.letra}</strong>? Isso não afetará treinos em andamento.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleDelete(showDeleteConfirm.id)}
                disabled={saving}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-red-600 active:scale-95 transition-all"
              >
                Confirmar Exclusão
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancelar
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
