import React, { useEffect, useRef, useState, useReducer } from 'react';
import { useGetFinancialSummary } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';

function formatPrice(price: number, unit: string): string {
  if (unit === 'USD') {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    return `$${price.toFixed(2)}`;
  }
  if (unit === 'USD/oz') {
    if (price >= 500) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    return `$${price.toFixed(2)}`;
  }
  if (unit === 'USD/lb') return `$${price.toFixed(3)}`;
  return price.toFixed(2);
}

function ChangeTag({ value, label }: { value: number; label: string }) {
  const positive = value > 0;
  const neutral = Math.abs(value) < 0.01;
  return (
    <div className={`flex items-center gap-1 text-xs ${neutral ? 'text-muted-foreground' : positive ? 'text-emerald-400' : 'text-rose-400'}`}>
      {neutral ? <Minus size={11} /> : positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      <span className="tabular-nums">{positive && !neutral ? '+' : ''}{value.toFixed(2)}%</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

interface FlashCardProps {
  item: {
    symbol: string;
    name?: string;
    nameFa?: string;
    unit?: string;
    category?: string;
    isCreativePick?: boolean;
    price: number;
    change24h: number;
    change7d: number;
    change30d: number;
  };
  flash: 'up' | 'down' | null;
}

function FlashCard({ item, flash }: FlashCardProps) {
  return (
    <Card
      className={`relative bg-card/50 border-white/10 overflow-hidden transition-all duration-300 hover:border-white/20 ${
        item.isCreativePick ? 'border-amber-500/40 bg-amber-950/20' : ''
      } ${flash === 'up' ? 'card-flash-up' : flash === 'down' ? 'card-flash-down' : ''}`}
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

        <p className={`text-2xl font-bold tabular-nums tracking-tight transition-all duration-300 ${
          flash === 'up' ? 'price-flash-up' : flash === 'down' ? 'price-flash-down' : ''
        }`}>
          {formatPrice(item.price, item.unit ?? 'USD')}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5 mb-3">{item.unit}</p>

        <div className="space-y-1">
          <ChangeTag value={item.change24h} label="۲۴ ساعت" />
          <ChangeTag value={item.change7d} label="۷ روز" />
          <ChangeTag value={item.change30d} label="۳۰ روز" />
        </div>
      </CardContent>
    </Card>
  );
}

export function FinancialKPICards() {
  const { data, isLoading, dataUpdatedAt } = useGetFinancialSummary({
    query: { refetchInterval: 15_000, refetchIntervalInBackground: true },
  });

  const prevPricesRef = useRef<Record<string, number>>({});
  const [flashStates, setFlashStates] = useState<Record<string, 'up' | 'down' | null>>({});

  // Detect price changes and trigger flash animation
  useEffect(() => {
    if (!data) return;
    const newFlashes: Record<string, 'up' | 'down'> = {};
    for (const item of data) {
      const prev = prevPricesRef.current[item.symbol];
      if (prev !== undefined && Math.abs(prev - item.price) > 0.0001) {
        newFlashes[item.symbol] = item.price > prev ? 'up' : 'down';
      }
      prevPricesRef.current[item.symbol] = item.price;
    }
    if (Object.keys(newFlashes).length > 0) {
      setFlashStates(newFlashes);
      const timer = setTimeout(() => setFlashStates({}), 900);
      return () => clearTimeout(timer);
    }
  }, [data]);

  // 1-second ticker for "last updated" counter
  const [, tick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const secondsAgo = dataUpdatedAt ? Math.floor((Date.now() - dataUpdatedAt) / 1000) : null;
  const nextIn = secondsAgo !== null ? Math.max(0, 15 - secondsAgo) : null;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-5" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-card/50 border-white/10 animate-pulse h-44" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Live status bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-emerald-400 font-medium tracking-wide text-[11px]">LIVE</span>
          <span className="text-muted-foreground/60">·</span>
          <span>بروزرسانی خودکار هر ۱۵ ثانیه</span>
        </div>
        {secondsAgo !== null && (
          <span className="tabular-nums text-[11px]">
            {secondsAgo === 0 ? 'همین الان' : `${secondsAgo} ثانیه پیش`}
            {nextIn !== null && nextIn > 0 && (
              <span className="text-muted-foreground/50 mr-1">· بعدی: {nextIn}ث</span>
            )}
          </span>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {data?.map((item) => (
          <FlashCard
            key={item.symbol}
            item={item as any}
            flash={flashStates[item.symbol] ?? null}
          />
        ))}
      </div>
    </div>
  );
}
