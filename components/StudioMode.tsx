import React, { useMemo, useState } from 'react';
import { AppMode, Fabric, InteriorStyle, Lighting, SofaModel, VisualizationConfig, GenerationResult } from '../types';
import { processSofaImage, Engine, OPENAI_IMAGE_MODELS, OpenAIModel } from '../services/openaiService';
import { hasGeminiKey } from '../services/geminiService';
import { urlToDataUrl } from '../services/sofaModelsService';
import { ResultCard } from './ResultCard';

interface StudioModeProps {
  models: SofaModel[];
  fabrics: Fabric[];
  userName: string;
  onGenerated?: () => void;
}

const STYLES = Object.values(InteriorStyle);
const STEPS = ['Modelo', 'Tela', 'Escena'];

export const StudioMode: React.FC<StudioModeProps> = ({ models, fabrics, userName, onGenerated }) => {
  const [step, setStep] = useState(0);
  const [model, setModel] = useState<SofaModel | null>(null);
  const [openFabricId, setOpenFabricId] = useState<string | null>(null);
  const [textureColorId, setTextureColorId] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<'salon' | 'estudio'>('salon');
  const [style, setStyle] = useState<InteriorStyle>(InteriorStyle.MINIMALIST);
  const [addDecor, setAddDecor] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '3:4'>('1:1');
  const [numImages, setNumImages] = useState(3);
  const [fastMode, setFastMode] = useState(false);
  const [engine, setEngine] = useState<Engine>('openai');
  const [openaiModel, setOpenaiModel] = useState<OpenAIModel>('gpt-image-1');
  const geminiAvailable = hasGeminiKey();

  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const texture = useMemo(
    () => fabrics.flatMap((f) => f.colors.map((c) => ({ c, fabricName: f.name }))).find((x) => x.c.id === textureColorId),
    [fabrics, textureColorId]
  );
  const activeFabric = fabrics.find((f) => f.id === openFabricId) || null;

  const canContinue = step === 0 ? !!model : step === 1 ? !!texture : true;

  const handleGenerate = async () => {
    if (!model?.image_url) {
      setError('Selecciona un modelo de sofá con imagen.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    setResults([]);
    try {
      const { dataUrl, mimeType } = await urlToDataUrl(model.image_url);

      const base: VisualizationConfig = {
        style,
        wallColor: '#F9F9F7',
        lighting: Lighting.NATURAL,
        flooring: 'Roble Claro',
        // La tela define COLOR + TEXTURA (sin paleta). targetSofaColor solo etiqueta.
        targetSofaColor: texture ? `${texture.fabricName} ${texture.c.name}` : undefined,
        aspectRatio,
        numImages,
        fastMode,
        changeFabric: !!texture,
        targetFabric: texture?.fabricName,
        fabricReferenceImageUrl: texture?.c.image_url || undefined,
        selectedFabricColorId: texture?.c.id,
        useFabricColor: true,
        fabricColorHex: texture?.c.color_hex || undefined,
      };

      const mode = environment === 'salon' ? AppMode.INTEGRATE : AppMode.COLOR_CHANGE;

      const configFor = (variant: number): VisualizationConfig => {
        if (mode === AppMode.INTEGRATE) {
          const cfg: VisualizationConfig = { ...base, integrateColorChange: true, addDecor };
          if (variant === 1) return { ...cfg, lighting: Lighting.WARM, style: InteriorStyle.SCANDINAVIAN };
          if (variant === 2) return { ...cfg, wallColor: 'Gris Suave', flooring: 'Nogal Oscuro' };
          return cfg;
        }
        // Estudio (re-tapizado en fondo neutro): color + textura.
        return { ...base, changeColor: true };
      };

      const count = Math.min(3, Math.max(1, numImages));
      const responses = await Promise.all(
        Array.from({ length: count }, (_, i) => processSofaImage(dataUrl, mimeType, configFor(i), mode, userName, engine, openaiModel))
      );
      onGenerated?.();

      const valid: GenerationResult[] = responses
        .filter((r): r is { generatedUrl: string; processedInputUrl: string; costUsd: number } => r !== null)
        .map((r, idx) => ({ id: `studio-${idx}-${idx}`, url: r.generatedUrl, originalUrl: r.processedInputUrl, mode }));

      if (valid.length === 0) setError('No se pudo generar. Inténtalo de nuevo.');
      setResults(valid);
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || (typeof e === 'string' ? e : JSON.stringify(e));
      setError(`Error al generar (${engine}): ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setResults([]);
    setStep(0);
    setModel(null);
    setTextureColorId(null);
    setOpenFabricId(null);
  };

  // ── Resultados ─────────────────────────────────────────────────────────────
  if (results.length > 0 && !isGenerating) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 pb-6 mb-8">
          <div>
            <span className="text-[#74AE2C] text-xs font-black uppercase tracking-[0.3em] block mb-2">Modo Estudio</span>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tighter uppercase">Resultados</h3>
          </div>
          <button
            onClick={reset}
            className="px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl text-slate-400 font-bold uppercase tracking-widest text-xs hover:border-[#74AE2C] hover:text-[#74AE2C] transition-all"
          >
            Nueva composición
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Ficha lateral: tela usada como referencia */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-4 sm:sticky sm:top-24">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Tela usada</h4>
              {texture ? (
                <>
                  <div className="aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 mb-3">
                    {texture.c.image_url ? (
                      <img src={texture.c.image_url} alt={texture.c.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">sin imagen</div>
                    )}
                  </div>
                  <p className="text-sm font-black text-slate-800 leading-tight">{texture.fabricName}</p>
                  <p className="text-xs font-bold text-slate-500">{texture.c.name}</p>
                  {texture.c.color_hex && (
                    <div className="mt-3">
                      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Color</span>
                      <div
                        className="w-full aspect-square rounded-2xl border-2 border-slate-100 shadow-inner"
                        style={{ backgroundColor: texture.c.color_hex }}
                      />
                      <span className="block text-center text-sm font-black text-slate-600 uppercase mt-2 tracking-wider">{texture.c.color_hex}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400">Sin tela de referencia.</p>
              )}

              <div className="border-t border-slate-100 mt-4 pt-3 space-y-1">
                {model && <p className="text-[11px] text-slate-400"><span className="font-bold text-slate-500">Modelo:</span> {model.name}</p>}
                <p className="text-[11px] text-slate-400">
                  <span className="font-bold text-slate-500">Motor:</span> {engine === 'gemini' ? 'Gemini' : `OpenAI · ${openaiModel}`}
                </p>
                <p className="text-[11px] text-slate-400">
                  <span className="font-bold text-slate-500">Escena:</span> {environment === 'salon' ? 'Salón' : 'Estudio'}
                </p>
              </div>
            </div>
          </aside>

          {/* Imágenes generadas */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {results.map((r, idx) => (
              <ResultCard key={r.id} result={r} idx={idx} allowHiRes />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Generando ──────────────────────────────────────────────────────────────
  if (isGenerating) {
    return (
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="relative w-28 h-28 mb-8">
          <div className="absolute inset-0 border-8 border-[#74AE2C]/10 rounded-full"></div>
          <div className="absolute inset-0 border-8 border-[#74AE2C] rounded-full border-t-transparent animate-spin"></div>
        </div>
        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Componiendo en estudio...</h3>
        <p className="text-slate-400 font-medium mt-3 max-w-sm">
          Aplicando tu modelo con la tela elegida en {environment === 'salon' ? 'un salón premium' : 'estudio neutro'}.
        </p>
      </div>
    );
  }

  // ── Asistente ──────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Cabecera + stepper */}
      <div className="mb-8">
        <span className="text-[#74AE2C] text-xs font-black uppercase tracking-[0.3em] block mb-2">Modo Estudio</span>
        <h2 className="text-2xl sm:text-4xl font-black text-slate-800 uppercase tracking-tight mb-6">
          Compón tu sofá paso a paso
        </h2>
        <div className="flex items-center gap-2 sm:gap-4">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <button
                onClick={() => (i < step || (i === 0) || (i <= step)) && setStep(i)}
                className="flex items-center gap-2 group"
              >
                <span
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-black transition-all ${
                    i === step ? 'bg-[#74AE2C] text-white' : i < step ? 'bg-[#74AE2C]/20 text-[#74AE2C]' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {i < step ? '✓' : i + 1}
                </span>
                <span className={`text-xs sm:text-sm font-bold hidden xs:block sm:block ${i === step ? 'text-slate-800' : 'text-slate-400'}`}>
                  {label}
                </span>
              </button>
              {i < STEPS.length - 1 && <div className="flex-1 h-0.5 bg-slate-100 rounded-full min-w-[12px]"></div>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-100 shadow-xl min-h-[320px]">
        {/* Paso 1: Modelo */}
        {step === 0 && (
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-1">Elige el modelo de sofá</h3>
            <p className="text-sm text-slate-400 mb-6">De tu catálogo de modelos propios.</p>
            {models.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 font-medium">
                No hay modelos todavía. Añádelos en la pestaña "Modelos".
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModel(m)}
                    className={`text-left rounded-2xl border-2 overflow-hidden transition-all ${
                      model?.id === m.id ? 'border-[#74AE2C] ring-4 ring-[#74AE2C]/10' : 'border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-slate-50">
                      {m.image_url && <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="p-2.5">
                      <span className="text-xs font-bold text-slate-700 truncate block">{m.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Paso 2: Tela (color + textura de la muestra) */}
        {step === 1 && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-black text-slate-800 mb-1">Elige la tela</h3>
              <p className="text-sm text-slate-400 mb-5">Se usará su <span className="font-bold text-slate-600">color y su textura</span> tal cual, sin colores predeterminados.</p>
              {fabrics.length === 0 ? (
                <p className="text-xs text-slate-400">No hay telas todavía. Créalas en la pestaña "Telas".</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {fabrics.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setOpenFabricId(openFabricId === f.id ? null : f.id)}
                        className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                          openFabricId === f.id || f.colors.some((c) => c.id === textureColorId)
                            ? 'bg-[#74AE2C] border-[#74AE2C] text-white'
                            : 'bg-white border-slate-100 text-slate-500 hover:border-[#74AE2C]/30'
                        }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                  {activeFabric && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                      {activeFabric.colors.map((c) => (
                        <button key={c.id} title={c.name} onClick={() => setTextureColorId(c.id)} className="flex flex-col items-center gap-1.5 group">
                          <div
                            className={`w-full aspect-square rounded-2xl overflow-hidden border-2 bg-slate-50 transition-all ${
                              textureColorId === c.id ? 'border-[#74AE2C] ring-4 ring-[#74AE2C]/10 scale-105' : 'border-slate-100 group-hover:border-slate-300'
                            }`}
                          >
                            {c.image_url && <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />}
                          </div>
                          <span className={`text-[10px] font-bold text-center leading-tight ${textureColorId === c.id ? 'text-[#74AE2C]' : 'text-slate-400'}`}>
                            {c.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {texture && (
                    <div className="flex items-center gap-2 text-[11px] font-bold text-[#74AE2C] bg-[#74AE2C]/5 rounded-xl px-3 py-2">
                      <span>Tela: {texture.fabricName} · {texture.c.name}</span>
                      <button onClick={() => setTextureColorId(null)} className="ml-auto text-slate-400 hover:text-red-500">quitar</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Paso 3: Escena */}
        {step === 2 && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-black text-slate-800 mb-1">¿Dónde lo mostramos?</h3>
              <p className="text-sm text-slate-400 mb-5">Elige el tipo de escena.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setEnvironment('salon')}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${environment === 'salon' ? 'border-[#74AE2C] bg-[#74AE2C]/5' : 'border-slate-100 hover:border-slate-300'}`}
                >
                  <span className="block text-base font-black text-slate-800">Integrar en salón</span>
                  <span className="text-xs text-slate-400">Salón realista y decorado alrededor del sofá.</span>
                </button>
                <button
                  onClick={() => setEnvironment('estudio')}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${environment === 'estudio' ? 'border-[#74AE2C] bg-[#74AE2C]/5' : 'border-slate-100 hover:border-slate-300'}`}
                >
                  <span className="block text-base font-black text-slate-800">Estudio (fondo neutro)</span>
                  <span className="text-xs text-slate-400">Foto de catálogo, fondo limpio minimalista.</span>
                </button>
              </div>
            </div>

            {environment === 'salon' && (
              <div className="border-t border-slate-100 pt-6 space-y-5">
                <div>
                  <h4 className="text-sm font-black text-slate-800 mb-3">Estilo del salón</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {STYLES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStyle(s)}
                        className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all ${style === s ? 'bg-[#74AE2C] border-[#74AE2C] text-white' : 'bg-white border-slate-100 text-slate-500 hover:border-[#74AE2C]/30'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={addDecor} onChange={(e) => setAddDecor(e.target.checked)} className="w-5 h-5 accent-[#74AE2C]" />
                  <span className="text-sm font-bold text-slate-600">Salón equipado y decorado</span>
                </label>
              </div>
            )}

            {/* Motor de IA */}
            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-sm font-black text-slate-800 mb-3">Motor de IA</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setEngine('openai')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${engine === 'openai' ? 'border-[#74AE2C] bg-[#74AE2C]/5' : 'border-slate-100 hover:border-slate-300'}`}
                >
                  <span className="block text-sm font-black text-slate-800">OpenAI · GPT Image</span>
                  <span className="text-xs text-slate-400">gpt-image-1. Buena calidad general.</span>
                </button>
                <button
                  onClick={() => geminiAvailable && setEngine('gemini')}
                  disabled={!geminiAvailable}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    engine === 'gemini' ? 'border-[#74AE2C] bg-[#74AE2C]/5' : 'border-slate-100 hover:border-slate-300'
                  } ${!geminiAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="block text-sm font-black text-slate-800">Google · Gemini</span>
                  <span className="text-xs text-slate-400">
                    {geminiAvailable ? 'gemini-2.5-flash-image. Muy fiel al producto.' : 'Falta la API key de Gemini.'}
                  </span>
                </button>
              </div>
              {!geminiAvailable && (
                <p className="text-[11px] text-amber-600 mt-2 font-medium">
                  Para activar Gemini, añade tu clave <span className="font-bold">VITE_GEMINI_API_KEY</span> en el .env y vuelve a desplegar.
                </p>
              )}

              {/* Modelo concreto de OpenAI */}
              {engine === 'openai' && (
                <div className="mt-4">
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Modelo OpenAI</label>
                  <div className="flex flex-wrap gap-2">
                    {OPENAI_IMAGE_MODELS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setOpenaiModel(m)}
                        className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${openaiModel === m ? 'bg-[#74AE2C] border-[#74AE2C] text-white' : 'bg-white border-slate-100 text-slate-500 hover:border-[#74AE2C]/30'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {openaiModel === 'gpt-image-2'
                      ? 'El más nuevo. Gestiona la fidelidad internamente (sin input_fidelity).'
                      : openaiModel === 'gpt-image-1.5'
                      ? 'Más nuevo que gpt-image-1 y mantiene la máxima fidelidad al producto.'
                      : 'Modelo base estable.'}
                  </p>
                </div>
              )}
            </div>

            {/* Formato / cantidad / velocidad */}
            <div className="border-t border-slate-100 pt-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Formato</h4>
                <div className="flex gap-2">
                  {(['1:1', '3:4'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setAspectRatio(r)}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${aspectRatio === r ? 'border-[#74AE2C] bg-[#74AE2C]/5 text-[#74AE2C]' : 'border-slate-100 text-slate-400'}`}
                    >
                      {r === '1:1' ? 'Cuadrado' : 'Vertical'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Imágenes</h4>
                <div className="flex gap-2">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => setNumImages(n)}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-black transition-all ${numImages === n ? 'border-[#74AE2C] bg-[#74AE2C]/5 text-[#74AE2C]' : 'border-slate-100 text-slate-400'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Velocidad</h4>
                <button
                  onClick={() => setFastMode((v) => !v)}
                  className={`w-full py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${fastMode ? 'border-[#74AE2C] bg-[#74AE2C]/5 text-[#74AE2C]' : 'border-slate-100 text-slate-400'}`}
                >
                  {fastMode ? 'Modo rápido: ON' : 'Modo rápido: OFF'}
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-bold border border-red-100">{error}</div>
        )}
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between gap-4 mt-6">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-5 sm:px-6 py-3 rounded-2xl border-2 border-slate-100 text-slate-400 font-bold uppercase tracking-widest text-xs disabled:opacity-40 hover:border-slate-200 transition-all"
        >
          Atrás
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => canContinue && setStep((s) => s + 1)}
            disabled={!canContinue}
            className="px-6 sm:px-8 py-3 rounded-2xl bg-[#74AE2C] text-white font-black uppercase tracking-widest text-xs disabled:bg-slate-200 disabled:text-slate-400 hover:bg-[#639626] transition-all"
          >
            Continuar
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={!model}
            className="px-6 sm:px-10 py-3 rounded-2xl bg-[#74AE2C] text-white font-black uppercase tracking-widest text-xs disabled:bg-slate-200 disabled:text-slate-400 hover:bg-[#639626] transition-all"
          >
            Generar
          </button>
        )}
      </div>
    </div>
  );
};
