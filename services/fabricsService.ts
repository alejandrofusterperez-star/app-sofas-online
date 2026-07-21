import { supabase } from './supabaseClient';
import { Fabric, FabricColor } from '../types';

const BUCKET = 'fabrics';

/** Carga todas las telas con sus colores. */
export const listFabrics = async (): Promise<Fabric[]> => {
  if (!supabase) return [];

  const { data: fabrics, error: fErr } = await supabase
    .from('fabrics')
    .select('id, name, created_at')
    .order('created_at', { ascending: true });

  if (fErr) {
    console.warn('Error cargando telas:', fErr.message);
    return [];
  }

  const { data: colors, error: cErr } = await supabase
    .from('fabric_colors')
    .select('id, fabric_id, name, image_path, image_url, created_at')
    .order('created_at', { ascending: true });

  if (cErr) {
    console.warn('Error cargando colores de telas:', cErr.message);
  }

  const byFabric = new Map<string, FabricColor[]>();
  (colors || []).forEach((c) => {
    const list = byFabric.get(c.fabric_id) || [];
    list.push(c as FabricColor);
    byFabric.set(c.fabric_id, list);
  });

  return (fabrics || []).map((f) => ({
    ...f,
    colors: byFabric.get(f.id) || [],
  })) as Fabric[];
};

/** Crea una tela nueva. */
export const createFabric = async (name: string): Promise<Fabric | null> => {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase
    .from('fabrics')
    .insert({ name: name.trim() })
    .select('id, name, created_at')
    .single();
  if (error) throw new Error(error.message);
  return { ...(data as any), colors: [] };
};

/** Elimina una tela (y en cascada sus colores). También borra sus imágenes del Storage. */
export const deleteFabric = async (fabric: Fabric): Promise<void> => {
  if (!supabase) throw new Error('Supabase no configurado');
  const paths = fabric.colors.map((c) => c.image_path).filter(Boolean) as string[];
  if (paths.length) {
    await supabase.storage.from(BUCKET).remove(paths);
  }
  const { error } = await supabase.from('fabrics').delete().eq('id', fabric.id);
  if (error) throw new Error(error.message);
};

const sanitize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'x';

/** Añade un color (con imagen) a una tela. Sube la imagen al Storage. */
export const addFabricColor = async (
  fabricId: string,
  name: string,
  file: File
): Promise<FabricColor> => {
  if (!supabase) throw new Error('Supabase no configurado');

  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  // Nombre de archivo único sin depender de Date.now()/random (usamos crypto si existe).
  const uid =
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${sanitize(name)}-${Math.floor(performance.now())}`);
  const path = `${fabricId}/${uid}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || 'image/png', upsert: true });
  if (upErr) throw new Error(upErr.message);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const imageUrl = pub?.publicUrl || null;

  const { data, error } = await supabase
    .from('fabric_colors')
    .insert({ fabric_id: fabricId, name: name.trim(), image_path: path, image_url: imageUrl })
    .select('id, fabric_id, name, image_path, image_url, created_at')
    .single();
  if (error) throw new Error(error.message);

  return data as FabricColor;
};

/** Elimina un color de tela (fila + imagen del Storage). */
export const deleteFabricColor = async (color: FabricColor): Promise<void> => {
  if (!supabase) throw new Error('Supabase no configurado');
  if (color.image_path) {
    await supabase.storage.from(BUCKET).remove([color.image_path]);
  }
  const { error } = await supabase.from('fabric_colors').delete().eq('id', color.id);
  if (error) throw new Error(error.message);
};
