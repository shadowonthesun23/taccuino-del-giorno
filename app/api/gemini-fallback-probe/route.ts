import { GoogleGenerativeAI } from '@google/generative-ai';

const PROBE_MODEL = 'gemini-3.5-flash-lite';
const PROBE_TIMEOUT_MS = 45_000;

type ProbeGenerationConfig = {
  responseMimeType: 'application/json';
  thinkingConfig: {
    thinkingLevel: 'medium';
  };
};

function getSafeErrorMessage(error: unknown, apiKey: string): string {
  const message = error instanceof Error ? error.message : 'Unknown Gemini error';

  return message
    .replaceAll(apiKey, '[redacted]')
    .replace(/AIza[0-9A-Za-z_-]+/gu, '[redacted]')
    .slice(0, 240);
}

export async function POST() {
  const startedAt = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error(`[gemini-fallback-probe] model=${PROBE_MODEL} durationMs=0 status=error reason=missing_api_key`);
    return Response.json({ model: PROBE_MODEL, error: 'GEMINI_API_KEY missing' }, { status: 500 });
  }

  const generationConfig: ProbeGenerationConfig = {
    responseMimeType: 'application/json',
    thinkingConfig: { thinkingLevel: 'medium' },
  };
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: PROBE_MODEL,
    generationConfig,
  });

  try {
    const result = await model.generateContent(
      'Return exactly this JSON object and nothing else: {"status":"OK"}',
      { timeout: PROBE_TIMEOUT_MS },
    );
    const response = result.response.text().trim();
    const durationMs = Date.now() - startedAt;

    if (!response) {
      throw new Error('Gemini returned an empty response');
    }

    console.info(`[gemini-fallback-probe] model=${PROBE_MODEL} durationMs=${durationMs} status=success`);
    return Response.json({ model: PROBE_MODEL, durationMs, response });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const safeError = getSafeErrorMessage(error, apiKey);

    console.error(
      `[gemini-fallback-probe] model=${PROBE_MODEL} durationMs=${durationMs} status=error error=${safeError}`,
    );
    return Response.json({ model: PROBE_MODEL, durationMs, error: safeError }, { status: 502 });
  }
}
