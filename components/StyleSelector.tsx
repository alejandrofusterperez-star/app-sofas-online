
import React, { useState } from 'react';
import { InteriorStyle, Lighting, VisualizationConfig, AppMode, Fabric } from '../types';

interface StyleSelectorProps {
  config: VisualizationConfig;
  onChange: (config: VisualizationConfig) => void;
  disabled?: boolean;
  mode: AppMode;
  allowColorChange?: boolean;
  // Biblioteca de telas (solo se usa cuando isAdmin === true).
  fabrics?: Fabric[];
  isAdmin?: boolean;
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

const fabricTypes = [
  'Chenilla',
  'Lino',
  'Terciopelo',
  'Pana',
  'Bouclé',
  'Algodón',
  'Piel / Cuero',
  'Antimanchas',
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

export const StyleSelector: React.FC<StyleSelectorProps> = ({ config, onChange, disabled, mode, allowColorChange, fabrics = [], isAdmin }) => {
  const [openFabricId, setOpenFabricId] = useState<string | null>(null);
  const commonHeader = (title: string) => (
    <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
      <div className="w-1.5 h-1.5 bg-[#74AE2C] rounded-full"></div>
      {title}
    </label>
  );

  const toggleCard = (active: boolean, onToggle: () => void, title: string, subtitle: string) => (
    <div
      onClick={() => !disabled && onToggle()}
      className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer group ${active
        ? 'border-[#74AE2C] bg-[#74AE2C]/5'
        : 'border-slate-100 bg-white hover:border-slate-200'
        }`}
    >
      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${active
        ? 'bg-[#74AE2C] border-[#74AE2C]'
        : 'border-slate-300 bg-white group-hover:border-[#74AE2C]'
        }`}>
        {active && (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <div>
        <span className={`block text-sm font-bold ${active ? 'text-[#74AE2C]' : 'text-slate-600'}`}>{title}</span>
        <span className="text-xs text-slate-400">{subtitle}</span>
      </div>
    </div>
  );


  // Selector de la biblioteca de telas (admin): elige tela → color con imagen de referencia.
  const renderFabricLibrary = () => {
    if (!fabrics.length) {
      return (
        <p className="text-xs text-slate-400 mt-2 font-medium">
          No hay telas en la biblioteca todavía. Créalas en el panel "Telas".
        </p>
      );
    }
    const activeFabric = fabrics.find((f) => f.id === openFabricId) || null;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {fabrics.map((fabric) => {
            const selectedHere = fabric.colors.some((c) => c.id === config.selectedFabricColorId);
            return (
              <button
                key={fabric.id}
                onClick={() => setOpenFabricId(openFabricId === fabric.id ? null : fabric.id)}
                disabled={disabled}
                className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all ${
                  openFabricId === fabric.id || selectedHere
                    ? 'bg-[#74AE2C] border-[#74AE2C] text-white shadow-lg shadow-[#74AE2C]/20'
                    : 'bg-white border-slate-100 text-slate-500 hover:border-[#74AE2C]/30'
                }`}
              >
                {fabric.name}
                {selectedHere ? ' ✓' : ''}
              </button>
            );
          })}
        </div>

        {activeFabric && (
          <div className="pt-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">
              Colores de {activeFabric.name}
            </p>
            {activeFabric.colors.length === 0 ? (
              <p className="text-xs text-slate-400">Esta tela no tiene colores todavía.</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {activeFabric.colors.map((color) => (
                  <button
                    key={color.id}
                    title={color.name}
                    disabled={disabled}
                    onClick={() =>
                      onChange({
                        ...config,
                        // Al elegir una tela nuestra "olvidamos" el cambio de color manual:
                        // la variación ya define tela + color mediante la imagen de referencia.
                        changeFabric: true,
                        changeColor: false,
                        targetFabric: activeFabric.name,
                        targetSofaColor: color.name,
                        fabricReferenceImageUrl: color.image_url || undefined,
                        selectedFabricColorId: color.id,
                      })
                    }
                    className="flex flex-col items-center gap-1.5 group outline-none"
                  >
                    <div
                      className={`w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 bg-slate-50 ${
                        config.selectedFabricColorId === color.id
                          ? 'border-[#74AE2C] ring-4 ring-[#74AE2C]/10 scale-105'
                          : 'border-slate-100 group-hover:border-slate-300'
                      }`}
                    >
                      {color.image_url ? (
                        <img src={color.image_url} alt={color.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-300">
                          sin img
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold text-center leading-tight transition-colors ${
                        config.selectedFabricColorId === color.id ? 'text-[#74AE2C]' : 'text-slate-400'
                      }`}
                    >
                      {color.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {config.selectedFabricColorId && (
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#74AE2C] bg-[#74AE2C]/5 rounded-xl px-3 py-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Tela de referencia seleccionada: {config.targetFabric} · {config.targetSofaColor}
            <button
              onClick={() =>
                onChange({
                  ...config,
                  fabricReferenceImageUrl: undefined,
                  selectedFabricColorId: undefined,
                  changeFabric: false,
                  changeColor: true,
                })
              }
              className="ml-auto text-slate-400 hover:text-red-500"
            >
              quitar
            </button>
          </div>
        )}
      </div>
    );
  };

  // Selector del número de imágenes a generar (1, 2 o 3).
  const renderImageCount = () => (
    <div className="mt-6 border-t border-slate-100 pt-6">
      {commonHeader('Número de imágenes')}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((n) => {
          const active = (config.numImages ?? 3) === n;
          return (
            <button
              key={n}
              onClick={() => onChange({ ...config, numImages: n })}
              disabled={disabled}
              className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border-2 transition-all ${active
                ? 'border-[#74AE2C] bg-[#74AE2C]/5 text-[#74AE2C]'
                : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}
            >
              <span className="text-lg font-black leading-none">{n}</span>
              <span className="text-[10px] font-bold">{n === 1 ? 'imagen' : 'imágenes'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (mode === AppMode.COLOR_CHANGE) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Admin: la biblioteca de telas manda. Si eliges una tela nuestra,
            se aplica esa tela exacta y se ocultan los ajustes manuales. */}
        {isAdmin && (
          <div>
            {commonHeader('Tela de nuestra biblioteca')}
            <p className="text-xs text-slate-400 mb-4 -mt-1">
              Elige una tela nuestra y su variación: se aplicará esa tela exacta (con su color) usando la imagen de referencia.
            </p>
            {renderFabricLibrary()}
          </div>
        )}

        {/* Ajustes manuales. Para admin se ocultan cuando ya hay una tela nuestra elegida. */}
        {!(isAdmin && config.selectedFabricColorId) && (
          <div className={isAdmin ? 'border-t border-slate-100 pt-6 space-y-6' : 'space-y-6'}>
            <div>
              {commonHeader(isAdmin ? 'O cambia solo el color' : '¿Qué quieres cambiar?')}
              <div className="space-y-3">
                {toggleCard(
                  !!config.changeColor,
                  () => onChange({ ...config, changeColor: !config.changeColor }),
                  'Cambiar el color',
                  'Aplica un nuevo tono al tapizado'
                )}
                {!isAdmin &&
                  toggleCard(
                    !!config.changeFabric,
                    () => onChange({ ...config, changeFabric: !config.changeFabric }),
                    'Cambiar la tela / material',
                    'Cambia el tipo de tejido (terciopelo, lino, pana...)'
                  )}
              </div>
              {!isAdmin && !config.changeColor && !config.changeFabric && (
                <p className="text-xs text-amber-600 mt-3 font-medium">
                  Selecciona al menos una opción para ver cambios.
                </p>
              )}
            </div>

            {config.changeColor && (
              <div className="border-t border-slate-100 pt-6">
                {commonHeader('Elige el nuevo color')}
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
            )}

            {!isAdmin && config.changeFabric && (
              <div className="border-t border-slate-100 pt-6">
                {commonHeader('Elige la nueva tela')}
                <div className="grid grid-cols-2 gap-2">
                  {fabricTypes.map((fabric) => (
                    <button
                      key={fabric}
                      onClick={() => onChange({ ...config, targetFabric: fabric })}
                      disabled={disabled}
                      className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all ${config.targetFabric === fabric
                        ? 'bg-[#74AE2C] border-[#74AE2C] text-white shadow-lg shadow-[#74AE2C]/20'
                        : 'bg-white border-slate-100 text-slate-500 hover:border-[#74AE2C]/30'
                        }`}
                    >
                      {fabric}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {renderImageCount()}
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

      {/* Cambio de color del sofá — solo usuario digency, dentro de Integrar */}
      {mode === AppMode.INTEGRATE && allowColorChange && (
        <div className="border-t border-slate-100 pt-6">
          {commonHeader('Color del sofá')}
          {toggleCard(
            !!config.integrateColorChange,
            () => onChange({ ...config, integrateColorChange: !config.integrateColorChange }),
            'Cambiar el color del sofá',
            'Integra el mismo sofá con un nuevo tono de tapizado'
          )}

          {config.integrateColorChange && (
            <div className="mt-5">
              {commonHeader('Elige el nuevo color')}
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
          )}
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
