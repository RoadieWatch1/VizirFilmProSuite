// C:\Users\vizir\VizirPro\app\api\stripe-webhook\route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * IMPORTANT:
 * - Do NOT create Stripe client or initialize Firebase Admin at module load time.
 * - Vercel/Next can evaluate route modules during build, and missing env vars can crash builds.
 */

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
}

function ensureFirebaseAdmin() {
  if (getApps().length) return;

  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error(
      "Missing Firebase Admin env vars (FIREBASE_PROJECT_ID/NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)"
    );
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) {
    console.error("❌ Missing STRIPE_WEBHOOK_SECRET");
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch (err: any) {
    console.error("❌ Failed to read webhook body:", err?.message || err);
    return new NextResponse("Invalid body", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed.", err?.message || err);
    return new NextResponse("Webhook Error", { status: 400 });
  }

  try {
    ensureFirebaseAdmin();
    const db = getFirestore();

    // ✅ Handle successful payments
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const metadata = session.metadata || {};
      const userId = metadata.userId;

      if (!userId) {
        console.warn("⚠️ checkout.session.completed missing metadata.userId");
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const customerId = (session.customer as string) || "";
      const isSub = session.mode === "subscription";

      await db
        .collection("users")
        .doc(userId)
        .set(
          {
            isSubscribed: true,
            stripeCustomerId: customerId || null,
            subscriptionType: isSub ? "subscription" : "lifetime",
            lastUpdated: Date.now(),
          },
          { merge: true }
        );

      console.log(`✅ Marked user ${userId} as subscribed (checkout.session.completed).`);
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;

      const metadata = invoice.metadata || {};
      const userId = metadata.userId;

      if (!userId) {
        console.warn("⚠️ invoice.payment_succeeded missing metadata.userId");
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const customerId = (invoice.customer as string) || "";

      // ✅ Stripe types differ by version; read subscription safely
      const subscriptionId =
        typeof (invoice as any).subscription === "string"
          ? ((invoice as any).subscription as string)
          : typeof (invoice as any).subscription?.id === "string"
          ? ((invoice as any).subscription.id as string)
          : "";

      await db
        .collection("users")
        .doc(userId)
        .set(
          {
            isSubscribed: true,
            stripeCustomerId: customerId || null,
            stripeSubscriptionId: subscriptionId || null,
            subscriptionType: "subscription",
            lastUpdated: Date.now(),
          },
          { merge: true }
        );

      console.log(`✅ Marked user ${userId} as subscribed (invoice.payment_succeeded).`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Webhook handler error:", err?.message || err);
    return new NextResponse("Webhook handler error", { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
