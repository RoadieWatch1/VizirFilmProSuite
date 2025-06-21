export interface Shot {
  shot_type: string;
  description: string;
  lens_angle: string;
  movement: string;
  lighting_setup: string;
  image: string;
}

export interface StoryboardScene {
  shots: Shot[];
}

export async function generateStoryboard(prompt: string, genre: string): Promise<StoryboardScene> {
  const response = await fetch('/api/storyboard', {
    method: 'POST',
    body: JSON.stringify({ prompt, genre }),
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to generate storyboard');
  }

  const data = await response.json();
  return data as StoryboardScene;
}

