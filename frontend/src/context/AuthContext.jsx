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
    if (!authUser) {
      setLoading(false);
      return;
    }
    try {
      let { data: userProfile } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!userProfile) {
        const { data: newData, error: insertError } = await supabase
          .from("usuarios")
          .insert([
            {
              id: authUser.id,
              nome:
                authUser.user_metadata?.full_name ||
                authUser.email?.split("@")[0] ||
                "Atleta",
              email: authUser.email || "",
              avatar_url: authUser.user_metadata?.avatar_url || null,
            },
          ])
          .select()
          .single();

        if (insertError && insertError.code === "23505") {
          const retry = await supabase
            .from("usuarios")
            .select("*")
            .eq("id", authUser.id)
            .single();
          userProfile = retry.data;
        } else if (newData) {
          userProfile = newData;
        }
      }

      if (userProfile) {
        setProfile(userProfile);
        updateSubscriptionFlags(userProfile);
      }
    } catch (err) {
      console.error("Falha critica no sincronismo:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  const updateSubscriptionFlags = (userData) => {
    if (userData.testador_pagamento === true) {
      setIsPremium(true);
      setIsGracePeriod(false);
      return;
    }

    const { isPremium: premium, isGracePeriod: grace } =
      calculateSubscriptionStatus(userData.status_assinatura, userData.data_vencimento);

    setIsPremium(premium);
    setIsGracePeriod(grace);
  };

  useEffect(function () {
    let isMounted = true;

    async function loadInitialSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchUserProfile(currentUser);
        } else {
          setProfile(null);
          setIsPremium(false);
          setIsGracePeriod(false);
        }
      } catch (error) {
        console.error("Erro na inicializacao:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async function (event, session) {
      if (!isMounted) return;

      if (event === "INITIAL_SESSION") return;

      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        setIsPremium(false);
        setIsGracePeriod(false);
        localStorage.removeItem("active_training_session");
        localStorage.removeItem("treino_em_andamento");
        setLoading(false);
        return;
      }

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        setLoading(true);
        await fetchUserProfile(currentUser);
      }
    });

    return function () {
      isMounted = false;
      subscription.unsubscribe();
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
    localStorage.removeItem("active_training_session");
    localStorage.removeItem("treino_em_andamento");
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
