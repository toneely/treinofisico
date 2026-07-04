/**
 * Calculates the subscription status based on subscription status and expiration date.
 * @param {string} statusAssinatura - 'free' or 'premium'
 * @param {string} dataVencimento - ISO date string
 * @returns {Object} { status: 'Free' | 'Premium' | 'Em Atraso', isPremium: boolean, isGracePeriod: boolean }
 */
export const calculateSubscriptionStatus = (statusAssinatura, dataVencimento) => {
  if (statusAssinatura === "grace_period") {
    return { status: "Em Atraso", isPremium: true, isGracePeriod: true };
  }

  if (statusAssinatura !== "premium") {
    return { status: "Free", isPremium: false, isGracePeriod: false };
  }

  if (!dataVencimento) {
    return { status: "Premium", isPremium: true, isGracePeriod: false };
  }

  const vencimento = new Date(dataVencimento);
  const hoje = new Date();

  if (hoje <= vencimento) {
    return { status: "Premium", isPremium: true, isGracePeriod: false };
  }

  const diffTime = hoje - vencimento;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) {
    return { status: "Em Atraso", isPremium: true, isGracePeriod: true };
  }

  return { status: "Free", isPremium: false, isGracePeriod: false };
};
