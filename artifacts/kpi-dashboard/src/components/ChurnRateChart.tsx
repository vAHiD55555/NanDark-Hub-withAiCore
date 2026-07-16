import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetChurnMetrics, getGetChurnMetricsQueryKey, GetChurnMetricsPeriod } from '@workspace/api-client-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { formatPercent } from '@/lib/formatters';

interface ChurnRateChartProps {
  period: GetChurnMetricsPeriod;
}

export function ChurnRateChart({ period }: ChurnRateChartProps) {
  const { data, isLoading } = useGetChurnMetrics(
    { period },
    { query: { enabled: true, queryKey: getGetChurnMetricsQueryKey({ period }) } }
  );

  if (isLoading || !data) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Churn Rate</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Skeleton className="w-full h-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 bg-card/50 backdrop-blur-sm border-white/5">
      <CardHeader>
        <CardTitle className="text-base font-medium tracking-tight">Monthly Churn Rate (%)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--foreground))', fontFamily: 'var(--font-mono)' }}
                formatter={(value: number) => [formatPercent(value), 'Churn Rate']}
              />
              <Line 
                type="monotone" 
                dataKey="churnRate" 
                stroke="hsl(var(--chart-5))" 
                strokeWidth={2}
                dot={{ r: 4, fill: 'hsl(var(--card))', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: 'hsl(var(--chart-5))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
