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

/** Calcula el coste en USD de una llamada a gpt-image-1. */
export const computeCostUsd = (
  usage: OpenAIImageUsage | null | undefined,
  size: string,
  quality: string
): number => {
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
  const costUsd = computeCostUsd(record.usage, record.size, record.quality);

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

/** Obtiene el total de gasto global acumulado. */
export const getSpendTotals = async (): Promise<SpendTotals | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('get_openai_spend_total');
    if (error) {
      console.warn('No se pudo obtener el total de gasto:', error.message);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { totalCostUsd: 0, totalCalls: 0 };
    return {
      totalCostUsd: Number(row.total_cost_usd) || 0,
      totalCalls: Number(row.total_calls) || 0,
    };
  } catch (e) {
    console.warn('Error obteniendo el total de gasto:', e);
    return null;
  }
};
