/**
 * =====================================================================
 * STORYBOARD SPEC VALIDATOR
 * Strict film grammar enforcement for storyboard generation
 * =====================================================================
 * 
 * Rules enforcer:
 * - Shot size grammar (LS, MS, CU, etc.)
 * - Camera angles (low angle, high angle, eye level)
 * - Lens properties (focal length perspective)
 * - Composition rules (rule of thirds, framing)
 * - Multi-frame generation strategy
 * - Dialogue/action consistency
 * 
 * Purpose: Ensure storyboard frames are cinematically correct
 * and can be shot exactly as specified.
 */

export interface ShotGrammarRule {
  shotSize: string; // e.g., 'LS', 'MS', 'CU'
  definition: string;
  framingRule: string;
  depthOfField?: string;
}

export interface CameraAngleRule {
  angle: string; // e.g., 'Low Angle', 'High Angle'
  cameraPosition: string;
  psychologicalEffect: string;
  enforceRule: string;
}

export interface LensCharacteristic {
  lens: string; // e.g., '24mm Wide', '85mm Portrait'
  perspective: string;
  distortion: string;
  emotionalWeight: string;
}

export interface CompositionRule {
  rule: string; // e.g., 'Rule of Thirds'
  application: string;
  framingGuide: string;
}

/**
 * SHOT SIZES - STRICT DEFINITIONS
 * These are non-negotiable grammar rules
 */
export const SHOT_SIZES: Record<string, ShotGrammarRule> = {
  ELS: {
    shotSize: 'ELS (Extreme Long Shot)',
    definition: 'Entire environment visible, character nearly imperceptible',
    framingRule: 'Environment dominates 80%+ of frame, character is tiny reference point',
    depthOfField: 'Infinite, establishes geography',
  },
  LS: {
    shotSize: 'LS (Long Shot)',
    definition: 'Full body of character visible, environment provides context',
    framingRule: 'Head-to-toe visible; character occupies ~30% of frame',
    depthOfField: 'Deep focus, shows entire scene',
  },
  MLS: {
    shotSize: 'MLS (Medium Long Shot)',
    definition: 'Full body visible with legs emphasized',
    framingRule: 'Knees-to-head visible; character ~40% of frame',
    depthOfField: 'Deep to medium',
  },
  MS: {
    shotSize: 'MS (Medium Shot)',
    definition: 'Waist to head, primary framing for dialogue',
    framingRule: 'Approximately waist-up; character ~50-60% of frame',
    depthOfField: 'Medium DOF allows slight background blur',
  },
  MCU: {
    shotSize: 'MCU (Medium Close-Up)',
    definition: 'Chest to head, emotional content',
    framingRule: 'Chest-up; character ~70% of frame',
    depthOfField: 'Shallow DOF begins to separate subject from background',
  },
  CU: {
    shotSize: 'CU (Close-Up)',
    definition: 'Face or hands, intimate emotional moments',
    framingRule: 'Face-only or hands-only; subject fills most of frame',
    depthOfField: 'Shallow DOF; background is soft bokeh',
  },
  ECU: {
    shotSize: 'ECU (Extreme Close-Up)',
    definition: 'Eye detail, object detail, intense emotional beat',
    framingRule: 'Fills frame with specific feature (eye, mouth, object)',
    depthOfField: 'Extremely shallow; only focused area sharp',
  },
  INSERT: {
    shotSize: 'INSERT',
    definition: 'Small object detail (clock, knife, letter)',
    framingRule: 'Object fills frame, no character required',
    depthOfField: 'Can be macro photography, shallow DOF',
  },
  OS: {
    shotSize: 'OS (Over-Shoulder)',
    definition: 'Two characters in dialogue; shot from behind one',
    framingRule: 'Rear character ~20%, front character fills rest',
    depthOfField: 'Shallow DOF on front character',
  },
  POV: {
    shotSize: 'POV (Point-of-View)',
    definition: 'Camera shows what character sees',
    framingRule: 'Head level at character\'s height; environment fills frame',
    depthOfField: 'Matches character\'s visual focus',
  },
  TWO_SHOT: {
    shotSize: '2-Shot',
    definition: 'Two characters, both visible and relevant',
    framingRule: 'Both occupy ~30% each, with space/interaction between',
    depthOfField: 'Medium, may slightly separate pair from background',
  },
};

