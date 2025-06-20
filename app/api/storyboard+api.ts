export async function POST(request: Request) {
  try {
    const { sceneText, genre } = await request.json();
    
    // Get OpenAI API key from environment variables
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here' || OPENAI_API_KEY.includes('your_ope')) {
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured properly. Please:\n1. Get your API key from https://platform.openai.com/account/api-keys\n2. Add it to your .env file as OPENAI_API_KEY=your_actual_key\n3. Restart the development server' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const callOpenAI = async (prompt: string): Promise<string> => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      return result.choices?.[0]?.message?.content || '';
    };

    const callDALLE = async (prompt: string): Promise<string | null> => {
      try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: prompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard',
            style: 'natural'
          }),
        });

        if (!response.ok) {
          console.error('DALL-E Error:', response.status);
          return null;
        }

        const result = await response.json();
        return result.data?.[0]?.url || null;
      } catch (error) {
        console.error('DALL-E Error:', error);
        return null;
      }
    };

    // Generate shot list
    const shotListPrompt = `As an experienced Director of Photography for a ${genre} film, analyze this scene and create a shot list of 5-7 essential shots:

SCENE: ${sceneText}

Respond in this exact JSON format:
{
  "shots": [
    {
      "shot_type": "Wide Shot",
      "description": "Character enters the room, hesitant and looking around nervously",
      "lens_angle": "35mm lens, eye level",
      "movement": "Static",
      "lighting_setup": "Natural key light from window camera left, soft fill from bounce board camera right"
    }
  ]
}`;

    const shotListResponse = await callOpenAI(shotListPrompt);
    
    let shotData;
    try {
      const jsonMatch = shotListResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        shotData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      throw new Error('Could not parse shot list from AI response');
    }

    const shots = shotData.shots || [];
    
    if (shots.length === 0) {
      throw new Error('No shots generated in response');
    }

    // Generate images for each shot
    const shotsWithImages = [];
    for (const shot of shots) {
      const imagePrompt = `Simple black and white storyboard sketch: ${shot.description}. Camera: ${shot.shot_type}. Clean pencil drawing style, film storyboard panel, basic composition, minimal details.`;
      const imageUrl = await callDALLE(imagePrompt);
      shotsWithImages.push({ ...shot, image: imageUrl });
    }

    return new Response(JSON.stringify({
      sceneText,
      shots: shotsWithImages,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Storyboard API Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}