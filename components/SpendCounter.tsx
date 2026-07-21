import React, { useEffect, useRef, useState } from 'react';
import {
  getSpendStats,
  getSpendDaily,
  usdToEur,
  SpendTotals,
  DailySpend,
} from '../services/spendTracker';

interface SpendCounterProps {
  /** Cada vez que cambia, el contador vuelve a consultar (tras generar). */
  reloadToken?: number;
}

const POLL_MS = 15000;

type Period = { label: string; days: number | null };
const PERIODS: Period[] = [
  { label: 'Hoy', days: 1 },
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: 'Todo', days: null },
];

const eur = (usd: number) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usdToEur(usd));

export const SpendCounter: React.FC<SpendCounterProps> = ({ reloadToken }) => {
  const [open, setOpen] = useState(false);
  const [periodIdx, setPeriodIdx] = useState(3); // "Todo" por defecto
  const [stats, setStats] = useState<SpendTotals | null>(null);
  const [daily, setDaily] = useState<DailySpend[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);
  const prevCost = useRef<number | null>(null);

  const period = PERIODS[periodIdx];

  const refresh = async () => {
    const [s, d] = await Promise.all([
      getSpendStats(period.days),
      open ? getSpendDaily(30) : Promise.resolve<DailySpend[]>([]),
    ]);
    if (s) {
      setStats(s);
      if (prevCost.current !== null && s.totalCostUsd !== prevCost.current) {
        setPulse(true);
        setTimeout(() => setPulse(false), 900);
      }
      prevCost.current = s.totalCostUsd;
    }
    if (open) setDaily(d);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodIdx, open, reloadToken]);

  const maxDaily = Math.max(1, ...daily.map((d) => d.costUsd));

  return (
    <div className="fixed bottom-5 right-5 z-[60] select-none">
      {/* Panel expandido */}
      {open && (
        <div className="mb-3 w-[calc(100vw-2.5rem)] max-w-[330px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#74AE2C]/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#74AE2C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-white text-xs font-black uppercase tracking-widest">Gasto OpenAI</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-5">
            {/* Filtro de periodo */}
            <div className="flex bg-slate-50 p-1 rounded-xl mb-5">
              {PERIODS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => setPeriodIdx(i)}
                  className={`flex-1 py-2 text-[11px] font-black rounded-lg transition-all ${
                    i === periodIdx ? 'bg-white shadow-sm text-[#74AE2C]' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Total del periodo */}
            <div className="text-center mb-5">
              <div className="text-4xl font-black text-slate-800 tabular-nums tracking-tight">
                {loading && !stats ? '…' : eur(stats?.totalCostUsd ?? 0)}
              </div>
              <div className="text-xs font-bold text-slate-400 mt-1">
                {stats?.totalCalls ?? 0} generaciones · {period.label.toLowerCase()}
              </div>
            </div>

            {/* Gráfico diario (últimos 30 días) */}
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Últimos 30 días
              </div>
              {daily.length === 0 ? (
                <div className="text-xs text-slate-300 text-center py-6">Sin datos todavía</div>
              ) : (
                <div className="flex items-end gap-[3px] h-20">
                  {daily.map((d) => (
                    <div
                      key={d.day}
                      title={`${d.day}: ${eur(d.costUsd)} (${d.calls})`}
                      className="flex-1 bg-[#74AE2C]/20 hover:bg-[#74AE2C] rounded-sm transition-colors min-h-[2px]"
                      style={{ height: `${Math.max(4, (d.costUsd / maxDaily) * 100)}%` }}
                    />
                  ))}
                </div>
              )}
            </div>

            <p className="text-[9px] text-slate-300 text-center mt-4 leading-tight">
              Convertido de USD (facturación real de OpenAI) a EUR de forma aproximada.
            </p>
          </div>
        </div>
      )}

      {/* Badge compacto */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-3 bg-slate-900/95 backdrop-blur-md text-white pl-4 pr-5 py-3 rounded-2xl shadow-2xl border border-white/10 transition-all duration-500 hover:scale-[1.02] ${
          pulse ? 'ring-2 ring-[#74AE2C] scale-105' : ''
        }`}
        title="Ver histórico de gasto"
      >
        <div className="w-9 h-9 rounded-xl bg-[#74AE2C]/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-[#74AE2C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="leading-none text-left">
          <div className="text-[9px] font-black uppercase tracking-[0.15em] text-white/50 mb-1">
            Gasto OpenAI · {period.label}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black tabular-nums tracking-tight">
              {loading && !stats ? '…' : eur(stats?.totalCostUsd ?? 0)}
            </span>
            {stats && <span className="text-[10px] font-bold text-white/40 tabular-nums">{stats.totalCalls} gen.</span>}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
};
