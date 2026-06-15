
import React from 'react';
import { InteriorStyle, Lighting, VisualizationConfig, AppMode } from '../types';

interface StyleSelectorProps {
  config: VisualizationConfig;
  onChange: (config: VisualizationConfig) => void;
  disabled?: boolean;
  mode: AppMode;
}

const styles = Object.values(InteriorStyle);
const lightingOptions = Object.values(Lighting);

// ... (wallColors and sofaColors omitted for brevity in search but kept in file)
const wallColors = [
  { name: 'Blanco Lino', value: '#F9F9F7' },
  { name: 'Greige Pinterest', value: '#B0ADA3' },
  { name: 'Beige Arena', value: '#F5F5DC' },
  { name: 'Gris Suave', value: '#E5E7EB' },
  { name: 'Verde Salvia', value: '#A7BCB9' },
  { name: 'Verde Eucalipto', value: '#5F8575' },
  { name: 'Terracota', value: '#C6715E' },
  { name: 'Arena Desierto', value: '#EDC9AF' },
];

const sofaColors = [
  { name: 'Crema Pinterest', value: '#F3E5AB' },
  { name: 'Beige Lino', value: '#E3D9C6' },
  { name: 'Taupe', value: '#8B8589' },
  { name: 'Verde Salvia', value: '#8A9A5B' },
  { name: 'Gris Antracita', value: '#374151' },
  { name: 'Cuero Natural', value: '#92400E' },
  { name: 'Mostaza Tierra', value: '#D97706' },
  { name: 'Rosa Arcilla', value: '#D4A5A5' },
  { name: 'Verde OK', value: '#74AE2C' },
  { name: 'Azul Real', value: '#1E3A8A' },
  { name: 'Burdeos', value: '#7F1D1D' },
];

