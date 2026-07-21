import { supabase } from './supabaseClient';
import { SofaModel } from '../types';

const BUCKET = 'sofas';

/** Carga todos los modelos de sofá. */
export const listSofaModels = async (): Promise<SofaModel[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('sofa_models')
    .select('id, name, image_path, image_url, created_at')
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('Error cargando modelos de sofá:', error.message);
    return [];
  }
  return (data || []) as SofaModel[];
};

/** Crea un modelo de sofá con su foto base. */
export const createSofaModel = async (name: string, file: File): Promise<SofaModel> => {
  if (!supabase) throw new Error('Supabase no configurado');

  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const uid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `m-${Math.floor(performance.now())}`;
  const path = `${uid}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || 'image/png', upsert: true });
  if (upErr) throw new Error(upErr.message);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const imageUrl = pub?.publicUrl || null;

  const { data, error } = await supabase
    .from('sofa_models')
    .insert({ name: name.trim(), image_path: path, image_url: imageUrl })
    .select('id, name, image_path, image_url, created_at')
    .single();
  if (error) throw new Error(error.message);

  return data as SofaModel;
};

/** Elimina un modelo de sofá (fila + imagen del Storage). */
export const deleteSofaModel = async (model: SofaModel): Promise<void> => {
  if (!supabase) throw new Error('Supabase no configurado');
  if (model.image_path) {
    await supabase.storage.from(BUCKET).remove([model.image_path]);
  }
  const { error } = await supabase.from('sofa_models').delete().eq('id', model.id);
  if (error) throw new Error(error.message);
};

/**
 * Descarga una imagen (URL pública) y la convierte a data URL base64.
 * Se usa para pasar la foto base del modelo al motor de generación.
 */
export const urlToDataUrl = async (
  url: string
): Promise<{ dataUrl: string; mimeType: string }> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar la imagen del modelo (${res.status})`);
  const blob = await res.blob();
  const mimeType = blob.type || 'image/png';
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return { dataUrl, mimeType };
};
