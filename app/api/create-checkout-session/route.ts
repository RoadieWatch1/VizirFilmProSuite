import Stripe from "stripe";

// ✅ Load your environment variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const APP_URL = process.env.EXPO_PUBLIC_APP_URL;

// ✅ Throw helpful errors if they’re missing
if (!STRIPE_SECRET_KEY) {
  throw new Error("❌ STRIPE_SECRET_KEY is not defined in environment variables.");
}

if (!APP_URL) {
  throw new Error("❌ EXPO_PUBLIC_APP_URL is not defined in environment variables.");
}

// ✅ Initialize Stripe client safely
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { priceId } = body;

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "Missing priceId in request body." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const mode = priceId.includes("lifetime") ? "payment" : "subscription";

    // ✅ Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/success`,
      cancel_url: `${APP_URL}/cancel`,
    });

    console.log("✅ Stripe Checkout session created:", session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (e) {
    console.error("❌ Stripe Checkout error:", e);

    const message =
      e instanceof Error ? e.message : "Unknown error creating checkout session.";

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
