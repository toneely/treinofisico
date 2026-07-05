import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AdBanner from "../components/ui/AdBanner";
import {
  ChevronLeft,
  User,
  Mail,
  LogOut,
  X,
  Camera,
  Save,
  CheckCircle2,
  Lock,
  Loader2,
  Check,
  Image as ImageIcon,
  Palette,
  Dumbbell,
  History as HistoryIcon,
  ShieldCheck,
  Zap,
  CreditCard,
  QrCode,
  Copy,
  AlertCircle,
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
  const [creatingPayment, setCreatingPayment] = useState(null);

  const [showCardModal, setShowCardModal] = useState(false);
  const [pixData, setPixData] = useState(null);
  const mpRef = useRef(null);

  const [cardData, setCardData] = useState({
    cardNumber: "",
    cardExpirationMonth: "",
    cardExpirationYear: "",
    securityCode: "",
    cardholderName: "",
    identificationType: "CPF",
    identificationNumber: "",
  });

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

  const [appSettings, setAppSettings] = useState({ subscription_price: 29.90 });

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase.from('config_app').select('*').single();
      if (data) setAppSettings(data);
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    if (profile) {
      const timer = setTimeout(() => {
        setFormData({
          nome: profile.nome || "",
          foco_treino: profile.foco_treino || "",
          atividade_alternativa: profile.atividade_alternativa || "Capoeira",
          avatar_url: profile.avatar_url || null,
          testador_pagamento: profile.testador_pagamento || false,
          status_assinatura: profile.status_assinatura || "free",
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  // Initialize Mercado Pago V2 with Public Key from Netlify/Vite Env
  useEffect(() => {
    const publicKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;
    if (window.MercadoPago && !mpRef.current && publicKey) {
      mpRef.current = new window.MercadoPago(publicKey);
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCardInputChange = (e) => {
    const { name, value } = e.target;
    setCardData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user?.id) {
      showToast("Erro: Usuário não identificado.", "error");
      return;
    }

    setSaving(true);
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

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
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

  async function handlePaymentInitiation(paymentType) {
    if (paymentType === 'card_recurring' || paymentType === 'card_one_time') {
      setShowCardModal(paymentType);
      return;
    }

    setCreatingPayment(paymentType);
    try {
      const { data, error } = await supabase.functions.invoke('mercado-pago-subscription', {
        body: {
          paymentType,
          external_reference: user.id,
          email: user.email,
          transaction_amount: appSettings.subscription_price
        }
      });

      if (error) throw error;

      if (data?.init_point) {
        showToast("Redirecionando para o Mercado Pago...", "info");
        window.location.href = data.init_point;
      } else if (data?.qr_code_base64) {
        setPixData(data);
        showToast("QR Code gerado!", "success");
      } else {
        throw new Error("Resposta inválida do servidor.");
      }
    } catch (e) {
      console.error("Erro no pagamento:", e);
      showToast("Erro: " + e.message, "error");
    } finally {
      setCreatingPayment(null);
    }
  };

  const handleProcessCardPayment = async (e) => {
    e.preventDefault();
    if (!mpRef.current) {
      showToast("SDK do Mercado Pago não inicializado.", "error");
      return;
    }

    setCreatingPayment(showCardModal);
    try {
      // 1. Get Payment Method (Brand)
      const paymentMethods = await mpRef.current.getPaymentMethods({
        bin: cardData.cardNumber.replace(/\s/g, '').substring(0, 6)
      });
      const paymentMethodId = paymentMethods.results?.[0]?.id || 'visa';

      // 2. Generate Card Token
      const tokenResponse = await mpRef.current.createCardToken({
        cardNumber: cardData.cardNumber.replace(/\s/g, ''),
        cardholderName: cardData.cardholderName,
        cardExpirationMonth: cardData.cardExpirationMonth,
        cardExpirationYear: cardData.cardExpirationYear,
        securityCode: cardData.securityCode,
        identificationType: cardData.identificationType,
        identificationNumber: cardData.identificationNumber,
      });

      if (tokenResponse.error) {
        throw new Error(tokenResponse.error[0]?.message || "Erro ao validar cartão.");
      }

      const cardToken = tokenResponse.id;

      // 3. Call Edge Function
      const { data, error } = await supabase.functions.invoke('mercado-pago-subscription', {
        body: {
          paymentType: showCardModal,
          external_reference: user.id,
          email: user.email,
          token: cardToken,
          payment_method_id: paymentMethodId,
          installments: 1,
          transaction_amount: appSettings.subscription_price
        }
      });

      if (error) throw error;

      if (data.status === 'approved') {
        showToast("Pagamento aprovado!", "success");
        setShowCardModal(false);
        await refreshProfile();
      } else {
        showToast(`Status: ${data.status}`, "info");
      }
    } catch (e) {
      console.error("Erro no checkout transparente:", e);
      showToast("Erro: " + e.message, "error");
    } finally {
      setCreatingPayment(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast("Código PIX copiado!", "success");
  };

  return (
    <div
      className="p-6 max-w-2xl mx-auto"
      style={{ paddingBottom: isPremium ? "80px" : "148px" }}
    >
      <header className="mb-8 flex justify-between items-center px-2">
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

      {/* 1. Identification Card */}
      <section className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-200 mb-6 flex flex-col items-center">
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

      <div className="space-y-6 px-1">
        {/* 2. Account Data (Dados Pessoais) */}
        <section className="bg-white rounded-[32px] overflow-hidden shadow-xl border border-slate-200">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
            <User style={{ color: "var(--color-primary)" }} size={18} />
            <h3 className="font-bold  uppercase text-xs tracking-widest">
              Dados da Conta
            </h3>
          </div>
          <div className="p-8 space-y-6">
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
            <div className="flex flex-col gap-1 opacity-60">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                E-mail (Referência)
              </label>
              <input
                type="text"
                value={user.email}
                readOnly
                className="p-3 bg-slate-50 border-none rounded-2xl outline-none font-bold cursor-not-allowed"
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

        {/* 3. Security (Nova Senha) */}
        <section className="bg-white rounded-[32px] overflow-hidden shadow-xl border border-slate-200">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
            <Lock style={{ color: "var(--color-secondary)" }} size={18} />
            <h3 className="font-bold uppercase text-xs tracking-widest">
              Segurança
            </h3>
          </div>
          <form onSubmit={handleUpdatePassword} className="p-8 space-y-6">
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

        {/* 4. Mercado Pago Payment Card */}
        {formData.testador_pagamento && formData.status_assinatura !== 'premium' && (
          <section className="bg-white rounded-[32px] overflow-hidden shadow-xl border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="p-8 border-b border-slate-50 text-center">
              <span className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
                Upgrade para Premium
              </span>
              <div className="flex items-baseline justify-center gap-2 mt-2">
                <span className="text-6xl font-black text-slate-900 tracking-tighter">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appSettings.subscription_price)}
                </span>
                <span className="text-base font-bold text-slate-400">/ mes</span>
              </div>

              <ul className="mt-10 space-y-5 text-left max-w-[260px] mx-auto">
                <li className="flex items-start gap-4 text-slate-700 text-sm font-bold leading-snug">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Acesso premium ilimitado e exclusivo</span>
                </li>
                <li className="flex items-start gap-4 text-slate-700 text-sm font-bold leading-snug">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Experiência completa sem anúncios</span>
                </li>
                <li className="flex items-start gap-4 text-slate-700 text-sm font-bold leading-snug">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Acompanhamento detalhado de evolução</span>
                </li>
              </ul>
            </div>

            <div className="p-8 space-y-8">
              {/* Section 1: Recurring */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Assinaturas (Renovação Automática)
                </h4>
                <button
                  onClick={() => handlePaymentInitiation('card_recurring')}
                  disabled={!!creatingPayment}
                  className="w-full py-5 rounded-2xl font-black text-sm transition-all flex items-center justify-between px-8 shadow-xl active:scale-95"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--text-on-primary)",
                  }}
                >
                  <div className="flex flex-col items-start">
                    <span className="text-[9px] uppercase opacity-80 mb-0.5">Recomendado</span>
                    <span>Cartão de Crédito</span>
                  </div>
                  {creatingPayment === 'card_recurring' ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} className="opacity-40" />}
                </button>

                <button
                  onClick={() => handlePaymentInitiation('native_subscription')}
                  disabled={!!creatingPayment}
                  className="w-full py-6 bg-[#009EE3] text-white rounded-2xl font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all flex flex-col items-center justify-center gap-2"
                >
                  <div className="flex items-center justify-center gap-2">
                    {creatingPayment === 'native_subscription' ? <Loader2 className="animate-spin" size={18} /> : (
                    <>
                      <svg viewBox="0 0 1000 350" className="h-6 w-auto" fill="white">
                        <path d="m496.75,221.66c-13.4-.63-20.16,2.56-24.57,5.93-6.09,4.65-9.8,11.53-9.8,22.52v56.51h7.88c2.11,0,4.22-.73,5.77-2.16,1.74-1.6,2.61-3.56,2.61-5.86v-21.12c1.92,3.31,4.45,5.74,7.65,7.32,3.03,1.41,6.53,2.12,10.51,2.12,7.49,0,13.64-2.98,18.41-8.97,4.78-6.15,7.17-14.15,7.17-24.06s-2.26-16.97-7.68-23.57c-4.38-5.34-11.04-8.35-17.94-8.66Zm5.55,46.38c-2.39,3.31-5.66,4.96-9.8,4.96-4.46,0-7.89-1.64-10.28-4.96-2.39-2.99-3.59-7.45-3.59-13.45,0-6.43,1.11-11.16,3.34-14.15,2.4-3.29,5.75-4.96,10.05-4.96s7.89,1.66,10.28,4.96c2.4,3.31,3.59,8.02,3.59,14.15,0,5.68-1.19,10.14-3.59,13.45Z"/>
                        <path d="m636.47,227.49c-5.53-4.19-11.18-6.38-20.89-6.12-9.86.27-17.03,3.03-21.49,9.07-4.46,6.05-6.68,13.95-6.68,23.68,0,8.33,1.68,15.04,5.04,20.17,3.37,5.1,7.4,8.6,12.1,10.47,4.68,1.89,9.42,2.28,14.2,1.19,4.77-1.11,8.57-3.84,11.39-8.24v3.99c-.32,5.03-1.53,8.8-3.63,11.32-2.13,2.5-4.47,4.04-7.06,4.59-2.56.54-5.16.24-7.73-.95-2.59-1.17-4.5-2.87-5.75-5.06h-17.14c4.44,13.34,12.41,19.23,26.77,20.27,23.16,1.67,30.54-17.94,30.52-28.52v-33.25c0-10.99-3.58-18.03-9.63-22.63Zm-6.81,32.66c-.63,3.68-1.64,6.4-3.06,8.12-2.97,4.08-7.6,5.53-13.84,4.37-6.27-1.19-9.4-7.2-9.4-18.03,0-5.03.93-9.51,2.82-13.45,1.88-3.91,5.47-5.89,10.79-5.89,3.91,0,6.89,1.42,8.92,4.24,2.04,2.83,3.34,6.05,3.88,9.67.55,3.61.5,7.27-.12,10.96Z"/>
                        <path d="m573.49,225.84c-5.29-2.67-11.34-4.03-18.15-4.03-10.47,0-17.85,2.73-22.15,8.19-2.7,3.48-4.22,7.94-4.58,13.36h15.65c.38-2.39,1.15-4.29,2.3-5.68,1.61-1.89,4.36-2.85,8.23-2.85,3.47,0,6.09.48,7.88,1.45,1.78.96,2.67,2.72,2.67,5.26,0,2.08-1.16,3.62-3.49,4.6-1.3.57-3.46,1.04-6.48,1.42l-5.54.67c-6.3.8-11.09,2.13-14.31,3.99-5.93,3.41-8.88,8.92-8.88,16.54,0,5.87,1.83,10.41,5.52,13.61,3.67,3.21,8.34,4.55,13.99,4.81,35.36,1.58,34.96-18.64,35.28-22.84v-23.27c0-7.46-2.63-12.54-7.92-15.24Zm-8.22,35.31c-.1,5.43-1.66,9.15-4.63,11.2-2.98,2.05-6.24,3.07-9.78,3.07-2.24,0-4.13-.63-5.7-1.85-1.56-1.23-2.34-3.23-2.34-6,0-3.1,1.28-5.39,3.83-6.87,1.52-.87,3.99-1.61,7.45-2.2l3.7-.68c1.84-.35,3.29-.72,4.33-1.12,1.07-.39,2.11-.91,3.14-1.56v6.03Z"/>
                        <path d="m707.61,230.97c-5.22-6.54-13.14-9.81-23.76-9.81s-18.52,3.26-23.73,9.81c-5.22,6.53-7.83,14.24-7.83,23.15s2.61,16.8,7.83,23.25c5.21,6.42,13.13,9.64,23.73,9.64s18.53-3.22,23.76-9.64c5.21-6.45,7.81-14.19,7.81-23.25s-2.6-16.62-7.81-23.15Zm-12.93,37.46c-2.53,3.36-6.15,5.05-10.87,5.05s-8.36-1.69-10.91-5.05c-2.56-3.35-3.83-8.12-3.83-14.31s1.27-10.95,3.83-14.29c2.54-3.34,6.18-5.01,10.91-5.01s8.35,1.67,10.87,5.01c2.53,3.34,3.79,8.1,3.79,14.29s-1.26,10.96-3.79,14.31Z"/>
                        <path d="m510.37,70.92c14.56,12.24,24.21,26.99,27.15,43.06Zm-137.1-77.97c42.1,0,79.76,12.07,105.09,31.07-12.24,5.3-23.91,7.97-35.17,7.97-11.52-.01-23.03-2.78-34.21-8.23-.59-.28-14.61-6.89-29.2-6.9-.38,0-.77,0-1.15.01-17.14.4-26.8,6.49-33.29,11.82-6.31.16-11.76,1.68-16.61,3.03-4.33,1.2-8.06,2.24-11.7,2.24-1.5,0-4.2-.14-4.44-.15-4.18-.13-25.18-5.28-41.95-11.61,25.27-17.96,61.89-29.26,102.64-29.26Zm-107.61,33.01c17.51,7.16,38.76,12.7,45.48,13.13,1.87.12,3.87.34,5.87.34,4.46,0,8.91-1.25,13.21-2.45,2.54-.71,5.35-1.49,8.3-2.05-.79.77-1.58,1.56-2.37,2.35l-12.17,13.17c-.96.97-3.04,3.55-1.67,6.73.54,1.28,1.65,2.51,3.2,3.55,2.9,1.95,8.1,3.28,12.92,3.28,1.83,0,3.57-.18,5.15-.54,5.11-1.14,10.46-5.41,16.13-9.92,4.52-3.59,10.94-8.15,15.86-9.49,1.38-.37,3.06-.61,4.42-.61.41,0,.79.02,1.14.07,3.24.41,6.38,1.51,11.99,5.72,10,7.51,54.22,46.2,54.65,46.58.03.02,2.85,2.46,2.65,6.5-.11,2.26-1.36,4.26-3.54,5.65-1.89,1.2-3.83,1.81-5.8,1.81-2.96,0-4.99-1.39-5.13-1.48-.16-.13-15.31-14.03-20.89-18.7-.89-.74-1.75-1.4-2.62-1.4-.47,0-.88.2-1.16.55-.88,1.08.1,2.58,1.26,3.56l17.7,17.8s2.21,2.06,2.45,4.79c.14,2.95-1.27,5.42-4.2,7.34-2.09,1.38-4.2,2.07-6.27,2.07-2.72,0-4.63-1.24-5.05-1.53l-2.54-2.5c-4.64-4.57-9.43-9.29-12.94-12.21-.86-.71-1.77-1.37-2.64-1.37-.43,0-.82.16-1.12.48-.4.44-.68,1.24.32,2.57.4.55.89,1,.89,1l12.91,14.51c.1.13,2.66,3.17.29,6.19l-.46.58c-.39.42-.8.82-1.2,1.16-2.2,1.81-5.14,2-6.31,2-.63,0-1.22-.05-1.75-.15-1.27-.23-2.13-.58-2.55-1.07l-.16-.16c-.7-.73-7.21-7.38-12.6-11.87-.71-.6-1.6-1.34-2.51-1.34-.45,0-.85.18-1.17.52-1.06,1.17.54,2.91,1.22,3.55l11.01,12.15c-.01.11-.15.36-.41.74-.4.55-1.73,1.88-5.73,2.38-.48.06-.98.09-1.46.09-4.12,0-8.52-2-10.79-3.2,1.03-2.18,1.57-4.58,1.57-6.98,0-9.07-7.36-16.44-16.43-16.45-.19,0-.4,0-.59.01.29-4.14-.29-11.98-8.34-15.43-2.32-1-4.63-1.52-6.87-1.52-1.76,0-3.45.3-5.04.91-1.67-3.24-4.44-5.6-8.04-6.83-2-.69-3.98-1.04-5.9-1.04-3.35,0-6.44.99-9.19,2.94-2.64-3.28-6.62-5.22-10.81-5.22-3.67,0-7.2,1.47-9.81,4.06-3.43-2.62-17.03-11.26-53.44-19.53-1.74-.39-5.69-1.52-8.17-2.25,3.41-16.34,13.8-31.27,29.2-43.52Zm67.54,94.78l-.39-.35h-.4c-.32,0-.66.13-1.11.45-1.86,1.31-3.63,1.94-5.44,1.94-1,0-2.02-.2-3.04-.59-8.44-3.29-7.78-11.25-7.36-13.65.06-.49-.06-.86-.37-1.12l-.6-.49-.56.53c-1.65,1.59-3.8,2.45-6.06,2.45-4.83,0-8.77-3.93-8.76-8.77,0-4.83,3.94-8.76,8.78-8.75,4.37,0,8.09,3.28,8.64,7.65l.3,2.35,1.29-1.99c.14-.23,3.69-5.59,10.2-5.58,1.24,0,2.52.2,3.81.6,5.19,1.58,6.07,6.29,6.2,8.25.09,1.14.91,1.2,1.06,1.2.45,0,.78-.28,1.01-.53.98-1.02,3.11-2.72,6.45-2.72,1.53,0,3.15.37,4.83,1.09,8.25,3.54,4.51,14.02,4.47,14.13-.71,1.74-.74,2.5-.07,2.95l.32.15h.24c.37,0,.83-.16,1.6-.42,1.12-.39,2.81-.97,4.4-.97h0c6.21.07,11.26,5.13,11.26,11.26,0,6.2-5.06,11.24-11.27,11.24-6.07,0-11.01-4.73-11.23-10.74-.02-.52-.07-1.88-1.23-1.88-.47,0-.89.29-1.36.72-1.34,1.24-3.04,2.49-5.52,2.49-1.13,0-2.35-.26-3.64-.79-6.41-2.6-6.5-7-6.24-8.77.07-.47.09-.96-.23-1.35Zm40.07,48.88c-76.26,0-138.08-39.55-138.08-88.33,0-1.96.14-3.91.33-5.84.61.15,6.67,1.59,7.92,1.88,37.19,8.26,49.48,16.85,51.56,18.48-.7,1.69-1.07,3.51-1.07,5.35,0,7.69,6.25,13.95,13.93,13.95.86,0,1.72-.08,2.56-.24,1.16,5.66,4.86,9.95,10.51,12.15,1.65.63,3.32.96,4.97.96,1.06,0,2.13-.13,3.17-.39,1.05,2.65,3.39,5.96,8.65,8.09,1.84.74,3.68,1.13,5.47,1.13,1.46,0,2.89-.26,4.25-.76,2.52,6.13,8.51,10.2,15.19,10.2,4.43,0,8.68-1.8,11.78-4.99,2.65,1.48,8.25,4.15,13.91,4.16.73,0,1.41-.05,2.11-.13,5.62-.71,8.23-2.91,9.43-4.62.22-.3.41-.62.58-.95,1.32.38,2.78.69,4.46.7,3.07,0,6.01-1.05,8.99-3.21,2.93-2.11,5.01-5.14,5.31-7.72,0-.03,0-.07.01-.11.99.2,2,.3,3.01.3,3.16,0,6.27-.98,9.24-2.93,5.73-3.75,6.72-8.66,6.63-11.87,1.01.21,2.03.32,3.05.32,2.96,0,5.88-.89,8.65-2.66,3.55-2.27,5.69-5.75,6.02-9.79.21-2.75-.47-5.53-1.91-7.91,9.58-4.13,31.48-12.12,57.27-17.93.11,1.46.17,2.93.17,4.41,0,48.78-61.82,88.33-138.07,88.33Z"/>
                        <path d="m910.26,142.12c-5.21-6.54-13.13-9.8-23.75-9.8s-18.53,3.27-23.74,9.8c-5.22,6.53-7.83,14.25-7.83,23.16s2.61,16.81,7.83,23.26c5.21,6.43,13.13,9.65,23.74,9.65s18.54-3.22,23.75-9.65c5.22-6.45,7.82-14.19,7.82-23.26s-2.6-16.63-7.82-23.16Zm-12.92,37.48c-2.53,3.35-6.15,5.04-10.89,5.04s-8.36-1.69-10.91-5.04c-2.55-3.35-3.82-8.13-3.82-14.32s1.27-10.95,3.82-14.29c2.55-3.34,6.19-5.01,10.91-5.01s8.35,1.67,10.89,5.01c2.53,3.34,3.8,8.11,3.8,14.29s-1.27,10.97-3.8,14.32Z"/>
                        <path d="m776.98,136.65c-5.29-2.68-11.34-4.03-18.15-4.03-10.47,0-17.86,2.73-22.17,8.18-2.71,3.49-4.22,7.95-4.58,13.37h15.65c.38-2.4,1.15-4.29,2.31-5.69,1.61-1.89,4.36-2.84,8.23-2.84,3.46,0,6.08.48,7.88,1.45,1.78.96,2.68,2.72,2.68,5.26,0,2.09-1.16,3.61-3.49,4.61-1.3.57-3.46,1.04-6.48,1.42l-5.55.68c-6.3.8-11.08,2.13-14.32,3.99-5.92,3.41-8.88,8.93-8.88,16.55,0,5.87,1.83,10.41,5.52,13.61,3.67,3.21,8.34,4.55,13.98,4.81,35.37,1.59,34.98-18.64,35.3-22.84v-23.27c0-7.47-2.65-12.55-7.93-15.25Zm-8.22,35.32c-.11,5.42-1.66,9.15-4.64,11.2-2.99,2.05-6.24,3.07-9.78,3.07-2.24,0-4.14-.63-5.7-1.85-1.56-1.23-2.34-3.24-2.34-6.01,0-3.1,1.28-5.39,3.83-6.88,1.51-.87,3.99-1.61,7.45-2.2l3.69-.69c1.84-.35,3.28-.73,4.34-1.13,1.07-.38,2.1-.9,3.13-1.55v6.03Z"/>
                        <path d="m696.32,146.48c4.05,0,7.01,1.25,8.94,3.75,1.31,1.84,2.13,3.93,2.45,6.24h17.45c-.95-8.81-4.03-14.95-9.24-18.43-5.22-3.47-11.9-5.21-20.07-5.21-9.61,0-17.15,2.95-22.61,8.84-5.46,5.9-8.2,14.15-8.2,24.75,0,9.38,2.47,17.04,7.42,22.93,4.95,5.89,12.66,8.84,23.14,8.84s18.42-3.53,23.76-10.61c3.35-4.38,5.23-9.03,5.62-13.94h-17.39c-.36,3.25-1.37,5.9-3.06,7.94-1.67,2.03-4.5,3.06-8.5,3.06-5.63,0-9.47-2.57-11.5-7.72-1.12-2.75-1.69-6.38-1.69-10.91s.57-8.54,1.69-11.43c2.12-5.39,6.05-8.1,11.79-8.1Z"/>
                        <path d="m660.36,132.83c-35.85,0-33.72,31.73-33.72,31.73v32.24h16.27v-30.23c0-4.96.63-8.62,1.86-11.01,2.23-4.23,6.6-6.35,13.1-6.35.49,0,1.13.03,1.92.07.79.04,1.69.11,2.73.23v-16.55c-.72-.05-1.19-.07-1.39-.1-.21-.02-.46-.03-.77-.03Z"/>
                        <path d="m613.6,144.85c-2.81-4.16-6.38-7.21-10.68-9.15-4.31-1.92-9.15-2.88-14.52-2.88-9.06,0-16.42,2.85-22.1,8.56-5.67,5.72-8.52,13.92-8.52,24.63,0,11.43,3.15,19.67,9.44,24.74,6.28,5.06,13.54,7.61,21.76,7.61,9.96,0,17.71-3.01,23.24-9.02,2.99-3.16,4.86-6.29,5.65-9.38h-17.26c-.68.98-1.41,1.81-2.22,2.46-2.3,1.89-5.42,2.47-9.09,2.47-3.47,0-6.2-.52-8.66-2.07-4.06-2.5-6.35-6.72-6.59-12.91h45.01c.06-5.34-.11-9.43-.54-12.27-.74-4.84-2.4-9.1-4.92-12.77Zm-39.15,14.38c.58-4.02,2.03-7.2,4.3-9.56,2.29-2.35,5.5-3.53,9.65-3.53,3.81,0,7.01,1.11,9.59,3.34,2.57,2.22,4,5.48,4.3,9.75h-27.83Z"/>
                        <path d="m525.46,132.61c-7.55,0-14.08,3.31-18.47,8.61-4.17-5.3-10.59-8.61-18.48-8.61-15.89,0-26.13,11.67-26.13,27.12v37.06h14.87v-37.41c0-6.83,4.62-11.55,11.27-11.55,9.8,0,10.81,8.13,10.81,11.55v37.41h14.87v-37.41c0-6.83,4.73-11.55,11.26-11.55,9.8,0,10.93,8.13,10.93,11.55v37.41h14.85v-37.06c0-15.93-9.56-27.12-25.79-27.12Z"/>
                        <path d="m833.71,124.7l-.02,17.43c-1.81-2.92-4.17-5.2-7.08-6.83-2.9-1.64-6.23-2.47-9.98-2.47-8.13,0-14.6,3.03-19.46,9.06-4.86,6.05-7.29,14.77-7.29,25.31,0,9.15,2.47,16.65,7.4,22.49,4.93,5.83,14.6,8.39,23.19,8.39,29.95,0,29.6-25.68,29.6-25.68v-59.11s-16.37-1.75-16.37,11.41Zm-3.13,55.04c-2.37,3.4-5.86,5.1-10.43,5.1s-7.98-1.72-10.23-5.13c-2.25-3.43-3.37-8.41-3.37-14.11,0-5.3,1.1-9.72,3.31-13.29,2.21-3.57,5.67-5.36,10.4-5.36,3.1,0,5.82.98,8.17,2.94,3.81,3.25,5.73,9.09,5.73,16.64,0,5.4-1.2,9.81-3.58,13.21Z"/>
                      </svg>
                      <span className="text-xs">Assinatura Mercado Pago</span>
                    </>
                    )}
                  </div>
                  <span className="text-[9px] opacity-90 normal-case font-bold italic">Para clientes com conta Mercado Pago</span>
                </button>
              </div>

              {/* Section 2: One-time */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Pagamentos Avulsos (30 dias)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handlePaymentInitiation('pix_one_time')}
                    disabled={!!creatingPayment}
                    className="py-5 bg-transparent hover:bg-slate-50 text-slate-600 rounded-2xl font-bold text-xs transition-all flex flex-col items-center justify-center border-2 border-slate-100 gap-2 active:scale-95"
                  >
                    <QrCode size={20} className="text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-tight">PIX (Avulso)</span>
                  </button>

                  <button
                    onClick={() => handlePaymentInitiation('card_one_time')}
                    disabled={!!creatingPayment}
                    className="py-5 bg-transparent hover:bg-slate-50 text-slate-600 rounded-2xl font-bold text-xs transition-all flex flex-col items-center justify-center border-2 border-slate-100 gap-2 active:scale-95"
                  >
                    <CreditCard size={20} className="text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-tight">Cartão (Avulso)</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-widest pt-2">
                <Lock size={12} /> Pagamento Seguro
              </div>
            </div>
          </section>
        )}

        {/* 5. Status for Premium Users */}
        {formData.testador_pagamento && formData.status_assinatura === 'premium' && (
          <section className="bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] p-6 flex items-center justify-between shadow-xl">
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

        {/* 6. Appearance Section */}
        <section className="bg-white rounded-[32px] overflow-hidden shadow-xl border border-slate-200">
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
          </div>
        </section>
      </div>

      {/* Pix Modal */}
      {pixData && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black mb-2 text-center">Pagamento via PIX</h2>
            <p className="text-slate-400 text-xs text-center mb-6">Escaneie o código abaixo para ativar o Premium. <span className="block text-amber-500 font-bold">Este código expira em 30 minutos.</span></p>

            <div className="bg-slate-50 p-4 rounded-3xl flex justify-center mb-6">
              <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code" className="w-48 h-48" />
            </div>

            <div className="space-y-2 mb-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código Pix (Copia e Cola)</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={pixData.qr_code}
                  className="flex-1 p-3 bg-slate-50 border-none rounded-xl text-[10px] font-mono text-slate-500 outline-none"
                />
                <button
                  onClick={() => copyToClipboard(pixData.qr_code)}
                  className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <button
              onClick={() => setPixData(null)}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
            >
              Concluído
            </button>
          </div>
        </div>
      )}

      {/* Transparent Card Modal */}
      {showCardModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-200 my-8">
             <div className="flex justify-between items-center mb-6">
               <div>
                  <h2 className="text-xl font-black">Dados do Cartão</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {showCardModal === 'card_recurring' ? 'Assinatura Recorrente' : 'Pagamento Único'}
                  </p>
               </div>
               <button onClick={() => setShowCardModal(false)} className="p-2 bg-slate-100 rounded-xl text-slate-400"><X size={20} /></button>
             </div>

             <form onSubmit={handleProcessCardPayment} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número do Cartão</label>
                  <input
                    type="text" name="cardNumber" value={cardData.cardNumber} onChange={handleCardInputChange}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    placeholder="0000 0000 0000 0000" required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mês (MM)</label>
                    <input
                      type="text" name="cardExpirationMonth" value={cardData.cardExpirationMonth} onChange={handleCardInputChange}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all text-center"
                      placeholder="12" required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ano (AA)</label>
                    <input
                      type="text" name="cardExpirationYear" value={cardData.cardExpirationYear} onChange={handleCardInputChange}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all text-center"
                      placeholder="28" required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CVC</label>
                    <input
                      type="text" name="securityCode" value={cardData.securityCode} onChange={handleCardInputChange}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all text-center"
                      placeholder="123" required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF</label>
                    <input
                      type="text" name="identificationNumber" value={cardData.identificationNumber} onChange={handleCardInputChange}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                      placeholder="000.000.000-00" required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome no Cartão</label>
                  <input
                    type="text" name="cardholderName" value={cardData.cardholderName} onChange={handleCardInputChange}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    placeholder="JOAO A SILVA" required
                  />
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl flex gap-3 text-amber-800">
                   <AlertCircle size={18} className="shrink-0" />
                   <p className="text-[10px] font-medium leading-relaxed">
                     Seus dados são criptografados pelo SDK do Mercado Pago. Esta é uma implementação de Checkout Transparente.
                   </p>
                </div>

                <button
                  type="submit"
                  disabled={!!creatingPayment}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
                >
                  {creatingPayment ? <Loader2 className="animate-spin" /> : <>Finalizar Pagamento</>}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Avatar Modal */}
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
