// ===== OpenRouter API Calls =====

export const LOCKED_STORYBOARD_JSON_SCHEMA = `{
  "product_name": "string",
  "scenes": [
    {
      "scene_number": 1,
      "scene_title": "string",
      "hook_type": "HOOK | PROBLEM | SOLUTION | PROOF | CTA",
      "picture_ref": false,
      "speaker": "string",
      "dialogue": "string",
      "action": "string",
      "image_prompt": "string",
      "video_audio_prompt": "string"
    }
  ],
  "caption": "string",
  "hashtags": "string"
}`;

const LOCKED_JSON_CONTRACT = `LOCKED JSON OUTPUT CONTRACT:
- Return only valid JSON. No markdown, no code fences, no comments, no explanation.
- The root object must contain exactly these keys: product_name, scenes, caption, hashtags.
- scenes must be an array with exactly {{SCENE_COUNT}} items.
- Every scene object must contain exactly these keys: scene_number, scene_title, hook_type, picture_ref, speaker, dialogue, action, image_prompt, video_audio_prompt.
- scene_number must start at 1 and continue in order.
- picture_ref must be a boolean.
- image_prompt and video_audio_prompt must be detailed production prompts in English.
- dialogue, action, caption, and hashtags should match the user's language and product context.
- Do not add extra keys.

JSON schema shape:
${LOCKED_STORYBOARD_JSON_SCHEMA}`;

const SYSTEM_GEM_INSTRUCTION = `You are a reusable storyboard prompt Gem for a production team. Follow the user's editable Gem instructions, but the locked JSON contract is higher priority than any template text. Always produce strict JSON only.`;

export async function callOpenRouter({ apiKey, model, prompt, temperature = 0.7, maxTokens = 8000 }) {
  const modelAttempts = getModelFallbackOrder(model);
  const failures = [];

  for (const attemptModel of modelAttempts) {
    try {
      const result = await callOpenRouterModel({
        apiKey,
        model: attemptModel,
        prompt,
        temperature,
        maxTokens,
      });

      Object.defineProperty(result, '__usedModel', {
        value: attemptModel,
        enumerable: false,
      });

      Object.defineProperty(result, '__fallbackModels', {
        value: failures.map(f => f.model),
        enumerable: false,
      });

      return result;
    } catch (error) {
      failures.push({ model: attemptModel, message: error.message });
      if (!shouldTryNextFreeModel(model, error)) {
        throw error;
      }
    }
  }

  throw new Error(`All free models failed: ${failures.map(f => `${f.model} (${f.message})`).join(' | ')}`);
}

async function callOpenRouterModel({ apiKey, model, prompt, temperature, maxTokens }) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.href,
      'X-Title': 'AI Prompt Generator Pro',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_GEM_INSTRUCTION },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || `API Error: ${response.status}`;
    const error = new Error(normalizeApiErrorMessage(msg, model, response.status));
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  if (!data.choices?.[0]?.message) throw new Error('Invalid API response');

  const result = parseJsonResponse(data.choices[0].message.content);
  Object.defineProperty(result, '__usage', {
    value: normalizeUsage(data.usage),
    enumerable: false,
  });
  return result;
}

function getModelFallbackOrder(selectedModel) {
  const freeModels = AI_MODELS
    .map(model => model.value)
    .filter(isFreeModel)
    .sort((a, b) => {
      if (a === 'openrouter/free') return 1;
      if (b === 'openrouter/free') return -1;
      return 0;
    });

  if (!isFreeModel(selectedModel)) return [selectedModel];

  return [
    selectedModel,
    ...freeModels.filter(value => value !== selectedModel),
  ];
}

function shouldTryNextFreeModel(selectedModel, error) {
  if (!isFreeModel(selectedModel)) return false;
  if ([401, 402, 403].includes(error.status)) return false;

  const message = String(error.message || '').toLowerCase();
  return (
    [408, 409, 425, 429, 500, 502, 503, 504].includes(error.status) ||
    message.includes('rate limit') ||
    message.includes('overload') ||
    message.includes('capacity') ||
    message.includes('unavailable') ||
    message.includes('timeout') ||
    message.includes('no endpoints') ||
    message.includes('provider returned error') ||
    message.includes('valid locked json')
  );
}

