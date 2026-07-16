import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetMrrTrend, getGetMrrTrendQueryKey, GetMrrTrendPeriod } from '@workspace/api-client-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/lib/formatters';

interface MRRTrendChartProps {
  period: GetMrrTrendPeriod;
}

export function MRRTrendChart({ period }: MRRTrendChartProps) {
  const { data, isLoading } = useGetMrrTrend(
    { period },
    { query: { enabled: true, queryKey: getGetMrrTrendQueryKey({ period }) } }
  );

  if (isLoading || !data) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>MRR Movement</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Skeleton className="w-full h-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2 bg-card/50 backdrop-blur-sm border-white/5">
      <CardHeader>
        <CardTitle className="text-base font-medium tracking-tight">Net MRR Movement</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                tickFormatter={(val) => `$${val / 1000}k`}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ fontFamily: 'var(--font-mono)' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend 
                iconType="circle" 
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} 
              />
              <Bar dataKey="newMrr" name="New MRR" stackId="a" fill="hsl(var(--chart-4))" radius={[0, 0, 4, 4]} />
              <Bar dataKey="expansionMrr" name="Expansion MRR" stackId="a" fill="hsl(var(--chart-1))" />
              <Bar dataKey="churnedMrr" name="Churned MRR" stackId="a" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
