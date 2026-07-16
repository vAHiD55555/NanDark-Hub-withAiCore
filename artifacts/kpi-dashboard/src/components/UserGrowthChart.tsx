import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetUserGrowth, getGetUserGrowthQueryKey, GetUserGrowthPeriod } from '@workspace/api-client-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { formatNumber } from '@/lib/formatters';

interface UserGrowthChartProps {
  period: GetUserGrowthPeriod;
}

export function UserGrowthChart({ period }: UserGrowthChartProps) {
  const { data, isLoading } = useGetUserGrowth(
    { period },
    { query: { enabled: true, queryKey: getGetUserGrowthQueryKey({ period }) } }
  );

  if (isLoading || !data) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>رشد کاربران</CardTitle>
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
        <CardTitle className="text-base font-medium tracking-tight">روند کاربران فعال</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                tickFormatter={(val) => `${val / 1000}k`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--foreground))', fontFamily: 'var(--font-mono)' }}
                formatter={(value: number) => [formatNumber(value), 'کاربران فعال']}
              />
              <Area 
                type="monotone" 
                dataKey="cumulativeUsers" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorCumulative)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
