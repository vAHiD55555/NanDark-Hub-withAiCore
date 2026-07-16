import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FinancialKPICards } from '../components/FinancialKPICards';
import { PriceTrendChart } from '../components/PriceTrendChart';
import { CreativePickPanel } from '../components/CreativePickPanel';
import { VolatilityChart } from '../components/VolatilityChart';

export type FinancialPeriod = '7d' | '30d' | '90d' | '1y';

export default function Dashboard() {
  const [period, setPeriod] = useState<FinancialPeriod>('90d');

  return (
    <div className="min-h-[100dvh] bg-background text-foreground pb-20" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-primary-foreground shadow-[0_0_15px_rgba(0,184,217,0.5)] text-xs">
              MKT
            </div>
            <span className="font-semibold text-lg tracking-tight">رصد بازار جهانی</span>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>بازه زمانی:</span>
            <Select value={period} onValueChange={(v) => setPeriod(v as FinancialPeriod)}>
              <SelectTrigger className="w-[120px] h-8 bg-card/50 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">۷ روز</SelectItem>
                <SelectItem value="30d">۳۰ روز</SelectItem>
                <SelectItem value="90d">۹۰ روز</SelectItem>
                <SelectItem value="1y">۱ سال</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">شاخص‌های کلیدی بازار</h1>
          <p className="text-muted-foreground mt-1">قیمت لحظه‌ای و تغییرات BTC، ETH، طلا، دلار و آیتم پیشنهادی</p>
        </div>

        {/* KPI Price Cards */}
        <FinancialKPICards />

        {/* Price Trend Chart + Creative Pick */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <PriceTrendChart period={period} />
          </div>
          <div className="xl:col-span-1">
            <CreativePickPanel />
          </div>
        </div>

        {/* Volatility per instrument */}
        <VolatilityChart period={period} />
      </main>
    </div>
  );
}
