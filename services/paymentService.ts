// /services/paymentService.ts
export interface SubscriptionProduct {
  identifier: string;
  title: string;
  description: string;
  price: string;
  period: string;
}

// ✅ Export your real Stripe products
export const subscriptionProducts = async (): Promise<SubscriptionProduct[]> => {
  return [
    {
      identifier: 'price_1RasBfIgN98dwGnNFbbrFxqo',
      title: 'Lifetime Pro Suite',
      description:
        'All future upgrades free, full access to Pro Suite, priority support, and exclusive tools.',
      price: '$199.00',
      period: 'One-time',
    },
    {
      identifier: 'price_1Ras6nIgN98dwGnNS4Zazdux',
      title: 'Yearly Pro',
      description:
        'Full Pro features. Save 20% vs monthly.',
      price: '$38.30',
      period: 'Yearly',
    },
    {
      identifier: 'price_1Ras0gIgN98dwGnNFn2dMyFO',
      title: 'Monthly Pro',
      description:
        'Full Pro features. Cancel anytime.',
      price: '$3.99',
      period: 'Monthly',
    },
  ];
};

// ✅ Named export: restore simulation (keep for native later)
export const restorePurchases = async (): Promise<void> => {
  console.log('Simulating restore purchases...');
  return new Promise((resolve) => setTimeout(() => resolve(), 1000));
};

/**
 * ✅ NEW FUNCTION
 * Start Stripe checkout for web only
 */
export const startStripeCheckout = async (priceId: string) => {
  try {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    });

    const data = await res.json();

    if (data?.url) {
      window.location.href = data.url;
    } else {
      alert("Failed to create Stripe checkout session.");
    }
  } catch (error) {
    console.error(error);
    alert("An error occurred starting Stripe checkout.");
  }
};