/**
 * CAMERA ANGLES - PSYCHOLOGICAL INTENT
 * Enforced strictly for emotional storytelling
 */
export const CAMERA_ANGLES: Record<string, CameraAngleRule> = {
  'Eye Level': {
    angle: 'Eye Level',
    cameraPosition: 'Horizontal to subject\'s eye line',
    psychologicalEffect: 'Neutral, equality, no power dynamic',
    enforceRule: 'Camera must be at exact subject eye height',
  },
  'Low Angle': {
    angle: 'Low Angle',
    cameraPosition: 'Below subject eye line, looking up',
    psychologicalEffect: 'Empowerment, dominance, grandeur, threat',
    enforceRule: 'Camera must be substantially BELOW eye level; subject must appear to tower',
  },
  'High Angle': {
    angle: 'High Angle',
    cameraPosition: 'Above subject eye line, looking down',
    psychologicalEffect: 'Vulnerability, weakness, imprisonment, insignificance',
    enforceRule: 'Camera must be substantially ABOVE eye level; subject appears diminished',
  },
  'Dutch Angle': {
    angle: 'Dutch Angle (Tilted/Canted)',
    cameraPosition: 'Camera rotated 15–45° off horizontal',
    psychologicalEffect: 'Chaos, instability, disorientation, danger, surrealism',
    enforceRule: 'Horizon line must be visibly tilted; no subtle tilts',
  },
  "Bird's Eye": {
    angle: "Bird's Eye (Overhead)",
    cameraPosition: 'Camera directly above subject, looking straight down',
    psychologicalEffect: 'Omniscient perspective, detachment, trap/maze, surveillance',
    enforceRule: 'Camera must shoot straight DOWN; scene viewed as map/diagram',
  },
  "Worm's Eye": {
    angle: "Worm's Eye (Ground Level)",
    cameraPosition: 'Camera at ground level, extreme low angle',
    psychologicalEffect: 'Extreme vulnerability, surrealism, insect/animal perspective',
    enforceRule: 'Camera literally at ground; subjects tower impossibly',
  },
};

/**
 * LENS FOCAL LENGTHS - PERSPECTIVE DISTORTION
 * Strictly tied to emotional weight and composition
 */
export const LENS_CHARACTERISTICS: Record<string, LensCharacteristic> = {
  '24mm Wide': {
    lens: '24mm Wide',
    perspective: 'Exaggerated perspective, foreground depth emphasized, background compressed',
    distortion: 'Noticeable barrel distortion at edges; makes close subjects loom',
    emotionalWeight: 'Claustrophobic, visceral, immersive, slightly unsettling',
  },
  '35mm Standard': {
    lens: '35mm Standard',
    perspective: 'Moderate wide angle; closer to human eye perspective',
    distortion: 'Minimal distortion; natural-feeling',
    emotionalWeight: 'Cinematic but accessible; journalistic feel',
  },
  '50mm Standard': {
    lens: '50mm Standard',
    perspective: 'Matches human eye angle of view (~47°)',
    distortion: 'No distortion; most neutral',
    emotionalWeight: 'Natural, observed, intimate realism',
  },
  '85mm Portrait': {
    lens: '85mm Portrait',
    perspective: 'Slightly compressed; flattens depth, isolates subject',
    distortion: 'Minimal; flattering to faces',
    emotionalWeight: 'Romantic, isolated, psychological introspection',
  },
  '135mm Telephoto': {
    lens: '135mm Telephoto',
    perspective: 'Heavily compressed; foreground and background merge',
    distortion: 'Heavy compression; subjects appear stacked',
    emotionalWeight: 'Distant observation, surveillance, psychological intensity',
  },
};

/**
 * COMPOSITION RULES - VISUAL BALANCE
 */
