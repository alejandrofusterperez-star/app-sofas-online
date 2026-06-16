
import React, { useState, useRef } from 'react';
import { Layout } from './components/Layout';
import { StyleSelector } from './components/StyleSelector';
import { InteriorStyle, Lighting, VisualizationConfig, GenerationResult, AppMode } from './types';
import { processSofaImage } from './services/openaiService';
import { Login } from './components/Login';
import { ResultCard } from './components/ResultCard';
import { WhatsNew } from './components/WhatsNew';

// Cambia esta clave cada vez que anuncies una novedad para volver a mostrar el modal.
const WHATS_NEW_KEY = 'oksofas_whatsnew_telas_v1';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [mode, setMode] = useState<AppMode>(AppMode.INTEGRATE);
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [config, setConfig] = useState<VisualizationConfig>({
    style: InteriorStyle.MINIMALIST,
    wallColor: '#ffffff',
    lighting: Lighting.NATURAL,
    flooring: 'Roble Claro',
    targetSofaColor: 'Verde OK',
    changeColor: true,
    changeFabric: false,
    targetFabric: 'Chenilla',
    addDecor: true
  });
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onload = (event) => {
        setBaseImage(event.target?.result as string);
        setResults([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!baseImage) return;

    setIsGenerating(true);
    setError(null);
    setResults([]);

    try {
      const promises = [
        processSofaImage(baseImage, mimeType, config, mode),
        processSofaImage(baseImage, mimeType, {
          ...config,
          lighting: mode === AppMode.INTEGRATE ? Lighting.WARM : config.lighting,
          style: mode === AppMode.INTEGRATE ? InteriorStyle.SCANDINAVIAN : config.style
        }, mode),
        processSofaImage(baseImage, mimeType, {
          ...config,
          wallColor: mode === AppMode.INTEGRATE ? 'Gris Suave' : config.wallColor,
          flooring: mode === AppMode.INTEGRATE ? 'Nogal Oscuro' : config.flooring
        }, mode),
      ];

      const responses = await Promise.all(promises);

      const validResults: GenerationResult[] = responses
        .filter((res): res is { generatedUrl: string, processedInputUrl: string } => res !== null)
        .map((res, idx) => ({
          id: `res-${idx}-${Date.now()}`,
          url: res.generatedUrl,
          originalUrl: res.processedInputUrl, // Use the PADDED/PROCESSED input image
          style: config.style,
          mode
        }));

      setResults(validResults);
    } catch (err) {
      setError("Ha ocurrido un error al conectar con nuestro diseñador virtual. Inténtalo de nuevo.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    try {
      if (!localStorage.getItem(WHATS_NEW_KEY)) {
        setShowWhatsNew(true);
      }
    } catch {
      setShowWhatsNew(true);
    }
  };

  const closeWhatsNew = () => {
    setShowWhatsNew(false);
    try {
      localStorage.setItem(WHATS_NEW_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout>
      {showWhatsNew && <WhatsNew onClose={closeWhatsNew} />}
      <div className="max-w-7xl mx-auto px-4 py-8 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* Columna Izquierda - Controles */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[2rem] p-7 border border-slate-100 shadow-xl shadow-slate-200/50">
              <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-8">
                <button
                  onClick={() => { setMode(AppMode.INTEGRATE); setResults([]); }}
                  className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all duration-300 ${mode === AppMode.INTEGRATE ? 'bg-white shadow-md text-[#74AE2C]' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  INTEGRAR SOFÁ
                </button>
                <button
                  onClick={() => { setMode(AppMode.MATTRESS); setResults([]); }}
                  className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all duration-300 ${mode === AppMode.MATTRESS ? 'bg-white shadow-md text-[#74AE2C]' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  INTEGRAR COLCHÓN
                </button>
                <button
                  onClick={() => { setMode(AppMode.COLOR_CHANGE); setResults([]); }}
                  className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all duration-300 ${mode === AppMode.COLOR_CHANGE ? 'bg-white shadow-md text-[#74AE2C]' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  CAMBIAR COLOR
                </button>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#74AE2C] rounded-full"></div>
                  {mode === AppMode.MATTRESS ? 'Tu colchón actual' : 'Tu sofá actual'}
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-[2rem] p-5 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group ${baseImage ? 'border-[#74AE2C]/30 bg-[#74AE2C]/5' : 'border-slate-200 hover:border-[#74AE2C] hover:bg-[#F8FAF5]'
                    }`}
                >
                  {baseImage ? (
                    <div className="relative w-full">
                      <img src={baseImage} alt="Mueble" className="w-full aspect-video object-cover rounded-2xl shadow-sm" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-2xl transition-opacity">
                        <span className="bg-white/90 text-[#74AE2C] px-4 py-2 rounded-full text-xs font-bold shadow-lg">Cambiar Foto</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                        <svg className="w-6 h-6 text-[#74AE2C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-700 uppercase tracking-tight">Subir Imagen</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {mode === AppMode.MATTRESS ? 'Sube una foto clara de tu colchón' : 'Sube una foto clara de tu sofá'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              </div>

              <StyleSelector config={config} onChange={setConfig} disabled={isGenerating} mode={mode} />

              <button
                disabled={!baseImage || isGenerating}
                onClick={handleProcess}
                className={`w-full mt-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest text-white shadow-xl transition-all transform active:scale-95 ${!baseImage || isGenerating
                  ? 'bg-slate-200 cursor-not-allowed text-slate-400'
                  : 'bg-[#74AE2C] hover:bg-[#639626] shadow-[#74AE2C]/30 hover:shadow-[#74AE2C]/40 -translate-y-0.5'
                  }`}
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Estamos diseñando...
                  </div>
                ) : (
                  mode === AppMode.INTEGRATE ? 'Visualizar en mi salón' :
                    mode === AppMode.MATTRESS ? 'Visualizar en mi habitación' : 'Ver con nuevo tapizado'
                )}
              </button>

              {error && (
                <div className="mt-5 flex gap-3 items-center p-4 rounded-2xl bg-red-50 text-red-600 text-xs font-bold border border-red-100">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha - Resultados */}
          <div className="lg:col-span-8">
            {!isGenerating && results.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center min-h-[600px] border-2 border-dashed border-slate-100 rounded-[3rem] bg-white/50 p-12 text-center animate-in fade-in zoom-in-95 duration-700">
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-10 shadow-2xl shadow-[#74AE2C]/10 border border-[#74AE2C]/5">
                  <svg className="w-14 h-14 text-[#74AE2C]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <h3 className="text-3xl font-black text-slate-800 mb-4 tracking-tight uppercase">Tu hogar, a tu medida</h3>
                <p className="text-slate-400 max-w-md leading-relaxed font-medium">
                  Usa nuestra Inteligencia Artificial para ver cómo quedaría cualquiera de nuestros {mode === AppMode.MATTRESS ? 'colchones' : 'sofás'} en el {mode === AppMode.MATTRESS ? 'dormitorio' : 'salón'} de tus sueños.
                </p>
                <div className="mt-12 grid grid-cols-3 gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#74AE2C]/10 flex items-center justify-center text-[#74AE2C] text-sm font-black">1</div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sube tu foto</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#74AE2C]/10 flex items-center justify-center text-[#74AE2C] text-sm font-black">2</div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personaliza</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#74AE2C]/10 flex items-center justify-center text-[#74AE2C] text-sm font-black">3</div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sorpréndete</span>
                  </div>
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="h-full flex flex-col items-center justify-center min-h-[600px] bg-white rounded-[3rem] border border-slate-50 shadow-2xl shadow-[#74AE2C]/5 p-12 text-center">
                <div className="space-y-10 max-w-sm">
                  <div className="relative mx-auto w-32 h-32">
                    <div className="absolute inset-0 border-8 border-[#74AE2C]/5 rounded-full"></div>
                    <div className="absolute inset-0 border-8 border-[#74AE2C] rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src="https://oksofas.es/wp-content/uploads/2025/01/oksofas-logo-png.png.webp" alt="Loading" className="w-12 h-auto opacity-30 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Creando magia...</h3>
                    <p className="text-slate-400 font-medium italic leading-relaxed">
                      "Estamos combinando materiales reales y texturas premium para que tu {mode === AppMode.MATTRESS ? 'dormitorio' : 'salón'} sea perfecto"
                    </p>
                  </div>
                </div>
              </div>
            )}

            {results.length > 0 && !isGenerating && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 pb-8">
                  <div>
                    <span className="text-[#74AE2C] text-xs font-black uppercase tracking-[0.3em] block mb-2">Diseño Finalizado</span>
                    <h3 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">
                      {mode === AppMode.INTEGRATE ? 'Nuestras Propuestas' : 'Nuevos Acabados'}
                    </h3>
                  </div>
                  <div className="flex gap-3">
                    <span className="px-5 py-2.5 bg-[#74AE2C] text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-[#74AE2C]/20">
                      {mode === AppMode.INTEGRATE ? config.style : config.targetSofaColor}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {results.map((result, idx) => (
                    <ResultCard key={result.id} result={result} idx={idx} />
                  ))}
                </div>

                <div className="flex justify-center pt-10 pb-20">
                  <button
                    onClick={() => { setResults([]); setBaseImage(null); }}
                    className="px-8 py-4 bg-white border-2 border-slate-100 rounded-[2rem] text-slate-400 font-bold uppercase tracking-widest text-xs hover:border-[#74AE2C] hover:text-[#74AE2C] transition-all shadow-sm"
                  >
                    Probar otro modelo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
