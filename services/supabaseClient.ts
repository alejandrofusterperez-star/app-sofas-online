import { createClient } from '@supabase/supabase-js';

// La URL y la clave "publishable/anon" son públicas por diseño: es seguro exponerlas
// en el frontend. El acceso a los datos está restringido por RLS (solo se puede
// operar a través de las funciones RPC expuestas).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
      })
    : null;

if (!supabase) {
  console.warn(
    'Supabase no configurado: define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env para activar el contador de gasto.'
  );
}
