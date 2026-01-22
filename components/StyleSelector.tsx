
import React from 'react';
import { InteriorStyle, Lighting, VisualizationConfig, AppMode, AspectRatio } from '../types';

interface StyleSelectorProps {
  config: VisualizationConfig;
  onChange: (config: VisualizationConfig) => void;
  disabled?: boolean;
  mode: AppMode;
}

const styles = Object.values(InteriorStyle);
const lightingOptions = Object.values(Lighting);
const aspectRatios = Object.values(AspectRatio);

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

  const aspectRatioSelector = (
    <div className="mt-8 pt-8 border-t border-slate-50">
      {commonHeader('Formato de imagen')}
      <div className="grid grid-cols-3 gap-3">
        {aspectRatios.map((ratio) => (
          <button
            key={ratio}
            onClick={() => onChange({ ...config, aspectRatio: ratio as AspectRatio })}
            disabled={disabled}
            className={`flex flex-col items-center gap-2 py-3 px-2 rounded-2xl border transition-all ${config.aspectRatio === ratio
              ? 'bg-[#74AE2C]/5 border-[#74AE2C] text-[#74AE2C] shadow-sm'
              : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
              }`}
          >
            {/* Simple icon for ratio */}
            <div className={`border-2 rounded transition-colors ${config.aspectRatio === ratio ? 'border-[#74AE2C]' : 'border-slate-300'
              } ${ratio === AspectRatio.SQUARE ? 'w-5 h-5' :
                ratio === AspectRatio.LANDSCAPE ? 'w-7 h-4' : 'w-4 h-7'
              }`} />
            <span className="text-[10px] font-black uppercase tracking-widest">{ratio}</span>
          </button>
        ))}
      </div>
    </div>
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
        {aspectRatioSelector}
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

      {aspectRatioSelector}
    </div>
  );
};
