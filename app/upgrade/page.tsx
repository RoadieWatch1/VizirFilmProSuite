"use client";

import { useEffect, useState } from "react";
import {
  startStripeCheckout,
  subscriptionProducts,
  SubscriptionProduct,
} from "@/services/paymentService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Crown } from "lucide-react";

export default function UpgradePage() {
  const [plans, setPlans] = useState<SubscriptionProduct[]>([]);
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const products = await subscriptionProducts();
      setPlans(products);
    })();
  }, []);

  const handleSubscribe = async (priceId: string) => {
    setLoadingPriceId(priceId);
    await startStripeCheckout(priceId);
    setLoadingPriceId(null);
  };

  return (
    <div className="min-h-screen cinematic-gradient py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-6">
          Upgrade to Vizir Pro
        </h1>
        <p className="text-[#B2C8C9] text-center mb-12 max-w-2xl mx-auto">
          Unlock longer scripts, advanced features, and priority support for
          your filmmaking projects.
        </p>

        {plans.length === 0 ? (
          <div className="text-center text-[#B2C8C9]">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-4" />
            Loading subscription plans...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => {
              const isLoading = loadingPriceId === plan.identifier;

              return (
                <Card
                  key={plan.identifier}
                  className={`glass-effect p-6 border-[#FF6A00]/20 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    isLoading
                      ? "ring-2 ring-[#FF6A00]/50 scale-105"
                      : ""
                  }`}
                >
                  <div>
                    <h2 className="text-xl text-white font-bold mb-2 flex items-center">
                      {plan.title}
                      {plan.period !== "One-time" && (
                        <span className="ml-2 text-sm text-[#FF6A00]">
                          ({plan.period})
                        </span>
                      )}
                    </h2>
                    <p className="text-[#B2C8C9] text-sm mb-4">
                      {plan.description}
                    </p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-[#FF6A00] mb-4">
                      {plan.price}
                    </p>
                    <Button
                      onClick={() => handleSubscribe(plan.identifier)}
                      className="w-full bg-[#FF6A00] hover:bg-[#E55A00] text-white font-semibold transition-all duration-200"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Redirecting...
                        </>
                      ) : (
                        <>
                          <Crown className="w-4 h-4 mr-2" />
                          Subscribe
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
