import React, { useState } from 'react';
import { useGetFinancialPrices } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { FinancialPeriod } from '../pages/Dashboard';

const SYMBOLS = [
  { key: 'BTC', nameFa: 'بیت‌کوین', color: '#f59e0b' },
  { key: 'ETH', nameFa: 'اتریوم', color: '#818cf8' },
  { key: 'GOLD', nameFa: 'طلا', color: '#fcd34d' },
  { key: 'DXY', nameFa: 'شاخص دلار', color: '#38bdf8' },
  { key: 'COPPER', nameFa: 'مس', color: '#fb923c' },
];

interface Props {
  period: FinancialPeriod;
}

function useAllPrices(period: FinancialPeriod) {
  const btc = useGetFinancialPrices('BTC', { period });
  const eth = useGetFinancialPrices('ETH', { period });
  const gold = useGetFinancialPrices('GOLD', { period });
  const dxy = useGetFinancialPrices('DXY', { period });
  const copper = useGetFinancialPrices('COPPER', { period });
  return { btc, eth, gold, dxy, copper };
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-white/10 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-muted-foreground mb-2 font-mono">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-foreground">{p.name}:</span>
          <span className={`font-bold tabular-nums ${parseFloat(p.value) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {parseFloat(p.value) >= 0 ? '+' : ''}{parseFloat(p.value).toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function PriceTrendChart({ period }: Props) {
  const { btc, eth, gold, dxy, copper } = useAllPrices(period);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const isLoading = btc.isLoading || eth.isLoading;

  // Merge all data by date
  const merged = React.useMemo(() => {
    const byDate = new Map<string, Record<string, number>>();
    const datasets: Record<string, { date: string; normalizedPct: number }[]> = {
      BTC: btc.data ?? [],
      ETH: eth.data ?? [],
      GOLD: gold.data ?? [],
      DXY: dxy.data ?? [],
      COPPER: copper.data ?? [],
    };

    for (const [sym, rows] of Object.entries(datasets)) {
      for (const r of rows) {
        if (!byDate.has(r.date)) byDate.set(r.date, {});
        byDate.get(r.date)![sym] = parseFloat(r.normalizedPct.toFixed(2));
      }
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date: date.substring(5), ...vals }));
  }, [btc.data, eth.data, gold.data, dxy.data, copper.data]);

  const toggle = (key: string) => {
    setHidden(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  if (isLoading) return <Card className="bg-card/50 border-white/10 h-96 animate-pulse" />;

  return (
    <Card className="bg-card/50 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">بازدهی نسبی (٪ تغییر از ابتدای بازه)</CardTitle>
        <p className="text-xs text-muted-foreground">مقایسه عملکرد همه شاخص‌ها در یک نمودار</p>
      </CardHeader>
      <CardContent>
        {/* Legend toggles */}
        <div className="flex flex-wrap gap-3 mb-4">
          {SYMBOLS.map(s => (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              className={`flex items-center gap-1.5 text-xs transition-opacity ${hidden.has(s.key) ? 'opacity-30' : 'opacity-100'}`}
            >
              <span className="w-3 h-0.5 rounded" style={{ backgroundColor: s.color, display: 'inline-block' }} />
              <span>{s.nameFa}</span>
            </button>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={merged} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              interval={Math.floor(merged.length / 6)}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            {SYMBOLS.map(s => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.nameFa}
                stroke={s.color}
                strokeWidth={hidden.has(s.key) ? 0 : 1.5}
                dot={false}
                activeDot={hidden.has(s.key) ? false : { r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
