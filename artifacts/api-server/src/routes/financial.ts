import { Router } from "express";
import { db } from "@workspace/db";
import { financialInstrumentsTable, financialPriceHistoryTable } from "@workspace/db";
import { desc, eq, gte, and } from "drizzle-orm";
import {
  fetchYahooHistory,
  buildLiveSummary,
  type OhlcPoint,
} from "../services/marketData";

const financialRouter = Router();

const SYMBOLS = ["BTC", "ETH", "GOLD", "DXY", "COPPER"] as const;

function periodToDays(period: string | undefined): number {
  switch (period) {
    case "7d":  return 7;
    case "30d": return 30;
    case "90d": return 90;
    default:    return 365;
  }
}

function cutoffDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().substring(0, 10);
}

// ── DB fallback helpers ────────────────────────────────────────────────────

async function dbHistory(symbol: string, days: number): Promise<OhlcPoint[]> {
  const rows = await db
    .select()
    .from(financialPriceHistoryTable)
    .where(
      and(
        eq(financialPriceHistoryTable.symbol, symbol),
        gte(financialPriceHistoryTable.date, cutoffDate(days))
      )
    )
    .orderBy(financialPriceHistoryTable.date);

  if (rows.length === 0) return [];
  const base = parseFloat(rows[0].close as string);

  return rows.map((r) => {
    const close = parseFloat(r.close as string);
    return {
      date:          r.date,
      open:          parseFloat(r.open as string),
      high:          parseFloat(r.high as string),
      low:           parseFloat(r.low as string),
      close,
      changePct:     parseFloat(r.changePct as string),
      normalizedPct: parseFloat((((close - base) / base) * 100).toFixed(3)),
    };
  });
}

// GET /api/financial/instruments
financialRouter.get("/financial/instruments", async (_req, res) => {
  const rows = await db
    .select()
    .from(financialInstrumentsTable)
    .orderBy(financialInstrumentsTable.id);
  res.json(rows);
});

// GET /api/financial/summary  — live prices with DB fallback
financialRouter.get("/financial/summary", async (_req, res) => {
  const instruments = await db.select().from(financialInstrumentsTable);

  const results = await Promise.all(
    instruments.map(async (inst) => {
      // Try live data first
      const live = await buildLiveSummary(inst.symbol);
      if (live) {
        return {
          ...live,
          name:         inst.name,
          nameFa:       inst.nameFa,
          unit:         inst.unit,
          category:     inst.category,
          isCreativePick: inst.isCreativePick === 1,
          source:       "live" as const,
        };
      }

      // DB fallback
      const latest = await db
        .select()
        .from(financialPriceHistoryTable)
        .where(eq(financialPriceHistoryTable.symbol, inst.symbol))
        .orderBy(desc(financialPriceHistoryTable.date))
        .limit(2);

      const current = latest[0];
      const prev    = latest[1];
      if (!current) return null;

      const close    = parseFloat(current.close as string);
      const prevClose = prev ? parseFloat(prev.close as string) : close;

      return {
        symbol:        inst.symbol,
        name:          inst.name,
        nameFa:        inst.nameFa,
        unit:          inst.unit,
        category:      inst.category,
        isCreativePick: inst.isCreativePick === 1,
        price:         close,
        change24h:     ((close - prevClose) / prevClose) * 100,
        change7d:      0,
        change30d:     0,
        high24h:       parseFloat(current.high as string),
        low24h:        parseFloat(current.low as string),
        source:        "fallback" as const,
      };
    })
  );

  res.json(results.filter(Boolean));
});

// GET /api/financial/prices/:symbol  — live OHLC with DB fallback
financialRouter.get("/financial/prices/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const days   = periodToDays(req.query.period as string | undefined);

  // Try Yahoo Finance
  const live = await fetchYahooHistory(symbol, days);
  if (live && live.length > 0) {
    res.json(live);
    return;
  }

  // DB fallback
  const fallback = await dbHistory(symbol, days);
  if (fallback.length === 0) {
    res.status(404).json({ error: "No data found for symbol" });
    return;
  }
  res.json(fallback);
});

// ── Creative pick scoring ──────────────────────────────────────────────────

