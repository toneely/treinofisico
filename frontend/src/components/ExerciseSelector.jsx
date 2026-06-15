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
    const userId = overrideUserId || authUser.id;

    // Search personal library
    const { data: personal } = await supabase
      .from("exercicios")
      .select("id, nome, alvo_principal, is_global:id(id)") // logic flag
      .eq("user_id", userId)
      .eq("modalidade", modalidade)
      .ilike("nome", `%${searchTerm}%`)
      .limit(10);

    // Search global library
    const { data: global } = await supabase
      .from("exercicios_padrao")
      .select("id, nome, alvo_principal")
      .eq("modalidade", modalidade)
      .ilike("nome", `%${searchTerm}%`)
      .limit(10);

    // Combine results (prioritize personal)
    const combined = [...(personal || [])];
    const personalNames = new Set(combined.map((e) => e.nome.toLowerCase()));

    if (global) {
      global.forEach((g) => {
        if (!personalNames.has(g.nome.toLowerCase())) {
          combined.push({ ...g, is_global: true });
        }
      });
    }

    setResults(combined);
    setLoading(false);
  };

  const handleSelection = async (exercise) => {
    let finalId = exercise.id;

    if (exercise.is_global) {
      // Copy-on-Write Logic
      setLoading(true);
      const userId = overrideUserId || authUser.id;

      // Double check if it was already copied (race condition or existing)
      const { data: existing } = await supabase
        .from("exercicios")
        .select("id")
        .eq("user_id", userId)
        .eq("nome", exercise.nome)
        .maybeSingle();

      if (existing) {
        finalId = existing.id;
      } else {
        // Fetch full global data to copy
        const { data: globalData } = await supabase
          .from("exercicios_padrao")
          .select("*")
          .eq("id", exercise.id)
          .single();

        if (globalData) {
          const { id, ...copyData } = globalData;
          const { data: newPersonal, error } = await supabase
            .from("exercicios")
            .insert([{ ...copyData, user_id: userId }])
            .select()
            .single();

          if (error) {
            showToast("Erro ao vincular exercício: " + error.message, "error");
            setLoading(false);
            return;
          }
          finalId = newPersonal.id;
        }
      }
      setLoading(false);
    }

    setSelectedEx(exercise);
    setIsOpen(false);
    onSelect({ ...exercise, id: finalId });
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2 border border-slate-200 rounded-lg text-left text-sm bg-white transition flex justify-between items-center"
        style={{ hoverBorderColor: "var(--color-primary)" }}
      >
        <span className={selectedEx ? " font-medium" : "text-slate-400"}>
          {selectedEx ? selectedEx.nome : "Selecionar exercício..."}
        </span>
        <Search size={14} className="text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-50 flex gap-2">
            <select
              value={modalidade}
              onChange={(e) => setModalidade(e.target.value)}
              className="p-1.5 bg-slate-50 border-none rounded-lg text-xs font-bold outline-none focus:ring-2 transition-all focus:shadow-[0_0_0_2px_var(--color-primary)]"
            >
              {modalidades.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <div className="relative flex-1">
              <Search
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300"
                size={12}
              />
              <input
                autoFocus
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border-none rounded-lg text-xs outline-none focus:ring-2 transition-all focus:shadow-[0_0_0_2px_var(--color-primary)]"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
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
                  key={`${ex.is_global ? "g" : "p"}_${ex.id}`}
                  onClick={() => handleSelection(ex)}
                  className="w-full p-3 text-left hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0"
                >
                  <div>
                    <p className="text-xs font-bold ">{ex.nome}</p>
                    <p className="text-[10px] text-slate-400">
                      {ex.alvo_principal}
                    </p>
                  </div>
                  {ex.is_global ? (
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
              <div className="p-4 text-center text-xs text-slate-400">
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
