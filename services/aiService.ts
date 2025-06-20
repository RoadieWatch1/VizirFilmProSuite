export async function generateStoryboard(prompt: string) {
  const response = await fetch('/api/storyboard', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
    headers: { 'Content-Type': 'application/json' },
  });

  return response.json();
}
