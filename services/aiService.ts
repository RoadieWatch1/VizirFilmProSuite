// /services/aiService.ts
/**
 * Calls the backend generate API for script, synopsis, concept, characters, etc.
 */
export async function generateFilmPackage(
  idea: string,
  genre: string,
  length: string,
  setLoadingMessage: (msg: string) => void
): Promise<any> {
  setLoadingMessage("Generating your film package...");

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      movieIdea: idea,
      movieGenre: genre,
      scriptLength: length,
      provider: "openai",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error?.error || "Failed to generate film package.");
  }

  return response.json();
}

export async function generateStoryboard(
  idea: string,
  genre: string,
  length: string,
  setLoadingMessage: (msg: string) => void
): Promise<any> {
  setLoadingMessage("Generating storyboard...");

  const response = await fetch("/api/storyboard", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sceneText: idea,
      genre,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error?.error || "Failed to generate storyboard.");
  }

  return (await response.json()).shots;
}

export async function generateSchedule(
  idea: string,
  genre: string,
  length: string,
  setLoadingMessage: (msg: string) => void
): Promise<any> {
  setLoadingMessage("Generating shooting schedule...");

  const response = await fetch("/api/schedule", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      movieIdea: idea,
      movieGenre: genre,
      scriptLength: length,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error?.error || "Failed to generate schedule.");
  }

  return (await response.json()).schedule;
}

export async function generateLocations(
  idea: string,
  genre: string,
  setLoadingMessage: (msg: string) => void
): Promise<any> {
  setLoadingMessage("Generating locations...");

  const response = await fetch("/api/locations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      movieIdea: idea,
      movieGenre: genre,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error?.error || "Failed to generate locations.");
  }

  return (await response.json()).locations;
}

export async function generateSoundDesign(
  idea: string,
  genre: string,
  setLoadingMessage: (msg: string) => void
): Promise<any> {
  setLoadingMessage("Generating sound design...");

  const response = await fetch("/api/sound", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      movieIdea: idea,
      movieGenre: genre,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error?.error || "Failed to generate sound design.");
  }

  return (await response.json()).soundPlan;
}

export async function generateExportPackage(
  idea: string,
  genre: string,
  length: string,
  setLoadingMessage: (msg: string) => void
): Promise<any> {
  setLoadingMessage("Preparing export package...");

  const response = await fetch("/api/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      movieIdea: idea,
      movieGenre: genre,
      scriptLength: length,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error?.error || "Failed to generate export package.");
  }

  return (await response.json()).exportPackage;
}

/**
 * Calls the backend Stable Diffusion API for generating images.
 */
export async function generateStableDiffusionImage(
  prompt: string,
  setLoadingMessage: (msg: string) => void,
  width?: number,
  height?: number
): Promise<string[]> {
  setLoadingMessage("Generating image with Stable Diffusion...");

  const response = await fetch("/api/stable-diffusion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      width: width || 512,
      height: height || 512,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to generate image.");
  }

  const data = await response.json();
  return data.images || [];
}
