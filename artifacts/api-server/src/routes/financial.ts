import { Router } from "express";
import { db } from "@workspace/db";
import { financialInstrumentsTable, financialPriceHistoryTable } from "@workspace/db";
import { desc, eq, gte, and } from "drizzle-orm";

const financialRouter = Router();

function periodToDays(period: string | undefined): number {
  switch (period) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    default: return 365;
  }
}

function cutoffDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().substring(0, 10);
}

// GET /api/financial/instruments
financialRouter.get("/financial/instruments", async (_req, res) => {
  const rows = await db
    .select()
    .from(financialInstrumentsTable)
    .orderBy(financialInstrumentsTable.id);
  res.json(rows);
});

// GET /api/financial/summary
financialRouter.get("/financial/summary", async (_req, res) => {
  const instruments = await db.select().from(financialInstrumentsTable);

  const results = await Promise.all(
    instruments.map(async (inst) => {
      // Latest 2 days for change calculation
      const latest = await db
        .select()
        .from(financialPriceHistoryTable)
        .where(eq(financialPriceHistoryTable.symbol, inst.symbol))
        .orderBy(desc(financialPriceHistoryTable.date))
        .limit(2);

      const current = latest[0];
      const prev = latest[1];

      if (!current) return null;

      const close = parseFloat(current.close as string);
      const prevClose = prev ? parseFloat(prev.close as string) : close;
      const change24h = ((close - prevClose) / prevClose) * 100;

      // 7-day and 30-day change
      const week = await db
        .select()
        .from(financialPriceHistoryTable)
        .where(
          and(
            eq(financialPriceHistoryTable.symbol, inst.symbol),
            gte(financialPriceHistoryTable.date, cutoffDate(8))
          )
        )
        .orderBy(financialPriceHistoryTable.date)
        .limit(1);

      const month = await db
        .select()
        .from(financialPriceHistoryTable)
        .where(
          and(
            eq(financialPriceHistoryTable.symbol, inst.symbol),
            gte(financialPriceHistoryTable.date, cutoffDate(32))
          )
        )
        .orderBy(financialPriceHistoryTable.date)
        .limit(1);

      const change7d = week[0]
        ? ((close - parseFloat(week[0].close as string)) / parseFloat(week[0].close as string)) * 100
        : 0;
      const change30d = month[0]
        ? ((close - parseFloat(month[0].close as string)) / parseFloat(month[0].close as string)) * 100
        : 0;

      return {
        symbol: inst.symbol,
        name: inst.name,
        nameFa: inst.nameFa,
        unit: inst.unit,
        category: inst.category,
        isCreativePick: inst.isCreativePick === 1,
        price: parseFloat(close.toFixed(4)),
        change24h: parseFloat(change24h.toFixed(2)),
        change7d: parseFloat(change7d.toFixed(2)),
        change30d: parseFloat(change30d.toFixed(2)),
        high24h: parseFloat((current.high as string)),
        low24h: parseFloat((current.low as string)),
      };
    })
  );

  res.json(results.filter(Boolean));
});

// GET /api/financial/prices/:symbol
financialRouter.get("/financial/prices/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const days = periodToDays(req.query.period as string | undefined);
  const cutoff = cutoffDate(days);

  const rows = await db
    .select()
    .from(financialPriceHistoryTable)
    .where(
      and(
        eq(financialPriceHistoryTable.symbol, symbol.toUpperCase()),
        gte(financialPriceHistoryTable.date, cutoff)
      )
    )
    .orderBy(financialPriceHistoryTable.date);

  if (rows.length === 0) {
    res.status(404).json({ error: "No data found for symbol" });
    return;
  }

  const basePrice = parseFloat(rows[0].close as string);

  const result = rows.map((r) => ({
    date: r.date,
    open: parseFloat(r.open as string),
    high: parseFloat(r.high as string),
    low: parseFloat(r.low as string),
    close: parseFloat(r.close as string),
    changePct: parseFloat(r.changePct as string),
    normalizedPct: ((parseFloat(r.close as string) - basePrice) / basePrice) * 100,
  }));

  res.json(result);
});

// GET /api/financial/creative-pick
financialRouter.get("/financial/creative-pick", async (_req, res) => {
  // Get Copper's last 90 days for trend
  const rows = await db
    .select()
    .from(financialPriceHistoryTable)
    .where(
      and(
        eq(financialPriceHistoryTable.symbol, "COPPER"),
        gte(financialPriceHistoryTable.date, cutoffDate(90))
      )
    )
    .orderBy(financialPriceHistoryTable.date);

  const latest = rows[rows.length - 1];
  const oldest = rows[0];

  const price = latest ? parseFloat(latest.close as string) : 0;
  const priceStart = oldest ? parseFloat(oldest.close as string) : price;
  const change90d = ((price - priceStart) / priceStart) * 100;

  res.json({
    symbol: "COPPER",
    nameFa: "مس",
    name: "Copper",
    unit: "USD/lb",
    price,
    change90d: parseFloat(change90d.toFixed(2)),
    potentialScore: 87,
    thesis: {
      title: "انقلاب انرژی، کلید مس",
      summary:
        "مس به‌عنوان فلز محوری زیرساخت AI، خودروهای برقی و انرژی‌های تجدیدپذیر در موقعیت استراتژیک قرار دارد.",
      catalysts: [
        "مراکز داده AI به مس فراوان برای سیم‌کشی و خنک‌سازی نیاز دارند",
        "هر خودرو برقی ۴ برابر مس یک خودرو معمولی مصرف می‌کند",
        "پنل‌های خورشیدی و توربین‌های بادی از مس‌محورترین تجهیزات صنعتی‌اند",
        "معادن اصلی در شیلی و پرو با محدودیت ظرفیت روبرو هستند",
      ],
      risks: [
        "کاهش رشد اقتصادی چین ممکن است تقاضا را کوتاه‌مدت کاهش دهد",
        "نوسان ارز در کشورهای استخراج‌کننده اصلی",
      ],
      targetPrice: parseFloat((price * 1.22).toFixed(2)),
      horizon: "۶-۱۲ ماه",
    },
    priceHistory: rows.map((r) => ({
      date: r.date,
      close: parseFloat(r.close as string),
      normalizedPct: ((parseFloat(r.close as string) - priceStart) / priceStart) * 100,
    })),
  });
});

export default financialRouter;
