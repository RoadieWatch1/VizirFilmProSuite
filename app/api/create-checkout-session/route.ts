// app/api/create-checkout-session/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-06-30.basil",
});

// ✅ Your Lifetime price ID
const LIFETIME_PRICE_ID = "price_1RasBfIgN98dwGnNFbbrFxqo";

export async function POST(req: Request) {
  const { priceId } = await req.json();

  if (!priceId) {
    return NextResponse.json(
      { error: "Missing priceId" },
      { status: 400 }
    );
  }

  // ✅ Default to subscription
  let mode: "payment" | "subscription" = "subscription";

  // ✅ Switch to one-time if it's the lifetime price
  if (priceId === LIFETIME_PRICE_ID) {
    mode = "payment";
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Stripe error" },
      { status: 500 }
    );
  }
}