export const StyleSelector: React.FC<StyleSelectorProps> = ({ config, onChange, disabled, mode }) => {
  const commonHeader = (title: string) => (
    <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
      <div className="w-1.5 h-1.5 bg-[#74AE2C] rounded-full"></div>
      {title}
    </label>
  );


  if (mode === AppMode.COLOR_CHANGE) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          {commonHeader('Elige el nuevo tapizado')}
          <div className="grid grid-cols-4 gap-4">
            {sofaColors.map((color) => (
              <button
                key={color.name}
                title={color.name}
                onClick={() => onChange({ ...config, targetSofaColor: color.name })}
                disabled={disabled}
                className="flex flex-col items-center gap-2 group outline-none"
              >
                <div
                  className={`w-full aspect-square rounded-2xl border-2 transition-all duration-300 ${config.targetSofaColor === color.name
                    ? 'border-[#74AE2C] ring-4 ring-[#74AE2C]/10 scale-105'
                    : 'border-slate-100 group-hover:border-slate-300'
                    }`}
                  style={{ backgroundColor: color.value }}
                />
                <span className={`text-[10px] font-bold text-center leading-tight transition-colors ${config.targetSofaColor === color.name ? 'text-[#74AE2C]' : 'text-slate-400'
                  }`}>
                  {color.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-6">
          {commonHeader('Formato de imagen')}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onChange({ ...config, aspectRatio: '1:1' })}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${config.aspectRatio !== '3:4'
                ? 'border-[#74AE2C] bg-[#74AE2C]/5 text-[#74AE2C]'
                : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}
            >
              <div className="w-4 h-4 border-2 border-current rounded-sm"></div>
              <span className="text-xs font-bold">Cuadrado (1:1)</span>
            </button>
            <button
              onClick={() => onChange({ ...config, aspectRatio: '3:4' })}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${config.aspectRatio === '3:4'
                ? 'border-[#74AE2C] bg-[#74AE2C]/5 text-[#74AE2C]'
                : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}
            >
              <div className="w-3 h-4 border-2 border-current rounded-sm"></div>
              <span className="text-xs font-bold">Vertical (A4)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        {commonHeader('Estilo del ambiente')}
        <div className="grid grid-cols-2 gap-2">
          {styles.map((style) => (
            <button
              key={style}
              onClick={() => onChange({ ...config, style })}
              disabled={disabled}
              className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all ${config.style === style
                ? 'bg-[#74AE2C] border-[#74AE2C] text-white shadow-lg shadow-[#74AE2C]/20'
                : 'bg-white border-slate-100 text-slate-500 hover:border-[#74AE2C]/30'
                }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      <div>
        {commonHeader('Color de paredes')}
        <div className="flex flex-wrap gap-3">
          {wallColors.map((color) => (
            <button
              key={color.name}
              title={color.name}
              onClick={() => onChange({ ...config, wallColor: color.name })}
              disabled={disabled}
              className={`w-9 h-9 rounded-full border-2 transition-all ${config.wallColor === color.name ? 'scale-110 border-[#74AE2C] ring-4 ring-[#74AE2C]/10 shadow-md' : 'border-white shadow-sm hover:border-slate-200'
                }`}
              style={{ backgroundColor: color.value }}
            />
          ))}
        </div>
      </div>

      <div>
        {commonHeader('Iluminación ambiente')}
        <select
          value={config.lighting}
          onChange={(e) => onChange({ ...config, lighting: e.target.value as Lighting })}
          disabled={disabled}
          className="w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-[#74AE2C]/10 focus:border-[#74AE2C] focus:outline-none transition-all appearance-none cursor-pointer"
        >
          {lightingOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* Decoration toggle for Integrate (sofa) mode */}
      {mode === AppMode.INTEGRATE && (
        <div>
          {commonHeader('Decoración del salón')}
          <div
            onClick={() => onChange({ ...config, addDecor: !config.addDecor })}
            className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer group ${config.addDecor
              ? 'border-[#74AE2C] bg-[#74AE2C]/5'
              : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
          >
            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${config.addDecor
              ? 'bg-[#74AE2C] border-[#74AE2C]'
              : 'border-slate-300 bg-white group-hover:border-[#74AE2C]'
              }`}>
              {config.addDecor && (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <span className={`block text-sm font-bold ${config.addDecor ? 'text-[#74AE2C]' : 'text-slate-600'}`}>
                Salón equipado y decorado
              </span>
              <span className="text-xs text-slate-400">
                Añade alfombra, mesa de centro, lámparas, plantas y arte (sin tapar el sofá)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pillow toggle for Mattress mode */}
      {mode === AppMode.MATTRESS && (
        <div>
          {commonHeader('Personalización')}
          <div
            onClick={() => onChange({ ...config, addPillows: !config.addPillows })}
            className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer group ${config.addPillows
              ? 'border-[#74AE2C] bg-[#74AE2C]/5'
              : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
          >
            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${config.addPillows
              ? 'bg-[#74AE2C] border-[#74AE2C]'
              : 'border-slate-300 bg-white group-hover:border-[#74AE2C]'
              }`}>
              {config.addPillows && (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <span className={`block text-sm font-bold ${config.addPillows ? 'text-[#74AE2C]' : 'text-slate-600'}`}>
                Añadir Almohadas
              </span>
              <span className="text-xs text-slate-400">
                Coloca 2 almohadas premium en la cabecera
              </span>
            </div>
          </div>

        </div>
      )}

      <div className="mt-6 border-t border-slate-100 pt-6">
        {commonHeader('Formato de imagen')}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onChange({ ...config, aspectRatio: '1:1' })}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${config.aspectRatio !== '3:4'
              ? 'border-[#74AE2C] bg-[#74AE2C]/5 text-[#74AE2C]'
              : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}
          >
            <div className="w-4 h-4 border-2 border-current rounded-sm"></div>
            <span className="text-xs font-bold">Cuadrado (1:1)</span>
          </button>
          <button
            onClick={() => onChange({ ...config, aspectRatio: '3:4' })}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${config.aspectRatio === '3:4'
              ? 'border-[#74AE2C] bg-[#74AE2C]/5 text-[#74AE2C]'
              : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}
          >
            <div className="w-3 h-4 border-2 border-current rounded-sm"></div>
            <span className="text-xs font-bold">Vertical (A4)</span>
          </button>
        </div>
      </div>

    </div>
  );
};
