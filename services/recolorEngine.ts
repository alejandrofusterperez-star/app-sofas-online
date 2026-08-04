// Motor de detección + recoloreo + cambio de tela sobre una FOTO FIJA (client-side, sin API).
//
// Flujo:
//  1) DETECCIÓN: el usuario toca el sofá -> "flood fill" (crecimiento de región) que
//     selecciona SOLO los píxeles CONECTADOS y de color parecido a donde tocó. Al ser
//     una foto fija podemos recorrer toda la región con precisión (no como en vivo).
//     Se pueden acumular varios toques para cubrir sombras/zonas separadas.
//  2) SUAVIZADO: se difumina el borde de la máscara para que el recoloreo no quede recortado.
//  3) RECOLOREO: sobre la máscara se cambia tono/saturación CONSERVANDO la luminancia
//     original (pliegues, luces y sombras). La tela modula esa luminancia con textura.

export interface RecolorParams {
  targetH: number;      // color objetivo (HSL) 0..1
  targetS: number;
  intensity: number;    // 0..1
  fabric: string;       // textura procedural de reserva: 'none' | 'lino' | ...
  fabricAmount: number; // 0..1
  keepColor?: boolean;  // solo textura, conserva el color real del sofá
  highlight?: boolean;  // pinta la máscara de verde (vista de selección)
  // Textura REAL de la tela (de la base de datos): luminancia normalizada por píxel
  // (valor ≈ texL - mediaTextura, rango aprox. -0.5..0.5) y su intensidad de imprimación.
  texLum?: Float32Array | null;
  texAmount?: number;
}

// ─── Utilidades de color ─────────────────────────────────────────────────────

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

// ─── Detección por crecimiento de región (flood fill) ────────────────────────

// Selecciona la región conectada al punto (seedX, seedY) cuyo color se parece al del
// punto tocado. Acumula sobre `mask` (Uint8Array w*h; 255 = seleccionado).
// `tolerance` en unidades de cromaticidad normalizada (aprox. 0.01–0.12).
export const floodFillSelect = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  seedX: number,
  seedY: number,
  tolerance: number,
  mask: Uint8Array
): void => {
  seedX = Math.max(0, Math.min(width - 1, Math.round(seedX)));
  seedY = Math.max(0, Math.min(height - 1, Math.round(seedY)));

  const seedIdx = seedY * width + seedX;
  const si = seedIdx * 4;
  const ssum = data[si] + data[si + 1] + data[si + 2] + 1e-6;
  const seedCr = data[si] / ssum;
  const seedCg = data[si + 1] / ssum;
  // Luminancia de referencia para no saltar a zonas demasiado más oscuras/claras
  const seedL = (data[si] + data[si + 1] + data[si + 2]) / 3;

  const tol2 = tolerance * tolerance;
  const lTol = 90; // margen de brillo permitido respecto a la semilla

  // Stack de índices de píxel (no *4)
  const stack: number[] = [seedIdx];
  // Visitados: reutilizamos un Uint8Array aparte para no re-encolar
  const visited = new Uint8Array(width * height);

  while (stack.length) {
    const p = stack.pop() as number;
    if (visited[p]) continue;
    visited[p] = 1;

    const pi = p * 4;
    const sum = data[pi] + data[pi + 1] + data[pi + 2] + 1e-6;
    const cr = data[pi] / sum;
    const cg = data[pi + 1] / sum;
    const dcr = cr - seedCr;
    const dcg = cg - seedCg;
    if (dcr * dcr + dcg * dcg > tol2) continue;
    if (Math.abs(sum / 3 - seedL) > lTol) continue;

    mask[p] = 255;

    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) stack.push(p - 1);
    if (x < width - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - width);
    if (y < height - 1) stack.push(p + width);
  }
};

// Difumina la máscara (box blur separable) para bordes suaves. Devuelve Uint8Array alpha.
export const featherMask = (
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number
): Uint8Array => {
  if (radius <= 0) return mask.slice();
  const tmp = new Float32Array(width * height);
  const out = new Uint8Array(width * height);
  const win = radius * 2 + 1;

  // Horizontal
  for (let y = 0; y < height; y++) {
    let acc = 0;
    const row = y * width;
    for (let x = -radius; x <= radius; x++) {
      acc += mask[row + Math.max(0, Math.min(width - 1, x))];
    }
    for (let x = 0; x < width; x++) {
      tmp[row + x] = acc / win;
      const add = row + Math.min(width - 1, x + radius + 1);
      const sub = row + Math.max(0, x - radius);
      acc += mask[add] - mask[sub];
    }
  }
  // Vertical
  for (let x = 0; x < width; x++) {
    let acc = 0;
    for (let y = -radius; y <= radius; y++) {
      acc += tmp[Math.max(0, Math.min(height - 1, y)) * width + x];
    }
    for (let y = 0; y < height; y++) {
      out[y * width + x] = acc / win;
      const add = Math.min(height - 1, y + radius + 1) * width + x;
      const sub = Math.max(0, y - radius) * width + x;
      acc += tmp[add] - tmp[sub];
    }
  }
  return out;
};

// ─── Textura real de la tela (imagen de la base de datos) ────────────────────

