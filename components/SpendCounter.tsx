import React, { useEffect, useRef, useState } from 'react';
import { getSpendTotals, SpendTotals } from '../services/spendTracker';

interface SpendCounterProps {
  /** Cada vez que cambia, el contador vuelve a consultar el total (tras generar). */
  reloadToken?: number;
}

const POLL_MS = 15000;

const formatUsd = (n: number) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: n < 100 ? 3 : 2,
    maximumFractionDigits: n < 100 ? 3 : 2,
  }).format(n || 0);

export const SpendCounter: React.FC<SpendCounterProps> = ({ reloadToken }) => {
  const [totals, setTotals] = useState<SpendTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);
  const prevCost = useRef<number | null>(null);

  const refresh = async () => {
    const t = await getSpendTotals();
    if (t) {
      setTotals(t);
      if (prevCost.current !== null && t.totalCostUsd !== prevCost.current) {
        setPulse(true);
        setTimeout(() => setPulse(false), 900);
      }
      prevCost.current = t.totalCostUsd;
    }
    setLoading(false);
  };

  // Carga inicial + sondeo periódico para reflejar el gasto de otros usuarios.
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, []);

  // Refresco inmediato tras una generación propia.
  useEffect(() => {
    if (reloadToken !== undefined) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadToken]);

  return (
    <div className="fixed bottom-5 right-5 z-[60] select-none">
      <div
        className={`flex items-center gap-3 bg-slate-900/95 backdrop-blur-md text-white pl-4 pr-5 py-3 rounded-2xl shadow-2xl border border-white/10 transition-all duration-500 ${
          pulse ? 'ring-2 ring-[#74AE2C] scale-105' : ''
        }`}
        title="Gasto total acumulado en llamadas a OpenAI (gpt-image-1)"
      >
        <div className="w-9 h-9 rounded-xl bg-[#74AE2C]/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-[#74AE2C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="leading-none">
          <div className="text-[9px] font-black uppercase tracking-[0.15em] text-white/50 mb-1">
            Gasto OpenAI
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black tabular-nums tracking-tight">
              {loading && !totals ? '…' : formatUsd(totals?.totalCostUsd ?? 0)}
            </span>
            {totals && (
              <span className="text-[10px] font-bold text-white/40 tabular-nums">
                {totals.totalCalls} gen.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
