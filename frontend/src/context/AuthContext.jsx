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

  const fetchUserProfile = async (authUser) => {
    if (!authUser) return;
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (error && error.code === "PGRST116") {
        // Primeiro login: Criar registro na tabela usuarios (Apenas colunas seguras)
        const { data: newUser, error: insertError } = await supabase
          .from("usuarios")
          .insert([
            {
              id: authUser.id,
              nome: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Atleta",
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;

        setProfile(newUser);
        updateSubscriptionFlags(newUser);
        return;
      }

      if (error) throw error;

      if (data) {
        setProfile(data);
        updateSubscriptionFlags(data);
      }
    } catch (error) {
      console.error("Erro silencioso ao buscar/criar perfil:", error);
    }
  };

  const updateSubscriptionFlags = (userData) => {
    const { isPremium: premium, isGracePeriod: grace } =
      calculateSubscriptionStatus(userData.status_assinatura, userData.data_vencimento);

    setIsPremium(premium);
    setIsGracePeriod(grace);
  };

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserProfile(currentUser).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth State Change:", event, session?.user?.email);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      try {
        if (currentUser) {
          setLoading(true);
          await fetchUserProfile(currentUser);
        } else {
          setProfile(null);
          setIsPremium(false);
          setIsGracePeriod(false);
        }
      } catch (err) {
        console.error("Erro na transição de auth:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
  const signOut = () => supabase.auth.signOut();

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
