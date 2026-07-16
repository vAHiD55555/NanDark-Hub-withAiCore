import React from 'react';
import { useGetCreativePick } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp, AlertTriangle, Target, Zap } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

export function CreativePickPanel() {
  const { data, isLoading } = useGetCreativePick();

  if (isLoading) return <Card className="bg-card/50 border-white/10 h-full min-h-96 animate-pulse" />;
  if (!data) return null;

  const chartData = data.priceHistory.map(p => ({
    date: p.date.substring(5),
    pct: parseFloat(p.normalizedPct.toFixed(2)),
  }));

  const isPositive = data.change90d >= 0;
  const scoreColor =
    data.potentialScore >= 80 ? 'text-emerald-400' :
    data.potentialScore >= 60 ? 'text-amber-400' : 'text-rose-400';

  return (
    <Card className="bg-amber-950/20 border-amber-500/30 h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-amber-400" />
          <CardTitle className="text-base text-amber-300">آیتم پیشنهادی هوش مصنوعی</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">گزینه‌ای با پتانسیل بالا برای سرمایه‌گذاری</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-bold text-amber-100">{data.nameFa}</p>
            <p className="text-sm text-muted-foreground font-mono">{data.symbol} · {data.unit}</p>
          </div>
          <div className="text-left">
            <p className="text-xl font-bold tabular-nums">${data.price.toFixed(3)}</p>
            <p className={`text-xs flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              <TrendingUp size={11} />
              {isPositive ? '+' : ''}{data.change90d.toFixed(2)}% (۹۰ روز)
            </p>
          </div>
        </div>

        {/* Potential Score */}
        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">امتیاز پتانسیل</span>
            <span className={`text-lg font-bold ${scoreColor}`}>{data.potentialScore}/100</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all"
              style={{ width: `${data.potentialScore}%` }}
            />
          </div>
        </div>

        {/* Mini Chart */}
        <ResponsiveContainer width="100%" height={80}>
          <AreaChart data={chartData} margin={{ top: 2, right: 2, left: -30, bottom: 2 }}>
            <defs>
              <linearGradient id="copperGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: '#1c1917', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
              formatter={(v: any) => [`${parseFloat(v) >= 0 ? '+' : ''}${parseFloat(v).toFixed(2)}%`, 'بازدهی']}
            />
            <Area
              type="monotone"
              dataKey="pct"
              stroke="#f59e0b"
              strokeWidth={1.5}
              fill="url(#copperGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Thesis title */}
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Zap size={13} className="text-amber-400" />
            <p className="text-xs font-semibold text-amber-300">{data.thesis.title}</p>
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
                <span className="text-emerald-500 mt-0.5">▸</span>
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
                <span className="text-rose-500 mt-0.5">▸</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Target */}
        <div className="flex items-center justify-between bg-black/20 rounded-lg p-3">
          <div className="flex items-center gap-1.5">
            <Target size={13} className="text-amber-400" />
            <span className="text-xs text-muted-foreground">قیمت هدف</span>
          </div>
          <div className="text-left">
            <span className="text-sm font-bold text-amber-300">${data.thesis.targetPrice.toFixed(3)}</span>
            <span className="text-xs text-muted-foreground mr-2">· {data.thesis.horizon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
