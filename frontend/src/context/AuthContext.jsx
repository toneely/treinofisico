import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { calculateSubscriptionStatus } from "../utils/subscriptionUtils";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
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

    // Safety timeout to prevent infinite loading hangs
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 6000);

    try {
      let { data: userProfile } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!userProfile) {
        const nomeSeguro = authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Atleta";
        const { data: newData, error: insertError } = await supabase
          .from("usuarios")
          .insert([
            {
              id: authUser.id,
              nome: String(nomeSeguro),
              email: authUser.email || "",
              avatar_url: authUser.user_metadata?.avatar_url || null,
            },
          ])
          .select()
          .single();

        if (insertError && insertError.code === "23505") {
          const { data: retryData } = await supabase
            .from("usuarios")
            .select("*")
            .eq("id", authUser.id)
            .single();
          userProfile = retryData;
        } else if (newData) {
          userProfile = newData;
        }
      }

      if (userProfile) {
        setProfile(userProfile);

        // Finalize loading as soon as profile is resolved
        setLoading(false);

        if (userProfile.testador_pagamento === true) {
          setIsPremium(true);
          setIsGracePeriod(false);
        } else {
          const { isPremium: premium, isGracePeriod: grace } = calculateSubscriptionStatus(userProfile.status_assinatura, userProfile.data_vencimento);
          setIsPremium(premium);
          setIsGracePeriod(grace);
        }
      }
    } catch (err) {
      console.error("Falha no sincronismo:", err);
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  }

  useEffect(function () {
    let isMounted = true;

    // Safety timeout for initial auth state check
    const authInitTimeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 6000);

    supabase.auth.getSession().then(function (result) {
      if (!isMounted) return;
      const session = result.data?.session ?? null;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserProfile(currentUser);
      } else {
        setLoading(false);
      }
      clearTimeout(authInitTimeout);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(function (event, session) {
      if (!isMounted) return;
      const currentUser = session?.user ?? null;

      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        setIsPremium(false);
        setIsGracePeriod(false);
        setLoading(false);
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        clearTimeout(authInitTimeout);
        setUser(currentUser);
        if (currentUser) {
          setLoading(true);
          fetchUserProfile(currentUser);
        } else {
          setLoading(false);
        }
      }
    });

    return function () {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(authInitTimeout);
    };
  }, []);

  function signOut() {
    supabase.auth.signOut().then(function () {
      setUser(null);
      setProfile(null);
      setIsPremium(false);
      setIsGracePeriod(false);
    });
  }

  function signUp(email, password) {
    return supabase.auth.signUp({ email, password });
  }

  function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  function signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/dashboard",
      },
    });
  }

  function refreshProfile() {
    if (user) {
      fetchUserProfile(user);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user: user,
        profile: profile,
        loading: loading,
        signUp: signUp,
        signIn: signIn,
        signInWithGoogle: signInWithGoogle,
        signOut: signOut,
        refreshProfile: refreshProfile,
        isPremium: isPremium,
        setIsPremium: setIsPremium,
        isGracePeriod: isGracePeriod
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
