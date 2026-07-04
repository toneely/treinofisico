import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { calculateSubscriptionStatus } from "../utils/subscriptionUtils";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [isGracePeriod, setIsGracePeriod] = useState(false);

  async function fetchUserProfile(authUser) {
    if (!authUser) return;
    try {
      let { data: userProfile, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (
        !userProfile ||
        (Array.isArray(userProfile) && userProfile.length === 0) ||
        (error && error.code === "PGRST116") ||
        userProfile.id !== authUser.id
      ) {
        console.log("Sincronizando/Criando perfil...");
        const { data: newData, error: upsertError } = await supabase
          .from("usuarios")
          .upsert(
            {
              id: authUser.id,
              nome:
                authUser.user_metadata?.full_name ||
                authUser.email?.split("@")[0] ||
                "Atleta",
              email: authUser.email,
              avatar_url: authUser.user_metadata?.avatar_url || null,
            },
            { onConflict: "id" }
          )
          .select()
          .single();

        if (upsertError) throw upsertError;
        userProfile = newData;
      }

      if (userProfile) {
        setProfile(userProfile);
        updateSubscriptionFlags(userProfile);
      }
    } catch (err) {
      console.error("Falha critica no sincronismo:", err);
      throw err;
    }
  }

  const updateSubscriptionFlags = (userData) => {
    const { isPremium: premium, isGracePeriod: grace } =
      calculateSubscriptionStatus(userData.status_assinatura, userData.data_vencimento);

    setIsPremium(premium);
    setIsGracePeriod(grace);
  };

  useEffect(() => {
    let safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn("Auth initialization safety timeout reached.");
        setLoading(false);
      }
    }, 6000);

    // Listen for changes on auth state (logged in, signed out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth State Change:", event, session?.user?.email);
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
        safetyTimeout = null;
      }

      // Redefinição preventiva imediata para evitar ID Leak entre trocas de conta
      setProfile(null);
      setUser(null);

      const currentUser = session?.user ?? null;

      // Cleanup on sign out
      if (event === "SIGNED_OUT") {
        setIsPremium(false);
        setIsGracePeriod(false);

        // Limpeza profunda de cache
        localStorage.removeItem("active_training_session");
        localStorage.removeItem("treino_em_andamento");
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) localStorage.removeItem(key);
        });

        setLoading(false);
        return;
      }

      setUser(currentUser);

      if (currentUser) {
        try {
          setLoading(true);
          await fetchUserProfile(currentUser);
          // Garantia de encerramento do loading após o sucesso
          setLoading(false);
        } catch (err) {
          console.error("Erro na transição de auth:", err);
          setLoading(false);
        } finally {
          // Força o fechamento do loading independente do resultado
          setLoading(false);
        }
      } else {
        setIsPremium(false);
        setIsGracePeriod(false);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (safetyTimeout) clearTimeout(safetyTimeout);
    };
  }, []);

  const signUp = (email, password) => supabase.auth.signUp({ email, password });
  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });
  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/inicio",
      },
    });

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsPremium(false);
    setIsGracePeriod(false);

    // Limpeza profunda de cache para evitar ID Leak
    localStorage.removeItem("active_training_session");
    localStorage.removeItem("treino_em_andamento");
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) localStorage.removeItem(key);
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        refreshProfile: () => user && fetchUserProfile(user),
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        isPremium,
        setIsPremium,
        isGracePeriod,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
