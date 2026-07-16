import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetUserSegments, getGetUserSegmentsQueryKey } from '@workspace/api-client-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatCurrency, formatPercent } from '@/lib/formatters';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function UserSegments() {
  const { data, isLoading } = useGetUserSegments({
    query: { enabled: true, queryKey: getGetUserSegmentsQueryKey() }
  });

  if (isLoading || !data) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>User Segments</CardTitle>
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
        <CardTitle className="text-base font-medium tracking-tight">Revenue by Segment</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-between">
        <div className="h-[180px] w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="mrr"
                nameKey="plan"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--foreground))', fontFamily: 'var(--font-mono)' }}
                formatter={(value: number) => formatCurrency(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full flex flex-col space-y-3">
          {data.map((segment, index) => (
            <div key={segment.plan} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-3 h-3 rounded-full shrink-0" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                />
                <div>
                  <div className="font-medium text-sm leading-tight">{segment.plan}</div>
                  <div className="text-xs text-muted-foreground">{segment.users} users ({formatPercent(segment.percentage)})</div>
                </div>
              </div>
              <div className="font-mono text-sm font-semibold">
                {formatCurrency(segment.mrr)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
