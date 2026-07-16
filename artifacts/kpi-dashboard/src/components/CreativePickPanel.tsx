import React from 'react';
import { useGetCreativePick } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp, AlertTriangle, Target, Zap, RefreshCw } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

const SYMBOL_COLORS: Record<string, string> = {
  BTC: '#f59e0b',
  ETH: '#818cf8',
  GOLD: '#fcd34d',
  DXY: '#38bdf8',
  COPPER: '#fb923c',
};

export function CreativePickPanel() {
  const { data, isLoading, refetch, isFetching } = useGetCreativePick();

  if (isLoading) return <Card className="bg-card/50 border-white/10 h-full min-h-96 animate-pulse" />;
  if (!data) return null;

  const chartData = data.priceHistory.map(p => ({
    date: p.date.substring(5),
    pct: parseFloat(p.normalizedPct.toFixed(2)),
  }));

  const isPositive = data.change90d >= 0;
  const pickColor = SYMBOL_COLORS[data.symbol] ?? '#f59e0b';

  const scoreColor =
    data.potentialScore >= 85 ? 'text-emerald-400' :
    data.potentialScore >= 70 ? 'text-amber-400' : 'text-rose-400';

  // Sort allScores descending for display
  const sortedScores = [...(data.allScores ?? [])].sort((a, b) => b.score - a.score);
  const maxScore = sortedScores[0]?.score ?? 100;

  return (
    <Card className="border-white/20 h-full" style={{ background: `${pickColor}10`, borderColor: `${pickColor}40` }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: pickColor }} />
            <CardTitle className="text-base" style={{ color: pickColor }}>
              آیتم پیشنهادی هوش مصنوعی
            </CardTitle>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 border border-white/10 rounded px-2 py-1"
          >
            <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} />
            استعلام مجدد
          </button>
        </div>
        <p className="text-xs text-muted-foreground">محاسبه‌شده لحظه‌ای از داده‌های ۹۰ روز اخیر</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Winner header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-bold" style={{ color: pickColor }}>{data.nameFa}</p>
            <p className="text-sm text-muted-foreground font-mono">{data.symbol} · {data.unit}</p>
          </div>
          <div className="text-left">
            <p className="text-xl font-bold tabular-nums">
              {data.unit === 'USD' || data.unit === 'USD/oz'
                ? `$${data.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                : `$${data.price.toFixed(3)}`}
            </p>
            <p className={`text-xs flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              <TrendingUp size={11} />
              {isPositive ? '+' : ''}{data.change90d.toFixed(2)}% (۹۰ روز)
            </p>
          </div>
        </div>

        {/* Score Competition — all instruments ranked */}
        <div className="bg-black/20 rounded-lg p-3 space-y-2">
          <p className="text-xs text-muted-foreground mb-3">رقابت امتیازها — این لحظه</p>
          {sortedScores.map((s, idx) => {
            const color = SYMBOL_COLORS[s.symbol] ?? '#888';
            const isWinner = s.symbol === data.symbol;
            const pct = maxScore > 0 ? (s.score / maxScore) * 100 : 0;
            return (
              <div key={s.symbol}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {isWinner && <Sparkles size={10} style={{ color }} />}
                    <span className={`text-xs ${isWinner ? 'font-bold' : 'text-muted-foreground'}`}
                      style={isWinner ? { color } : {}}>
                      {idx + 1}. {s.nameFa}
                    </span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${isWinner ? scoreColor : 'text-muted-foreground'}`}>
                    {s.score}
                  </span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1">
                  <div
                    className="h-1 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: isWinner ? color : '#374151' }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Mini chart */}
        <ResponsiveContainer width="100%" height={72}>
          <AreaChart data={chartData} margin={{ top: 2, right: 2, left: -30, bottom: 2 }}>
            <defs>
              <linearGradient id="pickGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={pickColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={pickColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: '#1c1917', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
              formatter={(v: any) => [`${parseFloat(v) >= 0 ? '+' : ''}${parseFloat(v).toFixed(2)}%`, 'بازدهی']}
            />
            <Area type="monotone" dataKey="pct" stroke={pickColor} strokeWidth={1.5} fill="url(#pickGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>

        {/* Thesis */}
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Zap size={13} style={{ color: pickColor }} />
            <p className="text-xs font-semibold" style={{ color: pickColor }}>{data.thesis.title}</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{data.thesis.summary}</p>
        </div>

        {/* Catalysts */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={12} className="text-emerald-400" />
            <p className="text-xs font-semibold text-emerald-400">محرک‌های رشد</p>
          </div>
          <ul className="space-y-1">
            {data.thesis.catalysts.map((c, i) => (
              <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                <span className="text-emerald-500 mt-0.5 shrink-0">▸</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Risks */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={12} className="text-rose-400" />
            <p className="text-xs font-semibold text-rose-400">ریسک‌ها</p>
          </div>
          <ul className="space-y-1">
            {data.thesis.risks.map((r, i) => (
              <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                <span className="text-rose-500 mt-0.5 shrink-0">▸</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Target price */}
        <div className="flex items-center justify-between bg-black/20 rounded-lg p-3">
          <div className="flex items-center gap-1.5">
            <Target size={13} style={{ color: pickColor }} />
            <span className="text-xs text-muted-foreground">قیمت هدف</span>
          </div>
          <div className="text-left">
            <span className="text-sm font-bold" style={{ color: pickColor }}>
              {data.unit === 'USD' || data.unit === 'USD/oz'
                ? `$${data.thesis.targetPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                : `$${data.thesis.targetPrice.toFixed(3)}`}
            </span>
            <span className="text-xs text-muted-foreground mr-2">· {data.thesis.horizon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
