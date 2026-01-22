
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
      Eres un diseñador de interiores de alta gama. 
      Toma este sofá EXACTO de la imagen e intégralo perfectamente en un salón nuevo.
      
      REGLAS CRÍTICAS:
      1. El sofá DEBE ser idéntico: misma forma, textura, costuras y color original. No lo cambies.
      2. El estilo del salón debe ser ${config.style}.
      3. Las paredes del salón deben ser de color ${config.wallColor}.
      4. El suelo debe ser de ${config.flooring}.
      5. La iluminación debe ser ${config.lighting}.
      6. Añade elementos decorativos (plantas, mesas, cuadros) que encajen con el estilo ${config.style}.
      7. El resultado debe parecer una fotografía de catálogo de muebles profesional.
      8. **IMPORTANTE: LA IMAGEN DEBE TENER UNA RELACIÓN DE ASPECTO DE ${config.aspectRatio}. ESTO ES OBLIGATORIO.**
    `.trim();
  } else {
    prompt = `
      Eres un experto en retoque fotográfico de muebles.
      Cambia el color de este sofá al color: ${config.targetSofaColor || 'Azul Marino'}.
      
      REGLAS CRÍTICAS:
      1. Mantén la textura exacta de la tela, las sombras y la forma del sofá. Solo cambia el color.
      2. El fondo debe ser un estudio fotográfico minimalista y neutro para que el sofá resalte.
      3. Asegúrate de que el nuevo color se vea natural y premium, respetando los pliegues y el relieve.
      4. **IMPORTANTE: LA IMAGEN DEBE TENER UNA RELACIÓN DE ASPECTO DE ${config.aspectRatio}. ESTO ES OBLIGATORIO.**
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
