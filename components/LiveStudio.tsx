import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  processImageData,
  hexToHsl,
  rgbToChroma,
  RecolorParams,
} from '../services/recolorEngine';

// Paleta de colores (alineada con StyleSelector)
const SOFA_COLORS = [
  { name: 'Verde OK', value: '#74AE2C' },
  { name: 'Azul Real', value: '#1E3A8A' },
  { name: 'Burdeos', value: '#7F1D1D' },
  { name: 'Gris Antracita', value: '#374151' },
  { name: 'Taupe', value: '#8B8589' },
  { name: 'Verde Salvia', value: '#8A9A5B' },
  { name: 'Mostaza Tierra', value: '#D97706' },
  { name: 'Rosa Arcilla', value: '#D4A5A5' },
  { name: 'Beige Lino', value: '#E3D9C6' },
  { name: 'Crema', value: '#F3E5AB' },
  { name: 'Cuero Natural', value: '#92400E' },
  { name: 'Negro', value: '#1C1C1C' },
];

const FABRICS = [
  { id: 'none', name: 'Original' },
  { id: 'lino', name: 'Lino' },
  { id: 'terciopelo', name: 'Terciopelo' },
  { id: 'pana', name: 'Pana' },
  { id: 'boucle', name: 'Bouclé' },
  { id: 'algodon', name: 'Algodón' },
  { id: 'piel', name: 'Piel / Cuero' },
];

const PROC_MAX_W = 640; // resolución de procesado en vivo (rendimiento)

