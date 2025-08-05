// C:\Users\vizir\VizirPro\app\api\stripe-webhook\route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-06-30.basil",
});

// Your Stripe webhook signing secret
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

// Initialize Firebase Admin (only once)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, endpointSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed.", err.message);
    return new NextResponse("Webhook Error", { status: 400 });
  }

  const db = getFirestore();

  // ✅ Handle successful payments (both subscriptions and one-time)
  if (
    event.type === "checkout.session.completed" ||
    event.type === "invoice.payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;

    const customerId = session.customer as string;
    const metadata = session.metadata;

    if (!metadata?.userId) {
      console.warn("⚠️ Missing userId in session metadata.");
      return NextResponse.json({ received: true });
    }

    const userId = metadata.userId;

    await db.collection("users").doc(userId).set(
      {
        isSubscribed: true,
        stripeCustomerId: customerId,
        subscriptionType: session.mode === "subscription" ? "subscription" : "lifetime",
        lastUpdated: Date.now(),
      },
      { merge: true }
    );

    console.log(`✅ Marked user ${userId} as subscribed.`);
  }

  return NextResponse.json({ received: true });
}
