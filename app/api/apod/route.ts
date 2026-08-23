import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

type NasaApod = {
  date?: string;
  media_type?: string;
  url?: string;
  hdurl?: string;
  thumbnail_url?: string;
  copyright?: string;
  title?: string;
  explanation?: string;
};

type ApodResponse = {
  date: string;
  media_type: string;
  url: string;
  hdurl?: string;
  thumbnail_url?: string;
  copyright?: string;
  title_en: string;
  explanation_en: string;
  title_it: string;
  explanation_it: string;
};

type DeepLResponse = { translations?: Array<{ text?: string }> };
type GeminiTranslation = { title_it?: string; explanation_it?: string };

class TranslationTimeoutError extends Error {
  constructor() {
    super('Translation timed out');
    this.name = 'TranslationTimeoutError';
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Errore inatteso';
}

function withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new TranslationTimeoutError()), timeoutMs);
    task.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

function getRomeDateIso(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function translateTexts(texts: string[], apiKey: string): Promise<string[]> {
  const baseUrl = apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com'
    : 'https://api.deepl.com';

  const body = new URLSearchParams();
  texts.forEach((t) => body.append('text', t));
  body.append('target_lang', 'IT');
  body.append('source_lang', 'EN');

  const res = await fetch(`${baseUrl}/v2/translate`, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    signal: AbortSignal.timeout(4_000),
  });

  if (!res.ok) {
    throw new Error('DeepL translation failed');
  }

  const json = await res.json() as DeepLResponse;
  return (json.translations ?? []).map((translation) => translation.text ?? '');
}

async function translateWithGemini(title: string, explanation: string, apiKey: string): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `Translate the following NASA Astronomy Picture of the Day (APOD) metadata from English to Italian.
Make the translation sound elegant, poetic, and engaging, suitable for a cultural, high-quality editorial notebook.

Title: "${title}"
Explanation: "${explanation}"

Respond with a JSON object of this structure:
{
  "title_it": "titolo tradotto",
  "explanation_it": "descrizione tradotta"
}`;

  const res = await withTimeout(model.generateContent(prompt), 4_500);
  const text = res.response.text();
  const json = JSON.parse(text) as GeminiTranslation;
  return [json.title_it || '', json.explanation_it || ''];
}

async function processApod(apodJson: NasaApod): Promise<ApodResponse> {
  const title_en = apodJson.title || '';
  const explanation_en = apodJson.explanation || '';
  let title_it = title_en;
  let explanation_it = explanation_en;

  const geminiKey = process.env.GEMINI_API_KEY;
  const deeplKey = process.env.DEEPL_API_KEY;

  if (geminiKey && (title_en || explanation_en)) {
    try {
      const translated = await translateWithGemini(title_en, explanation_en, geminiKey);
      if (translated[0]) title_it = translated[0];
      if (translated[1]) explanation_it = translated[1];
    } catch (error: unknown) {
      if (error instanceof TranslationTimeoutError) {
        console.warn('Traduzione APOD saltata: Gemini non ha risposto entro il limite.');
      } else {
        console.error('Errore traduzione APOD con Gemini:', error);
      }
      // A timeout should not keep this optional card in a loading state. A
      // quick Gemini failure can still use DeepL when it is configured.
      if (deeplKey && !(error instanceof TranslationTimeoutError)) {
        try {
          const translated = await translateTexts([title_en, explanation_en], deeplKey);
          if (translated[0]) title_it = translated[0];
          if (translated[1]) explanation_it = translated[1];
        } catch (deepLError: unknown) {
          console.error('Errore traduzione APOD con DeepL dopo fallimento Gemini:', deepLError);
        }
      }
    }
  } else if (deeplKey && (title_en || explanation_en)) {
    try {
      const translated = await translateTexts([title_en, explanation_en], deeplKey);
      if (translated[0]) title_it = translated[0];
      if (translated[1]) explanation_it = translated[1];
    } catch (error: unknown) {
      console.error('Errore traduzione APOD con DeepL:', error);
    }
  }

  return {
    date: apodJson.date ?? '',
    media_type: apodJson.media_type ?? 'image',
    url: apodJson.url ?? '',
    hdurl: apodJson.hdurl,
    thumbnail_url: apodJson.thumbnail_url,
    copyright: apodJson.copyright,
    title_en,
    explanation_en,
    title_it,
    explanation_it,
  };
}

const memoryCache = new Map<string, ApodResponse>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('data');

    let dataIso: string;
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      dataIso = dateParam;
    } else {
      dataIso = getRomeDateIso();
    }

    // 1. Verifica cache in memoria (risposta istantanea)
    if (memoryCache.has(dataIso)) {
      return NextResponse.json(memoryCache.get(dataIso), {
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      });
    }

    const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
    const nasaUrl = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}&date=${dataIso}&thumbs=true`;

    const nasaRes = await fetch(nasaUrl, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(6_000),
    });

    if (!nasaRes.ok) {
      // Se l'immagine per oggi non è ancora disponibile (fuso orario USA vs Roma),
      // e la data richiesta è oggi, proviamo ad ottenere quella di ieri come fallback.
      const todayIso = getRomeDateIso();
      if (dataIso === todayIso) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayIso = getRomeDateIso(yesterday);

        // Verifica cache in memoria per ieri prima di fare fetch
        const cachedResult = memoryCache.get(yesterdayIso);
        if (cachedResult) {
          memoryCache.set(dataIso, cachedResult);
          return NextResponse.json(cachedResult, {
            headers: {
              'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            },
          });
        }

        const fallbackUrl = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}&date=${yesterdayIso}&thumbs=true`;
        const fallbackRes = await fetch(fallbackUrl, {
          next: { revalidate: 86400 },
          signal: AbortSignal.timeout(6_000),
        });

        if (fallbackRes.ok) {
          const apodJson = await fallbackRes.json() as NasaApod;
          const result = await processApod(apodJson);
          memoryCache.set(dataIso, result);
          memoryCache.set(yesterdayIso, result);
          return NextResponse.json(result, {
            headers: {
              'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            },
          });
        }
      }

      return NextResponse.json(
        { error: 'Nessun contenuto astronomico per questa data' },
        { status: 404 }
      );
    }

    const apodJson = await nasaRes.json() as NasaApod;
    const result = await processApod(apodJson);
    memoryCache.set(dataIso, result);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
