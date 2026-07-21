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
  const [error, setError] = useState<string | null>(null);
  // Vista maestro-detalle: null = lista de telas; id = página de esa tela.
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const selected = selectedId ? fabrics.find((f) => f.id === selectedId) || null : null;

  // Si estamos dentro de una tela, mostramos su página de detalle.
  if (selected) {
    return (
      <FabricDetail
        fabric={selected}
        onBack={() => setSelectedId(null)}
        onChanged={refresh}
        onDeleted={() => {
          setSelectedId(null);
          refresh();
        }}
        error={error}
        setError={setError}
      />
    );
  }

  return (
    <FabricList
      fabrics={fabrics}
      loading={loading}
      error={error}
      setError={setError}
      onOpen={(id) => {
        setError(null);
        setSelectedId(id);
      }}
      onChanged={refresh}
    />
  );
};

// ── Página 1: lista de telas (padres) ────────────────────────────────────────
const FabricList: React.FC<{
  fabrics: Fabric[];
  loading: boolean;
  error: string | null;
  setError: (m: string | null) => void;
  onOpen: (id: string) => void;
  onChanged: () => Promise<void> | void;
}> = ({ fabrics, loading, error, setError, onOpen, onChanged }) => {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createFabric(name);
      setNewName('');
      await onChanged();
      if (created) onOpen(created.id); // entra directamente a añadir variaciones
    } catch (e: any) {
      setError(e.message || 'No se pudo crear la tela');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Biblioteca de Telas</h2>
        <p className="text-slate-400 font-medium mt-2">
          Cada tela tiene su propia página. Ábrela para gestionar sus variaciones (con nombre e imagen de referencia).
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
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Nombre de la tela (ej. Bellucci, Terciopelo...)"
            className="flex-1 bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-[#74AE2C] transition-all font-bold text-slate-700"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          {fabrics.map((fabric) => {
            const cover = fabric.colors.find((c) => c.image_url)?.image_url || null;
            return (
              <button
                key={fabric.id}
                onClick={() => onOpen(fabric.id)}
                className="group text-left bg-white rounded-3xl border border-slate-100 shadow-lg overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <div className="aspect-[4/3] bg-slate-50 overflow-hidden">
                  {cover ? (
                    <img
                      src={cover}
                      alt={fabric.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm font-bold">
                      sin variaciones
                    </div>
                  )}
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-800 leading-tight">{fabric.name}</h3>
                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                      {fabric.colors.length} {fabric.colors.length === 1 ? 'variación' : 'variaciones'}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-[#74AE2C] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Página 2: detalle de una tela con sus variaciones ────────────────────────
const FabricDetail: React.FC<{
  fabric: Fabric;
  onBack: () => void;
  onChanged: () => Promise<void> | void;
  onDeleted: () => void;
  error: string | null;
  setError: (m: string | null) => void;
}> = ({ fabric, onBack, onChanged, onDeleted, error, setError }) => {
  const [variationName, setVariationName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | null) => {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const handleAdd = async () => {
    if (!variationName.trim() || !file) {
      setError('Añade un nombre de variación y una imagen.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addFabricColor(fabric.id, variationName, file);
      setVariationName('');
      pickFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await onChanged();
    } catch (e: any) {
      setError(e.message || 'No se pudo añadir la variación');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVariation = async (color: FabricColor) => {
    if (!confirm(`¿Eliminar la variación "${color.name}"?`)) return;
    setError(null);
    try {
      await deleteFabricColor(color);
      await onChanged();
    } catch (e: any) {
      setError(e.message || 'No se pudo eliminar la variación');
    }
  };

  const handleDeleteFabric = async () => {
    if (!confirm(`¿Eliminar la tela "${fabric.name}" y todas sus variaciones?`)) return;
    setError(null);
    try {
      await deleteFabric(fabric);
      onDeleted();
    } catch (e: any) {
      setError(e.message || 'No se pudo eliminar la tela');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Cabecera con volver */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-[#74AE2C] transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Todas las telas
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">{fabric.name}</h2>
          <p className="text-slate-400 font-medium mt-1">
            {fabric.colors.length} {fabric.colors.length === 1 ? 'variación' : 'variaciones'}
          </p>
        </div>
        <button
          onClick={handleDeleteFabric}
          className="text-xs font-bold text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors"
        >
          Eliminar tela
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-bold border border-red-100">
          {error}
        </div>
      )}

      {/* Añadir variación */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-lg mb-8">
        <label className="block text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[#74AE2C] rounded-full"></div>
          Añadir variación
        </label>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div
            onClick={() => fileRef.current?.click()}
            className="w-16 h-16 flex-shrink-0 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#74AE2C] cursor-pointer overflow-hidden flex items-center justify-center bg-slate-50"
            title="Subir imagen de la variación"
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
            value={variationName}
            onChange={(e) => setVariationName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Nombre de la variación (ej. C1, C2, Verde Bosque...)"
            className="flex-1 bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 outline-none focus:border-[#74AE2C] transition-all font-bold text-slate-700 text-sm"
          />
          <button
            onClick={handleAdd}
            disabled={saving || !variationName.trim() || !file}
            className="px-5 py-3 rounded-2xl bg-[#74AE2C] text-white font-black text-xs uppercase tracking-widest disabled:bg-slate-200 disabled:text-slate-400 hover:bg-[#639626] transition-all whitespace-nowrap"
          >
            {saving ? 'Subiendo...' : 'Añadir'}
          </button>
        </div>
      </div>

      {/* Variaciones existentes */}
      {fabric.colors.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-3xl text-slate-400 font-medium">
          Esta tela aún no tiene variaciones. Añade la primera arriba.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
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
                onClick={() => handleDeleteVariation(color)}
                title="Eliminar variación"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-black opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
