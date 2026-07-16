import { Router } from "express";
import { db } from "@workspace/db";
import { monthlyMetricsTable, cohortRetentionTable, userSegmentsTable } from "@workspace/db";
import { desc, gte, sql, inArray } from "drizzle-orm";

const metricsRouter = Router();

// Helper: parse period param to number of months
function periodToMonths(period: string | undefined): number {
  switch (period) {
    case "3m": return 3;
    case "6m": return 6;
    case "24m": return 24;
    default: return 12;
  }
}

// GET /api/metrics/summary
metricsRouter.get("/metrics/summary", async (req, res) => {
  const rows = await db
    .select()
    .from(monthlyMetricsTable)
    .orderBy(desc(monthlyMetricsTable.month))
    .limit(2);

  if (rows.length === 0) {
    res.status(404).json({ error: "No metrics data available" });
    return;
  }

  const current = rows[0];
  const prior = rows[1];

  const totalUsers = current.cumulativeUsers;
  const activeUsers = current.cumulativeUsers - current.churnedUsers;
  const monthlyChurnRate = parseFloat(current.churnRate as string);
  const annualChurnRate = parseFloat((1 - Math.pow(1 - monthlyChurnRate / 100, 12)).toFixed(3)) * 100;
  const retentionRate = parseFloat(current.retentionRate as string);
  const mrr = parseFloat(current.mrr as string);
  const arr = mrr * 12;

  const totalUsersDelta = prior
    ? ((current.cumulativeUsers - prior.cumulativeUsers) / prior.cumulativeUsers) * 100
    : 0;
  const mrrDelta = prior && parseFloat(prior.mrr as string) > 0
    ? ((mrr - parseFloat(prior.mrr as string)) / parseFloat(prior.mrr as string)) * 100
    : 0;
  const churnRateDelta = prior
    ? monthlyChurnRate - parseFloat(prior.churnRate as string)
    : 0;
  const retentionRateDelta = prior
    ? retentionRate - parseFloat(prior.retentionRate as string)
    : 0;

  res.json({
    totalUsers,
    activeUsers,
    monthlyChurnRate,
    annualChurnRate: parseFloat(annualChurnRate.toFixed(2)),
    retentionRate,
    mrr,
    arr,
    newUsersThisMonth: current.newUsers,
    churnedUsersThisMonth: current.churnedUsers,
    totalUsersDelta: parseFloat(totalUsersDelta.toFixed(2)),
    mrrDelta: parseFloat(mrrDelta.toFixed(2)),
    churnRateDelta: parseFloat(churnRateDelta.toFixed(2)),
    retentionRateDelta: parseFloat(retentionRateDelta.toFixed(2)),
  });
});

// GET /api/metrics/user-growth
metricsRouter.get("/metrics/user-growth", async (req, res) => {
  const months = periodToMonths(req.query.period as string | undefined);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().substring(0, 10);

  const rows = await db
    .select()
    .from(monthlyMetricsTable)
    .where(gte(monthlyMetricsTable.month, cutoffStr))
    .orderBy(monthlyMetricsTable.month);

  const result = rows.map((r) => ({
    month: new Date(r.month).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    newUsers: r.newUsers,
    churnedUsers: r.churnedUsers,
    netNewUsers: r.newUsers - r.churnedUsers,
    cumulativeUsers: r.cumulativeUsers,
  }));

  res.json(result);
});

// GET /api/metrics/churn
metricsRouter.get("/metrics/churn", async (req, res) => {
  const months = periodToMonths(req.query.period as string | undefined);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().substring(0, 10);

  const rows = await db
    .select()
    .from(monthlyMetricsTable)
    .where(gte(monthlyMetricsTable.month, cutoffStr))
    .orderBy(monthlyMetricsTable.month);

  const result = rows.map((r) => ({
    month: new Date(r.month).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    churnRate: parseFloat(r.churnRate as string),
    churnedUsers: r.churnedUsers,
    atRiskUsers: r.atRiskUsers,
  }));

  res.json(result);
});

// GET /api/metrics/retention
metricsRouter.get("/metrics/retention", async (req, res) => {
  const numCohorts = Math.min(12, Math.max(3, parseInt(req.query.cohorts as string ?? "6", 10) || 6));

  // Get the most recent N distinct cohort months
  const cohortMonths = await db
    .selectDistinct({ cohortMonth: cohortRetentionTable.cohortMonth })
    .from(cohortRetentionTable)
    .orderBy(desc(cohortRetentionTable.cohortMonth))
    .limit(numCohorts);

  const cohortMonthValues = cohortMonths.map((c) => c.cohortMonth);

  if (cohortMonthValues.length === 0) {
    res.json([]);
    return;
  }

  const allRows = await db
    .select()
    .from(cohortRetentionTable)
    .where(inArray(cohortRetentionTable.cohortMonth, cohortMonthValues))
    .orderBy(cohortRetentionTable.cohortMonth, cohortRetentionTable.monthOffset);

  // Group by cohort month
  const grouped = new Map<string, { cohortSize: number; retention: (number | null)[] }>();

  for (const row of allRows) {
    const key = row.cohortMonth;
    if (!grouped.has(key)) {
      grouped.set(key, { cohortSize: row.cohortSize, retention: [] });
    }
    const cohort = grouped.get(key)!;
    cohort.retention[row.monthOffset] = parseFloat(row.retentionRate as string);
  }

  // Determine max offset across all cohorts
  let maxOffset = 0;
  for (const [, v] of grouped) {
    maxOffset = Math.max(maxOffset, v.retention.length - 1);
  }

  const result = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cohortMonth, { cohortSize, retention }]) => {
      const padded: (number | null)[] = Array.from({ length: maxOffset + 1 }, (_, i) =>
        retention[i] !== undefined ? retention[i] : null
      );
      return {
        cohortMonth: new Date(cohortMonth).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        cohortSize,
        retention: padded,
      };
    });

  res.json(result);
});

// GET /api/metrics/mrr
metricsRouter.get("/metrics/mrr", async (req, res) => {
  const months = periodToMonths(req.query.period as string | undefined);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().substring(0, 10);

  const rows = await db
    .select()
    .from(monthlyMetricsTable)
    .where(gte(monthlyMetricsTable.month, cutoffStr))
    .orderBy(monthlyMetricsTable.month);

  const result = rows.map((r) => ({
    month: new Date(r.month).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    mrr: parseFloat(r.mrr as string),
    newMrr: parseFloat(r.newMrr as string),
    expansionMrr: parseFloat(r.expansionMrr as string),
    churnedMrr: parseFloat(r.churnedMrr as string),
    netNewMrr:
      parseFloat(r.newMrr as string) +
      parseFloat(r.expansionMrr as string) -
      parseFloat(r.churnedMrr as string),
  }));

  res.json(result);
});

// GET /api/metrics/segments
metricsRouter.get("/metrics/segments", async (req, res) => {
  const rows = await db.select().from(userSegmentsTable).orderBy(desc(userSegmentsTable.users));
  const total = rows.reduce((sum, r) => sum + r.users, 0);

  const result = rows.map((r) => ({
    plan: r.plan,
    users: r.users,
    percentage: total > 0 ? parseFloat(((r.users / total) * 100).toFixed(1)) : 0,
    mrr: parseFloat(r.mrr as string),
  }));

  res.json(result);
});

export default metricsRouter;
