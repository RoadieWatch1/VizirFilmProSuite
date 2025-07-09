// C:\Users\vizir\VizirFilmProSuite\app\api\debug+api.ts

export async function GET(request: Request): Promise<Response> {
  try {
    const serverKey = process.env.OPENAI_API_KEY || "";
    const expoKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";

    const response = {
      hasServerApiKey: !!serverKey,
      serverKeyLength: serverKey.length,
      serverKeyPrefix: serverKey ? serverKey.substring(0, 7) : "none",

      hasExpoApiKey: !!expoKey,
      expoKeyLength: expoKey.length,
      expoKeyPrefix: expoKey ? expoKey.substring(0, 7) : "none",

      allEnvKeys: Object.keys(process.env).filter((key) =>
        key.includes("OPENAI")
      ),
      nodeEnv: process.env.NODE_ENV,
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Debug API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
