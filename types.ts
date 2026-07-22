
export enum InteriorStyle {
  MINIMALIST = 'Minimalista',
  RUSTIC = 'Rústico',
  SCANDINAVIAN = 'Escandinavo',
  INDUSTRIAL = 'Industrial',
  BOHEMIAN = 'Bohemio',
  MID_CENTURY = 'Moderno Mid-Century'
}

export enum Lighting {
  NATURAL = 'Luz Natural',
  WARM = 'Cálida y Acogedora',
  MOODY = 'Sombría y Dramática',
  BRIGHT = 'Estudio Brillante'
}

export enum AppMode {
  INTEGRATE = 'INTEGRATE',
  COLOR_CHANGE = 'COLOR_CHANGE',
  MATTRESS = 'MATTRESS'
}

export interface VisualizationConfig {
  style: InteriorStyle;
  wallColor: string;
  lighting: Lighting;
  flooring: string;
  targetSofaColor?: string;
  changeColor?: boolean;
  changeFabric?: boolean;
  targetFabric?: string;
  addPillows?: boolean;
  addDecor?: boolean;
  aspectRatio?: string;
  // Número de imágenes a generar (1, 2 o 3).
  numImages?: number;
  // Modo rápido: usa calidad 'medium' (más rápido y barato) en vez de 'high'.
  fastMode?: boolean;
  // Solo para el usuario digency: permite cambiar el color del sofá dentro del modo INTEGRAR.
  integrateColorChange?: boolean;
  // Biblioteca de telas (admin): cuando se selecciona una tela+color de la biblioteca,
  // se guarda la URL de la imagen del swatch para enviarla como referencia a OpenAI.
  fabricReferenceImageUrl?: string;
  // Modo Estudio: si true, la muestra de tela define COLOR + TEXTURA (sin paleta).
  // Si false/undefined, la muestra aporta solo textura y el color viene de la paleta.
  useFabricColor?: boolean;
  // HEX manual de la variación de tela: si está, es el color EXACTO objetivo del prompt.
  fabricColorHex?: string;
  // Id del color de tela seleccionado de la biblioteca (para resaltar la selección en la UI).
  selectedFabricColorId?: string;
}

// ─── Biblioteca de telas (gestionada por el admin) ───────────────────────────
export interface FabricColor {
  id: string;
  fabric_id: string;
  name: string;
  image_path?: string | null;
  image_url?: string | null;
  // HEX de referencia (lo pone el admin) para forzar el color exacto en el prompt.
  color_hex?: string | null;
  // Marcado por el admin cuando esa tela+color genera resultados geniales.
  verified?: boolean;
  created_at?: string;
}

export interface Fabric {
  id: string;
  name: string;
  created_at?: string;
  colors: FabricColor[];
}

// Imagen guardada en la biblioteca, etiquetada por tela/variación.
export interface GalleryImage {
  id: string;
  image_path?: string | null;
  image_url?: string | null;
  fabric_id?: string | null;
  fabric_color_id?: string | null;
  fabric_name?: string | null;
  variation_name?: string | null;
  color_hex?: string | null;
  sofa_model_name?: string | null;
  engine?: string | null;
  model?: string | null;
  environment?: string | null;
  source?: string;
  created_at?: string;
}

// Metadatos para guardar una imagen en la biblioteca.
export interface GalleryMeta {
  fabric_id?: string | null;
  fabric_color_id?: string | null;
  fabric_name?: string | null;
  variation_name?: string | null;
  color_hex?: string | null;
  sofa_model_name?: string | null;
  engine?: string | null;
  model?: string | null;
  environment?: string | null;
  source?: string;
}

// Modelo de sofá (foto base) gestionado por el admin, usado en el Modo Estudio.
export interface SofaModel {
  id: string;
  name: string;
  image_path?: string | null;
  image_url?: string | null;
  created_at?: string;
}

export interface GenerationResult {
  id: string;
  url: string;
  originalUrl: string;
  style?: InteriorStyle;
  mode: AppMode;
}
