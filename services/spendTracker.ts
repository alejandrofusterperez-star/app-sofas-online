import { supabase } from './supabaseClient';

// ────────────────────────────────────────────────────────────────────────────
// Cálculo de coste de gpt-image-1
// ────────────────────────────────────────────────────────────────────────────
// Precios oficiales de OpenAI (USD por 1M de tokens) para gpt-image-1:
//   · texto de entrada:  $5
//   · imagen de entrada: $10
//   · imagen de salida:  $40
// La API devuelve un objeto `usage` con el desglose de tokens, así que cuando
// está disponible calculamos el coste EXACTO. Si no viene, usamos una estimación
// por imagen según tamaño y calidad (quality: high).

const TEXT_INPUT_PER_TOKEN = 5 / 1_000_000;
const IMAGE_INPUT_PER_TOKEN = 10 / 1_000_000;
const IMAGE_OUTPUT_PER_TOKEN = 40 / 1_000_000;

// Estimación de respaldo (USD por imagen) para calidad "high".
const FALLBACK_HIGH: Record<string, number> = {
  '1024x1024': 0.167,
  '1024x1536': 0.25,
  '1536x1024': 0.25,
};

// Gemini 2.5 Flash Image: coste aproximado por imagen de salida (~$0.039).
const GEMINI_PER_IMAGE = 0.039;

export interface OpenAIImageUsage {
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: {
    text_tokens?: number;
    image_tokens?: number;
  };
}

export interface SpendRecord {
  userName: string;
  model: string;
  size: string;
  quality: string;
  usage?: OpenAIImageUsage | null;
}

export interface SpendTotals {
  totalCostUsd: number;
  totalCalls: number;
}

export interface DailySpend {
  day: string; // YYYY-MM-DD
  costUsd: number;
  calls: number;
}

// Conversión aproximada USD → EUR (OpenAI factura en USD). Ajusta este valor
// si el cambio se mueve mucho; es solo para mostrar el gasto en euros.
export const EUR_PER_USD = 0.92;

export const usdToEur = (usd: number) => (usd || 0) * EUR_PER_USD;

/** Calcula el coste en USD de una llamada de generación (gpt-image-1 o Gemini). */
export const computeCostUsd = (
  usage: OpenAIImageUsage | null | undefined,
  size: string,
  quality: string,
  model?: string
): number => {
  // Gemini: coste por imagen (su usage no sigue el formato de OpenAI).
  if (model && model.toLowerCase().includes('gemini')) {
    return GEMINI_PER_IMAGE;
  }
  if (usage) {
    const textTokens = usage.input_tokens_details?.text_tokens ?? 0;
    const imageInputTokens = usage.input_tokens_details?.image_tokens ?? 0;
    const outputTokens = usage.output_tokens ?? 0;
    if (outputTokens > 0 || textTokens > 0 || imageInputTokens > 0) {
      return (
        textTokens * TEXT_INPUT_PER_TOKEN +
        imageInputTokens * IMAGE_INPUT_PER_TOKEN +
        outputTokens * IMAGE_OUTPUT_PER_TOKEN
      );
    }
  }
  // Respaldo: estimación por imagen (asumimos calidad high, que es lo que usa la app).
  return FALLBACK_HIGH[size] ?? 0.167;
};

/**
 * Registra el gasto de una llamada en Supabase y devuelve el nuevo total global.
 * Es tolerante a fallos: si Supabase no está configurado o falla, no rompe la
 * generación de imágenes; solo se pierde el registro de esa llamada.
 */
export const recordSpend = async (
  record: SpendRecord
): Promise<{ costUsd: number; totals: SpendTotals | null }> => {
  const costUsd = computeCostUsd(record.usage, record.size, record.quality, record.model);

  if (!supabase) {
    return { costUsd, totals: null };
  }

  try {
    const { data, error } = await supabase.rpc('record_openai_spend', {
      p_user_name: record.userName || 'desconocido',
      p_model: record.model,
      p_size: record.size,
      p_quality: record.quality,
      p_input_tokens: record.usage?.input_tokens ?? null,
      p_output_tokens: record.usage?.output_tokens ?? null,
      p_total_tokens: record.usage?.total_tokens ?? null,
      p_cost_usd: Number(costUsd.toFixed(6)),
    });

    if (error) {
      console.warn('No se pudo registrar el gasto en Supabase:', error.message);
      return { costUsd, totals: null };
    }

    const row = Array.isArray(data) ? data[0] : data;
    const totals: SpendTotals | null = row
      ? {
          totalCostUsd: Number(row.total_cost_usd) || 0,
          totalCalls: Number(row.total_calls) || 0,
        }
      : null;

    return { costUsd, totals };
  } catch (e) {
    console.warn('Error registrando el gasto en Supabase:', e);
    return { costUsd, totals: null };
  }
};

/** Obtiene el total de gasto global acumulado (histórico completo). */
export const getSpendTotals = async (): Promise<SpendTotals | null> => getSpendStats(null);

/**
 * Total y nº de llamadas desde hace `sinceDays` días. `null` = histórico completo.
 */
export const getSpendStats = async (sinceDays: number | null): Promise<SpendTotals | null> => {
  if (!supabase) return null;
  try {
    const since =
      sinceDays && sinceDays > 0
        ? new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()
        : null;
    const { data, error } = await supabase.rpc('get_openai_spend', { p_since: since });
    if (error) {
      console.warn('No se pudo obtener el gasto:', error.message);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { totalCostUsd: 0, totalCalls: 0 };
    return {
      totalCostUsd: Number(row.total_cost_usd) || 0,
      totalCalls: Number(row.total_calls) || 0,
    };
  } catch (e) {
    console.warn('Error obteniendo el gasto:', e);
    return null;
  }
};

/** Desglose de gasto por día (últimos `days` días). */
export const getSpendDaily = async (days: number): Promise<DailySpend[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc('get_openai_spend_daily', { p_days: days });
    if (error) {
      console.warn('No se pudo obtener el histórico diario:', error.message);
      return [];
    }
    return (data || []).map((r: any) => ({
      day: r.day,
      costUsd: Number(r.cost_usd) || 0,
      calls: Number(r.calls) || 0,
    }));
  } catch (e) {
    console.warn('Error obteniendo el histórico diario:', e);
    return [];
  }
};
