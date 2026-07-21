import React, { useEffect, useRef, useState } from 'react';
import { SofaModel } from '../types';
import { listSofaModels, createSofaModel, deleteSofaModel } from '../services/sofaModelsService';

interface SofaModelsAdminProps {
  onChanged?: () => void;
}

export const SofaModelsAdmin: React.FC<SofaModelsAdminProps> = ({ onChanged }) => {
  const [models, setModels] = useState<SofaModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setModels(await listSofaModels());
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

  const pickFile = (f: File | null) => {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const handleCreate = async () => {
    if (!name.trim() || !file) {
      setError('Añade un nombre y una foto base.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createSofaModel(name, file);
      setName('');
      pickFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await refresh();
    } catch (e: any) {
      setError(e.message || 'No se pudo crear el modelo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (model: SofaModel) => {
    if (!confirm(`¿Eliminar el modelo "${model.name}"?`)) return;
    setError(null);
    try {
      await deleteSofaModel(model);
      await refresh();
    } catch (e: any) {
      setError(e.message || 'No se pudo eliminar el modelo');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 uppercase tracking-tight">Modelos de Sofá</h2>
        <p className="text-slate-400 font-medium mt-2 text-sm sm:text-base">
          Sube la foto base de cada modelo. Se usarán en el Modo Estudio para generar sin que el cliente suba nada.
        </p>
      </div>

      {/* Crear modelo */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-lg mb-6 sm:mb-8">
        <label className="block text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[#74AE2C] rounded-full"></div>
          Nuevo modelo
        </label>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div
            onClick={() => fileRef.current?.click()}
            className="w-full sm:w-20 h-40 sm:h-20 flex-shrink-0 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#74AE2C] cursor-pointer overflow-hidden flex items-center justify-center bg-slate-50"
            title="Subir foto base del modelo"
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Nombre del modelo (ej. Chester, Módulo XL...)"
            className="flex-1 bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 outline-none focus:border-[#74AE2C] transition-all font-bold text-slate-700 text-sm"
          />
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim() || !file}
            className="px-6 py-3 rounded-2xl bg-[#74AE2C] text-white font-black text-xs uppercase tracking-widest disabled:bg-slate-200 disabled:text-slate-400 hover:bg-[#639626] transition-all whitespace-nowrap"
          >
            {saving ? 'Subiendo...' : 'Añadir modelo'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-bold border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-400 font-bold">Cargando modelos...</div>
      ) : models.length === 0 ? (
        <div className="text-center py-16 sm:py-20 border-2 border-dashed border-slate-100 rounded-3xl text-slate-400 font-medium">
          Todavía no hay modelos. Sube el primero arriba.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {models.map((model) => (
            <div key={model.id} className="group relative bg-white rounded-3xl border border-slate-100 shadow-lg overflow-hidden">
              <div className="aspect-[4/3] bg-slate-50 overflow-hidden">
                {model.image_url ? (
                  <img src={model.image_url} alt={model.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">sin imagen</div>
                )}
              </div>
              <div className="p-3 sm:p-4">
                <h3 className="text-sm font-black text-slate-800 leading-tight truncate">{model.name}</h3>
              </div>
              <button
                onClick={() => handleDelete(model)}
                title="Eliminar modelo"
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white text-sm font-black opacity-0 group-hover:opacity-100 transition-opacity shadow-lg flex items-center justify-center"
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
