import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/formatters';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useGetMetricsSummary, getGetMetricsSummaryQueryKey } from '@workspace/api-client-react';

export function KPICards() {
  const { data, isLoading } = useGetMetricsSummary({
    query: { enabled: true, queryKey: getGetMetricsSummaryQueryKey() }
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      title: 'کل کاربران فعال',
      value: formatNumber(data.activeUsers),
      delta: data.totalUsersDelta,
      deltaLabel: 'نسبت به ماه قبل',
      inverseDelta: false,
    },
    {
      title: 'درآمد ماهانه تکرارشونده',
      value: formatCurrency(data.mrr),
      delta: data.mrrDelta,
      deltaLabel: 'نسبت به ماه قبل',
      inverseDelta: false,
    },
    {
      title: 'نرخ ریزش ماهانه',
      value: formatPercent(data.monthlyChurnRate),
      delta: data.churnRateDelta,
      deltaLabel: 'نسبت به ماه قبل',
      inverseDelta: true,
    },
    {
      title: 'نرخ نگهداشت',
      value: formatPercent(data.retentionRate),
      delta: data.retentionRateDelta,
      deltaLabel: 'نسبت به ماه قبل',
      inverseDelta: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {kpis.map((kpi, i) => {
        const isPositiveDelta = kpi.delta > 0;
        const isNeutral = kpi.delta === 0;
        
        let isGood = isPositiveDelta;
        if (kpi.inverseDelta) {
          isGood = !isPositiveDelta;
        }
        
        return (
          <Card key={i} className="bg-card/50 backdrop-blur-sm border-white/5 relative overflow-hidden group">
            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {kpi.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-semibold tracking-tight text-foreground">
                {kpi.value}
              </div>
              <div className="flex items-center mt-2 space-x-2">
                <span
                  className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-sm ${
                    isNeutral
                      ? 'bg-muted text-muted-foreground'
                      : isGood
                      ? 'bg-success/10 text-success'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {isNeutral ? (
                    <Minus className="w-3 h-3 mr-1" />
                  ) : isGood ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  )}
                  {Math.abs(kpi.delta).toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">{kpi.deltaLabel}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
