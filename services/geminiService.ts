import { GoogleGenAI } from '@google/genai';

// Clave de Gemini: preferimos VITE_GEMINI_API_KEY; como respaldo, GEMINI_API_KEY
// (que vite.config inyecta en process.env). Es pública en el bundle como el resto.
const GEMINI_KEY =
  (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
  (typeof process !== 'undefined' ? (process.env as any)?.GEMINI_API_KEY : undefined) ||
  '';

export const hasGeminiKey = (): boolean => !!GEMINI_KEY;

export interface GeminiImage {
  mimeType: string;
  data: string; // base64 SIN el prefijo data:
}

export interface GeminiResult {
  b64: string | null;
  usage: any | null;
}

const MODEL = 'gemini-2.5-flash-image';

/**
 * Genera/edita una imagen con Gemini 2.5 Flash Image a partir de un prompt y una o
 * varias imágenes de referencia (1ª el sofá, 2ª la tela). Devuelve el PNG en base64.
 */
export const generateWithGemini = async (
  prompt: string,
  images: GeminiImage[]
): Promise<GeminiResult> => {
  if (!GEMINI_KEY) {
    throw new Error('Falta la clave de Gemini (VITE_GEMINI_API_KEY o GEMINI_API_KEY).');
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

  const parts: any[] = [{ text: prompt }];
  for (const img of images) {
    parts.push({ inlineData: { mimeType: img.mimeType || 'image/png', data: img.data } });
  }

  const response: any = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
  });

  const respParts = response?.candidates?.[0]?.content?.parts || [];
  let b64: string | null = null;
  for (const p of respParts) {
    if (p?.inlineData?.data) {
      b64 = p.inlineData.data;
      break;
    }
  }

  if (!b64) {
    console.warn('Gemini no devolvió imagen. Respuesta:', response);
  }

  return { b64, usage: response?.usageMetadata ?? null };
};
