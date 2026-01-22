// C:\Users\vizir\VizirPro\app\api\create-checkout-session\route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// ✅ Must be Node.js (Stripe + firebase-admin)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------- Firebase Admin Init (once) ----------
if (!getApps().length) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // ✅ Support either env naming style
  const clientEmail =
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;

  const privateKeyRaw =
    process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    // Don’t throw at module scope in production builds if env is missing.
    // We’ll return a 500 inside POST with a clean error.
    console.warn("⚠️ Firebase Admin env vars missing. Init will be attempted in POST.");
  } else {
    try {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKeyRaw.replace(/\\n/g, "\n"),
        }),
      });
      console.log("✅ Firebase Admin SDK initialized");
    } catch (error) {
      console.error("❌ Firebase Admin init failed:", error);
      // Same: don’t throw here; return clean error in POST.
    }
  }
}

// ---------- Stripe ----------
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-06-30.basil",
});

// One-time payment price (Lifetime)
const LIFETIME_PRICE_ID = "price_1RasBfIgN98dwGnNFbbrFxqo";

function jsonError(status: number, message: string, extra?: Record<string, any>) {
  return NextResponse.json(
    { error: message, ...(extra || {}) },
    { status }
  );
}

export async function POST(req: NextRequest) {
  // Validate required env at runtime
  if (!process.env.STRIPE_SECRET_KEY) {
    return jsonError(500, "Server misconfigured: STRIPE_SECRET_KEY is not set.");
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail =
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw =
    process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    return jsonError(500, "Server misconfigured: Firebase Admin env vars are missing.", {
      missing: {
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: !projectId,
        FIREBASE_ADMIN_CLIENT_EMAIL_or_FIREBASE_CLIENT_EMAIL: !clientEmail,
        FIREBASE_ADMIN_PRIVATE_KEY_or_FIREBASE_PRIVATE_KEY: !privateKeyRaw,
      },
    });
  }

  // Ensure Firebase is initialized (in case module init was skipped)
  if (!getApps().length) {
    try {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKeyRaw.replace(/\\n/g, "\n"),
        }),
      });
      console.log("✅ Firebase Admin SDK initialized (inside POST)");
    } catch (e: any) {
      console.error("❌ Firebase Admin init failed (inside POST):", e);
      return jsonError(500, "Firebase Admin initialization failed.");
    }
  }

  // Read body safely
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // If body is empty or invalid JSON
    body = {};
  }

  const priceId = body?.priceId as string | undefined;

  // ✅ Token handling: this is the main reason you’re seeing failures
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : undefined;

  if (!priceId) {
    return jsonError(400, "Missing priceId.");
  }

  if (!token) {
    // ✅ This turns your current “400” into a clear “not logged in”
    return jsonError(401, "Not authenticated. Please log in before purchasing.");
  }

  // Verify Firebase ID token
  let firebaseUID: string;
  let firebaseEmail: string | undefined;

  try {
    const decoded = await getAuth().verifyIdToken(token);
    firebaseUID = decoded.uid;
    firebaseEmail = decoded.email;
  } catch (err) {
    console.error("❌ Invalid Firebase token:", err);
    return jsonError(401, "Invalid Firebase session. Please log in again.");
  }

  // Decide checkout mode
  const mode: "payment" | "subscription" =
    priceId === LIFETIME_PRICE_ID ? "payment" : "subscription";

  // Use configured app URL if present, otherwise infer from request origin
  const origin =
    (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim()) ||
    req.nextUrl.origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],

      // ✅ Strong linking
      client_reference_id: firebaseUID,
      metadata: { userId: firebaseUID },

      // Helpful for Stripe checkout UI
      ...(firebaseEmail ? { customer_email: firebaseEmail } : {}),

      success_url: `${origin}/upgrade?success=true`,
      cancel_url: `${origin}/upgrade?canceled=true`,
      allow_promotion_codes: true,
    });

    console.log("✅ Created Stripe checkout session:", { sessionId: session.id });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("❌ Stripe session create failed:", err?.message || err);
    return jsonError(500, "Failed to create Stripe checkout session.", {
      stripeMessage: err?.message,
    });
  }
}
