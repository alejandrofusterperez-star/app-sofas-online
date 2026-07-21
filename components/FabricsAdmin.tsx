import React, { useEffect, useRef, useState } from 'react';
import { Fabric, FabricColor } from '../types';
import {
  listFabrics,
  createFabric,
  deleteFabric,
  addFabricColor,
  deleteFabricColor,
} from '../services/fabricsService';

interface FabricsAdminProps {
  /** Se llama cuando cambia la biblioteca, para que el generador recargue las telas. */
  onChanged?: () => void;
}

export const FabricsAdmin: React.FC<FabricsAdminProps> = ({ onChanged }) => {
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFabricName, setNewFabricName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await listFabrics();
    setFabrics(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    await load();
    onChanged?.();
  };

  const handleCreateFabric = async () => {
    const name = newFabricName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      await createFabric(name);
      setNewFabricName('');
      await refresh();
    } catch (e: any) {
      setError(e.message || 'No se pudo crear la tela');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteFabric = async (fabric: Fabric) => {
    if (!confirm(`¿Eliminar la tela "${fabric.name}" y todos sus colores?`)) return;
    setError(null);
    try {
      await deleteFabric(fabric);
      await refresh();
    } catch (e: any) {
      setError(e.message || 'No se pudo eliminar la tela');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Biblioteca de Telas</h2>
        <p className="text-slate-400 font-medium mt-2">
          Crea telas, añade colores con su nombre y sube una imagen de referencia. Al generar, esa imagen
          se envía a la IA para reproducir la tela exacta.
        </p>
      </div>

      {/* Crear nueva tela */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-lg mb-8">
        <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[#74AE2C] rounded-full"></div>
          Nueva tela
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={newFabricName}
            onChange={(e) => setNewFabricName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFabric()}
            placeholder="Ej. Terciopelo, Chenilla, Bouclé..."
            className="flex-1 bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-[#74AE2C] transition-all font-bold text-slate-700"
          />
          <button
            onClick={handleCreateFabric}
            disabled={creating || !newFabricName.trim()}
            className="px-6 py-3 rounded-2xl bg-[#74AE2C] text-white font-black text-sm uppercase tracking-widest disabled:bg-slate-200 disabled:text-slate-400 hover:bg-[#639626] transition-all"
          >
            {creating ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-bold border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-400 font-bold">Cargando telas...</div>
      ) : fabrics.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-3xl text-slate-400 font-medium">
          Todavía no hay telas. Crea la primera arriba.
        </div>
      ) : (
        <div className="space-y-6">
          {fabrics.map((fabric) => (
            <FabricCard
              key={fabric.id}
              fabric={fabric}
              onDeleteFabric={() => handleDeleteFabric(fabric)}
              onChanged={refresh}
              onError={setError}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Tarjeta de una tela con sus colores + formulario para añadir color ────────
const FabricCard: React.FC<{
  fabric: Fabric;
  onDeleteFabric: () => void;
  onChanged: () => Promise<void> | void;
  onError: (msg: string | null) => void;
}> = ({ fabric, onDeleteFabric, onChanged, onError }) => {
  const [colorName, setColorName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | null) => {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const handleAddColor = async () => {
    if (!colorName.trim() || !file) {
      onError('Añade un nombre de color y una imagen.');
      return;
    }
    setSaving(true);
    onError(null);
    try {
      await addFabricColor(fabric.id, colorName, file);
      setColorName('');
      pickFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await onChanged();
    } catch (e: any) {
      onError(e.message || 'No se pudo añadir el color');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteColor = async (color: FabricColor) => {
    if (!confirm(`¿Eliminar el color "${color.name}"?`)) return;
    onError(null);
    try {
      await deleteFabricColor(color);
      await onChanged();
    } catch (e: any) {
      onError(e.message || 'No se pudo eliminar el color');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-lg">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-black text-slate-800">{fabric.name}</h3>
        <button
          onClick={onDeleteFabric}
          className="text-xs font-bold text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors"
        >
          Eliminar tela
        </button>
      </div>

      {/* Colores existentes */}
      {fabric.colors.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 mb-6">
          {fabric.colors.map((color) => (
            <div key={color.id} className="group relative">
              <div className="aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50">
                {color.image_url ? (
                  <img src={color.image_url} alt={color.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
                    sin imagen
                  </div>
                )}
              </div>
              <p className="text-[11px] font-bold text-slate-600 text-center mt-2 leading-tight">{color.name}</p>
              <button
                onClick={() => handleDeleteColor(color)}
                title="Eliminar color"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-black opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 mb-6">Aún no hay colores en esta tela.</p>
      )}

      {/* Añadir color */}
      <div className="border-t border-slate-100 pt-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div
          onClick={() => fileRef.current?.click()}
          className="w-16 h-16 flex-shrink-0 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#74AE2C] cursor-pointer overflow-hidden flex items-center justify-center bg-slate-50"
          title="Subir imagen del color"
        >
          {preview ? (
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl text-slate-300">+</span>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] || null)}
        />
        <input
          type="text"
          value={colorName}
          onChange={(e) => setColorName(e.target.value)}
          placeholder="Nombre del color (ej. Verde Bosque)"
          className="flex-1 bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 outline-none focus:border-[#74AE2C] transition-all font-bold text-slate-700 text-sm"
        />
        <button
          onClick={handleAddColor}
          disabled={saving || !colorName.trim() || !file}
          className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest disabled:bg-slate-200 disabled:text-slate-400 hover:bg-slate-800 transition-all whitespace-nowrap"
        >
          {saving ? 'Subiendo...' : 'Añadir color'}
        </button>
      </div>
    </div>
  );
};
