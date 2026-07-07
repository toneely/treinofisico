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
    atividade_alternativa: "",
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
          atividade_alternativa: profile.atividade_alternativa || "",
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
          to="/app"
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

        {/* 3. Mercado Pago Payment Card - Positioned directly below Account Data */}
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
                  <span>Experiência completa sem anúncios</span>
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
                  className="w-full h-[88px] rounded-2xl font-black text-sm transition-all flex items-center justify-between px-8 shadow-xl active:scale-95"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--text-on-primary)",
                  }}
                >
                  <span>Cartão de Crédito</span>
                  {creatingPayment === 'card_recurring' ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} className="opacity-40" />}
                </button>

                <button
                  onClick={() => handlePaymentInitiation('native_subscription')}
                  disabled={!!creatingPayment}
                  className="w-full h-[88px] bg-white border-2 border-slate-100 rounded-2xl shadow-xl active:scale-95 transition-all flex flex-col items-center justify-center relative overflow-hidden"
                >
                  <div className="flex items-center justify-center gap-3">
                    {creatingPayment === 'native_subscription' ? <Loader2 className="animate-spin text-slate-400" size={20} /> : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="150" height="104" fill="none" viewBox="0 0 150 104" className="h-6 w-auto">
                          <path fill="#0A0080" d="M150 49.027c0-26.944-33.685-48.87-75-48.87-41.501 0-75 21.926-75 48.87v2.787c0 28.616 29.404 51.843 75 51.843 45.968 0 75-23.227 75-51.843v-2.787Z"/>
                          <path fill="#2ABCFF" d="M147.022 49.027c0 25.457-32.196 46.083-72.022 46.083-39.826 0-72.022-20.626-72.022-46.083C2.978 23.57 35.174 2.944 75 2.944c39.826.186 72.022 20.626 72.022 46.083Z"/>
                          <path fill="#fff" d="M50.993 34.533s-.745.743-.373 1.487c1.117 1.486 4.653 2.23 8.189 1.486 2.047-.557 4.839-2.601 7.444-4.645 2.792-2.23 5.583-4.46 8.56-5.389 2.979-.93 4.84-.558 6.142-.186 1.49.372 2.978 1.3 5.584 3.345 5.024 3.716 24.751 20.997 28.101 23.97 2.792-1.3 15.075-6.503 31.638-10.22-1.117-8.919-6.514-17.095-14.702-23.784-11.353 4.831-25.31 7.247-39.082.557 0 0-7.444-3.53-14.702-3.345-10.794.186-15.447 5.017-20.472 9.849l-6.327 6.875Z"/>
                          <path fill="#fff" d="M114.082 56.274c-.186-.186-23.263-20.44-28.474-24.342-2.978-2.23-4.653-2.788-6.514-3.16-.93-.185-2.233 0-3.163.372-2.42.744-5.584 2.788-8.375 5.017-2.978 2.416-5.77 4.46-8.189 5.017-3.163.93-7.258 0-9.119-1.114-.744-.558-1.303-1.115-1.489-1.673-.744-1.486.559-2.787.745-2.973l6.327-6.875 2.233-2.23c-2.047.186-3.908.743-5.769 1.3-2.233.558-4.466 1.302-6.7 1.302-.93 0-5.955-.744-6.885-1.115-5.77-1.487-10.794-3.16-18.425-6.69C11.166 25.8 5.211 34.161 3.536 43.452c1.303.372 3.35.93 4.28 1.115 20.472 4.46 26.8 9.291 28.102 10.22 1.303-1.3 2.978-2.23 5.025-2.23 2.233 0 4.28 1.115 5.583 2.974 1.117-.93 2.792-1.673 4.839-1.673.93 0 1.86.186 2.977.558a6.83 6.83 0 0 1 4.095 3.716c.744-.372 1.675-.557 2.791-.557 1.117 0 2.233.185 3.35.743 3.722 1.672 4.28 5.389 4.094 8.176h.745c4.466 0 8.189 3.716 8.189 8.176 0 1.3-.373 2.601-.931 3.902 1.303.743 4.28 2.23 7.072 1.858 2.233-.186 2.978-.929 3.35-1.486.186-.372.372-.558.186-.93l-5.77-6.503s-.93-.93-.558-1.3c.373-.372.93.185 1.303.557 2.978 2.415 6.514 6.132 6.514 6.132s.372.557 1.675.743c1.116.186 3.163 0 4.652-1.115.373-.372.745-.743.93-1.115 1.49-1.858-.185-3.716-.185-3.716l-6.7-7.619s-.93-.929-.558-1.3c.372-.372.93.185 1.302.557a253.206 253.206 0 0 1 8.003 7.619c.558.371 3.164 2.044 6.513-.186 2.048-1.301 2.42-2.973 2.42-4.274-.186-1.672-1.489-2.787-1.489-2.787l-9.305-9.291s-.93-.744-.558-1.301c.372-.372.93.186 1.302.557 2.978 2.416 10.98 9.663 10.98 9.663.186 0 2.792 2.044 6.328-.186 1.303-.743 2.047-1.858 2.047-3.345-.372-2.044-2.047-3.53-2.047-3.53Z"/>
                          <path fill="#fff" d="M69.417 67.98c-1.489 0-2.978.744-3.164.744-.186 0 0-.558.186-.93.186-.371 2.047-5.946-2.605-7.99-3.536-1.486-5.583.186-6.328.93-.186.185-.372.185-.372 0 0-.93-.558-3.717-3.536-4.646-4.28-1.3-7.072 1.672-7.816 2.787-.373-2.415-2.42-4.46-5.025-4.46a5 5 0 0 0-5.025 5.018 5 5 0 0 0 5.025 5.017c1.303 0 2.605-.558 3.536-1.487v.186c-.186 1.3-.559 5.76 4.094 7.619 1.861.743 3.536.186 4.839-.744.372-.371.372-.185.372.186-.186 1.115 0 3.717 3.536 5.017 2.605 1.115 4.28 0 5.21-.929.373-.371.56-.371.56.372.185 3.345 2.977 5.946 6.327 5.946 3.536 0 6.327-2.787 6.327-6.318.186-3.344-2.605-6.132-6.141-6.318Z"/>
                          <path fill="#0A0080" d="M115.012 53.858c-7.072-6.132-23.635-20.44-27.915-23.785-2.606-1.858-4.28-2.973-5.77-3.344-.744-.186-1.674-.372-2.791-.372s-2.42.186-3.536.558c-2.792.929-5.77 3.158-8.56 5.388l-.187.186c-2.605 2.044-5.21 4.088-7.258 4.646-.93.185-1.861.371-2.605.371-2.234 0-4.28-.743-5.025-1.672-.186-.186 0-.372.186-.744l6.141-7.06c4.839-4.832 9.492-9.477 20.1-9.663h.558c6.7 0 13.213 2.973 13.958 3.345 6.327 2.973 12.655 4.46 19.168 4.46 6.7 0 13.586-1.673 21.03-5.018-.744-.743-1.675-1.3-2.605-2.044-6.328 2.787-12.469 4.088-18.425 4.088-5.955 0-12.096-1.486-17.866-4.274-.372-.186-7.63-3.53-15.26-3.53h-.558c-8.933.186-13.958 3.344-17.308 6.132-3.35 0-6.142.929-8.747 1.672-2.233.558-4.28 1.115-6.142 1.115h-2.233c-2.233 0-13.213-2.787-21.96-6.132-.93.557-1.675 1.3-2.605 2.044 9.119 3.716 20.285 6.69 23.82 6.875.931 0 2.048.186 2.979.186 2.233 0 4.652-.557 6.885-1.3 1.303-.372 2.792-.744 4.28-1.116l-1.302 1.301-6.328 6.876c-.558.557-1.674 1.858-.93 3.53.372.743.93 1.3 1.675 1.858 1.489.93 4.28 1.673 6.7 1.673.93 0 1.86 0 2.605-.372 2.606-.557 5.397-2.787 8.375-5.203 2.42-1.858 5.77-4.274 8.188-5.017.745-.186 1.675-.372 2.234-.372h.558c1.675.186 3.35.744 6.328 2.973 5.21 3.903 28.287 24.157 28.473 24.343 0 0 1.489 1.3 1.303 3.344 0 1.115-.744 2.23-1.861 2.974-.93.557-2.047.929-2.978.929-1.488 0-2.605-.744-2.605-.744s-8.002-7.247-10.98-9.662c-.372-.372-.93-.744-1.303-.744-.186 0-.372.186-.558.372-.372.557 0 1.3.744 1.858l9.305 9.291s1.117 1.115 1.303 2.416c0 1.486-.744 2.787-2.233 3.902-1.117.743-2.233 1.115-3.35 1.115-1.489 0-2.42-.557-2.605-.743l-1.303-1.301c-2.42-2.416-4.839-4.831-6.7-6.318-.372-.371-.93-.743-1.303-.743-.186 0-.372 0-.558.186-.186.186-.372.743.186 1.3a2.3 2.3 0 0 0 .372.558l6.7 7.618s1.303 1.673.186 3.16l-.186.37-.558.558c-1.117.93-2.606 1.115-3.35 1.115h-.93c-.745-.186-1.117-.371-1.303-.557-.373-.372-3.722-3.902-6.514-6.132-.372-.372-.744-.743-1.303-.743-.186 0-.372 0-.558.185-.558.558.372 1.487.558 1.859l5.77 6.317s0 .186-.186.372c-.187.372-.931.93-2.978 1.3h-.745c-2.233 0-4.466-1.114-5.583-1.672.559-1.115.745-2.415.745-3.716 0-4.645-3.908-8.548-8.561-8.548h-.372c.186-2.23-.186-6.317-4.28-7.99-1.117-.557-2.42-.743-3.537-.743-.93 0-1.86.186-2.605.557-.93-1.672-2.233-2.973-4.28-3.53-1.117-.372-2.048-.558-3.164-.558-1.675 0-3.35.558-4.839 1.487-1.303-1.672-3.536-2.787-5.583-2.787-1.861 0-3.722.743-5.211 2.044-1.861-1.301-8.933-5.947-27.916-10.22-.93-.186-2.977-.744-4.28-1.115-.186 1.115-.372 2.044-.558 3.159 0 0 3.536.929 4.28.929 19.355 4.274 25.868 8.733 26.985 9.662a7.446 7.446 0 0 0-.558 2.787c0 4.089 3.35 7.247 7.258 7.247.372 0 .93 0 1.303-.185.558 2.973 2.605 5.203 5.397 6.317.93.372 1.675.558 2.605.558.558 0 1.117 0 1.675-.186.558 1.3 1.861 3.159 4.466 4.274.931.372 1.861.557 2.792.557.745 0 1.489-.185 2.233-.371 1.303 3.159 4.467 5.389 8.003 5.389 2.233 0 4.466-.93 6.141-2.602 1.303.743 4.28 2.23 7.258 2.23h1.117c2.978-.372 4.28-1.487 4.839-2.416.186-.186.186-.371.372-.557.744.186 1.489.371 2.233.371 1.675 0 3.164-.557 4.653-1.672 1.489-1.115 2.605-2.601 2.791-4.088.559.186 1.117.186 1.489.186 1.675 0 3.35-.558 4.839-1.487 2.977-2.044 3.536-4.46 3.536-6.132.558.186 1.116.186 1.675.186 1.489 0 2.977-.557 4.466-1.3a6.49 6.49 0 0 0 3.164-5.018c.186-1.486-.186-2.787-.931-4.088 5.025-2.23 16.378-6.318 29.963-9.29 0-1.116-.186-2.045-.372-3.16-16.191 2.974-28.288 8.176-31.452 9.477ZM69.417 80.244c-3.164 0-5.77-2.415-5.956-5.574 0-.186 0-.93-.558-.93-.186 0-.372.187-.744.372-.745.558-1.675 1.301-2.792 1.301-.558 0-1.302-.186-1.86-.371-3.35-1.301-3.35-3.717-3.165-4.646 0-.186 0-.557-.186-.743l-.186-.186h-.186c-.186 0-.372 0-.558.186-1.117.743-2.047 1.115-2.978 1.115-.558 0-1.116-.186-1.675-.372-4.466-1.672-4.094-5.946-3.908-7.061 0-.186 0-.372-.186-.557l-.372-.186-.373.371c-.93.744-2.047 1.301-3.163 1.301-2.606 0-4.653-2.044-4.653-4.645 0-2.602 2.047-4.646 4.653-4.646 2.233 0 4.28 1.672 4.466 3.902l.186 1.301.745-1.115c0-.186 1.86-2.973 5.397-2.973.558 0 1.302.186 2.047.372 2.791.743 3.164 3.344 3.164 4.273 0 .558.558.558.558.558.186 0 .372-.186.558-.186.559-.557 1.675-1.486 3.35-1.486.745 0 1.675.185 2.606.557 4.28 1.858 2.419 7.247 2.419 7.433-.372.929-.372 1.3 0 1.486h.372c.186 0 .372 0 .745-.186.558-.185 1.489-.557 2.233-.557 3.164 0 5.955 2.602 5.955 5.946 0 3.345-2.605 5.946-5.955 5.946Z"/>
                        </svg>
                        <span className="text-base font-bold text-slate-900">Mercado Pago</span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 normal-case font-bold italic text-center leading-none absolute bottom-1.5 left-0 right-0">Para clientes com conta Mercado Pago</span>
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
                    {creatingPayment === 'pix_one_time' ? <Loader2 className="animate-spin text-slate-400" size={20} /> : (
                      <>
                        <QrCode size={20} className="text-slate-400" />
                        <span className="text-[10px] font-black uppercase tracking-tight">PIX</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handlePaymentInitiation('card_one_time')}
                    disabled={!!creatingPayment}
                    className="py-5 bg-transparent hover:bg-slate-50 text-slate-600 rounded-2xl font-bold text-xs transition-all flex flex-col items-center justify-center border-2 border-slate-100 gap-2 active:scale-95"
                  >
                    {creatingPayment === 'card_one_time' ? <Loader2 className="animate-spin text-slate-400" size={20} /> : (
                      <>
                        <CreditCard size={20} className="text-slate-400" />
                        <span className="text-[10px] font-black uppercase tracking-tight">CARTÃO</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-widest pt-2">
                <Lock size={12} /> Pagamento Seguro
              </div>
            </div>
          </section>
        )}

        {/* 4. Status for Premium Users */}
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

        {/* 5. Appearance Section */}
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

        {/* 6. Security (Nova Senha) */}
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
          to="/app"
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
