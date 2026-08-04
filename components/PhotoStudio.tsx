import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  floodFillSelect,
  featherMask,
  applyRecolorMasked,
  buildTextureLum,
  hexToHsl,
} from '../services/recolorEngine';
import { Fabric, FabricColor } from '../types';

const MAX_EDIT = 1400; // lado máximo de la imagen de trabajo (rendimiento)
const DEFAULT_HEX = '#8A9A5B';

type Stage = 'source' | 'camera' | 'editing';

interface PhotoStudioProps {
  fabrics: Fabric[];
}

export const PhotoStudio: React.FC<PhotoStudioProps> = ({ fabrics }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Buffers de trabajo
  const originalRef = useRef<ImageData | null>(null); // foto original (nunca se modifica)
  const rawMaskRef = useRef<Uint8Array | null>(null); // máscara dura (flood fill acumulado)
  const featherRef = useRef<Uint8Array | null>(null); // máscara suavizada para render
  const dimsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const texLumRef = useRef<Float32Array | null>(null); // textura real de la tela (BD)

  const [stage, setStage] = useState<Stage>('source');
  const [selectedColor, setSelectedColor] = useState<FabricColor | null>(null);
  const [openFabric, setOpenFabric] = useState<string | null>(null);
  const [applyColor, setApplyColor] = useState(true);   // aplicar el HEX de la tela
  const [applyTexture, setApplyTexture] = useState(true); // imprimir la textura real
  const [texVersion, setTexVersion] = useState(0);      // fuerza re-render cuando la textura llega
  const [texStrength, setTexStrength] = useState(1.0);  // fuerza de imprimación de la textura
  const [tolerance, setTolerance] = useState(0.04);
  const [intensity, setIntensity] = useState(1.0);
  const [showMask, setShowMask] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const activeHex = selectedColor?.color_hex || DEFAULT_HEX;

  // ── Render de la foto con la máscara + params actuales ──
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const orig = originalRef.current;
    const feather = featherRef.current;
    if (!canvas || !orig) return;
    const { w, h } = dimsRef.current;
    // El canvas se monta al entrar en edición: aseguramos su tamaño real aquí.
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const buf = new ImageData(new Uint8ClampedArray(orig.data), w, h);

    if (feather) {
      const [th, ts] = hexToHsl(activeHex);
      const useTex = applyTexture && texLumRef.current && texLumRef.current.length === w * h;
      applyRecolorMasked(buf.data, w, h, feather, {
        targetH: th,
        targetS: ts,
        intensity,
        fabric: 'none',
        fabricAmount: 0.7,
        keepColor: !applyColor,
        highlight: showMask,
        texLum: useTex ? texLumRef.current : null,
        texAmount: useTex ? texStrength : 0,
      });
    }
    ctx.putImageData(buf, 0, 0);
  }, [activeHex, intensity, applyColor, applyTexture, showMask, texVersion, texStrength]);

  useEffect(() => {
    if (stage === 'editing') render();
  }, [render, stage]);

  // ── Construir el mapa de textura real cuando cambia la variación o la foto ──
  useEffect(() => {
    let cancelled = false;
    const { w, h } = dimsRef.current;
    if (stage !== 'editing' || !w || !h) return;
    if (!selectedColor?.image_url) {
      texLumRef.current = null;
      setTexVersion((v) => v + 1);
      return;
    }
    buildTextureLum(selectedColor.image_url, w, h).then((lum) => {
      if (cancelled) return;
      texLumRef.current = lum;
      setTexVersion((v) => v + 1);
    });
    return () => { cancelled = true; };
  }, [selectedColor, stage, hasSelection]);

  // ── Cargar una foto (subida o capturada) al buffer de trabajo ──
  const loadPhoto = useCallback((source: HTMLImageElement | HTMLVideoElement, sw: number, sh: number) => {
    const scale = Math.min(1, MAX_EDIT / Math.max(sw, sh));
    const w = Math.round(sw * scale);
    const h = Math.round(sh * scale);

    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext('2d', { willReadFrequently: true });
    if (!tctx) return;
    tctx.drawImage(source, 0, 0, w, h);

    const img = tctx.getImageData(0, 0, w, h);
    originalRef.current = img;
    rawMaskRef.current = new Uint8Array(w * h);
    featherRef.current = null;
    dimsRef.current = { w, h };
    setSelectedColor(null);
    texLumRef.current = null;
    setHasSelection(false);
    setStage('editing');
    // El canvas de edición se monta al cambiar de fase; el efecto de 'editing' lo
    // dimensiona y pinta (aquí todavía no existe en el DOM).
  }, []);

  // ── Cámara ──
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraReady(false);
    setStage('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err) {
      console.error(err);
      setCameraError('No se pudo acceder a la cámara. Revisa los permisos y que sea HTTPS.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const takePhoto = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    loadPhoto(v, v.videoWidth, v.videoHeight);
    stopCamera();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => loadPhoto(img, img.naturalWidth, img.naturalHeight);
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // ── Detección: tocar el sofá ──
  const handleTap = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const orig = originalRef.current;
    const rawMask = rawMaskRef.current;
    if (!canvas || !orig || !rawMask) return;
    const { w, h } = dimsRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * w;
    const y = ((e.clientY - rect.top) / rect.height) * h;

    floodFillSelect(orig.data, w, h, x, y, tolerance, rawMask);
    featherRef.current = featherMask(rawMask, w, h, 2);
    setHasSelection(true);
    render();
  };

  const clearSelection = () => {
    const { w, h } = dimsRef.current;
    rawMaskRef.current = new Uint8Array(w * h);
    featherRef.current = null;
    setHasSelection(false);
    render();
  };

  const newPhoto = () => {
    originalRef.current = null;
    rawMaskRef.current = null;
    featherRef.current = null;
    setHasSelection(false);
    setStage('source');
  };

  const download = () => {
    const canvas = canvasRef.current;
    const orig = originalRef.current;
    const feather = featherRef.current;
    if (!canvas || !orig) return;
    // Render final SIN el highlight de selección
    const { w, h } = dimsRef.current;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    const buf = new ImageData(new Uint8ClampedArray(orig.data), w, h);
    if (feather) {
      const [th, ts] = hexToHsl(activeHex);
      const useTex = applyTexture && texLumRef.current && texLumRef.current.length === w * h;
      applyRecolorMasked(buf.data, w, h, feather, {
        targetH: th, targetS: ts, intensity, fabric: 'none', fabricAmount: 0.7,
        keepColor: !applyColor, highlight: false,
        texLum: useTex ? texLumRef.current : null,
        texAmount: useTex ? texStrength : 0,
      });
    }
    ctx.putImageData(buf, 0, 0);
    const a = document.createElement('a');
    a.href = out.toDataURL('image/jpeg', 0.92);
    a.download = `oksofas-foto-${Math.floor(performance.now())}.jpg`;
    a.click();
  };

  return (
    <div className="bg-white rounded-3xl sm:rounded-[2rem] p-5 sm:p-7 border border-slate-100 shadow-xl shadow-slate-200/50">
      <div className="mb-5">
        <span className="text-[#74AE2C] text-[10px] font-black uppercase tracking-[0.3em] block mb-1">
          Beta · Foto
        </span>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
          Editor de sofá sobre foto
        </h3>
      </div>

      {/* Paso 1: elegir fuente */}
      {stage === 'source' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={startCamera}
            className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#74AE2C] hover:bg-[#F8FAF5] transition-all"
          >
            <div className="w-14 h-14 bg-[#74AE2C]/10 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-[#74AE2C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-sm font-black text-slate-700 uppercase tracking-tight">Hacer foto</span>
            <span className="text-xs text-slate-400 text-center">Usa la cámara del móvil</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#74AE2C] hover:bg-[#F8FAF5] transition-all"
          >
            <div className="w-14 h-14 bg-[#74AE2C]/10 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-[#74AE2C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 6h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
              </svg>
            </div>
            <span className="text-sm font-black text-slate-700 uppercase tracking-tight">Subir foto</span>
            <span className="text-xs text-slate-400 text-center">Desde tu galería</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFile} accept="image/*" className="hidden" />
        </div>
      )}

      {/* Paso 2: cámara en vivo para capturar */}
      {stage === 'camera' && (
        <div>
          <div className="relative rounded-[1.5rem] overflow-hidden bg-slate-900 aspect-[3/4] sm:aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                <p className="text-white/80 text-sm font-medium">{cameraError}</p>
              </div>
            )}
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={takePhoto}
              disabled={!cameraReady}
              className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all ${cameraReady ? 'bg-[#74AE2C] hover:bg-[#639626]' : 'bg-slate-200'}`}
            >
              📸 Capturar
            </button>
            <button
              onClick={() => { stopCamera(); setStage('source'); }}
              className="px-5 py-4 rounded-2xl bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: edición sobre la foto */}
      {stage === 'editing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <div className="relative rounded-[1.5rem] overflow-hidden bg-slate-100">
              <canvas ref={canvasRef} onClick={handleTap} className="w-full h-auto cursor-crosshair block" />
              {!hasSelection && (
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
                  <p className="text-white text-sm font-bold text-center">
                    👆 Toca el sofá para detectarlo (toca varias zonas si hace falta)
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={download}
                disabled={!hasSelection}
                className={`flex-1 min-w-[140px] py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all ${hasSelection ? 'bg-[#74AE2C] hover:bg-[#639626] shadow-lg shadow-[#74AE2C]/30' : 'bg-slate-200'}`}
              >
                Descargar
              </button>
              <button onClick={clearSelection} className="px-5 py-4 rounded-2xl bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-100">
                Borrar selección
              </button>
              <button onClick={newPhoto} className="px-5 py-4 rounded-2xl bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-100">
                Otra foto
              </button>
            </div>
          </div>

          {/* Controles */}
          <div className="lg:col-span-5 space-y-6">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-bold text-slate-800">Ver selección</span>
              <button
                onClick={() => setShowMask((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-all ${showMask ? 'bg-[#74AE2C]' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${showMask ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </label>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Precisión del toque</span>
                <span className="text-xs font-bold text-slate-400">{Math.round((tolerance / 0.12) * 100)}%</span>
              </div>
              <input type="range" min={0.012} max={0.12} step={0.002} value={tolerance}
                onChange={(e) => setTolerance(parseFloat(e.target.value))} className="w-full accent-[#74AE2C]" />
              <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                Aplica al SIGUIENTE toque. Súbelo si no coge bien el sofá; bájalo si se sale al fondo. Luego vuelve a tocar.
              </p>
            </div>

            {/* Telas de la base de datos */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                Tela {selectedColor && <span className="text-slate-600 normal-case">· {selectedColor.name} {selectedColor.color_hex}</span>}
              </p>
              {fabrics.length === 0 ? (
                <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-50 rounded-xl p-3">
                  No hay telas en la biblioteca todavía. Añádelas en la pestaña <b>Telas</b> (cada variación necesita su imagen y su HEX de color).
                </p>
              ) : (
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {fabrics.map((f) => {
                    const open = openFabric === f.id;
                    return (
                      <div key={f.id} className="border border-slate-100 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setOpenFabric(open ? null : f.id)}
                          className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-all"
                        >
                          <span className="text-xs font-bold text-slate-600">{f.name}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-2">
                            {f.colors.length} colores
                            <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </span>
                        </button>
                        {open && (
                          <div className="grid grid-cols-5 gap-2 p-2.5">
                            {f.colors.map((c) => {
                              const active = selectedColor?.id === c.id;
                              return (
                                <button
                                  key={c.id}
                                  onClick={() => setSelectedColor(active ? null : c)}
                                  title={`${c.name}${c.color_hex ? ' · ' + c.color_hex : ''}`}
                                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${active ? 'border-[#74AE2C] scale-105 shadow-md' : 'border-white hover:border-slate-200'}`}
                                  style={{ backgroundColor: c.color_hex || '#ddd' }}
                                >
                                  {c.image_url && (
                                    <img src={c.image_url} alt={c.name} loading="lazy" decoding="async"
                                      className="w-full h-full object-cover" />
                                  )}
                                  {active && (
                                    <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                            {f.colors.length === 0 && (
                              <span className="col-span-5 text-[10px] text-slate-300">sin variaciones</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Qué aplicar de la tela */}
            <div className="flex gap-2">
              <button
                onClick={() => setApplyColor((v) => !v)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${applyColor ? 'bg-[#74AE2C] text-white shadow-sm' : 'bg-slate-50 text-slate-400'}`}
              >
                Color {applyColor ? '✓' : ''}
              </button>
              <button
                onClick={() => setApplyTexture((v) => !v)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${applyTexture ? 'bg-[#74AE2C] text-white shadow-sm' : 'bg-slate-50 text-slate-400'}`}
              >
                Textura {applyTexture ? '✓' : ''}
              </button>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Intensidad color</span>
                <span className="text-xs font-bold text-slate-400">{Math.round(intensity * 100)}%</span>
              </div>
              <input type="range" min={0.2} max={1} step={0.05} value={intensity}
                onChange={(e) => setIntensity(parseFloat(e.target.value))} className="w-full accent-[#74AE2C]" />
            </div>

            {applyTexture && selectedColor?.image_url && (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">Fuerza textura</span>
                  <span className="text-xs font-bold text-slate-400">{Math.round(texStrength * 100)}%</span>
                </div>
                <input type="range" min={0} max={2} step={0.05} value={texStrength}
                  onChange={(e) => setTexStrength(parseFloat(e.target.value))} className="w-full accent-[#74AE2C]" />
              </div>
            )}

            <div className="bg-[#F8FAF5] rounded-2xl p-4 border border-[#74AE2C]/10">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                <span className="font-bold text-[#74AE2C]">Cómo va:</span> toca el sofá (asiento, respaldo
                y brazos por separado) para detectarlo, luego elige una tela de la biblioteca: se aplica su
                <b> color (HEX)</b> y su <b>textura real</b>. Usa <b>Ver selección</b> para comprobar la máscara.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
