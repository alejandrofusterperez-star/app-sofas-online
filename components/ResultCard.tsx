
import React, { useState } from 'react';
import { GenerationResult, AppMode } from '../types';

interface ResultCardProps {
    result: GenerationResult;
    idx: number;
    allowHiRes?: boolean;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, idx, allowHiRes = false }) => {
    const [showOriginal, setShowOriginal] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    // Lupa: nivel de zoom y punto de origen (en %) para explorar detalles.
    const [zoom, setZoom] = useState(1);
    const [origin, setOrigin] = useState({ x: 50, y: 50 });

    const openFullScreen = () => {
        setZoom(1);
        setOrigin({ x: 50, y: 50 });
        setIsFullScreen(true);
    };

    const updateOrigin = (clientX: number, clientY: number, el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
        const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
        setOrigin({ x, y });
    };

    const cycleZoom = () => setZoom((z) => (z >= 4 ? 1 : z === 1 ? 2 : z + 1));

    // Descarga en alta resolución cuadrada (2400x2400). La imagen se ajusta
    // dentro del cuadrado preservando su proporción, con relleno blanco.
    const downloadHiRes = async () => {
        const SIZE = 2400;
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
                img.src = result.url;
            });

            const canvas = document.createElement('canvas');
            canvas.width = SIZE;
            canvas.height = SIZE;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas no disponible');

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, SIZE, SIZE);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            const scale = Math.min(SIZE / img.width, SIZE / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);

            const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('No se pudo generar el archivo');

            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `ok-sofas-vision-${idx + 1}-2400x2400.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        } catch (err) {
            console.error('Error al descargar en alta resolución:', err);
        }
    };

    return (
        <>
            <div
                className={`group relative rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:shadow-[#74AE2C]/10 bg-white ${idx === 0 ? 'md:col-span-2' : ''
                    }`}
            >
                <div className="relative aspect-auto cursor-pointer" onClick={openFullScreen}>
                    <img
                        src={showOriginal ? result.originalUrl : result.url}
                        alt={`OK Sofás AI - ${idx + 1}`}
                        className={`w-full h-auto rounded-[2.5rem] transition-all duration-300 ${showOriginal ? 'brightness-90 scale-[1.01]' : 'opacity-100'}`}
                    />
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end p-10 pointer-events-none">
                    <div className="flex justify-between items-center w-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <div className="text-white">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#74AE2C]">Inspiración ${idx + 1}</p>
                            <h4 className="text-xl font-black uppercase tracking-tight">{result.mode === AppMode.INTEGRATE ? result.style || 'AI Design' : 'Estudio Color'}</h4>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={async () => {
                                    try {
                                        const response = await fetch(result.url);
                                        const blob = await response.blob();
                                        const blobUrl = URL.createObjectURL(blob);

                                        const link = document.createElement('a');
                                        link.href = blobUrl;
                                        link.download = `ok-sofas-vision-${idx + 1}.png`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);

                                        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                                    } catch (err) {
                                        console.error("Error al descargar la imagen:", err);
                                        const link = document.createElement('a');
                                        link.href = result.url;
                                        link.download = `ok-sofas-vision-${idx + 1}.png`;
                                        link.click();
                                    }
                                }}
                                className="pointer-events-auto bg-[#74AE2C] text-white px-6 py-4 rounded-2xl shadow-xl hover:bg-[#639626] transition-all flex items-center gap-3 font-black text-xs uppercase tracking-widest"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Guardar
                            </button>
                            {allowHiRes && (
                                <button
                                    onClick={downloadHiRes}
                                    title="Descargar en 2400 x 2400 px"
                                    className="pointer-events-auto bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl hover:bg-black transition-all flex items-center gap-3 font-black text-xs uppercase tracking-widest"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    2400 px
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* UI Elements relocated for better Z-Index handling */}

                {/* Label Antes/Después */}
                <div className="absolute top-6 left-6 z-30 pointer-events-none">
                    <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg backdrop-blur-md transition-all ${showOriginal ? 'bg-orange-500 text-white' : 'bg-white/90 text-slate-800'
                        }`}>
                        {showOriginal ? 'Original' : 'Resultado AI'}
                    </span>
                </div>

                {/* Botón Pantalla Completa */}
                <div className="absolute top-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <button
                        onClick={(e) => { e.stopPropagation(); openFullScreen(); }}
                        className="bg-white/90 backdrop-blur-md text-slate-800 p-2.5 rounded-full shadow-lg hover:bg-[#74AE2C] hover:text-white transition-all transform hover:scale-110"
                        title="Ver con lupa / pantalla completa"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-4.35-4.35M11 8v6M8 11h6M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                        </svg>
                    </button>
                </div>

                {/* Botón Comparar */}
                <button
                    onMouseDown={() => setShowOriginal(true)}
                    onMouseUp={() => setShowOriginal(false)}
                    onMouseLeave={() => setShowOriginal(false)}
                    onTouchStart={() => setShowOriginal(true)}
                    onTouchEnd={() => setShowOriginal(false)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-6 left-6 z-30 bg-white/20 backdrop-blur-xl border border-white/30 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all active:scale-95"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Mantén para ver antes
                </button>
            </div>

            {/* Modal Pantalla Completa */}
            {isFullScreen && (
                <div
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
                    onClick={() => setIsFullScreen(false)}
                >
                    <button
                        className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
                        onClick={() => setIsFullScreen(false)}
                    >
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div
                        className="relative w-full max-w-7xl max-h-[90vh] flex items-center justify-center overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={result.url}
                            alt="Full Screen Result"
                            onClick={cycleZoom}
                            onMouseMove={(e) => zoom > 1 && updateOrigin(e.clientX, e.clientY, e.currentTarget)}
                            onTouchMove={(e) => {
                                if (zoom > 1 && e.touches[0]) updateOrigin(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
                            }}
                            style={{
                                transform: `scale(${zoom})`,
                                transformOrigin: `${origin.x}% ${origin.y}%`,
                                transition: 'transform 0.15s ease-out',
                                cursor: zoom > 1 ? 'zoom-out' : 'zoom-in',
                            }}
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl select-none"
                            draggable={false}
                        />

                        {/* Controles de lupa */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-2 py-1.5 z-10" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => setZoom((z) => Math.max(1, z - 1))}
                                disabled={zoom <= 1}
                                className="w-9 h-9 rounded-full text-white text-xl font-black hover:bg-white/15 disabled:opacity-30 transition-colors"
                                title="Alejar"
                            >
                                −
                            </button>
                            <span className="text-white text-xs font-black tabular-nums w-10 text-center">{zoom}×</span>
                            <button
                                onClick={() => setZoom((z) => Math.min(4, z + 1))}
                                disabled={zoom >= 4}
                                className="w-9 h-9 rounded-full text-white text-xl font-black hover:bg-white/15 disabled:opacity-30 transition-colors"
                                title="Acercar (lupa)"
                            >
                                +
                            </button>
                        </div>

                        {zoom === 1 && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-[11px] font-bold uppercase tracking-widest bg-black/40 px-4 py-1.5 rounded-full pointer-events-none">
                                Haz clic o usa + para la lupa · mueve para explorar
                            </div>
                        )}

                        {/* Botón cerrar flotante inferior para móvil */}
                        <button
                            onClick={() => setIsFullScreen(false)}
                            className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-white/80 text-sm font-bold uppercase tracking-widest border border-white/30 px-6 py-2 rounded-full hover:bg-white/10 md:hidden"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