export const COMPOSITION_RULES: Record<string, CompositionRule> = {
  'Rule of Thirds': {
    rule: 'Rule of Thirds',
    application: 'Divide frame into 9 equal sections (3x3 grid); place key elements on lines or intersections',
    framingGuide: 'Horizon on top or bottom third; subject on left or right third; eyes on upper intersection',
  },
  'Center Frame': {
    rule: 'Center Frame',
    application: 'Subject placed directly in center; symmetrical composition',
    framingGuide: 'Subject dead-center; suggests power, authority, or stability',
  },
  'Leading Lines': {
    rule: 'Leading Lines',
    application: 'Use roads, shadows, architecture to draw eye toward subject',
    framingGuide: 'Lines converge at subject; creates depth and directional intent',
  },
  'Frame within Frame': {
    rule: 'Frame within Frame',
    application: 'Use foreground elements to create a secondary frame around subject',
    framingGuide: 'Doorway, window, branches frame subject; adds depth and context',
  },
};

/**
 * VALIDATE SHOT SIZE
 * Ensures storyboard uses correct shot size grammar
 */
export function validateShotSize(shotSize: string): {
  valid: boolean;
  rule?: ShotGrammarRule;
  error?: string;
} {
  const normalized = String(shotSize || '')
    .toUpperCase()
    .replace(/\s+/g, '');

  const key = Object.keys(SHOT_SIZES).find(
    k => normalized.includes(k) || normalized === k
  );

  if (!key) {
    return {
      valid: false,
      error: `Invalid shot size "${shotSize}". Use: ${Object.keys(SHOT_SIZES).join(', ')}`,
    };
  }

  return {
    valid: true,
    rule: SHOT_SIZES[key],
  };
}

/**
 * VALIDATE CAMERA ANGLE
 * Enforces psychological impact of angle choice
 */
export function validateCameraAngle(angle: string): {
  valid: boolean;
  rule?: CameraAngleRule;
  error?: string;
} {
  const normalized = String(angle || '').trim();
  const key = Object.keys(CAMERA_ANGLES).find(
    k => k.toLowerCase() === normalized.toLowerCase()
  );

  if (!key) {
    return {
      valid: false,
      error: `Invalid angle "${angle}". Use: ${Object.keys(CAMERA_ANGLES).join(', ')}`,
    };
  }

  return {
    valid: true,
    rule: CAMERA_ANGLES[key],
  };
}

/**
 * VALIDATE LENS
 * Ensures lens choice matches emotional intent
 */
export function validateLens(lens: string): {
  valid: boolean;
  characteristic?: LensCharacteristic;
  error?: string;
} {
  const normalized = String(lens || '').trim();
  const key = Object.keys(LENS_CHARACTERISTICS).find(
    k => k.toLowerCase() === normalized.toLowerCase()
  );

  if (!key) {
    return {
      valid: false,
      error: `Invalid lens "${lens}". Use: ${Object.keys(LENS_CHARACTERISTICS).join(', ')}`,
    };
  }

  return {
    valid: true,
    characteristic: LENS_CHARACTERISTICS[key],
  };
}

/**
 * VALIDATE COMPOSITION
 */
export function validateComposition(composition: string): {
  valid: boolean;
  rule?: CompositionRule;
  error?: string;
} {
  const normalized = String(composition || '').trim();
  const key = Object.keys(COMPOSITION_RULES).find(
    k => normalized.toLowerCase().includes(k.toLowerCase())
  );

  if (!key) {
    return {
      valid: false,
      error: `Invalid composition "${composition}". Use: ${Object.keys(COMPOSITION_RULES).join(', ')}`,
    };
  }

  return {
    valid: true,
    rule: COMPOSITION_RULES[key],
  };
}

/**
 * VALIDATE STORYBOARD FRAME
 * Full compliance check for a single frame
 */
export interface StoryboardFrameValidation {
  frameId: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  rules: {
    shotSize?: ShotGrammarRule;
    angle?: CameraAngleRule;
    lens?: LensCharacteristic;
    composition?: CompositionRule;
  };
}