const THESES: Record<string, {
  title: string;
  summary: string;
  catalysts: string[];
  risks: string[];
  targetMultiplier: number;
  horizon: string;
}> = {
  BTC: {
    title: "پادشاه دارایی‌های دیجیتال",
    summary:
      "بیت‌کوین با تبدیل شدن به دارایی ذخیره ارزش نهادی و پذیرش ETF‌های اسپات، در موج جدید تقاضای سازمانی قرار دارد.",
    catalysts: [
      "پذیرش ETF اسپات توسط صندوق‌های بزرگ سرمایه‌گذاری",
      "هاوینگ بیت‌کوین عرضه جدید را به نصف کاهش داده است",
      "تقاضای کشورهای در حال توسعه برای پوشش در برابر تورم",
      "موجودی بیت‌کوین در صرافی‌ها به پایین‌ترین سطح تاریخی رسیده",
    ],
    risks: [
      "سیاست‌های سخت‌گیرانه‌تر نظارتی در آمریکا یا اروپا",
      "نوسان‌های شدید می‌تواند سرمایه‌گذاران نهادی محتاط را دور کند",
    ],
    targetMultiplier: 1.28,
    horizon: "۶-۱۲ ماه",
  },
  ETH: {
    title: "زیرساخت مالی نسل بعد",
    summary:
      "اتریوم با رشد DeFi، NFT و قراردادهای هوشمند، ستون اصلی اقتصاد بلاک‌چین باقی مانده و شبکه‌اش روز‌به‌روز پربازدیدتر می‌شود.",
    catalysts: [
      "درآمد شبکه از کارمزدها به رکوردهای تاریخی نزدیک می‌شود",
      "مکانیزم سوختن (EIP-1559) عرضه اتریوم را کمیاب‌تر کرده",
      "رشد لایه دوم (L2) کاربران بیشتری به اکوسیستم می‌آورد",
      "پذیرش نهادی با راه‌اندازی ETF اتریوم",
    ],
    risks: [
      "رقابت از سوی بلاک‌چین‌های نسل سوم (Solana, Aptos)",
      "پیچیدگی فنی ممکن است پذیرش عمومی را کُند کند",
    ],
    targetMultiplier: 1.31,
    horizon: "۶-۹ ماه",
  },
  GOLD: {
    title: "پناهگاه امن در بازارهای پرتلاطم",
    summary:
      "طلا در شرایط تنش ژئوپلیتیک، نرخ بهره بالا و کاهش اعتماد به ارزهای فیات، مجدداً نقش تاریخی خود را بازیافته است.",
    catalysts: [
      "خریدهای بانک‌های مرکزی جهان به بالاترین سطح ۵۰ سال اخیر رسیده",
      "تنش‌های ژئوپلیتیک تقاضا برای دارایی امن را بالا نگه می‌دارد",
      "کاهش نرخ بهره انتظاری، هزینه فرصت نگهداری طلا را کم می‌کند",
      "تضعیف دلار در بلندمدت به نفع طلا است",
    ],
    risks: [
      "اگر Fed نرخ بهره را بالا نگه دارد، جذابیت طلا کاهش می‌یابد",
      "بهبود سریع‌تر از انتظار ریسک‌های جهانی می‌تواند تقاضا را کاهش دهد",
    ],
    targetMultiplier: 1.15,
    horizon: "۶-۱۲ ماه",
  },
  DXY: {
    title: "دلار در تقاطع سیاست پولی",
    summary:
      "شاخص دلار آمریکا در نقطه‌ای حساس قرار دارد؛ سیاست‌های Fed و چشم‌انداز تجاری جهانی مسیر آن را تعیین می‌کنند.",
    catalysts: [
      "اگر Fed زودتر از انتظار نرخ بهره را کاهش دهد، دلار تضعیف می‌شود",
      "بحران‌های منطقه‌ای، تقاضا برای دلار به‌عنوان ارز پناهگاه را بالا می‌برد",
      "اختلاف نرخ بهره آمریکا با اروپا و ژاپن از دلار حمایت می‌کند",
    ],
    risks: [
      "توافقات تجاری چندجانبه می‌تواند سلطه دلار را کاهش دهد",
      "رشد سریع اقتصادهای نوظهور جایگزین‌هایی برای دلار ایجاد می‌کند",
    ],
    targetMultiplier: 1.05,
    horizon: "۳-۶ ماه",
  },
  SILVER: {
    title: "فلز صنعتی و پناهگاه امن",
    summary:
      "نقره در تقاطع دو دنیاست: هم فلز گران‌بها برای ذخیره ارزش، هم فلز صنعتی کلیدی برای پنل‌های خورشیدی، الکترونیک و صنعت پزشکی.",
    catalysts: [
      "بزرگ‌ترین مصرف نقره پنل‌های خورشیدی است که رشد انفجاری دارند",
      "نسبت طلا به نقره (Gold/Silver Ratio) بالاتر از میانگین تاریخی، نقره را undervalued نشان می‌دهد",
      "کاربرد گسترده در الکترونیک، کاتالیست‌های خودرو، و تجهیزات پزشکی",
      "ذخایر معادن نقره در کاهش است و عرضه جدید محدود می‌ماند",
    ],
    risks: [
      "رکود صنعتی جهانی می‌تواند تقاضای نقره را به شدت کاهش دهد",
      "نوسان بیشتر از طلا ریسک کوتاه‌مدت را افزایش می‌دهد",
    ],
    targetMultiplier: 1.25,
    horizon: "۶-۱۲ ماه",
  },
  COPPER: {
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
    targetMultiplier: 1.22,
    horizon: "۶-۱۲ ماه",
  },
};

