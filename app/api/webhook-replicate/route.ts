import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

/**
 * Validates the Replicate webhook signature using HMAC SHA256.
 */
function isValidSignature(req: NextRequest, body: string): boolean {
  const secret = process.env.REPLICATE_WEBHOOK_SECRET || "";
  const signature = req.headers.get("replicate-signature") || "";

  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(body).digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature, "utf-8") as unknown as Uint8Array,
    Buffer.from(digest, "utf-8") as unknown as Uint8Array
  );
}

/**
 * Handles Replicate webhook POST requests.
 * Saves completed audio metadata to Firestore.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Validate webhook authenticity
  if (!isValidSignature(req, rawBody)) {
    console.error("❌ Invalid Replicate webhook signature.");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const outputUrl = payload?.output?.[0];
  const prompt = payload?.input?.prompt;
  const status = payload?.status;
  const audioType = payload?.input?.type || "unknown";
  const description = payload?.input?.description || "";
  const scenes = payload?.input?.scenes || [];

  console.log("✅ Replicate webhook received:");
  console.log("🎧 Audio:", outputUrl);
  console.log("✍️ Prompt:", prompt);
  console.log("📦 Status:", status);

  if (status === "succeeded" && outputUrl) {
    try {
      await addDoc(collection(db, "soundAssets"), {
        name: prompt || "Untitled",
        type: audioType,
        audioUrl: outputUrl,
        description,
        scenes,
        createdAt: Date.now(),
      });

      console.log("✅ Audio asset saved to Firestore.");
    } catch (error) {
      console.error("🔥 Firestore save error:", error);
    }
  }

  return NextResponse.json({ success: true });
}
