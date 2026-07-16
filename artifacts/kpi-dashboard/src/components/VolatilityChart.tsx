import React from 'react';
import { useGetFinancialPrices } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { FinancialPeriod } from '../pages/Dashboard';

interface Props {
  period: FinancialPeriod;
}

const SYMBOLS = [
  { key: 'BTC', nameFa: 'بیت‌کوین', color: '#f59e0b' },
  { key: 'ETH', nameFa: 'اتریوم', color: '#818cf8' },
  { key: 'GOLD', nameFa: 'طلا', color: '#fcd34d' },
  { key: 'DXY', nameFa: 'شاخص دلار', color: '#38bdf8' },
  { key: 'COPPER', nameFa: 'مس', color: '#fb923c' },
];

function computeWeeklyVolatility(
  data: { date: string; changePct: number }[]
): { week: string; [sym: string]: number | string }[] {
  const weeks = new Map<string, number[]>();
  for (const row of data) {
    const d = new Date(row.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().substring(5, 10);
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key)!.push(row.changePct);
  }

  return Array.from(weeks.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-16)
    .map(([week, changes]) => {
      const mean = changes.reduce((a, b) => a + b, 0) / changes.length;
      const variance = changes.reduce((s, c) => s + (c - mean) ** 2, 0) / changes.length;
      return { week, vol: parseFloat(Math.sqrt(variance).toFixed(3)) };
    });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-white/10 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-muted-foreground mb-2 font-mono">هفته {label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color }} />
          <span>{p.name}:</span>
          <span className="font-bold tabular-nums text-amber-300">{p.value}%</span>
        </div>
      ))}
    </div>
  );
}

export function VolatilityChart({ period }: Props) {
  const btc = useGetFinancialPrices('BTC', { period });
  const eth = useGetFinancialPrices('ETH', { period });
  const gold = useGetFinancialPrices('GOLD', { period });
  const dxy = useGetFinancialPrices('DXY', { period });
  const copper = useGetFinancialPrices('COPPER', { period });

  const isLoading = btc.isLoading;

  const merged = React.useMemo(() => {
    const datasets: Record<string, { date: string; changePct: number }[]> = {
      BTC: btc.data ?? [],
      ETH: eth.data ?? [],
      GOLD: gold.data ?? [],
      DXY: dxy.data ?? [],
      COPPER: copper.data ?? [],
    };

    const allWeekly: Record<string, number>[] = [];
    const weekKeys = new Set<string>();

    const computed: Record<string, { week: string; vol: number }[]> = {};
    for (const [sym, rows] of Object.entries(datasets)) {
      computed[sym] = computeWeeklyVolatility(rows);
      computed[sym].forEach(w => weekKeys.add(w.week));
    }

    const sorted = Array.from(weekKeys).sort();
    return sorted.map(week => {
      const row: Record<string, number | string> = { week };
      for (const sym of Object.keys(datasets)) {
        const found = computed[sym]?.find(w => w.week === week);
        row[sym] = found?.vol ?? 0;
      }
      return row;
    });
  }, [btc.data, eth.data, gold.data, dxy.data, copper.data]);

  if (isLoading) return <Card className="bg-card/50 border-white/10 h-64 animate-pulse" />;

  return (
    <Card className="bg-card/50 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">نوسان هفتگی هر شاخص (٪ انحراف معیار)</CardTitle>
        <p className="text-xs text-muted-foreground">هرچه ستون بلندتر، بازار پرنوسان‌تر</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={merged} margin={{ top: 5, right: 5, left: -15, bottom: 5 }} barSize={4} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} interval={1} />
            <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => SYMBOLS.find(s => s.key === value)?.nameFa ?? value}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
            {SYMBOLS.map(s => (
              <Bar key={s.key} dataKey={s.key} name={s.key} fill={s.color} opacity={0.85} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
