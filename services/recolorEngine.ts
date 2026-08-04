// Motor de recoloreo + cambio de tela en tiempo real (100% client-side, sin API).
//
// Idea:
//  - MÁSCARA: un pixel pertenece al sofá si su "croma" (color normalizado por brillo)
//    se parece al color de referencia que el usuario tocó. Al normalizar por brillo,
//    las sombras y los brillos del MISMO tapizado siguen contando como sofá.
//  - COLOR: sobre los pixeles de la máscara sustituimos el tono/saturación pero
//    CONSERVAMOS la luminancia original (que es la que lleva pliegues, luces y sombras).
//  - TELA: modulamos esa luminancia con una textura procedural (mate/brillo, canalé,
//    grano, nudos...) para "insinuar" el material.

export interface RecolorParams {
  // Cromaticidad de referencia (color del sofá que el usuario seleccionó)
  refCr: number;
  refCg: number;
  // Radio de similitud de croma (sensibilidad de la máscara)
  threshold: number;
  // Color objetivo en HSL (0..1)
  targetH: number;
  targetS: number;
  // Mezcla del recoloreo (0 = original, 1 = full)
  intensity: number;
  // Tela: 'none' | 'lino' | 'terciopelo' | 'pana' | 'boucle' | 'piel' | 'algodon'
  fabric: string;
  // Fuerza de la textura de tela (0..1)
  fabricAmount: number;
  // Si es true, no recolorea: solo aplica la textura de tela conservando el color real
  keepColor?: boolean;
}

// Ruido hash determinista (sin almacenamiento), en [-1, 1]
const hashNoise = (x: number, y: number): number => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
};

const hue2rgb = (p: number, q: number, t: number): number => {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
};

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r * 255, g * 255, b * 255];
};

export const hexToHsl = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return rgbToHsl(r, g, b);
};

// Cromaticidad (color normalizado por brillo) de un color RGB
export const rgbToChroma = (r: number, g: number, b: number): [number, number] => {
  const sum = r + g + b + 1e-6;
  return [r / sum, g / sum];
};

// Modula la luminancia según la tela elegida. Devuelve L' en [0,1].
const applyFabric = (
  L: number,
  x: number,
  y: number,
  fabric: string,
  amt: number
): number => {
  let out = L;
  switch (fabric) {
    case 'lino': {
      // Mate + grano fino de trama
      const grain = hashNoise(x * 1.7, y * 1.7) * 0.06 * amt;
      out = (L - 0.5) * (1 - 0.15 * amt) + 0.5 + grain; // comprime brillos (mate)
      break;
    }
    case 'terciopelo': {
      // Brillo direccional: más contraste + veladura suave
      const sheen = hashNoise(x * 0.4, y * 0.4) * 0.04 * amt;
      out = (L - 0.5) * (1 + 0.35 * amt) + 0.5 + sheen;
      break;
    }
    case 'pana': {
      // Canalé: líneas verticales en relieve
      const rib = Math.sin(x * 1.6) * 0.09 * amt;
      out = L + rib;
      break;
    }
    case 'boucle': {
      // Nudos: ruido grueso
      const nub = (hashNoise(Math.floor(x / 2), Math.floor(y / 2))) * 0.10 * amt;
      out = L + nub;
      break;
    }
    case 'piel': {
      // Cuero: liso + reflejos especulares marcados
      out = (L - 0.5) * (1 + 0.20 * amt) + 0.5;
      if (L > 0.72) out += (L - 0.72) * 0.8 * amt; // realza el brillo especular
      break;
    }
    case 'algodon': {
      const grain = hashNoise(x * 2.1, y * 2.1) * 0.03 * amt;
      out = L + grain;
      break;
    }
    default:
      return L;
  }
  return out < 0 ? 0 : out > 1 ? 1 : out;
};

// Procesa un ImageData IN-PLACE aplicando máscara + recoloreo + tela.
export const processImageData = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  p: RecolorParams
): void => {
  const thrSq = p.threshold * p.threshold;
  const applyFab = p.fabric && p.fabric !== 'none';

  for (let i = 0, px = 0; i < data.length; i += 4, px++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const sum = r + g + b + 1e-6;
    const cr = r / sum;
    const cg = g / sum;
    const dcr = cr - p.refCr;
    const dcg = cg - p.refCg;
    const dist = dcr * dcr + dcg * dcg;

    if (dist > thrSq) continue; // no es sofá -> se deja tal cual

    // Borde suave de la máscara (evita recortes duros)
    const edge = 1 - dist / thrSq; // 1 en el centro, 0 en el borde
    const soft = edge < 0.35 ? edge / 0.35 : 1;
    const blend = p.intensity * soft;

    const x = px % width;
    const y = (px / width) | 0;

    const [h, s, l] = rgbToHsl(r, g, b);
    const newL = applyFab ? applyFabric(l, x, y, p.fabric, p.fabricAmount) : l;

    let nr: number, ng: number, nb: number;
    if (p.keepColor) {
      // Solo tela: conserva el color real, cambia la luminancia
      [nr, ng, nb] = hslToRgb(h, s, newL);
    } else {
      // Recoloreo conservando la luminancia (con la modulación de tela)
      const outS = s * 0.35 + p.targetS * 0.65; // acerca la saturación al objetivo
      [nr, ng, nb] = hslToRgb(p.targetH, outS, newL);
    }

    data[i] = r + (nr - r) * blend;
    data[i + 1] = g + (ng - g) * blend;
    data[i + 2] = b + (nb - b) * blend;
  }
};
