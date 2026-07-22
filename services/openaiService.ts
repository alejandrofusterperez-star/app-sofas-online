
import { VisualizationConfig, AppMode } from "../types";
import { recordSpend } from "./spendTracker";

const OPENAI_IMAGE_EDIT_URL = "https://api.openai.com/v1/images/edits";

export const processSofaImage = async (
  base64Image: string,
  mimeType: string,
  config: VisualizationConfig,
  mode: AppMode,
  userName: string = 'desconocido'
): Promise<{ generatedUrl: string, processedInputUrl: string, costUsd: number } | null> => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    console.error("VITE_OPENAI_API_KEY no encontrada. Configúrala en .env.local (VITE_OPENAI_API_KEY=sk-...).");
    throw new Error("Falta la clave de OpenAI (VITE_OPENAI_API_KEY).");
  }
  console.log("OpenAI API Key detectada (comienza por:", apiKey.substring(0, 6), "...)");

  let prompt = '';

  // El output de gpt-image-1 SIEMPRE tiene un tamaño fijo (1024x1024, 1536x1024 o 1024x1536).
  // Si la foto del sofá no coincide con esa proporción, el modelo la RECORTA para encajarla.
  // Para evitarlo, "encajamos" (letterbox) la imagen de entrada en esa misma proporción + margen,
  // de forma que el producto siempre cabe entero y la IA solo rellena alrededor.
  const size = aspectRatioToSize(config.aspectRatio);
  const [outW, outH] = size.split('x').map(Number);
  const targetRatio = outW / outH;

  let processedBase64 = base64Image;
  try {
    processedBase64 = await padImageToRatio(base64Image, targetRatio);
  } catch (e) {
    console.warn("Could not letterbox the input image, using original", e);
  }

  // Referencia de tela (biblioteca). Se usa en re-tapizado e integración (Modo Estudio).
  const changeFabric = !!config.changeFabric;
  const hasFabricReference = changeFabric && !!config.fabricReferenceImageUrl;
  // Modo Estudio: la muestra define COLOR + TEXTURA. Si no, solo textura (color = paleta).
  const useFabricColor = hasFabricReference && !!config.useFabricColor;

  const fabricReferenceBlock = !hasFabricReference
    ? ''
    : useFabricColor
    ? `REFERENCIA DE TELA (COLOR + TEXTURA) — EXCEPCIÓN PERMITIDA AL BLOQUEO DEL SOFÁ:
      - Se adjuntan DOS imágenes: la PRIMERA es el SOFÁ (referencia estructural exacta) y la SEGUNDA es una MUESTRA (swatch) de la tela "${config.targetFabric}" (referencia EXCLUSIVA de tapizado).
      - RE-TAPIZA el sofá usando el color y el material EXACTOS de la muestra. Cambia ÚNICAMENTE el tapizado (material + color); no toques nada más del sofá.
      - COLOR: reproduce fielmente el color REAL de la muestra, incluyendo su luminosidad, saturación, subtonos y variaciones tonales naturales. NO lo reinterpretes, NO lo aclares, NO lo oscurezcas y NO lo desatures.
      - TEXTURA: reproduce la trama, fibras, grano, pelo, suavidad, densidad, irregularidades de superficie y el acabado mate o sutilmente reflectante de la muestra.
      - ESCALA (MUY IMPORTANTE): la muestra puede ser una FOTO MACRO / primer plano. Ajusta AUTOMÁTICAMENTE la escala de la textura para que las fibras, la trama y el detalle se vean realistas en un sofá a tamaño real. NO reproduzcas la tela a escala macro y NO agrandes sus fibras ni su patrón.
      - APLICACIÓN: aplica la tela de forma natural a TODAS las superficies tapizadas (cojines de asiento y respaldo, brazos, base, chaise). La textura debe seguir la perspectiva, forma, curvatura y volumen de cada pieza, con tensión, pliegues, arrugas, costuras, sombras y brillos realistas y una dirección del pelo coherente con la luz.
      - Debe parecer FÍSICAMENTE tapizado, no una textura pegada digitalmente.
      - EVITA: repetición/tiling visible, patrón duplicado, textura estirada o borrosa, reemplazo de color plano, relieve excesivo, fibras exageradas, contraste artificial, aspecto plástico, brillo irreal o apariencia CGI/ilustración.
      - Conserva el ángulo de cámara, composición, perspectiva, iluminación, sombras, fondo y dimensiones del sofá original. La SEGUNDA imagen es SOLO material: NO copies su forma ni su encuadre.`
    : `REFERENCIA DE TEXTURA (solo material) — EXCEPCIÓN PERMITIDA AL BLOQUEO DEL SOFÁ:
      - Se adjunta una SEGUNDA imagen: es una MUESTRA (swatch) de la tela "${config.targetFabric}".
      - ÚSALA SOLO COMO REFERENCIA DE TEXTURA/MATERIAL: copia su trama, fibras, grano, relieve, patrón y acabado (mate/reflectante) exactamente.
      - NO copies el COLOR de la muestra. El color del tapizado es el indicado para el sofá ("${config.targetSofaColor}"). Aplica la TEXTURA teñida con ese color, como si esa misma tela existiera en ese color.
      - ESCALA (MUY IMPORTANTE): la muestra puede ser una FOTO MACRO. Ajusta la escala de la textura para que se vea realista en un sofá a tamaño real; NO agrandes las fibras ni el patrón, y evita repetición/tiling, textura estirada o aspecto plástico/CGI.
      - La textura debe seguir la curvatura y el volumen de cada pieza con pliegues y sombras naturales; debe parecer físicamente tapizado. Cambia SOLO el tapizado; mantén forma, patas y estructura 1:1.
      - La PRIMERA imagen es el SOFÁ; la SEGUNDA es solo la textura de referencia: NO copies su forma ni su encuadre.`;

  // Solo para digency: cambio de color del sofá DENTRO del modo integrar (con paleta).
  // Si la tela ya define el color (useFabricColor) o hay referencia, no aplicamos paleta aquí.
  const wantsIntegrateColor = !hasFabricReference && !!config.integrateColorChange && !!config.targetSofaColor;

  const integrateColorRule = hasFabricReference
    ? '' // El re-tapizado lo dicta el bloque de referencia de tela.
    : wantsIntegrateColor
    ? `CAMBIO DE COLOR DEL SOFÁ (ÚNICA EXCEPCIÓN PERMITIDA AL BLOQUEO):
      - Cambia ÚNICAMENTE el TINTE/COLOR del tapizado del sofá a: ${config.targetSofaColor}.
      - Aplica el nuevo tono de forma uniforme, realista y premium a TODO el tapizado.
      - Respeta EXACTAMENTE las luces, sombras, pliegues, costuras, capitoné, botones y relieve originales: SOLO cambia el color, jamás la textura ni la forma.
      - NO cambies el color ni el material de las PATAS, herrajes, cremalleras ni de ningún elemento que no sea tela.
      - Todo lo demás del sofá permanece 1:1 idéntico.`
    : `COLOR DEL SOFÁ (CONSERVAR):
      - NO cambies el color del sofá (salvo microajuste de luz global, sin alterar el tono real).`;

  if (mode === AppMode.INTEGRATE) {
    prompt = `
      Eres un Fotógrafo Maestro de Catálogo de Muebles.
      TU OBJETIVO ÚNICO: Integrar el sofá de la imagen en un salón espectacular MANTENIENDO EL 100% DE FIDELIDAD ESTRUCTURAL${wantsIntegrateColor ? ', CAMBIANDO ÚNICAMENTE EL COLOR DEL TAPIZADO' : ''}.

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
      - NO sustituyas cojines ni añadas/quites cojines. No añadas mantas encima del sofá.
      - NO recortes partes del sofá. Debe verse completo.
      - PROHIBIDO colocar cualquier objeto que tape, cruce, se apoye o pase por delante ocultando el sofá. La decoración va SIEMPRE alrededor o por delante a baja altura (mesa de centro), nunca tapándolo.

      ${integrateColorRule}
      ${hasFabricReference ? '\n' + fabricReferenceBlock + '\n' : ''}
      INTEGRACIÓN REALISTA (SIN TOCAR EL SOFÁ):
      - Ajusta SOLO el entorno: crea un salón coherente alrededor del sofá.
      - Añade sombra de contacto realista debajo de las patas/base SIN tapar ni deformar el sofá.
      - Iluminación: solo ajustes suaves para coherencia ambiental${(wantsIntegrateColor || hasFabricReference) ? '.' : ', sin cambiar color real del tapizado.'}

      AMBIENTE — SALÓN COMPLETO Y CON SENTIDO (FONDO SOLO):
      - OBJETIVO DE ESCENA: genera un SALÓN REAL Y HABITADO, completamente amueblado y coherente. NO un sofá flotando en un fondo vacío o en un estudio sin contexto.
      - El espacio debe tener lógica: proporciones realistas, perspectiva correcta, suelo y paredes continuos, y una fuente de luz creíble (ventana y/o lámparas).
      - Estilo: ${config.style}.
      - Paredes: ${config.wallColor}.
      - Suelo: ${config.flooring}.
      - Iluminación: ${config.lighting}.
      ${config.addDecor
        ? `- DECORACIÓN ACTIVADA: equipa el salón de forma elegante, realista y de gama alta ALREDEDOR del sofá (sin tocarlo ni taparlo). Incluye una combinación coherente de:
        · Alfombra bajo/delante del sofá.
        · Mesa de centro baja delante del sofá (sin ocultarlo), con algún detalle encima (libros, bandeja, jarrón).
        · Mesa auxiliar o aparador a un lado, lámpara(s) de diseño, plantas de interior.
        · Cuadros o arte en la pared, cortinas y/o ventana con luz natural.
        · Detalles de "hogar vivido" (manta doblada sobre un puf o butaca, NUNCA sobre el sofá).
        - Todo debe combinar con el estilo elegido y verse como un catálogo de decoración premium.`
        : `- DECORACIÓN MÍNIMA: salón sobrio pero COMPLETO y con sentido (suelo, paredes y luz creíbles), con solo 1-2 elementos discretos (p. ej. una planta y un cuadro) para que NO parezca un fondo vacío. El sofá destaca al máximo.`}

      LISTA DE NEGATIVOS (NO HACER):
      - NO cambiar cabezales/reposacabezas.
      - NO cambiar el número de módulos, no crear chaise, no eliminar chaise.
      - NO cambiar patas (ni forma ni altura).
      - NO inventar costuras, capitoné, botones o paneles nuevos.
      - NO alterar el patrón del tejido ni su grano.
      ${wantsIntegrateColor
        ? '- NO cambiar NADA del sofá salvo el COLOR del tapizado indicado arriba (ni patas, ni costuras, ni forma, ni textura).'
        : '- NO cambiar el color del sofá (salvo microajuste de luz global, sin alterar el tono real).'}

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
    // Cambios independientes: el usuario puede pedir solo color, solo tela, o ambos.
    // (changeFabric/hasFabricReference/fabricReferenceBlock ya se calcularon arriba.)
    // Si la tela define el color (Modo Estudio), no aplicamos color de paleta.
    const changeColor = useFabricColor ? false : config.changeColor !== false;

    const colorBlock = useFabricColor
      ? '' // El color lo define la muestra de tela (bloque de referencia).
      : changeColor
      ? `COLOR (CAMBIAR):
      - Cambia el tinte del tapizado a: ${config.targetSofaColor || 'Azul Marino'}.
      - El tono debe ser uniforme, realista y premium.
      - Respeta SIEMPRE las luces, sombras y pliegues originales (solo cambia el color, no el relieve).`
      : `COLOR (CONSERVAR):
      - MANTÉN EXACTAMENTE el color y el tono original del tapizado. NO lo alteres en absoluto.`;

    // Si hay imagen de referencia de tela, el material lo dicta ESA imagen (bloque de
    // referencia), así que NO añadimos el bloque genérico de tejido (evita confusión).
    const fabricBlock = hasFabricReference
      ? ''
      : changeFabric
      ? `TELA / MATERIAL (CAMBIAR):
      - Cambia el tipo de tejido del tapizado a: ${config.targetFabric || 'Chenilla'}.
      - Reproduce de forma fotorrealista la trama, el brillo, el relieve y el comportamiento de la luz característicos de ese material (p. ej. el terciopelo refleja la luz, el lino es mate y texturizado, la pana tiene canalé, la piel/cuero es lisa y brillante).
      - Aplica el nuevo material respetando la forma, los pliegues y las costuras existentes del sofá.`
      : `TELA / MATERIAL (CONSERVAR):
      - MANTÉN EXACTAMENTE el mismo tejido y textura original (misma trama y acabado). NO cambies el material.`;

    prompt = `
      Eres un Especialista en Renderizado de Textiles para Mobiliario Premium.
      TU OBJETIVO: Re-tapizar el sofá preservando su ADN ESTRUCTURAL, cambiando ÚNICAMENTE lo que se indica abajo.

      BLOQUEO ESTRUCTURAL (PRIORIDAD #1):
      - NO cambies la forma, el número de plazas, brazos, respaldos, reposacabezas, cojines, patas ni las proporciones.
      - NO rotes, NO voltees (flip) y NO recortes el sofá: debe verse COMPLETO y con la MISMA orientación y ángulo de cámara.
      - NO conviertas el sofá en cama, NO abras mecanismos ni despliegues módulos. El mueble se mantiene tal cual.
      - PROTECCIÓN DE DETALLES: no cambies el color ni el material de las patas ni de los accesorios.

      CAMBIOS SOLICITADOS:
      ${colorBlock}

      ${fabricBlock}
      ${fabricReferenceBlock ? '\n' + fabricReferenceBlock + '\n' : ''}
      ENTORNO: Presentación de catálogo en estudio neutro minimalista, fondo limpio, para que el sofá sea el protagonista absoluto.

      VERIFICACIÓN FINAL: el sofá debe ser el MISMO modelo, misma forma y orientación; solo deben verse los cambios solicitados de color y/o material.
    `.trim();
  }

  try {
    const modelName = 'gpt-image-1';
    // Modo rápido -> calidad 'medium' (más rápido y barato). Por defecto 'high' (premium).
    const quality = config.fastMode ? 'medium' : 'high';
    console.log(`Llamando a OpenAI con modelo: ${modelName} (size: ${size}, quality: ${quality})`);

    // Convert the (possibly padded) data URL into a PNG Blob for the multipart upload
    const imageBlob = await dataUrlToBlob(processedBase64, mimeType);

    // Si hay una tela de referencia (biblioteca), la descargamos para enviarla como 2ª imagen.
    let fabricRefBlob: Blob | null = null;
    if (config.changeFabric && config.fabricReferenceImageUrl) {
      try {
        const refRes = await fetch(config.fabricReferenceImageUrl);
        if (refRes.ok) fabricRefBlob = await refRes.blob();
        else console.warn('No se pudo descargar la imagen de la tela de referencia:', refRes.status);
      } catch (e) {
        console.warn('Error descargando la tela de referencia:', e);
      }
    }

    const formData = new FormData();
    formData.append('model', modelName);
    if (fabricRefBlob) {
      // gpt-image-1 acepta varias imágenes con el campo image[]: 1ª el sofá, 2ª la tela.
      formData.append('image[]', imageBlob, 'sofa.png');
      formData.append('image[]', fabricRefBlob, 'fabric.png');
    } else {
      formData.append('image', imageBlob, 'sofa.png');
    }
    formData.append('prompt', prompt);
    formData.append('size', size);
    formData.append('quality', quality);
    // input_fidelity=high preserva al máximo el producto original (sofá/colchón/etiqueta)
    formData.append('input_fidelity', 'high');
    formData.append('n', '1');

    const response = await fetch(OPENAI_IMAGE_EDIT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Error de OpenAI:", response.status, errText);
      throw new Error(`OpenAI ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const b64 = data?.data?.[0]?.b64_json;

    if (b64) {
      // Registra el coste de esta llamada en el contador global (tolerante a fallos).
      let costUsd = 0;
      try {
        const { costUsd: c } = await recordSpend({
          userName,
          model: modelName,
          size,
          quality,
          usage: data?.usage ?? null,
        });
        costUsd = c;
      } catch (e) {
        console.warn('No se pudo registrar el gasto de la llamada:', e);
      }

      return {
        generatedUrl: `data:image/png;base64,${b64}`,
        processedInputUrl: processedBase64,
        costUsd,
      };
    }

    console.warn("OpenAI no devolvió ninguna imagen en la respuesta:", data);
    return null;
  } catch (error: any) {
    console.error("Error detallado en OpenAI:", error);
    if (error.status) console.error("Status Code:", error.status);
    if (error.message) console.error("Error Message:", error.message);
    throw error;
  }
};

