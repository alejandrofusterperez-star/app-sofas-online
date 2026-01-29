
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { VisualizationConfig, AppMode } from "../types";

export const processSofaImage = async (
  base64Image: string,
  mimeType: string,
  config: VisualizationConfig,
  mode: AppMode
): Promise<{ generatedUrl: string, processedInputUrl: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY || '' });

  let prompt = '';

  // Pre-process image if aspect ratio is requested
  let processedBase64 = base64Image;

  if (config.aspectRatio && config.aspectRatio !== '1:1') {
    try {
      processedBase64 = await adjustImageAspectRatio(base64Image, config.aspectRatio);
    } catch (e) {
      console.warn("Could not adjust aspect ratio, using original image", e);
    }
  }

  if (mode === AppMode.INTEGRATE) {
    prompt = `
      Eres un Fotógrafo Maestro de Catálogo de Muebles. 
      TU OBJETIVO ÚNICO: Integrar el sofá de la imagen en un salón espectacular MANTENIENDO EL 100% DE FIDELIDAD ESTRUCTURAL.
      
      INSTRUCCIÓN DE OUTPAINTING / RELLENO (CRÍTICO ID: #OUTPAINT):
      - La imagen de entrada puede tener espacios en blanco/vacíos arriba o abajo debido a un cambio de formato.
      - TU TAREA ES RELLENAR ESOS ESPACIOS con más techo/pared (arriba) y suelo (abajo).
      - NO estires el sofá. NO recortes la imagen.

      BLOQUEO ABSOLUTO DEL SOFÁ (CRÍTICO, PRIORIDAD #1):
      - El sofá es una “capa bloqueada / locked layer”.
      - PROHIBIDO: modificar forma, proporciones, número de plazas, altura, inclinación, brazos, respaldos, reposacabezas, módulos, chaise longue, cojines, costuras, botones, ribetes, patas (tipo/material/altura), cremalleras, pliegues.
      - PROHIBIDO: rotar, voltear (flip), deformar, estirar, reescalar no-uniforme, “enderezar”, reconstruir bordes, inventar textura o tapizado.
      - El resultado debe conservar 1:1 la textura original y todos los detalles del sofá.

      ORIENTACIÓN Y ENCUADRE (CRÍTICO, SIN ROTACIONES):
      - Mantén EXACTAMENTE el mismo ángulo de cámara del sofá original.
      - NO gires el sofá, NO lo reflejes, NO lo cambies de lado.
      - Mantén la misma perspectiva (mismo punto de fuga) y la misma relación de tamaño respecto a la imagen original.

      COMPOSICIÓN (NO CAMBIAR EL PRODUCTO):
      - El sofá debe seguir siendo el protagonista, en el centro visual.
      - NO cambies el tipo de sofá ni “lo mejores”.
      - NO sustituyas cojines ni añadas/quites cojines. No añadas mantas encima.
      - NO recortes partes del sofá. Debe verse completo.

      INTEGRACIÓN REALISTA (SIN TOCAR EL SOFÁ):
      - Ajusta SOLO el entorno: crea un salón coherente alrededor del sofá.
      - Añade sombra de contacto realista debajo de las patas/base SIN tapar ni deformar el sofá.
      - Iluminación: solo ajustes suaves para coherencia ambiental, sin cambiar color real del tapizado.

      AMBIENTE (FONDO SOLO):
      - Estilo: ${config.style}.
      - Paredes: ${config.wallColor}.
      - Suelo: ${config.flooring}.
      - Iluminación: ${config.lighting}.
      - El entorno debe ser de alta gama, pero NEUTRO para que el sofá destaque.
      - Evita elementos que distraigan (nada delante del sofá, nada que lo tape).

      LISTA DE NEGATIVOS (NO HACER):
      - NO cambiar cabezales/reposacabezas.
      - NO cambiar el número de módulos, no crear chaise, no eliminar chaise.
      - NO cambiar patas (ni forma ni altura).
      - NO inventar costuras, capitoné, botones o paneles nuevos.
      - NO alterar el patrón del tejido ni su grano.
      - NO cambiar el color del sofá (salvo microajuste de luz global, sin alterar el tono real).

      VERIFICACIÓN FINAL (OBLIGATORIA ANTES DE ENTREGAR):
      1) ¿El sofá es idéntico 1:1 (mismo modelo, mismos detalles, misma textura)?
      2) ¿Sigue con la MISMA orientación y ángulo (sin rotación/flip)?
      3) ¿No hay cojines/mantas/elementos añadidos o eliminados?
      Si alguna respuesta es NO, rehacer manteniendo el sofá intacto.

      CALIDAD: foto de catálogo hiperrealista, bordes limpios, sin halos, sin distorsión.
    `.trim();
  } else if (mode === AppMode.MATTRESS) {
    prompt = `
      Eres un Fotógrafo de Catálogo de Descanso (E-commerce) especializado en compositing.
      OBJETIVO ÚNICO: Integrar el colchón + base/canapé EXACTOS de la foto en un dormitorio premium CON AMPLIACIÓN DE ESCENA VERTICAL / OUTPAINTING.

      INSTRUCCIÓN DE OUTPAINTING / RELLENO (CRÍTICO ID: #OUTPAINT):
      - La imagen de entrada puede tener espacios en blanco/vacíos arriba o abajo (canvas extendido).
      - TU TAREA ES RELLENAR ESOS ESPACIOS con más pared, techo (arriba) y suelo/alfombra (abajo) de forma coherente.
      - NO estires el colchón.
      - NO recortes la imagen.

      BLOQUEO ABSOLUTO DEL PRODUCTO (CRÍTICO, PRIORIDAD #1):
      - El colchón y el canapé son una “capa bloqueada / locked layer”.
      - PROHIBIDO: rotar, deformar, reescalar no-uniforme, suavizar, retexturizar, reinterpretar, “mejorar”, re-iluminar agresivo, reconstruir bordes, inventar costuras.
      - El resultado debe conservar 1:1 la textura, el patrón del tejido, ribetes, cantos, grosor, esquinas y costuras.

      ETIQUETA / LOGO (CRÍTICO, PRIORIDAD #0):
      - La etiqueta y cualquier logo o texto impreso debe ser una COPIA EXACTA y LEGIBLE del original.
      - PROHIBIDO: cambiar tipografía, borrar letras, difuminar, reescribir, “aproximar” el texto, generar un logo nuevo.
      - Si el texto pierde legibilidad o cambia, el resultado es inválido.

      ORIENTACIÓN Y PERSPECTIVA (CRÍTICO, SIN ROTACIONES):
      - Mantén EXACTAMENTE el mismo ángulo de cámara del producto original.
      - NO gires el colchón, NO lo reflejes, NO cambies “cabeza/pies”.
      - Respeta la orientación real: el lado donde está la etiqueta en la foto debe seguir estando en el MISMO lado (pies/frontal) dentro del dormitorio.

      REGLA DE COMPOSICIÓN (FONDO SOLO):
      - Genera el dormitorio ALREDEDOR del producto, sin tocarlo.
      - Coloca el producto como cama real: cabecero detrás (en el lado opuesto a la etiqueta).
      - ${config.addPillows
        ? 'MANDATORIO: Añade EXACTAMENTE 2 almohadas premium en la cabecera (donde iría la cabeza). Deben ser realistas, mullidas y acordes al estilo del dormitorio. NO añadas nada más (ni mantas ni sábanas extra).'
        : 'No añadas sábanas, almohadas, mantas ni decoración encima del colchón. El colchón debe verse desnudo.'}
      - No tapes el canapé ni lo sustituyas por otra base.

      INTEGRACIÓN REALISTA (SIN TOCAR PRODUCTO):
      - Ajusta SOLO el fondo: perspectiva del entorno, sombras de contacto bajo el canapé y el colchón, y coherencia de luz ambiental.
      - Sombras: sutiles y realistas, sin “comerse” detalles del ribete o la etiqueta.
      - Evita halos, bordes recortados o artefactos alrededor del producto.

      AMBIENTE (DISEÑO PREMIUM):
      - Estilo: ${config.style}.
      - Paredes: Color ${config.wallColor}.
      - Suelo: ${config.flooring}.
      - Iluminación: ${config.lighting} (suave, de interior, coherente con el relieve original del producto).
      - ELEMENTOS OBLIGATORIOS DE AMBIENTE:
        1. MESITAS DE NOCHE: Genera siempre mesitas de noche a los lados (o al lado visible) que combinen perfectamente con el estilo elegido.
        2. DECORACIÓN: Añade lámparas de diseño sobre las mesitas, una alfombra mullida bajo la cama (sin tapar la base/canapé) y cuadros o arte en las paredes para dar sensación de "hogar vivido" y premium.

      LISTA DE NEGATIVOS (NO HACER):
      - NO cambiar el color del tejido.
      - NO reinterpretar el acolchado ni el patrón.
      - NO añadir capitoné, botones, costuras nuevas.
      - NO “enderezar” el colchón, NO hacerlo más alto/bajo, NO cambiar proporciones.
      - NO reemplazar el canapé por otro, NO añadir patas nuevas.

      VERIFICACIÓN FINAL (OBLIGATORIA ANTES DE ENTREGAR):
      1) ¿La etiqueta/logo es idéntica y 100% legible? 
      2) ¿El colchón+canapé mantienen la misma orientación exacta (sin rotación/flip)?
      3) ¿La textura y costuras son 1:1 sin inventos?
      Si alguna respuesta es NO, rehacer manteniendo el producto intacto.

      CALIDAD: fotografía de catálogo realista, nítida, sin distorsión del producto.
    `.trim();
  } else {
    prompt = `
      Eres un Especialista en Renderizado de Textiles para Mobiliario Premium.
      TU OBJETIVO: Cambiar el color del sofá preservando su ADN ESTRUCTURAL Y TEXTURA.
      
      REGLAS DE RECOLOREADO FIDELIGNO:
      1. INTEGRIDAD DE TEXTURA: Mantén la trama de la tela, los pliegues naturales y las sombras originales. Solo cambia el tinte cromático.
      2. PROTECCIÓN DE DETALLES: No cambies el color de las patas ni de los accesorios si los tiene.
      3. COLOR OBJETIVO: ${config.targetSofaColor || 'Azul Marino'}. El tono debe ser uniforme y premium.
      
      ENTORNO: Presentación de catálogo en estudio neutro minimalista para que el diseño del sofá sea el protagonista absoluto.
    `.trim();
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: processedBase64.split(',')[1] || processedBase64,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
      // @ts-ignore - Parámetro específico para modelos de generación de imagen
      generationConfig: {
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return {
          generatedUrl: `data:image/png;base64,${part.inlineData.data}`,
          processedInputUrl: processedBase64
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error en Gemini:", error);
    throw error;
  }
};

const adjustImageAspectRatio = (base64: string, ratioStr: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("No canvas context"));
        return;
      }

      // Parse ratio "3:4" -> 0.75
      const [w, h] = ratioStr.split(':').map(Number);
      const targetRatio = w / h;

      // Calculate new dimensions based on original image
      // We want to CONTAIN the image inside the new aspect ratio
      let newWidth = img.width;
      let newHeight = img.height;

      const currentRatio = img.width / img.height;

      if (currentRatio > targetRatio) {
        // Image is wider than target (e.g. square vs vertical) -> Increase Height (add bars top/bottom)
        newHeight = img.width / targetRatio;
      } else {
        // Image is taller than target -> Increase Width (add bars left/right)
        newWidth = img.height * targetRatio;
      }

      canvas.width = newWidth;
      canvas.height = newHeight;

      // Fill with transparent or white?
      // White is safer for "studio" extensions
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, newWidth, newHeight);

      // Draw original image centered
      const x = (newWidth - img.width) / 2;
      // Position: Center verticallly usually best for general integration
      // const y = (newHeight - img.height) / 2; 

      // EXPERIMENTAL: For MATTRESS, maybe align to BOTTOM so the floor is continuous?
      // If we center a bed, we have to invent floor below and ceiling above.
      // If we align bottom, we only invent ceiling.
      // Let's stick to CENTER as it's the safest bet for the AI to understand "context".
      const y = (newHeight - img.height) / 2;

      ctx.drawImage(img, x, y);

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = reject;
    img.src = base64;
  });
};