export function validateStoryboardFrame(frame: any): StoryboardFrameValidation {
  const frameId = `${frame.scene || 'Unknown'} — Shot ${frame.shotNumber || '?'}`;
  const errors: string[] = [];
  const warnings: string[] = [];
  const rules: any = {};

  // 1. Validate shot size
  if (!frame.shotSize) {
    errors.push('Missing shotSize');
  } else {
    const shotVal = validateShotSize(frame.shotSize);
    if (!shotVal.valid) {
      errors.push(shotVal.error || 'Invalid shot size');
    } else {
      rules.shotSize = shotVal.rule;
    }
  }

  // 2. Validate camera angle
  if (!frame.cameraAngle) {
    errors.push('Missing cameraAngle');
  } else {
    const angleVal = validateCameraAngle(frame.cameraAngle);
    if (!angleVal.valid) {
      errors.push(angleVal.error || 'Invalid angle');
    } else {
      rules.angle = angleVal.rule;
    }
  }

  // 3. Validate lens
  if (!frame.lens) {
    warnings.push('Missing lens specification');
  } else {
    const lensVal = validateLens(frame.lens);
    if (!lensVal.valid) {
      errors.push(lensVal.error || 'Invalid lens');
    } else {
      rules.lens = lensVal.characteristic;
    }
  }

  // 4. Validate composition
  if (!frame.composition) {
    warnings.push('Missing composition rule');
  } else {
    const compVal = validateComposition(frame.composition);
    if (!compVal.valid) {
      errors.push(compVal.error || 'Invalid composition');
    } else {
      rules.composition = compVal.rule;
    }
  }

  // 5. Validate description
  if (!frame.description || String(frame.description).trim().length < 20) {
    errors.push('Description too short or missing (min 20 chars)');
  }

  // 6. Validate camera movement
  if (!frame.cameraMovement) {
    warnings.push('Missing cameraMovement');
  }

  // 7. Validate action notes
  if (!frame.actionNotes) {
    warnings.push('Missing actionNotes (blocking/staging)');
  }

  // 8. Validate imagePrompt
  if (!frame.imagePrompt) {
    errors.push('Missing imagePrompt');
  }

  return {
    frameId,
    isValid: errors.length === 0,
    errors,
    warnings,
    rules,
  };
}

/**
 * VALIDATE MULTI-FRAME SEQUENCE
 * Ensures frames don't repeat shot sizes too much
 * and follow good editing rhythm
 */
export interface SequenceValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  shotSizeDistribution: Record<string, number>;
  angleDistribution: Record<string, number>;
}

export function validateFrameSequence(frames: any[]): SequenceValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const shotSizeDistribution: Record<string, number> = {};
  const angleDistribution: Record<string, number> = {};

  // Validate individual frames
  const frameValidations = frames.map(f => validateStoryboardFrame(f));
  const invalidFrames = frameValidations.filter(v => !v.isValid);
  if (invalidFrames.length > 0) {
    errors.push(`${invalidFrames.length} frame(s) failed validation`);
  }

  // Track shot sizes
  frames.forEach((f, idx) => {
    const shotSize = String(f.shotSize || '').toUpperCase();
    shotSizeDistribution[shotSize] = (shotSizeDistribution[shotSize] || 0) + 1;

    // Check for repetition
    if (idx > 0 && frames[idx - 1].shotSize === f.shotSize && idx > 1) {
      if (frames[idx - 2].shotSize === f.shotSize) {
        warnings.push(`Frame ${idx + 1}: Same shot size (${f.shotSize}) used 3+ times consecutively`);
      }
    }

    const angle = String(f.cameraAngle || '');
    angleDistribution[angle] = (angleDistribution[angle] || 0) + 1;
  });

  // Warn if LS/CU distribution is unbalanced
  const lsCount = shotSizeDistribution['LS'] || 0;
  const cuCount = shotSizeDistribution['CU'] || 0;
  const msCount = shotSizeDistribution['MS'] || 0;

  const ratio = frames.length > 0 ? (lsCount / frames.length) * 100 : 0;
  if (ratio > 50) {
    warnings.push(`Heavy use of LS (${ratio.toFixed(0)}%); consider more CU/MS for emotional beats`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    shotSizeDistribution,
    angleDistribution,
  };
}

/**
 * GENERATE COMPLIANT IMAGE PROMPT
 * Ensures the storyboard image prompt meets all requirements
 */
