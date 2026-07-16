import { pgTable, serial, text, integer, numeric, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Monthly snapshot of aggregated KPI data
export const monthlyMetricsTable = pgTable("monthly_metrics", {
  id: serial("id").primaryKey(),
  month: date("month").notNull().unique(), // e.g. '2025-01-01' (first of month)
  newUsers: integer("new_users").notNull().default(0),
  churnedUsers: integer("churned_users").notNull().default(0),
  cumulativeUsers: integer("cumulative_users").notNull().default(0),
  churnRate: numeric("churn_rate", { precision: 6, scale: 3 }).notNull().default("0"),
  retentionRate: numeric("retention_rate", { precision: 6, scale: 3 }).notNull().default("0"),
  mrr: numeric("mrr", { precision: 12, scale: 2 }).notNull().default("0"),
  newMrr: numeric("new_mrr", { precision: 12, scale: 2 }).notNull().default("0"),
  expansionMrr: numeric("expansion_mrr", { precision: 12, scale: 2 }).notNull().default("0"),
  churnedMrr: numeric("churned_mrr", { precision: 12, scale: 2 }).notNull().default("0"),
  atRiskUsers: integer("at_risk_users").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cohort retention table: one row per cohort+month combination
export const cohortRetentionTable = pgTable("cohort_retention", {
  id: serial("id").primaryKey(),
  cohortMonth: date("cohort_month").notNull(), // when users joined
  monthOffset: integer("month_offset").notNull(), // 0 = starting month, 1 = month after, etc.
  cohortSize: integer("cohort_size").notNull(),
  retainedUsers: integer("retained_users").notNull(),
  retentionRate: numeric("retention_rate", { precision: 6, scale: 3 }).notNull(),
});

// User plan segments snapshot (updated monthly)
export const userSegmentsTable = pgTable("user_segments", {
  id: serial("id").primaryKey(),
  plan: text("plan").notNull().unique(),
  users: integer("users").notNull().default(0),
  mrr: numeric("mrr", { precision: 12, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMonthlyMetricsSchema = createInsertSchema(monthlyMetricsTable).omit({ id: true, createdAt: true });
export type InsertMonthlyMetrics = z.infer<typeof insertMonthlyMetricsSchema>;
export type MonthlyMetrics = typeof monthlyMetricsTable.$inferSelect;

export const insertCohortRetentionSchema = createInsertSchema(cohortRetentionTable).omit({ id: true });
export type InsertCohortRetention = z.infer<typeof insertCohortRetentionSchema>;
export type CohortRetention = typeof cohortRetentionTable.$inferSelect;

export const insertUserSegmentSchema = createInsertSchema(userSegmentsTable).omit({ id: true, updatedAt: true });
export type InsertUserSegment = z.infer<typeof insertUserSegmentSchema>;
export type UserSegment = typeof userSegmentsTable.$inferSelect;