export const LiveStudio: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const workRef = useRef<HTMLCanvasElement | null>(null);

  // Referencia de croma del sofá (lo que el usuario ha tocado). null = sin selección aún.
  const refChromaRef = useRef<{ cr: number; cg: number } | null>(null);
  // Params vivos (en ref para que el loop siempre lea lo último sin recrear el rAF)
  const paramsRef = useRef({
    colorHex: SOFA_COLORS[0].value,
    fabric: 'none',
    threshold: 0.045,
    intensity: 0.9,
    fabricAmount: 0.7,
    changeColor: true,
  });

  const [color, setColor] = useState(SOFA_COLORS[0].value);
  const [fabric, setFabric] = useState('none');
  const [threshold, setThreshold] = useState(0.045);
  const [intensity, setIntensity] = useState(0.9);
  const [changeColor, setChangeColor] = useState(true);
  const [hasSelection, setHasSelection] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [capture, setCapture] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Mantener paramsRef sincronizado con el estado
  useEffect(() => {
    paramsRef.current = {
      colorHex: color,
      fabric,
      threshold,
      intensity,
      fabricAmount: 0.7,
      changeColor,
    };
  }, [color, fabric, threshold, intensity, changeColor]);

  const buildParams = useCallback((): RecolorParams | null => {
    const ref = refChromaRef.current;
    if (!ref) return null;
    const p = paramsRef.current;
    const [h, s] = hexToHsl(p.colorHex);
    return {
      refCr: ref.cr,
      refCg: ref.cg,
      threshold: p.threshold,
      targetH: h,
      targetS: s,
      intensity: p.intensity,
      fabric: p.fabric,
      fabricAmount: p.fabricAmount,
      keepColor: !p.changeColor,
    };
  }, []);

  // Arranca la cámara
  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    setCameraError(null);
    setReady(false);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      }
    } catch (err: any) {
      console.error('Error cámara:', err);
      setCameraError(
        'No se pudo acceder a la cámara. Revisa los permisos del navegador (y que la web esté en HTTPS).'
      );
    }
  }, []);

  useEffect(() => {
    startCamera(facing);
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  // Bucle de render en tiempo real
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (!workRef.current) workRef.current = document.createElement('canvas');
    const work = workRef.current;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      if (!video.videoWidth || video.paused) return;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const scale = Math.min(1, PROC_MAX_W / vw);
      const pw = Math.round(vw * scale);
      const ph = Math.round(vh * scale);

      if (work.width !== pw || work.height !== ph) {
        work.width = pw;
        work.height = ph;
        canvas.width = pw;
        canvas.height = ph;
      }

      const wctx = work.getContext('2d', { willReadFrequently: true });
      const dctx = canvas.getContext('2d');
      if (!wctx || !dctx) return;

      wctx.drawImage(video, 0, 0, pw, ph);
      const params = buildParams();
      if (params) {
        const imgData = wctx.getImageData(0, 0, pw, ph);
        processImageData(imgData.data, pw, ph, params);
        dctx.putImageData(imgData, 0, 0);
      } else {
        // Sin selección: muestra el vídeo tal cual
        dctx.drawImage(work, 0, 0);
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [buildParams, ready]);

  // Toca el sofá para fijar su color de referencia
  const handlePick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const work = workRef.current;
    if (!canvas || !work) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * work.width);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * work.height);
    const wctx = work.getContext('2d', { willReadFrequently: true });
    if (!wctx) return;
    // Promedia una pequeña zona alrededor del toque para robustez
    const R = 4;
    const sx = Math.max(0, x - R);
    const sy = Math.max(0, y - R);
    const sw = Math.min(work.width - sx, R * 2);
    const sh = Math.min(work.height - sy, R * 2);
    const d = wctx.getImageData(sx, sy, sw, sh).data;
    let tr = 0, tg = 0, tb = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      tr += d[i]; tg += d[i + 1]; tb += d[i + 2]; n++;
    }
    if (n === 0) return;
    const [cr, cg] = rgbToChroma(tr / n, tg / n, tb / n);
    refChromaRef.current = { cr, cg };
    setHasSelection(true);
  };

  // Captura la imagen actual a resolución completa
  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const full = document.createElement('canvas');
    full.width = video.videoWidth;
    full.height = video.videoHeight;
    const ctx = full.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, full.width, full.height);
    const params = buildParams();
    if (params) {
      const img = ctx.getImageData(0, 0, full.width, full.height);
      processImageData(img.data, full.width, full.height, params);
      ctx.putImageData(img, 0, 0);
    }
    setCapture(full.toDataURL('image/jpeg', 0.92));
  };

  const downloadCapture = () => {
    if (!capture) return;
    const a = document.createElement('a');
    a.href = capture;
    a.download = `oksofas-live-${Date.now()}.jpg`;
    a.click();
  };

  const resetSelection = () => {
    refChromaRef.current = null;
    setHasSelection(false);
  };

  return (
    <div className="bg-white rounded-[2rem] p-5 sm:p-7 border border-slate-100 shadow-xl shadow-slate-200/50">
      <div className="flex items-center justify-between mb-5">
        <div>
          <span className="text-[#74AE2C] text-[10px] font-black uppercase tracking-[0.3em] block mb-1">
            Beta · En vivo
          </span>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
            Estudio en tiempo real
          </h3>
        </div>
        <button
          onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
          className="px-4 py-2.5 rounded-2xl bg-slate-50 text-slate-500 text-xs font-bold hover:bg-slate-100 transition-all flex items-center gap-2"
          title="Cambiar cámara"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Girar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Vídeo / Canvas */}
        <div className="lg:col-span-7">
          <div className="relative rounded-[1.5rem] overflow-hidden bg-slate-900 aspect-[3/4] sm:aspect-video">
            <video ref={videoRef} className="hidden" playsInline muted />
            <canvas
              ref={canvasRef}
              onClick={handlePick}
              className="w-full h-full object-cover cursor-crosshair"
            />

            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center p-8 text-center bg-slate-900">
                <p className="text-white/80 text-sm font-medium leading-relaxed">{cameraError}</p>
              </div>
            )}

            {!cameraError && !hasSelection && ready && (
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
                <p className="text-white text-sm font-bold text-center flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 text-[#74AE2C]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  Toca el sofá para empezar
                </p>
              </div>
            )}

            {!ready && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                <div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCapture}
              disabled={!hasSelection}
              className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all active:scale-95 ${
                hasSelection ? 'bg-[#74AE2C] hover:bg-[#639626] shadow-lg shadow-[#74AE2C]/30' : 'bg-slate-200 cursor-not-allowed'
              }`}
            >
              📸 Capturar
            </button>
            {hasSelection && (
              <button
                onClick={resetSelection}
                className="px-5 py-4 rounded-2xl bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Reiniciar
              </button>
            )}
          </div>
        </div>

        {/* Controles */}
        <div className="lg:col-span-5 space-y-6">
          {/* Cambiar color on/off */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-bold text-slate-800">Cambiar color</span>
            <button
              onClick={() => setChangeColor((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-all ${changeColor ? 'bg-[#74AE2C]' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${changeColor ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </label>

          {changeColor && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Color</p>
              <div className="grid grid-cols-6 gap-2">
                {SOFA_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    title={c.name}
                    className={`aspect-square rounded-xl border-2 transition-all ${
                      color === c.value ? 'border-[#74AE2C] scale-110 shadow-md' : 'border-white'
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tela */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Tela</p>
            <div className="flex flex-wrap gap-2">
              {FABRICS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFabric(f.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    fabric === f.id
                      ? 'bg-[#74AE2C] text-white shadow-md shadow-[#74AE2C]/20'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          {/* Sensibilidad */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Sensibilidad</span>
              <span className="text-xs font-bold text-slate-400">{Math.round((threshold / 0.09) * 100)}%</span>
            </div>
            <input
              type="range" min={0.012} max={0.09} step={0.002}
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-[#74AE2C]"
            />
            <p className="text-[11px] text-slate-400 mt-1 leading-tight">
              Sube si no coge todo el sofá; baja si "mancha" el fondo.
            </p>
          </div>

          {/* Intensidad */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Intensidad</span>
              <span className="text-xs font-bold text-slate-400">{Math.round(intensity * 100)}%</span>
            </div>
            <input
              type="range" min={0.2} max={1} step={0.05}
              value={intensity}
              onChange={(e) => setIntensity(parseFloat(e.target.value))}
              className="w-full accent-[#74AE2C]"
            />
          </div>

          <div className="bg-[#F8FAF5] rounded-2xl p-4 border border-[#74AE2C]/10">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <span className="font-bold text-[#74AE2C]">Consejo:</span> apunta a un sofá bien
              iluminado y de color uniforme. Toca sobre el tapizado; ajusta la sensibilidad
              hasta que el color solo afecte al sofá.
            </p>
          </div>
        </div>
      </div>

      {/* Modal de captura */}
      {capture && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setCapture(null)}>
          <div className="bg-white rounded-[2rem] p-5 max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={capture} alt="Captura" className="w-full rounded-2xl mb-4" />
            <div className="flex gap-3">
              <button
                onClick={downloadCapture}
                className="flex-1 py-4 rounded-2xl bg-[#74AE2C] text-white font-black text-xs uppercase tracking-widest hover:bg-[#639626] transition-all"
              >
                Descargar
              </button>
              <button
                onClick={() => setCapture(null)}
                className="px-6 py-4 rounded-2xl bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