export function generateCompliantImagePrompt(frame: any): string {
  const {
    description,
    shotSize,
    cameraAngle,
    lens,
    lighting,
    composition,
    actionNotes,
    characters = [],
  } = frame;

  // Storyboard style constants
  const STORYBOARD_STYLE =
    'Cinematic hand-drawn storyboard sketch, black and white pencil style, ' +
    'professional film pre-production, dramatic lighting, realistic proportions, ' +
    'strong composition, detailed line work, moody atmosphere, not photorealistic, ' +
    'no color, no text, visible pencil strokes, cross-hatching effect, film grammar accurate';

  // Shot framing language
  const SHOT_FRAMING = {
    ELS: 'extreme wide establishing shot, environment dominates',
    LS: 'wide long shot, full bodies visible, environmental context',
    MLS: 'medium long shot, knees-to-head visible',
    MS: 'medium shot, waist-to-head framing',
    MCU: 'medium close-up, chest-to-head',
    CU: 'close-up, face detail and emotion',
    ECU: 'extreme close-up, detail emphasis',
    INSERT: 'insert shot, object detail only',
    OS: 'over-shoulder dialogue shot',
    POV: 'point-of-view perspective',
    '2-Shot': 'two-character frame, interaction',
  };

  const shotFraming = SHOT_FRAMING[shotSize as keyof typeof SHOT_FRAMING] || shotSize;

  // Angle language
  const ANGLE_LANGUAGE: Record<string, string> = {
    'Low Angle': 'shot from below looking up, camera at ground level, subject towers above',
    'High Angle': 'shot from above looking down, camera elevated, subject appears diminished',
    'Eye Level': 'neutral eye-level camera positioning',
    'Dutch Angle': 'tilted camera angle 30 degrees, diagonal horizon',
    "Bird's Eye": 'overhead top-down perspective, map-like view',
    "Worm's Eye": 'ground-level extreme low angle view',
  };

  const angleDesc = ANGLE_LANGUAGE[cameraAngle] || cameraAngle || '';

  // Lens language
  const LENS_LANGUAGE: Record<string, string> = {
    '24mm Wide': 'ultra-wide distorted perspective, exaggerated depth, foreground emphasis',
    '35mm Standard': 'moderate wide angle, natural cinematic view',
    '50mm Standard': 'standard 50mm perspective, human eye equivalent',
    '85mm Portrait': 'compressed telephoto perspective, isolated subject, flattened depth',
    '135mm Telephoto': 'heavy compression, distant observation, stacked spatial planes',
  };

  const lensDesc = LENS_LANGUAGE[lens as keyof typeof LENS_LANGUAGE] || lens || '';

  // Build the prompt
  const prompt = [
    STORYBOARD_STYLE,
    '',
    `${shotFraming} shot, ${angleDesc}`,
    lensDesc ? `Lens perspective: ${lensDesc}` : '',
    '',
    `Scene: ${description}`,
    actionNotes ? `Action/Staging: ${actionNotes}` : '',
    lighting ? `Lighting: ${lighting}` : '',
    composition ? `Composition: ${composition}` : '',
    characters.length > 0 ? `Characters: ${characters.join(', ')}` : '',
    '',
    'Film grammar exact compliance required. No interpretation allowed.',
  ]
    .filter(Boolean)
    .join('\n');

  return prompt.trim();
}

/**
 * MULTI-FRAME STRATEGY
 * Generate 3 distinct storyboard frames for each scene
 */
export interface MultiFrameStrategy {
  frame1: {
    name: string;
    shotSize: string;
    angle: string;
    purpose: string;
  };
  frame2: {
    name: string;
    shotSize: string;
    angle: string;
    purpose: string;
  };
  frame3: {
    name: string;
    shotSize: string;
    angle: string;
    purpose: string;
  };
}

export function getMultiFrameStrategy(sceneContext: string): MultiFrameStrategy {
  // Default 3-frame strategy
  return {
    frame1: {
      name: 'ESTABLISHING SHOT',
      shotSize: 'LS',
      angle: 'Eye Level',
      purpose: 'Set location, introduce environment, establish geography',
    },
    frame2: {
      name: 'ACTION / DIALOGUE SHOT',
      shotSize: 'MS',
      angle: 'Eye Level',
      purpose: 'Main action, character performance, dialogue delivery',
    },
    frame3: {
      name: 'TENSION / DETAIL SHOT',
      shotSize: 'CU',
      angle: 'Low Angle',
      purpose: 'Emotional impact, close detail, psychological moment',
    },
  };
}
