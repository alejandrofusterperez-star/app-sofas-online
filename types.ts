
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
  addPillows?: boolean;
  aspectRatio?: string;
}

export interface GenerationResult {
  id: string;
  url: string;
  originalUrl: string;
  style?: InteriorStyle;
  mode: AppMode;
}
