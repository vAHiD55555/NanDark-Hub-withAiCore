import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KPICards } from '../components/KPICards';
import { UserGrowthChart } from '../components/UserGrowthChart';
import { ChurnRateChart } from '../components/ChurnRateChart';
import { MRRTrendChart } from '../components/MRRTrendChart';
import { RetentionHeatmap } from '../components/RetentionHeatmap';
import { UserSegments } from '../components/UserSegments';
import { GetUserGrowthPeriod } from '@workspace/api-client-react';

export default function Dashboard() {
  const [period, setPeriod] = useState<GetUserGrowthPeriod>('12m');

  return (
    <div className="min-h-[100dvh] bg-background text-foreground pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-primary-foreground tracking-tighter shadow-[0_0_15px_rgba(0,184,217,0.5)]">
              NX
            </div>
            <span className="font-semibold text-lg tracking-tight">نکسوس آنالیتیکس</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>بازه زمانی:</span>
              <Select value={period} onValueChange={(val) => setPeriod(val as GetUserGrowthPeriod)}>
                <SelectTrigger className="w-[130px] h-8 bg-card/50 border-white/10">
                  <SelectValue placeholder="انتخاب بازه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3m">۳ ماه اخیر</SelectItem>
                  <SelectItem value="6m">۶ ماه اخیر</SelectItem>
                  <SelectItem value="12m">۱۲ ماه اخیر</SelectItem>
                  <SelectItem value="24m">۲۴ ماه اخیر</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
        <div className="flex flex-col space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">نمای کلی</h1>
          <p className="text-muted-foreground">شاخص‌های عملکرد SaaS شما در یک نگاه.</p>
        </div>

        <KPICards />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <UserGrowthChart period={period} />
          <ChurnRateChart period={period} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <MRRTrendChart period={period} />
          <UserSegments />
        </div>

        <div className="grid grid-cols-1 gap-6 mt-6">
          <RetentionHeatmap />
        </div>
      </main>
    </div>
  );
}
