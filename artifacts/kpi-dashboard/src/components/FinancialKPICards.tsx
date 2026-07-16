import React from 'react';
import { useGetFinancialSummary } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';

function formatPrice(price: number, unit: string): string {
  if (unit === 'USD') {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    return `$${price.toFixed(2)}`;
  }
  if (unit === 'USD/oz') return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (unit === 'USD/lb') return `$${price.toFixed(3)}`;
  return price.toFixed(2);
}

function ChangeTag({ value, label }: { value: number; label: string }) {
  const positive = value > 0;
  const neutral = Math.abs(value) < 0.01;
  return (
    <div className={`flex items-center gap-1 text-xs ${neutral ? 'text-muted-foreground' : positive ? 'text-emerald-400' : 'text-rose-400'}`}>
      {neutral ? <Minus size={11} /> : positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      <span>{positive && !neutral ? '+' : ''}{value.toFixed(2)}%</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

export function FinancialKPICards() {
  const { data, isLoading } = useGetFinancialSummary();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="bg-card/50 border-white/10 animate-pulse h-44" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {data?.map((item) => (
        <Card
          key={item.symbol}
          className={`relative bg-card/50 border-white/10 overflow-hidden transition-all hover:border-white/20 ${
            item.isCreativePick ? 'border-amber-500/40 bg-amber-950/20' : ''
          }`}
        >
          {item.isCreativePick && (
            <div className="absolute top-2 left-2">
              <Badge variant="outline" className="text-amber-400 border-amber-500/50 text-[10px] px-1.5 py-0 gap-1">
                <Sparkles size={9} />
                پیشنهاد
              </Badge>
            </div>
          )}
          <CardContent className="p-4 pt-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground font-mono">{item.symbol}</p>
                <p className="text-sm font-medium mt-0.5">{item.nameFa}</p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                item.category === 'crypto' ? 'bg-violet-500/20 text-violet-400' :
                item.category === 'commodity' ? 'bg-amber-500/20 text-amber-400' :
                'bg-sky-500/20 text-sky-400'
              }`}>
                {item.category === 'crypto' ? 'رمزارز' : item.category === 'commodity' ? 'کالا' : 'شاخص'}
              </span>
            </div>

            <p className="text-2xl font-bold tabular-nums tracking-tight">
              {formatPrice(item.price, item.unit)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 mb-3">{item.unit}</p>

            <div className="space-y-1">
              <ChangeTag value={item.change24h} label="۲۴ ساعت" />
              <ChangeTag value={item.change7d} label="۷ روز" />
              <ChangeTag value={item.change30d} label="۳۰ روز" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
