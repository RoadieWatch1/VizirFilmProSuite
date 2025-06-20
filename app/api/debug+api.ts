export async function GET(request: Request) {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    return new Response(JSON.stringify({
      hasApiKey: !!OPENAI_API_KEY,
      keyLength: OPENAI_API_KEY?.length || 0,
      keyPrefix: OPENAI_API_KEY?.substring(0, 7) || 'none',
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('OPENAI')),
      nodeEnv: process.env.NODE_ENV,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      hasProcessEnv: typeof process !== 'undefined',
      hasEnv: typeof process.env !== 'undefined',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}