/**
 * Centralized AI client for ZodiacSense.
 * Automatically adapts between xAI (Grok) and Groq (Llama) based on the API key provided.
 */

function getApiKey(): string {
  const key = process.env.GROK_API_KEY;
  if (!key || key === 'your_grok_key_here') {
    throw new Error('GROK_API_KEY is not configured. Please add it to .env.local');
  }
  return key.trim();
}

function getApiConfig() {
  const key = getApiKey();
  const isGroq = key.startsWith('gsk_');
  return {
    key,
    isGroq,
    url: isGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.x.ai/v1/chat/completions',
    defaultTextModel: isGroq ? 'llama-3.3-70b-versatile' : 'grok-2-latest',
    defaultVisionModel: isGroq ? null : 'grok-2-vision-latest'
  };
}

export interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface GrokResponse {
  text: string;
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = vars[key];
    return value !== undefined ? String(value) : match;
  });
}

export interface AiOptions {
  contextId?: string;
  temperature?: number;
  topP?: number;
}

export async function callGrokText(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  options?: AiOptions
): Promise<GrokResponse> {
  const config = getApiConfig();
  
  // Use config's default model to avoid "Model not found" errors on both Groq and xAI
  const finalModel = config.defaultTextModel;

  const messages: GrokMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: userPrompt },
  ];

  const bodyPayload: any = { model: finalModel, messages, max_tokens: maxTokens };
  if (options) {
    if (options.contextId) bodyPayload.context_id = options.contextId;
    if (options.temperature !== undefined) bodyPayload.temperature = options.temperature;
    if (options.topP !== undefined) bodyPayload.top_p = options.topP;
  }

  const res = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.key}`,
    },
    body: JSON.stringify(bodyPayload),
    signal: AbortSignal.timeout(90000), // 90s timeout for structured responses
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`API error ${res.status}: ${errBody}`);
  }

  const json = await res.json();
  const text: string = json.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('API returned empty response');

  return {
    text,
    model: json.model || finalModel,
    usage: json.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

export async function callGrokVision(
  model: string,
  systemPrompt: string,
  userText: string,
  imageUrls: string[],
  maxTokens: number,
  options?: AiOptions
): Promise<GrokResponse> {
  const config = getApiConfig();
  
  if (config.isGroq) {
    // Groq doesn't support vision anymore. Attempt to fallback to Gemini if key is provided.
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      throw new Error('You are using a Groq API key, but Groq decommissioned their vision models. Please add a GEMINI_API_KEY to your .env.local to enable Palm Reading for free, or use a real xAI Grok API key.');
    }
    return callGeminiVision(geminiKey, systemPrompt, userText, imageUrls, options);
  }

  const finalModel = config.defaultVisionModel;

  const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: 'text', text: userText },
    ...imageUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
  ];

  const messages: GrokMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userContent });

  const bodyPayload: any = { model: finalModel, messages, max_tokens: maxTokens };
  if (options) {
    if (options.contextId) bodyPayload.context_id = options.contextId;
    if (options.temperature !== undefined) bodyPayload.temperature = options.temperature;
    if (options.topP !== undefined) bodyPayload.top_p = options.topP;
  }

  const res = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.key}`,
    },
    body: JSON.stringify(bodyPayload),
    signal: AbortSignal.timeout(90000), // 90s for vision
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Vision API error ${res.status}: ${errBody}`);
  }

  const json = await res.json();
  const text: string = json.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('Vision API returned empty response');

  return {
    text,
    model: json.model || finalModel,
    usage: json.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

/**
 * Fallback to Google Gemini API (gemini-2.5-flash) for Vision tasks.
 */
async function callGeminiVision(
  apiKey: string,
  systemPrompt: string,
  userText: string,
  imageUrls: string[], // base64 data URIs
  options?: AiOptions
): Promise<GrokResponse> {
  const parts: any[] = [];
  
  if (systemPrompt) {
    parts.push({ text: `System Instruction: ${systemPrompt}\n\n` });
  }
  parts.push({ text: userText });

  for (const url of imageUrls) {
    // Parse data URL: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    if (url.startsWith('data:')) {
      const mimeType = url.split(';')[0].split(':')[1];
      const base64Data = url.split(',')[1];
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      });
    } else {
      // Note: Gemini REST API only accepts inline base64 or file URIs (gs://). 
      // If passing a public URL, we'd have to download it first. 
      // Fortunately, the webcam capture produces data URIs.
      throw new Error('Gemini fallback only supports base64 data URLs for images.');
    }
  }

  const payload: any = {
    contents: [{ parts }]
  };

  if (options) {
    if (options.contextId) payload.cachedContent = options.contextId;
    if (options.temperature !== undefined || options.topP !== undefined) {
      payload.generationConfig = {};
      if (options.temperature !== undefined) payload.generationConfig.temperature = options.temperature;
      if (options.topP !== undefined) payload.generationConfig.topP = options.topP;
    }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90000),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errBody}`);
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  
  if (!text) throw new Error('Gemini API returned empty response');

  return {
    text,
    model: 'gemini-2.5-flash',
    usage: {
      prompt_tokens: json.usageMetadata?.promptTokenCount ?? 0,
      completion_tokens: json.usageMetadata?.candidatesTokenCount ?? 0,
      total_tokens: json.usageMetadata?.totalTokenCount ?? 0,
    }
  };
}
