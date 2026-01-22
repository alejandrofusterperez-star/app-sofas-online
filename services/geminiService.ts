
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { VisualizationConfig, AppMode } from "../types";

export const processSofaImage = async (
  base64Image: string,
  mimeType: string,
  config: VisualizationConfig,
  mode: AppMode
): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  let prompt = '';

  if (mode === AppMode.INTEGRATE) {
    prompt = `
      Eres un Fotógrafo Maestro de Catálogo de Muebles. 
      TU OBJETIVO ÚNICO: Integrar el sofá de la imagen en un salón espectacular MANTENIENDO EL 100% DE FIDELIDAD ESTRUCTURAL.
      
      REGLAS DE PROTECCIÓN GEOMÉTRICA (CRÍTICO):
      1. ANATOMÍA: Mantén el número exacto de asientos, respaldos y la forma exacta de los brazos. Prohibido añadir o quitar elementos.
      2. DETALLES TÉCNICOS: Conserva las costuras, los botones (tufting) y el tipo de pata (material y altura) originales. No los "alucines".
      3. PERSPECTIVA: El sofá debe mantener su ángulo y proporciones originales respecto a la cámara.
      
      CONFIGURACIÓN DEL AMBIENTE:
      - Estilo: ${config.style}. Crea un entorno de alta gama que combine con el sofá.
      - Paredes: Color ${config.wallColor}.
      - Suelo: ${config.flooring}. Asegura sombras de contacto realistas bajo el sofá.
      - Iluminación: ${config.lighting}. La luz debe incidir sobre el sofá de forma coherente con su relieve 3D original.
      
      CALIDAD FINAL: Fotografía de estudio profesional, iluminación balanceada, sin distorsiones en los bordes del mueble.
      **REQUERIMIENTO TÉCNICO: RELACIÓN DE ASPECTO ${config.aspectRatio} OBLIGATORIA.**
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
      **REQUERIMIENTO TÉCNICO: RELACIÓN DE ASPECTO ${config.aspectRatio} OBLIGATORIA.**
    `.trim();
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1] || base64Image,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
      // @ts-ignore - Parámetro específico para modelos de generación de imagen
      generationConfig: {
        aspectRatio: config.aspectRatio
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    return null;
  } catch (error) {
    console.error("Error en Gemini:", error);
    throw error;
  }
};