// Carga la imagen de textura (URL pública de Supabase) y la convierte en un mapa de
// luminancia NORMALIZADO (valor - media) del tamaño de la foto (w×h), tileando la
// muestra. Ese mapa "imprime" la trama del tejido sobre el sofá conservando su sombreado.
// Devuelve null si la imagen no carga o el navegador bloquea el acceso (CORS).
export const buildTextureLum = (
  imageUrl: string,
  w: number,
  h: number,
  tilePx = 160
): Promise<Float32Array | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const ar = img.naturalWidth / img.naturalHeight || 1;
        const tw = tilePx;
        const th = Math.max(1, Math.round(tilePx / ar));
        const tile = document.createElement('canvas');
        tile.width = tw;
        tile.height = th;
        const tctx = tile.getContext('2d');
        if (!tctx) return resolve(null);
        tctx.drawImage(img, 0, 0, tw, th);

        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const cx = cv.getContext('2d', { willReadFrequently: true });
        if (!cx) return resolve(null);
        const pat = cx.createPattern(tile, 'repeat');
        if (!pat) return resolve(null);
        cx.fillStyle = pat;
        cx.fillRect(0, 0, w, h);

        const d = cx.getImageData(0, 0, w, h).data;
        const out = new Float32Array(w * h);
        let mean = 0;
        for (let p = 0; p < out.length; p++) {
          const i = p * 4;
          const L = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
          out[p] = L;
          mean += L;
        }
        mean /= out.length;
        // Guardamos la desviación respecto a la media con un realce de contraste,
        // para que la trama del tejido se note más al imprimirla sobre el sofá.
        const CONTRAST = 1.35;
        for (let p = 0; p < out.length; p++) out[p] = (out[p] - mean) * CONTRAST;
        resolve(out);
      } catch (e) {
        console.warn('No se pudo leer la textura (¿CORS?):', e);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
};

// ─── Aplicación de tela ──────────────────────────────────────────────────────

const applyFabric = (L: number, x: number, y: number, fabric: string, amt: number): number => {
  let out = L;
  switch (fabric) {
    case 'lino': {
      const grain = hashNoise(x * 1.7, y * 1.7) * 0.06 * amt;
      out = (L - 0.5) * (1 - 0.15 * amt) + 0.5 + grain;
      break;
    }
    case 'terciopelo': {
      const sheen = hashNoise(x * 0.4, y * 0.4) * 0.04 * amt;
      out = (L - 0.5) * (1 + 0.35 * amt) + 0.5 + sheen;
      break;
    }
    case 'pana': {
      const rib = Math.sin(x * 1.6) * 0.09 * amt;
      out = L + rib;
      break;
    }
    case 'boucle': {
      const nub = hashNoise(Math.floor(x / 2), Math.floor(y / 2)) * 0.10 * amt;
      out = L + nub;
      break;
    }
    case 'piel': {
      out = (L - 0.5) * (1 + 0.20 * amt) + 0.5;
      if (L > 0.72) out += (L - 0.72) * 0.8 * amt;
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

// ─── Recoloreo con máscara explícita ─────────────────────────────────────────

// Aplica recoloreo + tela IN-PLACE solo donde la máscara (alpha 0..255) es > 0.
export const applyRecolorMasked = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  mask: Uint8Array,
  p: RecolorParams
): void => {
  const applyFab = p.fabric && p.fabric !== 'none';

  for (let px = 0; px < mask.length; px++) {
    const a = mask[px];
    if (a === 0) continue;
    const alpha = (a / 255) * p.intensity;

    const i = px * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];

    if (p.highlight) {
      // Vista de selección: mezcla hacia verde para ver qué está detectado
      const hv = (a / 255) * 0.5;
      data[i] = r + (116 - r) * hv;
      data[i + 1] = g + (174 - g) * hv;
      data[i + 2] = b + (44 - b) * hv;
      continue;
    }

    const x = px % width;
    const y = (px - x) / width;

    // DESATURAR: nos quedamos solo con la luminancia perceptual del sofá, que lleva el
    // relieve (pliegues, luces y sombras). Sobre ese "gris" aplicamos el color nuevo al
    // 100%, así el tono sale FIEL en vez de mezclarse con el color original.
    let L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Imprime la textura: real de la tela (BD) o, en su defecto, la procedural.
    if (p.texLum && p.texAmount) {
      L += p.texLum[px] * p.texAmount;
      if (L < 0) L = 0; else if (L > 1) L = 1;
    } else if (applyFab) {
      L = applyFabric(L, x, y, p.fabric, p.fabricAmount);
    }

    // Comprime ligeramente el rango para que el color se lea con fuerza (menos lavado
    // en luces y sombras) sin perder el relieve.
    L = 0.08 + L * 0.84;

    let nr: number, ng: number, nb: number;
    if (p.keepColor) {
      // Conserva el color real del sofá; solo cambia el relieve/textura.
      const [h, s] = rgbToHsl(r, g, b);
      [nr, ng, nb] = hslToRgb(h, s, L);
    } else {
      // Color FIEL: tono y saturación 100% del objetivo, brillo tomado del sofá.
      [nr, ng, nb] = hslToRgb(p.targetH, p.targetS, L);
    }

    data[i] = r + (nr - r) * alpha;
    data[i + 1] = g + (ng - g) * alpha;
    data[i + 2] = b + (nb - b) * alpha;
  }
};
