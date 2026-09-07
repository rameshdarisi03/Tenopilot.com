/**
 * 🤖 Gemini Dynamic Model Discovery & Waterfall Ranking
 *
 * Automatically queries Google's live Model Catalog API to discover active, supported
 * models under the provided API key. Eliminates hardcoded model deprecation issues
 * without requiring code changes or deployments.
 */

interface CachedModelRegistry {
  models: string[];
  discoveredAt: number;
}

// In-memory cache with 1-hour TTL
let memoryCache: CachedModelRegistry | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Known deprecated models or non-generateContent models to black-list
const DEPRECATED_OR_UNSUPPORTED = new Set([
  "gemini-2.5-flash", // 404 deprecated for new users
  "gemini-1.0-pro",
  "text-bison-001",
  "chat-bison-001",
]);

// Preference ranking weight helper
function getModelPriorityWeight(name: string): number {
  // Check explicit version preferences
  if (name.includes("3.8-flash")) return 100;
  if (name.includes("3.5-flash")) return 95;
  if (name.includes("3.7-flash")) return 90;
  if (name === "gemini-flash-latest") return 85;
  if (name.includes("3.6-flash")) return 80;
  if (name.includes("3.1-flash-lite")) return 75;
  if (name.includes("2.5-flash-lite")) return 70;
  if (name.includes("2.0-flash")) return 65;
  if (name.includes("1.5-flash")) return 60;
  if (name.includes("flash")) return 50;
  if (name.includes("pro")) return 30;
  return 10;
}

/**
 * Returns prioritized, active Gemini models for generation.
 * Queries live Google API if cache expired, falling back gracefully to reliable defaults.
 */
export async function getActiveGeminiModels(apiKey?: string): Promise<string[]> {
  const key =
    apiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  // 1. Check if user configured manual override in environment
  const manualOverride = process.env.GEMINI_MODEL_OVERRIDE?.trim();

  // 2. Check in-memory cache
  const now = Date.now();
  if (memoryCache && now - memoryCache.discoveredAt < CACHE_TTL_MS) {
    if (manualOverride && !memoryCache.models.includes(manualOverride)) {
      return [manualOverride, ...memoryCache.models];
    }
    return memoryCache.models;
  }

  // 3. Fallback baseline if API call fails
  const baselineFallbacks = [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
  ];

  if (!key) {
    return manualOverride ? [manualOverride, ...baselineFallbacks] : baselineFallbacks;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s max discovery timeout

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const rawModels: any[] = data.models || [];

      // Filter to models that support content generation and aren't deprecated audio/tts/preview junk
      const candidateNames: string[] = [];

      for (const m of rawModels) {
        const fullName = String(m.name || "");
        const shortName = fullName.replace(/^models\//i, "").trim();
        const methods: string[] = Array.isArray(m.supportedGenerationMethods)
          ? m.supportedGenerationMethods
          : [];

        // Must support generateContent
        if (!methods.includes("generateContent")) continue;

        // Skip deprecated or audio/tts-specific sub-models
        if (DEPRECATED_OR_UNSUPPORTED.has(shortName)) continue;
        if (shortName.includes("tts") || shortName.includes("audio-preview") || shortName.includes("native-audio")) {
          continue;
        }

        // We want fast general-purpose text/vision models (especially flash family)
        candidateNames.push(shortName);
      }

      // Sort by priority weight descending
      candidateNames.sort((a, b) => getModelPriorityWeight(b) - getModelPriorityWeight(a));

      if (candidateNames.length > 0) {
        // Ensure baseline champions are present if missing
        for (const base of baselineFallbacks) {
          if (!candidateNames.includes(base)) {
            candidateNames.push(base);
          }
        }

        const prioritized = candidateNames.slice(0, 5); // Keep top 5 best models for waterfall

        memoryCache = {
          models: prioritized,
          discoveredAt: now,
        };

        if (manualOverride) {
          return [manualOverride, ...prioritized.filter((m) => m !== manualOverride)];
        }
        return prioritized;
      }
    }
  } catch (err) {
    console.warn("Dynamic Gemini model discovery network notice, using baseline models:", err);
  }

  // Graceful fallback
  const result = manualOverride ? [manualOverride, ...baselineFallbacks] : baselineFallbacks;
  memoryCache = {
    models: result,
    discoveredAt: now,
  };
  return result;
}
