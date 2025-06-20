export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      movieIdea: string;
      movieGenre: string;
      scriptLength: string;
      step: string;
    };

    const { movieIdea, movieGenre, scriptLength, step } = body;

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;


    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here' || OPENAI_API_KEY.includes('your_ope')) {
      return new Response(JSON.stringify({
        error: 'OpenAI API key not configured properly. Please:\n1. Get your API key from https://platform.openai.com/account/api-keys\n2. Add it to your .env file as OPENAI_API_KEY=your_actual_key\n3. Restart the development server'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const callOpenAI = async (prompt: string, model: string = 'gpt-4o'): Promise<string> => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API failed (${response.status}): ${errorText}`);
      }

      const result: unknown = await response.json();
      const text = (result as any)?.choices?.[0]?.message?.content;

      if (!text) {
        throw new Error('OpenAI API returned no text content');
      }

      return text;
    };

    let result: Record<string, any> = {};

    switch (step) {
      case 'concept':
        const conceptPrompt = `You are a professional script analyst and story consultant. For a ${movieGenre} film titled "${movieIdea}", create:

1. A compelling one-sentence LOGLINE that captures the essence of the story with clear protagonist, conflict, and stakes
2. A detailed SYNOPSIS (2-3 paragraphs) that outlines the main plot, character arcs, and resolution
3. Core THEMES (3-4 key themes) that the film explores with depth and meaning

Format your response exactly like this:
LOGLINE: [your logline here]

SYNOPSIS: [your synopsis here]

THEMES: [your themes here]

Make this professional and compelling for a ${scriptLength} film.`;

        const conceptResult = await callOpenAI(conceptPrompt);

        const loglineMatch = conceptResult.match(/LOGLINE:\s*(.*?)(?=\n\n|SYNOPSIS:|$)/s);
        const synopsisMatch = conceptResult.match(/SYNOPSIS:\s*(.*?)(?=\n\nTHEMES:|THEMES:|$)/s);
        const themesMatch = conceptResult.match(/THEMES:\s*(.*?)$/s);

        result = {
          logline: loglineMatch?.[1]?.trim() || 'A compelling story unfolds.',
          synopsis: synopsisMatch?.[1]?.trim() || 'Synopsis not generated.',
          themes: themesMatch?.[1]?.trim() || 'Themes not generated.',
        };
        break;

      case 'characters':
        const charactersPrompt = `Based on the logline "${movieIdea}" for a ${movieGenre} film, create detailed character breakdowns for 3-4 main characters. For each character include:

- Name (fitting for the genre and story)
- Age and physical description
- Personality/Archetype (complex, not one-dimensional)
- Primary motivation and goal
- Character flaw or internal conflict
- Brief backstory that informs their actions
- Character arc throughout the story

Make the characters compelling, diverse, and well-developed for this ${scriptLength} film.`;

        result = { characters: await callOpenAI(charactersPrompt) };
        break;

      case 'sound':
        const soundPrompt = `As a professional Sound Designer and Composer for a ${movieGenre} film with the logline "${movieIdea}", create a comprehensive audio design brief including:

1. OVERALL SONIC MOOD AND ATMOSPHERE
2. KEY SOUND MOTIFS AND EFFECTS
3. MUSIC STYLE AND INSTRUMENTATION
4. AUDIO STORYTELLING

Create a professional sound design document.`;

        result = { soundDesign: await callOpenAI(soundPrompt) };
        break;

      case 'outline':
        const outlinePrompt = `Create a detailed scene-by-scene outline (beat sheet) for a ${scriptLength} ${movieGenre} film with logline: "${movieIdea}".

Structure requirements:
- For films longer than 30 minutes: Use Three-Act Structure with clear act breaks
- For shorter films: Create tight pacing with clear beginning, middle, end
- Include page count estimates for each scene
- Mark key story beats (Inciting Incident, Plot Points, Midpoint, Climax, Resolution)

Make this a professional outline that could guide the screenplay writing process.`;

        result = { outline: await callOpenAI(outlinePrompt) };
        break;

      case 'script':
        const scriptPrompt = `Write a complete screenplay for a ${scriptLength} ${movieGenre} film based on: "${movieIdea}".

FORMATTING REQUIREMENTS:
- Use proper screenplay format with scene headings (INT./EXT. LOCATION - TIME)
- Include character names in ALL CAPS when first introduced
- Write clear, visual action lines
- Format dialogue properly

SPECIAL INSTRUCTION: For 3-4 highly visual scenes, wrap the entire scene with [SCENE START] and [SCENE END] tags.

Write a professional, shootable screenplay.`;

        result = { script: await callOpenAI(scriptPrompt, 'gpt-4o') };
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid step' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
