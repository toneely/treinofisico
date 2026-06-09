import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  ChevronLeft,
  User,
  Mail,
  LogOut,
  Camera,
  Save,
  Lock,
  Loader2,
  Check,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const Profile = () => {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    foco_treino: "",
    atividade_alternativa: "Capoeira",
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      showToast("Erro ao buscar perfil: " + error.message, "error");
    } else if (data) {
      setFormData({
        nome: data.nome || user.user_metadata?.full_name || "",
        foco_treino: data.foco_treino || "",
        atividade_alternativa: data.atividade_alternativa || "Capoeira",
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        nome: user.user_metadata?.full_name || "",
      }));
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("usuarios").upsert({
      id: user.id,
      nome: formData.nome,
      foco_treino: formData.foco_treino,
      atividade_alternativa: formData.atividade_alternativa,
    });

    if (error) showToast("Erro ao salvar: " + error.message, "error");
    else showToast("Perfil atualizado!", "success");
    setSaving(false);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast("As senhas não coincidem", "error");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showToast("A senha deve ter pelo menos 6 caracteres", "error");
      return;
    }

    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword,
    });

    if (error) {
      showToast("Erro ao atualizar senha: " + error.message, "error");
    } else {
      showToast("Senha alterada com sucesso!", "success");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    }
    setUpdatingPassword(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
    showToast("Sessão encerrada", "info");
  };

  if (loading)
    return (
      <div className="p-10 text-center text-slate-400">
        Carregando perfil...
      </div>
    );

  return (
    <div className="p-6 max-w-2xl mx-auto pb-24">
      <header className="mb-8 flex justify-between items-center">
        <Link
          to="/inicio"
          className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 transition"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-black ">Meu Perfil</h1>
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl hover:opacity-70 transition text-slate-400"
          title="Sair"
        >
          <LogOut size={20} />
        </button>
      </header>

      <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200 mb-6 flex flex-col items-center">
        <div className="relative mb-4">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center overflow-hidden border-4 border-white shadow-lg"
            style={{
              backgroundColor: "var(--color-secondary)",
              color: "var(--text-on-secondary)",
            }}
          >
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={40} className="text-white" />
            )}
          </div>
          <button
            className="absolute -bottom-2 -right-2 p-2 rounded-xl shadow-lg border-2 border-white"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--text-on-primary)",
            }}
          >
            <Camera size={14} />
          </button>
        </div>
        <h2 className="text-xl font-bold ">{formData.nome || "Atleta"}</h2>
        <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
          <Mail size={14} /> {user.email}
        </div>
        {user.email === "tone.mendes@gmail.com" && (
          <Link
            to="/admin"
            className="mt-4 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition"
          >
            Painel Administrativo
          </Link>
        )}
      </section>

      <div className="space-y-6">
        <section className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
            <User style={{ color: "var(--color-primary)" }} size={18} />
            <h3 className="font-bold  uppercase text-xs tracking-widest">
              Dados da Conta
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Nome de Exibição
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className="p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 font-bold  transition-all focus:shadow-[0_0_0_2px_var(--color-primary)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Foco de Treino
              </label>
              <input
                type="text"
                name="foco_treino"
                value={formData.foco_treino}
                onChange={handleInputChange}
                className="p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 font-bold  transition-all focus:shadow-[0_0_0_2px_var(--color-primary)]"
                placeholder="Ex: Calistenia / Musculação"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Atividade Alternativa
              </label>
              <input
                type="text"
                name="atividade_alternativa"
                value={formData.atividade_alternativa}
                onChange={handleInputChange}
                className="p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 font-bold  transition-all focus:shadow-[0_0_0_2px_var(--color-primary)]"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-2xl font-black shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--text-on-primary)",
              }}
            >
              {saving ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Save size={18} /> Salvar Dados
                </>
              )}
            </button>
          </div>
        </section>

        <section className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
            <Lock style={{ color: "var(--color-secondary)" }} size={18} />
            <h3 className="font-bold uppercase text-xs tracking-widest">
              Segurança
            </h3>
          </div>
          <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Nova Senha
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 font-bold transition-all focus:shadow-[0_0_0_2px_var(--color-secondary)]"
                placeholder="••••••••"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 font-bold transition-all focus:shadow-[0_0_0_2px_var(--color-secondary)]"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={updatingPassword}
              className="w-full py-4 rounded-2xl font-black shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
              style={{
                backgroundColor: "var(--color-secondary)",
                color: "var(--text-on-secondary)",
              }}
            >
              {updatingPassword ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Check size={18} /> Atualizar Senha
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Profile;
