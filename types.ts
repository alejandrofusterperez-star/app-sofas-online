
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
  // Solo para el usuario digency: permite cambiar el color del sofá dentro del modo INTEGRAR.
  integrateColorChange?: boolean;
  // Biblioteca de telas (admin): cuando se selecciona una tela+color de la biblioteca,
  // se guarda la URL de la imagen del swatch para enviarla como referencia a OpenAI.
  fabricReferenceImageUrl?: string;
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
  created_at?: string;
}

export interface Fabric {
  id: string;
  name: string;
  created_at?: string;
  colors: FabricColor[];
}

export interface GenerationResult {
  id: string;
  url: string;
  originalUrl: string;
  style?: InteriorStyle;
  mode: AppMode;
}
