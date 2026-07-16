import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetRetentionCohorts, getGetRetentionCohortsQueryKey } from '@workspace/api-client-react';
import { formatPercent } from '@/lib/formatters';

export function RetentionHeatmap() {
  const { data, isLoading } = useGetRetentionCohorts(
    { cohorts: 6 },
    { query: { enabled: true, queryKey: getGetRetentionCohortsQueryKey({ cohorts: 6 }) } }
  );

  if (isLoading || !data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>کوهورت‌های نگهداشت</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Skeleton className="w-full h-full" />
        </CardContent>
      </Card>
    );
  }

  // Find max months to show
  const maxMonths = Math.max(...data.map(c => c.retention.length));

  // Heatmap color logic
  const getCellColor = (value: number | null) => {
    if (value === null) return 'bg-transparent';
    // Mapped from 0-100 to opacity. 100% -> primary color full opacity
    // But since retention drops, let's use a scale where >80% is strong, <20% is weak
    const intensity = Math.max(0.1, value / 100);
    return `rgba(0, 184, 217, ${intensity})`; // Using --chart-1 equivalent color conceptually, but doing inline rgba for simplicity
  };

  return (
    <Card className="w-full bg-card/50 backdrop-blur-sm border-white/5">
      <CardHeader>
        <CardTitle className="text-base font-medium tracking-tight">کوهورت‌های نگهداشت (۶ ماه اخیر)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground border-b border-border/50 w-32">کوهورت</th>
                <th className="px-4 py-3 font-medium text-muted-foreground border-b border-border/50 text-right w-24">کاربران</th>
                {[...Array(maxMonths)].map((_, i) => (
                  <th key={i} className="px-4 py-3 font-medium text-muted-foreground border-b border-border/50 text-center w-16">
                    M{i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((cohort, i) => (
                <tr key={i} className="border-b border-border/10 last:border-0">
                  <td className="px-4 py-3 font-medium">{cohort.cohortMonth}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{cohort.cohortSize}</td>
                  {[...Array(maxMonths)].map((_, monthIdx) => {
                    const value = cohort.retention[monthIdx];
                    return (
                      <td key={monthIdx} className="p-1">
                        {value !== undefined && value !== null ? (
                          <div 
                            className="flex items-center justify-center h-10 w-full rounded-sm font-mono text-xs font-medium"
                            style={{ 
                              backgroundColor: getCellColor(value),
                              color: value > 50 ? '#000' : 'hsl(var(--foreground))'
                            }}
                          >
                            {formatPercent(value)}
                          </div>
                        ) : (
                          <div className="h-10 w-full flex items-center justify-center text-muted-foreground/30">
                            -
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
