import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Plus, Trash2, Edit2, Check, X, LayoutGrid } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

const WorkoutManager = ({ overrideUserId = null }) => {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(null);
  const [formData, setFormData] = useState({
    letra: "",
    nome: "",
    subtitulo: "",
  });

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    setLoading(true);
    let query = supabase.from("treinos").select("*").order("letra", { ascending: true });

    if (overrideUserId === null) {
      query = query.is("user_id", null);
    } else {
      query = query.eq("user_id", overrideUserId || authUser.id);
    }

    const { data, error } = await query;
    if (error) {
      showToast("Erro ao buscar treinos: " + error.message, "error");
    } else {
      setWorkouts(data);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // When overrideUserId is explicitly null, we want to save with user_id as null (global template)
    const userId = overrideUserId === null ? null : (overrideUserId || authUser.id);

    // Check for uniqueness based on user_id and letra
    const { data: existing } = await supabase
      .from("treinos")
      .select("id")
      .eq("letra", formData.letra)
      .filter("user_id", userId === null ? "is" : "eq", userId)
      .not("id", "eq", isEditing || 0)
      .maybeSingle();

    if (existing) {
      showToast(`A letra "${formData.letra}" já está em uso para este escopo.`, "error");
      return;
    }

    if (isEditing) {
      const query = supabase
        .from("treinos")
        .update({ ...formData, user_id: userId })
        .eq("id", isEditing);

      // The update should respect the multitenancy if it's not a global template
      if (userId !== null) {
        query.eq("user_id", userId);
      } else {
        query.is("user_id", null);
      }

      const { error } = await query;
      if (error)
        showToast("Erro ao atualizar treino: " + error.message, "error");
      else {
        showToast("Treino atualizado com sucesso!", "success");
        setIsEditing(null);
        resetForm();
        fetchWorkouts();
      }
    } else {
      const { error } = await supabase
        .from("treinos")
        .insert([{ ...formData, user_id: userId }]);
      if (error) showToast("Erro ao criar treino: " + error.message, "error");
      else {
        showToast("Treino criado com sucesso!", "success");
        resetForm();
        fetchWorkouts();
      }
    }
  };

  const resetForm = () => {
    setFormData({ letra: "", nome: "", subtitulo: "" });
    setIsEditing(null);
  };

  const handleEdit = (workout) => {
    setIsEditing(workout.id);
    setFormData({
      letra: workout.letra,
      nome: workout.nome,
      subtitulo: workout.subtitulo || "",
    });
    // Smooth scroll to top form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    const userId = overrideUserId === null ? null : (overrideUserId || authUser.id);
    if (
      window.confirm(
        "Tem certeza que deseja excluir este treino? Isso pode afetar a visualização de blocos.",
      )
    ) {
      const query = supabase.from("treinos").delete().eq("id", id);

      if (userId === null) {
        query.is("user_id", null);
      } else {
        query.eq("user_id", userId);
      }

      const { error } = await query;
      if (error) showToast("Erro ao excluir treino: " + error.message, "error");
      else {
        showToast("Treino excluído!", "success");
        fetchWorkouts();
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50">
        <h2 className="text-xl font-bold  flex items-center gap-2">
          <LayoutGrid size={20} style={{ color: "var(--color-primary)" }} />
          Gerenciar Treinos (Categorias)
        </h2>
      </div>
      <div className="p-6">
        <form
          onSubmit={handleSubmit}
          className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Letra (ex: A, B, C)
            </label>
            <input
              type="text"
              name="letra"
              value={formData.letra}
              onChange={handleInputChange}
              className="p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 transition-all focus:shadow-[0_0_0_2px_var(--color-primary)]"
              maxLength={2}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Nome do Treino
            </label>
            <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleInputChange}
              className="p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 transition-all focus:shadow-[0_0_0_2px_var(--color-primary)]"
              required
            />
          </div>
          <div className="md:col-span-2 flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Subtítulo / Descrição
            </label>
            <input
              type="text"
              name="subtitulo"
              value={formData.subtitulo}
              onChange={handleInputChange}
              className="p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 transition-all focus:shadow-[0_0_0_2px_var(--color-primary)]"
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-slate-200  rounded-lg font-medium hover:bg-slate-300 transition flex items-center gap-2"
              >
                <X size={18} /> Cancelar
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2  rounded-lg font-medium transition flex items-center gap-2 shadow-lg"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--text-on-primary)",
              }}
            >
              {isEditing ? <Check size={18} /> : <Plus size={18} />}
              {isEditing ? "Atualizar Treino" : "Adicionar Treino"}
            </button>
          </div>
        </form>
        {loading ? (
          <div className="text-center py-8 text-slate-500">
            Carregando categorias...
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map((workout) => (
              <div
                key={workout.id}
                className="p-4 rounded-xl border flex items-center justify-between transition bg-white border-slate-100 hover:border-slate-200"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg"
                    style={{
                      backgroundColor: "rgba(0,0,0,0.05)",
                      color: "var(--color-secondary)",
                    }}
                  >
                    {workout.letra}
                  </div>
                  <div>
                    <h4 className="font-bold ">{workout.nome}</h4>
                    <p className="text-xs text-slate-500">{workout.subtitulo}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(workout)}
                    className="p-2 text-slate-400 transition hover:opacity-70"
                    style={{ color: "var(--color-primary)" }}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(workout.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutManager;