function scoreInstrument(rows: OhlcPoint[]): number {
  if (rows.length < 10) return 0;

  const closes  = rows.map((r) => r.close);
  const changes = rows.map((r) => r.changePct);

  const recent30 = closes.slice(-30);
  const prior30  = closes.slice(-60, -30);
  const momentum30 = prior30.length > 0
    ? ((recent30[recent30.length - 1] - prior30[0]) / prior30[0]) * 100
    : 0;

  const momentum90 = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;

  const recentChanges = changes.slice(-30);
  const positiveDays  = recentChanges.filter((c) => c > 0).length;
  const consistency   = (positiveDays / Math.max(recentChanges.length, 1)) * 100;

  const mean     = recentChanges.reduce((a, b) => a + b, 0) / Math.max(recentChanges.length, 1);
  const variance = recentChanges.reduce((s, c) => s + (c - mean) ** 2, 0) / Math.max(recentChanges.length, 1);
  const vol      = Math.sqrt(variance);
  const sharpe   = vol > 0 ? momentum30 / vol : 0;

  // Small time-based jitter so result can shift on refresh
  const minuteNoise = (new Date().getMinutes() % 7) * 0.4;

  return momentum30 * 1.5 + momentum90 * 0.8 + consistency * 0.6 + sharpe * 2.0 + minuteNoise;
}

// GET /api/financial/creative-pick
financialRouter.get("/financial/creative-pick", async (_req, res) => {
  const instruments = await db.select().from(financialInstrumentsTable);

  const scored = await Promise.all(
    instruments.map(async (inst) => {
      // Try live 90-day history first, fall back to DB
      let rows: OhlcPoint[] = (await fetchYahooHistory(inst.symbol, 90)) ?? [];
      if (rows.length === 0) rows = await dbHistory(inst.symbol, 90);

      const rawScore     = scoreInstrument(rows);
      const potentialScore = Math.min(97, Math.max(55, Math.round(rawScore + 68)));
      return { inst, rows, potentialScore };
    })
  );

  scored.sort((a, b) => b.potentialScore - a.potentialScore);
  const { inst, rows, potentialScore } = scored[0];

  const oldest    = rows[0];
  const latest    = rows[rows.length - 1];
  const price     = latest?.close ?? 0;
  const priceStart = oldest?.close ?? price;
  const change90d  = priceStart > 0 ? ((price - priceStart) / priceStart) * 100 : 0;

  // Use live current price if available (more accurate than last OHLC close)
  const liveSummary = await buildLiveSummary(inst.symbol);
  const livePrice   = liveSummary?.price ?? price;

  const thesis = THESES[inst.symbol] ?? THESES["COPPER"];

  res.json({
    symbol:         inst.symbol,
    name:           inst.name,
    nameFa:         inst.nameFa,
    unit:           inst.unit,
    price:          parseFloat(livePrice.toFixed(4)),
    change90d:      parseFloat(change90d.toFixed(2)),
    potentialScore,
    dataSource:     rows.length > 0 ? "live" : "seed",
    allScores: scored.map((s) => ({
      symbol: s.inst.symbol,
      nameFa: s.inst.nameFa,
      score:  s.potentialScore,
    })),
    thesis: {
      title:       thesis.title,
      summary:     thesis.summary,
      catalysts:   thesis.catalysts,
      risks:       thesis.risks,
      targetPrice: parseFloat((livePrice * thesis.targetMultiplier).toFixed(4)),
      horizon:     thesis.horizon,
    },
    priceHistory: rows.map((r) => ({
      date:          r.date,
      close:         r.close,
      normalizedPct: r.normalizedPct,
    })),
  });
});

export default financialRouter;
