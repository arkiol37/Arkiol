/**
 * Prompt Compiler Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 * Translates structured engine directives (acting, continuity, cinematic,
 * motion) into provider-specific optimized prompts. Each provider (Runway,
 * Pika, Sora) has different prompt grammar, weight syntax, and quality
 * triggers — this engine maximizes output quality by speaking each
 * provider's native language.
 *
 * Architecture:
 *   1. DirectiveParser — extracts structured data from engine outputs
 *   2. ProviderGrammar — provider-specific prompt syntax rules
 *   3. WeightAllocator — prioritizes directives by visual impact
 *   4. NegativePromptBuilder — prevents common AI video artifacts
 *   5. QualityTriggerInjector — adds provider-specific quality boosters
 *   6. PromptAssembler — builds final optimized prompt string
 */

import type { StoryboardScene, DirectorIntent, Mood, Platform, RenderMode } from '../types';
import type { ProviderName } from '../../providers/providerAdapter';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CompiledPrompt {
  provider: ProviderName;
  positivePrompt: string;
  negativePrompt: string;
  styleTokens: string[];
  qualityTokens: string[];
  technicalParams: Record<string, unknown>;
  originalLength: number;
  compiledLength: number;
  compressionRatio: number;
}

interface PromptDirective {
  category: 'acting' | 'continuity' | 'cinematic' | 'motion' | 'brand' | 'platform' | 'quality';
  weight: number;        // 0-1 importance
  content: string;
  provider_specific: Partial<Record<ProviderName, string>>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 1  PROVIDER GRAMMAR — how each provider interprets prompts
// ═══════════════════════════════════════════════════════════════════════════════

interface ProviderGrammarProfile {
  maxPromptLength: number;
  supportsNegativePrompt: boolean;
  supportsWeightSyntax: boolean;
  weightFormat: (text: string, weight: number) => string;
  qualityTriggers: string[];
  styleTriggers: Record<string, string>;
  moodTranslation: Record<Mood, string>;
  avoidTerms: string[];      // terms that confuse this provider
  strengthTerms: string[];   // terms that boost quality
}

const PROVIDER_GRAMMAR: Record<ProviderName, ProviderGrammarProfile> = {
  runway: {
    maxPromptLength: 1500,
    supportsNegativePrompt: true,
    supportsWeightSyntax: true,
    weightFormat: (text, w) => w > 0.8 ? `(${text}:${w.toFixed(1)})` : text,
    qualityTriggers: [
      'cinematic lighting', 'professional color grading', 'smooth camera movement',
      'high production value', 'broadcast quality', 'photorealistic rendering',
      'consistent character appearance', 'stable identity throughout',
    ],
    styleTriggers: {
      cinematic: 'anamorphic lens, film grain, teal and orange grading, 2.35:1 cinematic framing',
      commercial: 'commercial broadcast quality, product photography lighting, clean key light',
      editorial: 'editorial fashion photography style, dramatic rim lighting',
    },
    moodTranslation: {
      Luxury: 'luxury commercial aesthetic, warm golden lighting, slow elegant camera movement, premium materials with light reflections',
      Energetic: 'high energy motion, dynamic camera angles, vibrant saturated colors, fast-paced kinetic movement',
      Minimal: 'minimalist design, clean white backgrounds, precise geometric composition, subtle movement',
      Playful: 'bright cheerful palette, playful bounce animation, warm natural lighting, friendly approachable feel',
      Cinematic: 'cinematic depth of field, dramatic chiaroscuro lighting, anamorphic lens flare, film grain texture',
      Emotional: 'warm intimate lighting, shallow depth of field, golden hour warmth, authentic human emotion',
      Corporate: 'professional studio lighting, clean corporate environment, trust-building blue tones, steady camera',
      Bold: 'high contrast dramatic lighting, strong shadows, impactful composition, commanding visual presence',
      Calm: 'soft diffused lighting, gentle slow motion, pastel color palette, serene atmosphere',
      Tech: 'futuristic blue-lit environment, holographic elements, data visualization aesthetic, clean digital surfaces',
    },
    avoidTerms: ['cartoon', 'anime', 'pixel art', 'low quality'],
    strengthTerms: ['photorealistic', 'broadcast quality', '8K detail', 'professional production'],
  },

  pika: {
    maxPromptLength: 1000,
    supportsNegativePrompt: true,
    supportsWeightSyntax: false,
    weightFormat: (text, _w) => text,
    qualityTriggers: [
      'high quality', 'smooth motion', 'consistent appearance',
      'professional animation', 'clean transitions',
    ],
    styleTriggers: {
      cinematic: 'cinematic style, dramatic lighting, film look',
      commercial: 'commercial quality, product focused, clean lighting',
      editorial: 'editorial style, dramatic mood',
    },
    moodTranslation: {
      Luxury: 'luxury aesthetic, elegant, premium quality, golden tones',
      Energetic: 'energetic, dynamic, vibrant colors, fast motion',
      Minimal: 'minimalist, clean, modern, simple design',
      Playful: 'playful, colorful, fun, bright animation',
      Cinematic: 'cinematic, dramatic lighting, film grain, depth of field',
      Emotional: 'emotional, warm, intimate, heartfelt',
      Corporate: 'professional, corporate, clean, trustworthy',
      Bold: 'bold, high contrast, impactful, dramatic',
      Calm: 'calm, serene, soft lighting, peaceful',
      Tech: 'futuristic, tech, digital, holographic',
    },
    avoidTerms: ['hyperrealistic', 'DSLR', '8K'],
    strengthTerms: ['high quality animation', 'smooth motion', 'detailed'],
  },

  sora: {
    maxPromptLength: 2000,
    supportsNegativePrompt: false,
    supportsWeightSyntax: false,
    weightFormat: (text, _w) => text,
    qualityTriggers: [
      'photorealistic', 'cinematic camera movement', 'physically accurate lighting',
      'natural motion', 'consistent character identity', 'professional production quality',
      'detailed textures', 'realistic physics',
    ],
    styleTriggers: {
      cinematic: 'shot on 35mm film, cinematic color grading, dramatic lighting with lens flares, anamorphic bokeh',
      commercial: 'professional TV commercial, studio lighting setup, product beauty shot',
      editorial: 'high fashion editorial, dramatic mood lighting, artistic composition',
    },
    moodTranslation: {
      Luxury: 'ultra-premium luxury commercial, slow deliberate camera movement revealing exquisite details, warm golden hour lighting with rich shadows, materials catching light beautifully',
      Energetic: 'high-energy commercial with dynamic camera work, rapid but smooth transitions, saturated punchy colors, subjects in energetic motion',
      Minimal: 'minimalist aesthetic with precise geometric framing, clean white studio environment, single subject with negative space, subtle refined movement',
      Playful: 'joyful vibrant commercial with bouncy motion, bright saturated colors, warm natural daylight, subjects expressing genuine happiness',
      Cinematic: 'cinematic commercial shot on anamorphic lenses, dramatic chiaroscuro lighting, visible film grain, shallow depth of field with creamy bokeh, teal and orange color grading',
      Emotional: 'emotionally resonant commercial with intimate camera angles, warm golden light streaming through windows, shallow focus on genuine human expressions, soft natural color palette',
      Corporate: 'professional corporate video with steady camera movement, clean studio lighting, subjects in professional attire, trustworthy blue and neutral tones',
      Bold: 'bold impactful commercial with high-contrast lighting, dramatic shadows, strong graphic composition, subjects commanding attention with confident presence',
      Calm: 'serene peaceful commercial with gentle slow-motion, soft diffused natural light, muted pastel colors, tranquil atmosphere with subtle ambient movement',
      Tech: 'futuristic technology commercial with cool blue-tinted lighting, holographic UI elements, sleek digital surfaces reflecting light, data-stream particle effects',
    },
    avoidTerms: ['2D', 'flat design', 'illustration'],
    strengthTerms: ['photorealistic', 'physically accurate', 'cinematic', 'professional production'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 2  DIRECTIVE PARSER — extracts structured data from scene
// ═══════════════════════════════════════════════════════════════════════════════

function parseDirectives(scene: StoryboardScene, intent: DirectorIntent): PromptDirective[] {
  const directives: PromptDirective[] = [];

  // Core scene content (highest priority)
  directives.push({
    category: 'brand', weight: 1.0,
    content: scene.prompt.split('.').slice(0, 3).join('.'), // First 3 sentences = core brief
    provider_specific: {},
  });

  // Visual direction
  if (scene.visualDirection) {
    directives.push({
      category: 'cinematic', weight: 0.85,
      content: scene.visualDirection,
      provider_specific: {},
    });
  }

  // Acting/emotion (from prompt injection)
  const actingMatch = scene.prompt.match(/Emotion:.*?(?=\.|$)/);
  if (actingMatch) {
    directives.push({
      category: 'acting', weight: 0.7,
      content: actingMatch[0],
      provider_specific: {
        runway: actingMatch[0] + ', natural micro-expressions, realistic eye movement',
        sora: actingMatch[0] + ', authentic human performance, natural body language',
      },
    });
  }

  // Continuity constraints (from prompt injection)
  const contMatch = scene.prompt.match(/IDENTITY LOCK:.*?(?=\.|$)/);
  if (contMatch) {
    directives.push({
      category: 'continuity', weight: 0.9,
      content: contMatch[0],
      provider_specific: {
        runway: '(consistent character appearance:1.3), (no morphing:1.2), stable identity',
        sora: 'maintain exact character appearance throughout, no identity drift, consistent features',
        pika: 'consistent appearance, no morphing, stable character',
      },
    });
  }

  // Cinematic direction (from prompt injection)
  const cineMatch = scene.prompt.match(/CINEMATOGRAPHY:.*?(?=\.|$)/);
  if (cineMatch) {
    directives.push({
      category: 'cinematic', weight: 0.8,
      content: cineMatch[0],
      provider_specific: {},
    });
  }

  // Platform optimization
  directives.push({
    category: 'platform', weight: 0.6,
    content: `${intent.platform} ${intent.placement} format, ${intent.aspectRatio} aspect ratio`,
    provider_specific: {
      runway: intent.platform === 'tiktok' ? 'vertical format, mobile-optimized framing, subject centered' :
              intent.platform === 'youtube' ? 'widescreen cinematic framing, high production value' : '',
    },
  });

  return directives;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 3  NEGATIVE PROMPT BUILDER — prevents common AI video artifacts
// ═══════════════════════════════════════════════════════════════════════════════

function buildNegativePrompt(intent: DirectorIntent, provider: ProviderName): string {
  const base = [
    'blurry', 'distorted', 'deformed', 'low quality', 'watermark',
    'text artifacts', 'flickering', 'jitter', 'morphing face',
    'inconsistent identity', 'color banding', 'motion blur artifacts',
  ];

  const moodNegatives: Partial<Record<Mood, string[]>> = {
    Luxury: ['cheap', 'plastic', 'harsh lighting', 'amateur'],
    Minimal: ['cluttered', 'busy', 'noisy', 'over-decorated'],
    Cinematic: ['flat lighting', 'static camera', 'TV quality'],
    Corporate: ['casual', 'unprofessional', 'messy'],
    Calm: ['aggressive', 'chaotic', 'harsh'],
  };

  const all = [...base, ...(moodNegatives[intent.mood] || [])];

  if (provider === 'runway') {
    return all.join(', ');
  } else if (provider === 'pika') {
    return all.slice(0, 10).join(', '); // Pika has shorter negative prompt limit
  }
  // Sora doesn't support negative prompts
  return '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 4  QUALITY TRIGGER INJECTOR
// ═══════════════════════════════════════════════════════════════════════════════

function getQualityTokens(intent: DirectorIntent, provider: ProviderName): string[] {
  const grammar = PROVIDER_GRAMMAR[provider];
  const tokens = [...grammar.qualityTriggers];

  // Add cinematic-specific quality tokens
  if (intent.renderMode === 'Cinematic Ad') {
    const style = grammar.styleTriggers.cinematic;
    if (style) tokens.push(style);
  } else {
    const style = grammar.styleTriggers.commercial;
    if (style) tokens.push(style);
  }

  // Add strength terms
  tokens.push(...grammar.strengthTerms);

  return tokens;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 5  PROMPT ASSEMBLER — builds final optimized prompt
// ═══════════════════════════════════════════════════════════════════════════════

function assemblePrompt(
  directives: PromptDirective[],
  qualityTokens: string[],
  moodTranslation: string,
  provider: ProviderName,
  maxLength: number,
): string {
  const grammar = PROVIDER_GRAMMAR[provider];

  // Sort directives by weight (highest first)
  const sorted = [...directives].sort((a, b) => b.weight - a.weight);

  const parts: string[] = [];

  // Add mood translation first (sets the visual tone)
  parts.push(moodTranslation);

  // Add directives, using provider-specific versions when available
  for (const dir of sorted) {
    const text = dir.provider_specific[provider] || dir.content;
    if (!text) continue;

    // Apply weight syntax if provider supports it
    const weighted = grammar.supportsWeightSyntax && dir.weight > 0.7
      ? grammar.weightFormat(text, dir.weight)
      : text;

    parts.push(weighted);
  }

  // Add quality tokens
  parts.push(qualityTokens.join(', '));

  // Assemble and trim to max length
  let prompt = parts.filter(Boolean).join('. ').replace(/\.\./g, '.').replace(/\s+/g, ' ').trim();

  // Remove any terms that confuse this provider
  for (const avoid of grammar.avoidTerms) {
    prompt = prompt.replace(new RegExp(avoid, 'gi'), '');
  }

  // Trim to max length at sentence boundary
  if (prompt.length > maxLength) {
    const truncated = prompt.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    prompt = lastPeriod > maxLength * 0.5 ? truncated.substring(0, lastPeriod + 1) : truncated;
  }

  return prompt.replace(/\s+/g, ' ').trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 6  PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export function compilePrompt(
  scene: StoryboardScene,
  intent: DirectorIntent,
  provider: ProviderName,
): CompiledPrompt {
  const grammar = PROVIDER_GRAMMAR[provider];
  const directives = parseDirectives(scene, intent);
  const qualityTokens = getQualityTokens(intent, provider);
  const moodTranslation = grammar.moodTranslation[intent.mood] || grammar.moodTranslation.Cinematic;
  const negativePrompt = buildNegativePrompt(intent, provider);

  const positivePrompt = assemblePrompt(
    directives, qualityTokens, moodTranslation,
    provider, grammar.maxPromptLength,
  );

  return {
    provider,
    positivePrompt,
    negativePrompt,
    styleTokens: Object.values(grammar.styleTriggers).slice(0, 2),
    qualityTokens,
    technicalParams: {
      maxLength: grammar.maxPromptLength,
      supportsNegative: grammar.supportsNegativePrompt,
      supportsWeights: grammar.supportsWeightSyntax,
    },
    originalLength: scene.prompt.length,
    compiledLength: positivePrompt.length,
    compressionRatio: positivePrompt.length / Math.max(1, scene.prompt.length),
  };
}

export function compileAllPrompts(
  scenes: StoryboardScene[],
  intent: DirectorIntent,
  provider: ProviderName,
): CompiledPrompt[] {
  return scenes.map(scene => compilePrompt(scene, intent, provider));
}

/**
 * Get the best provider for this intent based on capabilities.
 */
export function selectOptimalProvider(intent: DirectorIntent): ProviderName {
  if (intent.renderMode === 'Cinematic Ad') return 'sora';
  if (intent.platform === 'tiktok') return 'runway';
  return 'runway';
}
