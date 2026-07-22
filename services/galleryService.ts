import { supabase } from './supabaseClient';
import { GalleryImage, GalleryMeta } from '../types';

const BUCKET = 'gallery';

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `g-${Math.floor(performance.now())}-${Math.floor(performance.now() * 1000) % 1000}`;

/** Sube un Blob al bucket de la biblioteca y devuelve {path, url}. */
const uploadBlob = async (blob: Blob, ext: string): Promise<{ path: string; url: string | null }> => {
  if (!supabase) throw new Error('Supabase no configurado');
  const path = `${uid()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type || 'image/png', upsert: true });
  if (error) throw new Error(error.message);
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, url: pub?.publicUrl || null };
};

const insertRow = async (
  path: string,
  url: string | null,
  meta: GalleryMeta
): Promise<GalleryImage> => {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase
    .from('gallery_images')
    .insert({
      image_path: path,
      image_url: url,
      fabric_id: meta.fabric_id ?? null,
      fabric_color_id: meta.fabric_color_id ?? null,
      fabric_name: meta.fabric_name ?? null,
      variation_name: meta.variation_name ?? null,
      color_hex: meta.color_hex ?? null,
      sofa_model_name: meta.sofa_model_name ?? null,
      engine: meta.engine ?? null,
      model: meta.model ?? null,
      environment: meta.environment ?? null,
      source: meta.source ?? 'generated',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as GalleryImage;
};

/** Guarda una imagen ya generada (data URL base64) en la biblioteca. */
export const saveGeneratedImage = async (dataUrl: string, meta: GalleryMeta): Promise<GalleryImage> => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const { path, url } = await uploadBlob(blob, 'png');
  return insertRow(path, url, { ...meta, source: meta.source ?? 'generated' });
};

/** Sube una imagen manual (File) con sus metadatos. */
export const uploadManualImage = async (file: File, meta: GalleryMeta): Promise<GalleryImage> => {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const { path, url } = await uploadBlob(file, ext);
  return insertRow(path, url, { ...meta, source: 'manual' });
};

/** Lista la biblioteca (más recientes primero). */
export const listGallery = async (): Promise<GalleryImage[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('gallery_images')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('Error cargando la biblioteca:', error.message);
    return [];
  }
  return (data || []) as GalleryImage[];
};

/** Elimina una imagen de la biblioteca (fila + fichero del Storage). */
export const deleteGalleryImage = async (item: GalleryImage): Promise<void> => {
  if (!supabase) throw new Error('Supabase no configurado');
  if (item.image_path) {
    await supabase.storage.from(BUCKET).remove([item.image_path]);
  }
  const { error } = await supabase.from('gallery_images').delete().eq('id', item.id);
  if (error) throw new Error(error.message);
};