function normalizeApiErrorMessage(msg, model, status) {
  if (status === 401 || msg.includes('401')) return 'Invalid API Key';
  if (status === 429 || msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
    return isFreeModel(model)
      ? 'Rate limit exceeded. Trying another free model.'
      : 'Rate limit exceeded. Please wait.';
  }
  if (status === 402 || msg.includes('402')) return 'Insufficient API credits.';
  return msg;
}

function isFreeModel(model) {
  return model === 'openrouter/free' || String(model || '').endsWith(':free');
}

function normalizeUsage(usage = {}) {
  return {
    promptTokens: Number(usage.prompt_tokens || usage.promptTokens || 0),
    completionTokens: Number(usage.completion_tokens || usage.completionTokens || 0),
    totalTokens: Number(usage.total_tokens || usage.totalTokens || 0),
  };
}

export function buildPrompt(template, params) {
  const values = {
    STYLE: params.style || '',
    PRODUCT: params.product || '',
    SCENE_COUNT: String(params.sceneCount || '5'),
    MOOD: params.mood || '',
    PLATFORM: params.platform || '',
  };

  const editableGemPrompt = Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    template || ''
  );

  return `${editableGemPrompt.trim()}

INPUT VARIABLES:
- Style: ${values.STYLE}
- Product / subject: ${values.PRODUCT}
- Scene count: ${values.SCENE_COUNT}
- Mood: ${values.MOOD}
- Platform: ${values.PLATFORM}

${LOCKED_JSON_CONTRACT.replaceAll('{{SCENE_COUNT}}', values.SCENE_COUNT)}`;
}

export function buildModificationPrompt(modification, currentResult) {
  const sceneCount = currentResult?.scenes?.length || 1;

  return `Modify the storyboard using this instruction: "${modification}"

Current JSON context:
${JSON.stringify(currentResult, null, 2)}

${LOCKED_JSON_CONTRACT.replaceAll('{{SCENE_COUNT}}', String(sceneCount))}`;
}

function parseJsonResponse(text) {
  const cleaned = String(text || '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('AI did not return valid locked JSON.');
  }
}

export const AI_MODELS = [
  { value: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super 120B A12B (Free)' },
  { value: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B IT (Free)' },
  { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B Instruct (Free)' },
  { value: 'openai/gpt-oss-120b:free', label: 'GPT OSS 120B (Free)' },
  { value: 'qwen/qwen3-coder:free', label: 'Qwen3 Coder (Free)' },
  { value: 'openrouter/free', label: 'OpenRouter Free' },
  { value: 'google/gemini-flash-1.5', label: 'Gemini 1.5 Flash' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'openai/gpt-4o', label: 'GPT-4o' },
];

export const FREE_AI_MODELS = AI_MODELS.filter(model => isFreeModel(model.value));

export const CONTENT_MODES = [
  { value: 'hardsell', label: 'Hard Sell', name: 'Hard Sell' },
  { value: 'review', label: 'Review', name: 'Review' },
  { value: 'storytelling', label: 'Story', name: 'Storytelling' },
  { value: 'comedy', label: 'Comedy', name: 'Comedy' },
  { value: 'drama', label: 'Drama', name: 'Drama' },
  { value: 'tutorial', label: 'Tutorial', name: 'Tutorial' },
];

export const MOODS = [
  { value: 'cinematic-standard', label: 'Cinematic Standard' },
  { value: 'happy', label: 'Uplifting & Vibrant' },
  { value: 'dramatic', label: 'Intense & Dramatic' },
  { value: 'energetic', label: 'High Energy' },
  { value: 'funny', label: 'Comedic' },
  { value: 'calm', label: 'Calm & Aesthetic' },
];

export const PLATFORMS = [
  { value: 'tiktok', label: 'TikTok (Fast Paced)' },
  { value: 'instagram', label: 'IG Reels (Aesthetic)' },
  { value: 'youtube', label: 'YouTube (Detailed)' },
  { value: 'facebook', label: 'Facebook (Mass)' },
];
