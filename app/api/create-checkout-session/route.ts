// app/api/create-checkout-session/route.ts
import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin SDK (only once)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-06-30.basil",
});

const LIFETIME_PRICE_ID = "price_1RasBfIgN98dwGnNFbbrFxqo";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { priceId } = body;
  const token = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!priceId || !token) {
    return NextResponse.json({ error: "Missing priceId or token" }, { status: 400 });
  }

  let firebaseUID: string;

  try {
    const decoded = await getAuth().verifyIdToken(token);
    firebaseUID = decoded.uid;
  } catch (err) {
    console.error("❌ Firebase token verification failed", err);
    return NextResponse.json({ error: "Invalid Firebase token" }, { status: 401 });
  }

  let mode: "payment" | "subscription" = priceId === LIFETIME_PRICE_ID ? "payment" : "subscription";

  try {
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        firebaseUID, // ✅ This will allow us to identify the user in webhooks
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("❌ Stripe session creation failed", err);
    return NextResponse.json({ error: err.message || "Stripe error" }, { status: 500 });
  }
}
