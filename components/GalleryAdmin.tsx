import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Fabric, GalleryImage } from '../types';
import { listGallery, uploadManualImage, deleteGalleryImage } from '../services/galleryService';

interface GalleryAdminProps {
  fabrics: Fabric[];
}

export const GalleryAdmin: React.FC<GalleryAdminProps> = ({ fabrics }) => {
  const [items, setItems] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterFabric, setFilterFabric] = useState<string>('all');

  // Subida manual
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [upFabricId, setUpFabricId] = useState<string>('');
  const [upColorId, setUpColorId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setItems(await listGallery());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const upFabric = fabrics.find((f) => f.id === upFabricId) || null;

  const pickFile = (f: File | null) => {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const handleManualUpload = async () => {
    if (!file) {
      setError('Selecciona una imagen.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fabric = fabrics.find((f) => f.id === upFabricId) || null;
      const color = fabric?.colors.find((c) => c.id === upColorId) || null;
      await uploadManualImage(file, {
        fabric_id: fabric?.id ?? null,
        fabric_color_id: color?.id ?? null,
        fabric_name: fabric?.name ?? null,
        variation_name: color?.name ?? null,
        color_hex: color?.color_hex ?? null,
        source: 'manual',
      });
      pickFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setUpFabricId('');
      setUpColorId('');
      await load();
    } catch (e: any) {
      setError(e.message || 'No se pudo subir la imagen');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: GalleryImage) => {
    if (!confirm('¿Eliminar esta imagen de la biblioteca?')) return;
    setError(null);
    try {
      await deleteGalleryImage(item);
      await load();
    } catch (e: any) {
      setError(e.message || 'No se pudo eliminar');
    }
  };

  // Telas que SÍ tienen imágenes en la biblioteca (con su recuento), para los filtros.
  const availableFabrics = useMemo(() => {
    const map = new Map<string, { key: string; name: string; count: number }>();
    items.forEach((i) => {
      const key = i.fabric_id || '__none__';
      const name = i.fabric_name || 'Sin tela';
      const cur = map.get(key) || { key, name, count: 0 };
      cur.count += 1;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [items]);

  // Si el filtro activo deja de existir (p.ej. borras la última imagen de esa tela), vuelve a "todas".
  useEffect(() => {
    if (filterFabric !== 'all' && !availableFabrics.some((f) => f.key === filterFabric)) {
      setFilterFabric('all');
    }
  }, [availableFabrics, filterFabric]);

  const filtered = useMemo(
    () =>
      filterFabric === 'all'
        ? items
        : items.filter((i) => (i.fabric_id || '__none__') === filterFabric),
    [items, filterFabric]
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 uppercase tracking-tight">Biblioteca de imágenes</h2>
        <p className="text-slate-400 font-medium mt-2 text-sm sm:text-base">
          Imágenes guardadas por tela y color. Guarda las buenas desde el Modo Estudio o súbelas manualmente aquí.
        </p>
      </div>

      {/* Subida manual */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-lg mb-6">
        <label className="block text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[#74AE2C] rounded-full"></div>
          Subida manual
        </label>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div
            onClick={() => fileRef.current?.click()}
            className="w-full sm:w-24 h-40 sm:h-24 flex-shrink-0 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#74AE2C] cursor-pointer overflow-hidden flex items-center justify-center bg-slate-50"
          >
            {preview ? <img src={preview} alt="preview" className="w-full h-full object-cover" /> : <span className="text-2xl text-slate-300">+</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] || null)} />

          <select
            value={upFabricId}
            onChange={(e) => { setUpFabricId(e.target.value); setUpColorId(''); }}
            className="flex-1 bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 outline-none focus:border-[#74AE2C] font-bold text-slate-700 text-sm"
          >
            <option value="">Tela (opcional)</option>
            {fabrics.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          <select
            value={upColorId}
            onChange={(e) => setUpColorId(e.target.value)}
            disabled={!upFabric}
            className="flex-1 bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 outline-none focus:border-[#74AE2C] font-bold text-slate-700 text-sm disabled:opacity-50"
          >
            <option value="">Variación (opcional)</option>
            {upFabric?.colors.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button
            onClick={handleManualUpload}
            disabled={saving || !file}
            className="px-6 py-3 rounded-2xl bg-[#74AE2C] text-white font-black text-xs uppercase tracking-widest disabled:bg-slate-200 disabled:text-slate-400 hover:bg-[#639626] transition-all whitespace-nowrap"
          >
            {saving ? 'Subiendo...' : 'Subir'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-bold border border-red-100">{error}</div>
      )}

      {/* Filtros por tela (solo las que tienen imágenes) */}
      {items.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 mr-1">Filtrar</span>
            <button
              onClick={() => setFilterFabric('all')}
              className={`px-4 py-2 rounded-full text-xs font-black transition-all border-2 ${
                filterFabric === 'all'
                  ? 'bg-[#74AE2C] border-[#74AE2C] text-white shadow-md shadow-[#74AE2C]/20'
                  : 'bg-white border-slate-100 text-slate-500 hover:border-[#74AE2C]/40'
              }`}
            >
              Todas
              <span className={`ml-1.5 ${filterFabric === 'all' ? 'text-white/70' : 'text-slate-300'}`}>{items.length}</span>
            </button>
            {availableFabrics.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterFabric(f.key)}
                className={`px-4 py-2 rounded-full text-xs font-black transition-all border-2 ${
                  filterFabric === f.key
                    ? 'bg-[#74AE2C] border-[#74AE2C] text-white shadow-md shadow-[#74AE2C]/20'
                    : 'bg-white border-slate-100 text-slate-500 hover:border-[#74AE2C]/40'
                }`}
              >
                {f.name}
                <span className={`ml-1.5 ${filterFabric === f.key ? 'text-white/70' : 'text-slate-300'}`}>{f.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-400 font-bold">Cargando biblioteca...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 sm:py-20 border-2 border-dashed border-slate-100 rounded-3xl text-slate-400 font-medium">
          No hay imágenes todavía. Guarda alguna desde el Modo Estudio o súbela manualmente.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {filtered.map((item) => (
            <div key={item.id} className="group relative bg-white rounded-3xl border border-slate-100 shadow-lg overflow-hidden">
              <a href={item.image_url || undefined} target="_blank" rel="noreferrer" className="block aspect-square bg-slate-50">
                {item.image_url && <img src={item.image_url} alt={item.fabric_name || 'imagen'} className="w-full h-full object-cover" />}
              </a>
              <div className="p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  {item.color_hex && <span className="w-4 h-4 rounded-md border border-slate-200 flex-shrink-0" style={{ backgroundColor: item.color_hex }} />}
                  <p className="text-xs font-black text-slate-800 leading-tight truncate">
                    {item.fabric_name || 'Sin tela'}{item.variation_name ? ` · ${item.variation_name}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.model && <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{item.model}</span>}
                  {item.environment && <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{item.environment}</span>}
                  {item.source === 'manual' && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">manual</span>}
                </div>
              </div>
              <button
                onClick={() => handleDelete(item)}
                title="Eliminar"
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
