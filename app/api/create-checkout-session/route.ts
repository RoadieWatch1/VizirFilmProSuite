// C:\Users\vizir\VizirPro\app\api\create-checkout-session\route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin SDK if not already
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
    console.log("Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    throw new Error("Firebase Admin SDK initialization failed");
  }
}

// Initialize Stripe with the expected API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-06-30.basil", // Match the expected type to resolve TypeScript error
});

// One-time payment price (Lifetime)
const LIFETIME_PRICE_ID = "price_1RasBfIgN98dwGnNFbbrFxqo";

export const dynamic = "force-dynamic"; // Ensure route is dynamic

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    // Validate environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    if (
      !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      !process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
      !process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
      !process.env.NEXT_PUBLIC_APP_URL
    ) {
      throw new Error("Missing required Firebase or app URL environment variables");
    }

    body = await req.json();
    const { priceId } = body;
    const token = req.headers.get("authorization")?.replace("Bearer ", "");

    if (!priceId || !token) {
      return NextResponse.json(
        { error: "Missing priceId or token" },
        { status: 400 }
      );
    }

    // Verify Firebase ID token
    let firebaseUID: string;
    try {
      const decoded = await getAuth().verifyIdToken(token);
      firebaseUID = decoded.uid;
    } catch (err) {
      console.error("Invalid Firebase token:", err);
      return NextResponse.json(
        { error: "Invalid Firebase token" },
        { status: 401 }
      );
    }

    const mode: "payment" | "subscription" =
      priceId === LIFETIME_PRICE_ID ? "payment" : "subscription";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: firebaseUID,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade?canceled=true`,
    });

    console.log("Created Stripe checkout session:", { sessionId: session.id });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("[API] Checkout session error:", err, { input: body || "No input available" });
    return NextResponse.json(
      {
        error: err.message || "Failed to create checkout session",
        details: err.stack || "No stack trace available",
      },
      { status: 500 }
    );
  }
}