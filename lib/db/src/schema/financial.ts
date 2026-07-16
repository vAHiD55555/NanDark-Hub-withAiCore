import { pgTable, serial, text, numeric, date, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const financialInstrumentsTable = pgTable("financial_instruments", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  nameFa: text("name_fa").notNull(),
  unit: text("unit").notNull().default("USD"),
  category: text("category").notNull(),
  description: text("description"),
  isCreativePick: integer("is_creative_pick").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const financialPriceHistoryTable = pgTable("financial_price_history", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  date: date("date").notNull(),
  open: numeric("open", { precision: 16, scale: 4 }).notNull(),
  high: numeric("high", { precision: 16, scale: 4 }).notNull(),
  low: numeric("low", { precision: 16, scale: 4 }).notNull(),
  close: numeric("close", { precision: 16, scale: 4 }).notNull(),
  changePct: numeric("change_pct", { precision: 8, scale: 4 }).notNull().default("0"),
});

export const insertFinancialInstrumentSchema = createInsertSchema(financialInstrumentsTable).omit({ id: true, createdAt: true });
export type InsertFinancialInstrument = z.infer<typeof insertFinancialInstrumentSchema>;
export type FinancialInstrument = typeof financialInstrumentsTable.$inferSelect;

export const insertFinancialPriceHistorySchema = createInsertSchema(financialPriceHistoryTable).omit({ id: true });
export type InsertFinancialPriceHistory = z.infer<typeof insertFinancialPriceHistorySchema>;
export type FinancialPriceHistory = typeof financialPriceHistoryTable.$inferSelect;
