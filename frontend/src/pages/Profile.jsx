import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AdBanner from "../components/ui/AdBanner";
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
  Image as ImageIcon,
  Palette,
  Dumbbell,
  History as HistoryIcon,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import imageCompression from "browser-image-compression";
import { useAppearance } from "../context/AppearanceContext";

const Profile = () => {
  const { user, profile, refreshProfile, signOut, isPremium } = useAuth();
  const { showToast } = useToast();
  const { settings, updateAppearance } = useAppearance();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [creatingPreference, setCreatingPreference] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [formData, setFormData] = useState({
    nome: "",
    foco_treino: "",
    atividade_alternativa: "Capoeira",
    avatar_url: null,
    testador_pagamento: false,
    status_assinatura: "free",
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    // SSoT: Prioritize database profile. Metadata is only a fallback for new profiles.
    // Wrap in setTimeout to prevent cascading renders and satisfy linting.
    const timer = setTimeout(() => {
      if (profile) {
        setFormData({
          nome: profile.nome || "",
          foco_treino: profile.foco_treino || "",
          atividade_alternativa: profile.atividade_alternativa || "Capoeira",
          avatar_url: profile.avatar_url || null,
          testador_pagamento: profile.testador_pagamento || false,
          status_assinatura: profile.status_assinatura || "free",
        });
      } else if (user) {
        // Fallback for UI during first creation (metadata as placeholder)
        setFormData((prev) => ({
          ...prev,
          nome: user.user_metadata?.full_name || "",
          avatar_url: user.user_metadata?.avatar_url || null,
        }));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [profile, user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user?.id) {
      showToast("Erro: Usuário não identificado.", "error");
      return;
    }

    setSaving(true);
    // Explicit restricted update: only fields editable by user
    const { error } = await supabase
      .from("usuarios")
      .update({
        nome: formData.nome,
        foco_treino: formData.foco_treino,
        atividade_alternativa: formData.atividade_alternativa,
      })
      .eq("id", user.id);

    if (error) {
      console.error("Erro no RLS/Update:", error);
      showToast("Erro ao salvar: " + error.message, "error");
    } else {
      showToast("Perfil atualizado!", "success");
      // Imediatamente após o sucesso, atualiza o contexto global
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleUploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 400, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const fileName = `${user.id}/${Date.now()}_avatar.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatares")
        .upload(fileName, compressedFile);

      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from("avatares").getPublicUrl(fileName).data.publicUrl;

      const { error: dbError } = await supabase
        .from("usuarios")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (dbError) throw dbError;

      await refreshProfile();
      showToast("Foto de perfil atualizada!", "success");
      setShowAvatarModal(false);
    } catch (err) {
      showToast("Erro no upload: " + err.message, "error");
    } finally {
      setUploadingAvatar(false);
    }
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

  const handleColorChange = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    const { error } = await updateAppearance(newSettings);
    if (error) showToast("Erro ao atualizar cor: " + error.message, "error");
  };

  const handleCreateTestPreference = async () => {
    setCreatingPreference(true);
    try {
      const { data, error } = await supabase.functions.invoke('mercado-pago-subscription', {
        body: {
          planId: 'default_premium',
          external_reference: user.id,
          email: user.email
        }
      });

      if (error) throw error;
      if (data?.init_point) {
        showToast("Redirecionando para o Sandbox...", "info");
        window.location.href = data.init_point;
      } else {
        throw new Error("Link de pagamento não retornado.");
      }
    } catch (e) {
      console.error("Erro ao criar assinatura:", e);
      showToast("Erro ao carregar checkout de teste.", "error");
    } finally {
      setCreatingPreference(false);
    }
  };

  // if (loading && !user)
  //   return (
  //     <div className="p-10 text-center text-slate-400">
  //       Carregando perfil...
  //     </div>
  //   );

  return (
    <div
      className="p-6 max-w-2xl mx-auto"
      style={{ paddingBottom: isPremium ? "80px" : "148px" }}
    >
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
            {formData.avatar_url ? (
              <img
                src={formData.avatar_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={40} className="text-white" />
            )}
          </div>
          <button
            onClick={() => setShowAvatarModal(true)}
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

      {/* Mercado Pago Test Section (Hidden for normal users) */}
      {formData.testador_pagamento && formData.status_assinatura !== 'premium' && (
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] overflow-hidden shadow-xl border border-white/10 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400">
              <Zap size={18} fill="currentColor" />
              <h3 className="font-black uppercase text-xs tracking-widest">
                Área de Testes - Seja Premium
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-white/10 text-white/40">
              Plano Free
            </span>
          </div>

          <div className="p-8 text-center">
            <p className="text-slate-400 text-xs mb-6 leading-relaxed">
              Você está visualizando esta seção porque é um <b>testador autorizado</b>. Use este botão para validar a jornada de compra no Sandbox do Mercado Pago.
            </p>

            <button
              onClick={handleCreateTestPreference}
              disabled={creatingPreference}
              className="w-full py-4 bg-amber-500 text-black rounded-2xl font-black uppercase text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {creatingPreference ? <Loader2 className="animate-spin" /> : (
                <>
                  <Zap size={16} fill="currentColor" /> Assinar com Mercado Pago
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* Status for Premium Testers */}
      {formData.testador_pagamento && formData.status_assinatura === 'premium' && (
        <section className="bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] p-6 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-emerald-500 font-black uppercase text-[10px] tracking-widest">Status da Conta</h3>
              <p className="text-slate-900 font-bold">Assinatura Premium Ativa</p>
            </div>
          </div>
          <span className="px-2 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase rounded-lg">Sandbox</span>
        </section>
      )}

      <div className="space-y-6">
        <section className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
            <Palette style={{ color: "var(--color-primary)" }} size={18} />
            <h3 className="font-bold  uppercase text-xs tracking-widest">
              Aparência
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Cor Primária / Destaque A
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.color_ex_a}
                    onChange={(e) => handleColorChange("color_ex_a", e.target.value)}
                    className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 bg-transparent"
                  />
                  <div className="flex-1 px-3 py-2 bg-slate-50 rounded-xl font-mono text-xs uppercase font-bold text-slate-500">
                    {settings.color_ex_a}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Cor Secundária / Destaque B
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.color_ex_b}
                    onChange={(e) => handleColorChange("color_ex_b", e.target.value)}
                    className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 bg-transparent"
                  />
                  <div className="flex-1 px-3 py-2 bg-slate-50 rounded-xl font-mono text-xs uppercase font-bold text-slate-500">
                    {settings.color_ex_b}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 text-amber-800">
               <Palette className="shrink-0" size={20} />
               <p className="text-xs font-medium leading-relaxed">
                 A interface utiliza tons Claros para gestão e tons Escuros para a execução do treino. As cores acima definem os destaques e botões principais.
               </p>
            </div>
          </div>
        </section>

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

      {/* Avatar Upload Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xs rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Camera size={20} style={{ color: "var(--color-primary)" }} />
              Atualizar Foto
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="p-4 rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-50 transition-all"
                >
                  <ImageIcon size={24} />
                  <span className="text-[8px] font-black uppercase">Galeria</span>
                </button>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="p-4 rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-50 transition-all"
                >
                  <Camera size={24} />
                  <span className="text-[8px] font-black uppercase">Câmera</span>
                </button>
              </div>

              {uploadingAvatar && (
                <div className="flex items-center justify-center py-4 text-slate-400 gap-2 text-xs font-bold">
                  <Loader2 className="animate-spin" size={16} /> Processando...
                </div>
              )}

              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUploadAvatar} />
              <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleUploadAvatar} />

              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAvatarModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AdBanner isPremium={isPremium} />

      {/* Footer Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-around items-center z-50">
        <Link
          to="/inicio"
          className="text-slate-400 hover:opacity-80 flex flex-col items-center gap-1"
        >
          <Dumbbell size={24} />
          <span className="text-[10px] font-bold uppercase">Treinos</span>
        </Link>
        <Link
          to="/historico"
          className="text-slate-400 hover:opacity-80 flex flex-col items-center gap-1"
        >
          <HistoryIcon size={24} />
          <span className="text-[10px] font-bold uppercase">Histórico</span>
        </Link>
        <Link
          to="/perfil"
          className="flex flex-col items-center gap-1"
          style={{ color: "var(--color-primary-safe)" }}
        >
          <User size={24} />
          <span className="text-[10px] font-bold uppercase">Perfil</span>
        </Link>
      </nav>
    </div>
  );
};

export default Profile;
