import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { Search, Loader2, Plus, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const ExerciseSelector = ({
  currentExerciseId,
  onSelect,
  overrideUserId = null,
}) => {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalidade, setModalidade] = useState("Musculação");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEx, setSelectedEx] = useState(null);
  const dropdownRef = useRef(null);

  const modalidades = [
    "Musculação",
    "Atletismo",
    "Natação",
    "Pilates",
    "Calistenia",
    "CrossFit",
    "Mobilidade",
    "Cardio",
    "Luta",
  ];

  useEffect(() => {
    if (currentExerciseId) {
      fetchCurrentExercise();
    }
  }, [currentExerciseId]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (isOpen) fetchResults();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, modalidade, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCurrentExercise = async () => {
    const { data } = await supabase
      .from("exercicios")
      .select("id, nome, alvo_principal")
      .eq("id", currentExerciseId)
      .maybeSingle();
    if (data) setSelectedEx(data);
  };

  const fetchResults = async () => {
    setLoading(true);
    const userId = overrideUserId === null ? (authUser?.id || null) : overrideUserId;

    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('buscar_exercicios_unificados', {
        p_termo_busca: searchTerm,
        p_modalidade: modalidade,
        p_user_id: userId
      });

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error("Erro na busca unificada:", error);
      // Fallback logic could go here if RPC is not yet implemented
    } finally {
      setLoading(false);
    }
  };

  const handleSelection = async (exercise) => {
    let finalId = exercise.id_pessoal;

    if (exercise.fonte === 'padrao') {
      setLoading(true);
      const userId = overrideUserId === null ? (authUser?.id || null) : overrideUserId;

      try {
        const { data: newId, error } = await supabase.rpc('copiar_exercicio_padrao', {
          p_exercicio_padrao_id: exercise.id_original,
          p_user_id: userId
        });

        if (error) throw error;
        finalId = newId;
      } catch (error) {
        showToast("Erro ao vincular exercício: " + error.message, "error");
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    setSelectedEx({ ...exercise, id: finalId });
    setIsOpen(false);
    onSelect({ ...exercise, id: finalId });
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Categoria Selector Chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-1 scrollbar-none no-scrollbar">
        {modalidades.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setModalidade(m);
              if (!isOpen) setIsOpen(true);
            }}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter whitespace-nowrap transition-all ${
              modalidade === m
                ? "shadow-md"
                : "bg-black/5 dark:bg-white/5 opacity-60 border border-black/10 dark:border-white/10"
            }`}
            style={
              modalidade === m
                ? {
                    backgroundColor: "var(--color-primary)",
                    color: "var(--text-on-primary)",
                  }
                : {}
            }
          >
            {m}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2 border border-black/10 dark:border-zinc-800 rounded-lg text-left text-sm bg-black/5 dark:bg-zinc-900/50 dark:text-slate-100 transition flex justify-between items-center"
        style={{ hoverBorderColor: "var(--color-primary)" }}
      >
        <span className={selectedEx ? "font-medium" : "opacity-40"}>
          {selectedEx ? selectedEx.nome : "Selecionar exercício..."}
        </span>
        <Search size={14} className="opacity-40" />
      </button>

      {isOpen && (
        <div className="absolute z-[110] mt-1 w-full bg-[var(--bg-gestao)] dark:bg-zinc-950 border border-black/10 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-black/5 dark:border-zinc-800/50 flex gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-30 dark:text-zinc-500"
                size={12}
              />
              <input
                autoFocus
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 bg-black/5 dark:bg-zinc-900/50 border-none rounded-lg text-xs outline-none focus:ring-2 transition-all focus:shadow-[0_0_0_2px_var(--color-primary)] text-inherit dark:text-slate-100 dark:placeholder:text-zinc-500"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <Loader2
                  size={16}
                  className="animate-spin mx-auto"
                  style={{ color: "var(--color-primary)" }}
                />
              </div>
            ) : results.length > 0 ? (
              results.map((ex) => (
                <button
                  key={`${ex.fonte}_${ex.id_original}`}
                  onClick={() => handleSelection(ex)}
                  className="w-full p-3 text-left hover:bg-black/5 dark:hover:bg-zinc-800 flex items-center justify-between border-b border-black/5 dark:border-zinc-800/30 last:border-0 transition-colors"
                >
                  <div className="text-slate-900 dark:text-slate-100">
                    <p className="text-xs font-bold">{ex.nome}</p>
                    <p className="text-[10px] opacity-60 dark:text-zinc-400 dark:opacity-100">
                      {ex.alvo_principal}
                    </p>
                  </div>
                  {ex.fonte === 'padrao' ? (
                    <span
                      className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase"
                      style={{
                        color: "var(--color-primary)",
                        backgroundColor: "var(--color-primary)20",
                      }}
                    >
                      Global
                    </span>
                  ) : (
                    <Check size={12} className="text-emerald-500" />
                  )}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs opacity-40">
                Nenhum exercício encontrado.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseSelector;
