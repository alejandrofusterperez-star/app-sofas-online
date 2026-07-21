
import React from 'react';

interface WhatsNewProps {
  onClose: () => void;
}

export const WhatsNew: React.FC<WhatsNewProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-3xl sm:rounded-[2rem] shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-400"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur text-slate-500 hover:bg-white hover:text-slate-800 shadow-md transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Vídeo demostrativo (vertical) */}
        <div className="bg-[#F8FAF5] border-b border-slate-100 flex justify-center py-4 sm:py-6">
          <video
            className="h-[240px] sm:h-[320px] w-auto rounded-2xl shadow-lg shadow-slate-300/60 ring-1 ring-slate-200"
            src="/whats-new-telas.mp4"
            autoPlay
            loop
            muted
            playsInline
          />
        </div>

        {/* Contenido */}
        <div className="p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 bg-[#74AE2C]/10 text-[#74AE2C] text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-[#74AE2C] rounded-full animate-pulse"></span>
            Nuevo módulo
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-3">
            ¡Ahora también puedes cambiar la tela! 🧵
          </h2>

          <p className="text-sm text-slate-500 font-medium leading-relaxed mb-5">
            En el modo <span className="font-bold text-slate-700">Cambiar Color</span> hemos
            añadido un nuevo control para que elijas <span className="font-bold text-slate-700">qué quieres cambiar</span>:
          </p>

          <ul className="space-y-3 mb-6">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md bg-[#74AE2C] flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span className="text-sm text-slate-600">
                <span className="font-bold">Solo el color</span> — conserva la tela actual y cámbiale el tono.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md bg-[#74AE2C] flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span className="text-sm text-slate-600">
                <span className="font-bold">Solo la tela</span> — mantén el color y prueba terciopelo, lino, pana, piel...
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md bg-[#74AE2C] flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span className="text-sm text-slate-600">
                <span className="font-bold">Ambos a la vez</span> — color + material en una sola visualización.
              </span>
            </li>
          </ul>

          <button
            onClick={onClose}
            className="w-full bg-[#74AE2C] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#74AE2C]/20 hover:bg-[#639626] hover:-translate-y-0.5 transition-all active:scale-95"
          >
            ¡Entendido, probemos!
          </button>
        </div>
      </div>
    </div>
  );
};