// Mapea la relación de aspecto a uno de los tamaños soportados por gpt-image-1
const aspectRatioToSize = (ratioStr?: string): string => {
  if (!ratioStr || ratioStr === '1:1') return '1024x1024';
  const [w, h] = ratioStr.split(':').map(Number);
  if (!w || !h) return '1024x1024';
  if (w > h) return '1536x1024'; // horizontal
  if (h > w) return '1024x1536'; // vertical
  return '1024x1024';
};

const dataUrlToBlob = async (dataUrl: string, fallbackMime: string): Promise<Blob> => {
  // Si ya es un data URL, fetch lo convierte directamente a Blob
  if (dataUrl.startsWith('data:')) {
    const res = await fetch(dataUrl);
    return await res.blob();
  }
  // Si es base64 puro, decodifícalo manualmente
  const byteString = atob(dataUrl);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }
  return new Blob([bytes], { type: fallbackMime || 'image/png' });
};

// "Encaja" (letterbox) la imagen dentro de un lienzo con la proporción de salida exacta,
// añadiendo un margen de seguridad alrededor. Así el producto NUNCA se recorta: queda
// contenido por completo y gpt-image-1 solo rellena el espacio blanco con la escena.
const MARGIN = 0.12; // 12% de aire alrededor del producto

const padImageToRatio = (base64: string, targetRatio: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("No canvas context"));
        return;
      }

      const w = img.width;
      const h = img.height;

      // 1) Lienzo mínimo que CONTIENE la imagen con la proporción objetivo
      let boxW = w;
      let boxH = h;
      const currentRatio = w / h;

      if (currentRatio > targetRatio) {
        // Imagen más ancha que el objetivo -> añade altura (barras arriba/abajo)
        boxH = w / targetRatio;
      } else {
        // Imagen más alta que el objetivo -> añade anchura (barras a los lados)
        boxW = h * targetRatio;
      }

      // 2) Margen de aire uniforme alrededor (mantiene la proporción)
      const canvasW = boxW * (1 + 2 * MARGIN);
      const canvasH = boxH * (1 + 2 * MARGIN);

      canvas.width = canvasW;
      canvas.height = canvasH;

      // Fondo blanco -> zona a rellenar por la IA (estudio / escena)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Dibuja la imagen original centrada, sin escalarla
      const x = (canvasW - w) / 2;
      const y = (canvasH - h) / 2;
      ctx.drawImage(img, x, y);

      // PNG para no perder calidad ni introducir artefactos JPEG en los bordes
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = base64;
  });
};
