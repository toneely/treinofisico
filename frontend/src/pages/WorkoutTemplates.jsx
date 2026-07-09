import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import {
  ChevronLeft, Plus, Trash2, Edit2, Copy, Check, RefreshCw,
  LayoutGrid, AlertTriangle, ArrowUp, ArrowDown, PlayCircle, X
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import AdBanner from "../components/ui/AdBanner";
import LoadingScreen from "../components/LoadingScreen";

const WorkoutTemplates = () => {
  const { user: authUser, isPremium } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("my_workouts"); // "my_workouts" | "explore"
  const [workouts, setWorkouts] = useState([]);
  const [availablePrograms, setAvailablePrograms] = useState([]);
  const [modalidades, setModalidades] = useState([]);
  const [selectedExploreModality, setSelectedExploreModality] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [formData, setFormData] = useState({
    letra: "",
    nome: "",
    subtitulo: "",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [conflictConfig, setConflictModal] = useState({ isOpen: false, targetLetra: null, type: null });

  // Session conflict states derived from localStorage
  const [activeSession, setActiveSession] = useState(null);

  const checkActiveSession = useCallback(() => {
    const saved = localStorage.getItem("active_training_session");
    if (saved) {
      try {
        setActiveSession(JSON.parse(saved));
      } catch {
        localStorage.removeItem("active_training_session");
      }
    }
  }, []);

  const fetchWorkouts = useCallback(async () => {
    if (!authUser?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("treinos")
      .select("*, programas_padrao(nome)")
      .eq("user_id", authUser.id)
      .order("ordem_exibicao", { ascending: true })
      .order("letra", { ascending: true });

    if (error) {
      showToast("Erro ao buscar treinos: " + error.message, "error");
    } else {
      setWorkouts(data || []);
    }
    setLoading(false);
  }, [authUser?.id, showToast]);

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    try {
      const { data: mData, error: mError } = await supabase
        .from("modalidades")
        .select("*")
        .order("nome");

      if (mError) throw mError;
      setModalidades(mData || []);
      if (mData?.length > 0 && !selectedExploreModality) {
        setSelectedExploreModality(mData[0]);
      }

      const { data, error } = await supabase
        .from("programas_padrao")
        .select("*, modalidades(nome)")
        .order("nome", { ascending: true });

      if (error) throw error;
      setAvailablePrograms(data || []);
    } catch (err) {
      showToast("Erro ao buscar dados: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, selectedExploreModality]);

  useEffect(() => {
    // Wrapped in setTimeout to avoid cascading render lint error
    const t = setTimeout(() => {
      if (activeTab === "my_workouts") {
        fetchWorkouts();
      } else {
        fetchPrograms();
      }
      checkActiveSession();
    }, 0);
    return () => clearTimeout(t);
  }, [activeTab, fetchWorkouts, fetchPrograms, checkActiveSession]);

  const resetForm = () => {
    setFormData({ letra: "", nome: "", subtitulo: "" });
    setIsEditing(null);
    setIsFormModalOpen(false);
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
      setIsFormModalOpen(false);
    } catch (err) {
      showToast("Erro: " + err.message, "error");
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
    setIsFormModalOpen(true);
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

      const { error: wError } = await supabase
        .from("treinos")
        .insert([{
          user_id: authUser.id,
          letra: newLetra,
          nome: `${workout.nome} (Cópia)`,
          subtitulo: workout.subtitulo,
          ordem_exibicao: workouts.length
        }]);

      if (wError) throw wError;

      const { data: blocks } = await supabase
        .from("blocos_treino")
        .select("*")
        .eq("letra_treino", workout.letra)
        .eq("user_id", authUser.id);

      if (blocks && blocks.length > 0) {
        const newBlocks = blocks.map((block) => {
          const rest = { ...block };
          delete rest.id;
          delete rest.created_at;
          return {
            ...rest,
            letra_treino: newLetra,
            user_id: authUser.id
          };
        });
        const { error: bError } = await supabase.from("blocos_treino").insert(newBlocks);
        if (bError) throw bError;
      }

      showToast(`Treino duplicado como ${newLetra}!`, "success");
      fetchWorkouts();
    } catch (err) {
      showToast("Erro ao duplicar: " + err.message, "error");
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
    } catch {
      showToast("Erro ao salvar ordem", "error");
    }
  };

  const startNewTraining = useCallback((letra) => {
    if (activeSession && activeSession.letra === letra) {
      showToast("Você já está neste treino.", "info");
      navigate(`/treino/${letra}`);
    } else {
      localStorage.removeItem("active_training_session");
      navigate(`/treino/${letra}`);
    }
  }, [activeSession, navigate, showToast]);

  const handlePlay = (letra) => {
    const hasProgress = activeSession && Object.values(activeSession.exerciseTimes || {}).some(times => times.length > 0);
    const hasUnsavedChanges = activeSession && JSON.stringify(activeSession.blocos) !== JSON.stringify(activeSession.originalBlocos);

    if (hasProgress) {
      setConflictModal({ isOpen: true, targetLetra: letra, type: 'active' });
    } else if (hasUnsavedChanges) {
      setConflictModal({ isOpen: true, targetLetra: letra, type: 'unsaved' });
    } else {
      startNewTraining(letra);
    }
  };

  const finishCurrentAndStart = () => {
    showToast("Por favor, finalize seu treino atual na tela de treino antes de iniciar um novo.", "info");
    navigate(-1);
  };

  const discardAndStart = (letra) => {
    localStorage.removeItem("active_training_session");
    navigate(`/treino/${letra}`);
  };

  const handleImportProgram = async (program) => {
    setSaving(true);
    try {
      // 1. Fetch training templates for this program
      const { data: templates, error: tError } = await supabase
        .from("treinos_padrao")
        .select("*")
        .eq("programa_padrao_id", program.id)
        .order("ordem_exibicao", { ascending: true });

      if (tError) throw tError;
      if (!templates || templates.length === 0) {
        showToast("Este programa não possui treinos cadastrados.", "warning");
        setSaving(false);
        return;
      }

      // 2. Pre-calculate unique letters for the user to avoid conflicts
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const currentUsedLetras = workouts.map(w => w.letra);
      const letraMap = {}; // original_template_letra -> unique_user_letra

      templates.forEach(template => {
        if (!currentUsedLetras.includes(template.letra) && !Object.values(letraMap).includes(template.letra)) {
          letraMap[template.letra] = template.letra;
        } else {
          // Find next available letter
          for (let char of alphabet) {
            if (!currentUsedLetras.includes(char) && !Object.values(letraMap).includes(char)) {
              letraMap[template.letra] = char;
              break;
            }
          }
          // Fallback if alphabet is full
          if (!letraMap[template.letra]) {
             letraMap[template.letra] = template.letra + "x";
          }
        }
      });

      // 3. Clone each training template to the user's treinos
      const currentWorkoutsCount = workouts.length;

      for (let i = 0; i < templates.length; i++) {
        const template = templates[i];
        const uniqueLetra = letraMap[template.letra];

        const { error: wError } = await supabase
          .from("treinos")
          .insert([{
            user_id: authUser.id,
            letra: uniqueLetra,
            nome: template.nome,
            subtitulo: template.subtitulo,
            ordem_exibicao: currentWorkoutsCount + i,
            programa_padrao_id: program.id
          }]);

        if (wError) throw wError;

        // 4. Fetch associated blocks for this template and clone them
        const { data: blocks, error: bError } = await supabase
          .from("blocos_treino_padrao")
          .select("*")
          .eq("treino_padrao_id", template.id);

        if (bError) throw bError;

        if (blocks && blocks.length > 0) {
          const newBlocks = blocks.map(block => ({
            user_id: authUser.id,
            letra_treino: uniqueLetra,
            exercicio_id: block.exercicio_id,
            numero_bloco: block.numero_bloco,
            ordem_execucao: block.ordem_execucao,
            series_alvo: block.series_alvo,
            reps_alvo: block.reps_alvo
          }));

          const { error: insError } = await supabase
            .from("blocos_treino")
            .insert(newBlocks);

          if (insError) throw insError;
        }
      }

      showToast(`Programa "${program.nome}" importado com sucesso!`, "success");
      setActiveTab("my_workouts");
      fetchWorkouts();
    } catch (err) {
      showToast("Erro ao importar programa: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-zinc-950 text-white flex flex-col"
    >
      {/* Header */}
      <header className="p-4 px-6 border-b border-white/5 flex justify-between items-center sticky top-0 bg-zinc-950/80 backdrop-blur-xl z-20 max-w-2xl mx-auto w-full pb-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-white">
              <LayoutGrid size={20} style={{ color: "var(--color-primary)" }} />
              Gerenciar Treinos
            </h2>
          </div>
        </div>

        {/* Tab Control */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-8 translate-y-[50%]">
          <button
            onClick={() => setActiveTab("my_workouts")}
            className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${
              activeTab === "my_workouts"
                ? "text-[var(--color-primary)] border-[var(--color-primary)]"
                : "text-zinc-500 border-transparent opacity-50 hover:opacity-100"
            }`}
          >
            Meus Treinos
          </button>
          <button
            onClick={() => setActiveTab("explore")}
            className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${
              activeTab === "explore"
                ? "text-[var(--color-primary)] border-[var(--color-primary)]"
                : "text-zinc-500 border-transparent opacity-50 hover:opacity-100"
            }`}
          >
            Explorar Programas
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full flex-1 pt-4">
        {activeTab === "my_workouts" ? (
          <>
            <div className="p-6 pb-0">
              <button
                onClick={() => { resetForm(); setIsFormModalOpen(true); }}
                className="w-full py-3 bg-[var(--color-primary)] text-[var(--text-on-primary)] rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Adicionar novo treino
              </button>
            </div>

            {/* List Area */}
            <div
          className={`p-6 space-y-3 flex-1 ${!isPremium ? "resilient-bottom-spacing" : "pb-10"}`}
            >
              <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">Sua Biblioteca</h3>

              {loading ? (
                <div className="py-20 text-center animate-pulse">
                  <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase">Carregando treinos...</p>
                </div>
              ) : workouts.length === 0 ? (
                <div className="py-20 text-center opacity-20">
                  <LayoutGrid size={48} className="mx-auto mb-4 text-white" />
                  <p className="font-bold text-white">Nenhum template encontrado.</p>
                </div>
              ) : (
                workouts.map((workout, idx) => {
                  const isCurrent = activeSession && workout.letra === activeSession.letra;
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
                          {workout.programas_padrao && (
                            <p className="text-[8px] font-black uppercase text-[var(--color-primary)] mb-0.5 tracking-tighter opacity-80">
                              Ficha Base: {workout.programas_padrao.nome}
                            </p>
                          )}
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
          </>
        ) : (
          <div className="flex flex-col h-full">
            {/* Modalidade Tabs */}
            <div className="sticky top-0 bg-zinc-950/80 backdrop-blur-xl z-10 border-b border-white/5">
               <div className="flex gap-6 px-6 overflow-x-auto scrollbar-none no-scrollbar py-4">
                {modalidades.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedExploreModality(m)}
                    className={`text-[10px] font-black uppercase tracking-widest pb-1 transition-all whitespace-nowrap relative ${
                      selectedExploreModality?.id === m.id
                        ? "text-[var(--color-primary)]"
                        : "text-zinc-500 opacity-50 hover:opacity-100"
                    }`}
                  >
                    {m.nome}
                    {selectedExploreModality?.id === m.id && (
                      <div className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-[var(--color-primary)]"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className={`p-6 space-y-6 flex-1 ${!isPremium ? "resilient-bottom-spacing" : "pb-10"}`}>
            <div className="px-1">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Catálogo de Programas</h3>
              <p className="text-[10px] text-zinc-600 font-bold uppercase leading-tight">Escolha um programa estruturado por especialistas para importar.</p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-zinc-900/30 border border-white/5 rounded-[24px] p-5 animate-pulse flex flex-col gap-4 shadow-xl">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-4">
                        <div className="w-3/4 h-5 bg-white/10 rounded mb-2"></div>
                        <div className="w-full h-12 bg-white/5 rounded"></div>
                      </div>
                      <div className="w-12 h-6 bg-white/5 rounded-lg"></div>
                    </div>
                    <div className="w-full h-10 bg-white/5 rounded-xl"></div>
                  </div>
                ))}
              </div>
            ) : availablePrograms.filter(p => p.modalidade_id === selectedExploreModality?.id).length === 0 ? (
              <div className="py-20 text-center opacity-20">
                <LayoutGrid size={48} className="mx-auto mb-4 text-white" />
                <p className="font-bold text-white uppercase text-xs">Nenhum programa disponível nesta categoria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {availablePrograms.filter(p => p.modalidade_id === selectedExploreModality?.id).map((prog) => (
                  <div key={prog.id} className="bg-zinc-900/50 border border-white/10 rounded-[24px] p-5 hover:bg-zinc-900 transition-all flex flex-col gap-4 shadow-xl group">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-4">
                        <h4 className="text-base font-black text-white uppercase tracking-tight leading-tight mb-1 group-hover:text-[var(--color-primary)] transition-colors">
                          {prog.nome}
                        </h4>
                        <p className="text-xs text-zinc-400 font-medium leading-relaxed opacity-80">
                          {prog.descricao || prog.objetivo}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={`px-2.5 py-1 rounded-lg border font-black text-[8px] uppercase tracking-widest ${
                          prog.nivel === 'Avançado' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                          prog.nivel === 'Intermediário' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                          'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                        }`}>
                          {prog.nivel}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleImportProgram(prog)}
                      disabled={saving}
                      className="w-full py-2.5 bg-[var(--color-primary)] text-[var(--text-on-primary)] hover:brightness-110 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-[var(--color-primary)]/10"
                    >
                      {saving ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Plus size={14} />
                      )}
                      Importar Programa
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>

      {/* Internal Modals */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-white/10 w-full max-w-xs rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-center text-white mb-2">Excluir Treino?</h2>
            <p className="text-zinc-500 text-center text-sm mb-8">
              Tem certeza que deseja apagar o treino <strong>{showDeleteConfirm.letra}</strong>? Esta ação não pode ser desfeita.
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

      {isFormModalOpen && (
        <div className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-zinc-950 border border-white/10 w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                {isEditing ? 'Editar Treino' : 'Novo Treino'}
              </h2>
              <button onClick={resetForm} className="text-zinc-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
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
                    className="w-full p-3 bg-zinc-900 border border-white/5 text-white rounded-2xl font-bold focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all uppercase"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1 ml-1">Nome do Treino</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Peito e Tríceps"
                    required
                    className="w-full p-3 bg-zinc-900 border border-white/5 text-white rounded-2xl font-bold focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1 ml-1">Subtítulo / Descrição</label>
                <input
                  type="text"
                  value={formData.subtitulo}
                  onChange={(e) => setFormData({ ...formData, subtitulo: e.target.value })}
                  placeholder="Ex: Foco em hipertrofia"
                  className="w-full p-3 bg-zinc-900 border border-white/5 text-white rounded-2xl font-bold focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-2 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-[var(--color-primary)] text-[var(--text-on-primary)] rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isEditing ? <Check size={16} /> : <Plus size={16} />}
                  {isEditing ? "Atualizar Dados" : "Criar Treino"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full py-3 bg-white/5 text-zinc-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
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
                ? 'Você já tem uma sessão iniciada. Deseja finalizar o progresso atual ou descartar antes de mudar?'
                : 'O treino atual possui alterações não salvas. Deseja descartar as edições e abrir o novo treino?'}
            </p>
            <div className="flex flex-col gap-2">
              {conflictConfig.type === 'active' ? (
                <>
                  <button
                    onClick={() => { finishCurrentAndStart(); setConflictModal({ isOpen: false }); }}
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 active:scale-95 transition-all"
                  >
                    Finalizar e Abrir
                  </button>
                  <button
                    onClick={() => { discardAndStart(conflictConfig.targetLetra); setConflictModal({ isOpen: false }); }}
                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 active:scale-95 transition-all"
                  >
                    Descartar e Abrir
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { discardAndStart(conflictConfig.targetLetra); setConflictModal({ isOpen: false }); }}
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

      {!isFormModalOpen && <AdBanner isPremium={isPremium} variant="fixed-bottom" />}
    </div>
  );
};

export default WorkoutTemplates;
