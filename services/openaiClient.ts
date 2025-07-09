// /services/openaiClient.ts
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});
