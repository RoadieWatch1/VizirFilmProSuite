// VizirPro/services/paymentService.ts

export interface SubscriptionProduct {
  identifier: string;
  title: string;
  description: string;
  price: string;
  period: string;
}

/**
 * ✅ Hard-coded subscription products
 * Replace with live fetch from Stripe later if desired.
 */
export const subscriptionProducts = async (): Promise<SubscriptionProduct[]> => {
  return [
    {
      identifier: "price_1RasBfIgN98dwGnNFbbrFxqo",
      title: "Lifetime Pro Suite",
      description:
        "All future upgrades free, full access to Pro Suite, priority support, and exclusive tools.",
      price: "$399.00",
      period: "One-time",
    },
    {
      identifier: "price_1Ras6nIgN98dwGnNS4Zazdux",
      title: "Yearly Pro",
      description: "Full Pro features. Save 20% vs monthly.",
      price: "$115.10",
      period: "Yearly",
    },
    {
      identifier: "price_1Ras0gIgN98dwGnNFn2dMyFO",
      title: "Monthly Pro",
      description: "Full Pro features. Cancel anytime.",
      price: "$11.99",
      period: "Monthly",
    },
  ];
};

/**
 * ✅ Placeholder for native restore
 * (Useful for mobile apps later)
 */
export const restorePurchases = async (): Promise<void> => {
  console.log("Simulating restore purchases...");
  return new Promise((resolve) => setTimeout(() => resolve(), 1000));
};

/**
 * ✅ Start Stripe checkout from web (NOW sends Firebase token)
 */
export const startStripeCheckout = async (priceId: string, token: string) => {
  if (!priceId) throw new Error("Missing priceId.");
  if (!token) throw new Error("Missing auth token. Please log in again.");

  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ priceId }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // show the real backend error
    throw new Error(data?.error || "Failed to create Stripe checkout session.");
  }

  if (!data?.url) {
    throw new Error("Checkout created, but no redirect URL was returned.");
  }

  window.location.href = data.url;
};

