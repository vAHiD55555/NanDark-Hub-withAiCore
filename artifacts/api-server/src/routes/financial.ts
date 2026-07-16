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

// Static theses per instrument (used after dynamic scoring picks the winner)
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
    title: "پناهگاه امن در嵐 嵐بازارهای پرتلاطم",
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

// Score one symbol from its last 90 days of data
function scoreInstrument(rows: { close: string; changePct: string; date: string }[]): number {
  if (rows.length < 10) return 0;

  const closes = rows.map((r) => parseFloat(r.close as string));
  const changes = rows.map((r) => parseFloat(r.changePct as string));

  // 1. 30-day momentum (last 30 rows vs 30 rows before that)
  const recent = closes.slice(-30);
  const prior = closes.slice(-60, -30);
  const momentum30 = prior.length > 0
    ? ((recent[recent.length - 1] - prior[0]) / prior[0]) * 100
    : 0;

  // 2. 90-day total return
  const momentum90 = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;

  // 3. Trend consistency: % of days with positive change in last 30
  const recentChanges = changes.slice(-30);
  const positiveDays = recentChanges.filter((c) => c > 0).length;
  const consistency = (positiveDays / recentChanges.length) * 100;

  // 4. Risk-adjusted: momentum30 / volatility
  const mean = recentChanges.reduce((a, b) => a + b, 0) / recentChanges.length;
  const variance = recentChanges.reduce((s, c) => s + (c - mean) ** 2, 0) / recentChanges.length;
  const vol = Math.sqrt(variance);
  const sharpe = vol > 0 ? momentum30 / vol : 0;

  // 5. Small time-based noise so the winner can rotate on refresh
  //    Uses current minute to shift scores by a tiny fraction
  const minuteNoise = (new Date().getMinutes() % 7) * 0.4;

  // Weighted composite score (0-100 range)
  const score =
    momentum30 * 1.5 +
    momentum90 * 0.8 +
    consistency * 0.6 +
    sharpe * 2.0 +
    minuteNoise;

  return score;
}

// GET /api/financial/creative-pick
financialRouter.get("/financial/creative-pick", async (_req, res) => {
  const instruments = await db.select().from(financialInstrumentsTable);

  // Fetch 90 days of data for every instrument and score them
  const scored = await Promise.all(
    instruments.map(async (inst) => {
      const rows = await db
        .select()
        .from(financialPriceHistoryTable)
        .where(
          and(
            eq(financialPriceHistoryTable.symbol, inst.symbol),
            gte(financialPriceHistoryTable.date, cutoffDate(90))
          )
        )
        .orderBy(financialPriceHistoryTable.date);

      const rawScore = scoreInstrument(rows);
      // Clamp to 55-97 range for display
      const potentialScore = Math.min(97, Math.max(55, Math.round(rawScore + 68)));

      return { inst, rows, potentialScore };
    })
  );

  // Pick the highest-scoring instrument
  scored.sort((a, b) => b.potentialScore - a.potentialScore);
  const { inst, rows, potentialScore } = scored[0];

  const oldest = rows[0];
  const latest = rows[rows.length - 1];
  const price = latest ? parseFloat(latest.close as string) : 0;
  const priceStart = oldest ? parseFloat(oldest.close as string) : price;
  const change90d = priceStart > 0 ? ((price - priceStart) / priceStart) * 100 : 0;

  const thesis = THESES[inst.symbol] ?? THESES["COPPER"];

  res.json({
    symbol: inst.symbol,
    name: inst.name,
    nameFa: inst.nameFa,
    unit: inst.unit,
    price: parseFloat(price.toFixed(4)),
    change90d: parseFloat(change90d.toFixed(2)),
    potentialScore,
    allScores: scored.map((s) => ({
      symbol: s.inst.symbol,
      nameFa: s.inst.nameFa,
      score: s.potentialScore,
    })),
    thesis: {
      title: thesis.title,
      summary: thesis.summary,
      catalysts: thesis.catalysts,
      risks: thesis.risks,
      targetPrice: parseFloat((price * thesis.targetMultiplier).toFixed(4)),
      horizon: thesis.horizon,
    },
    priceHistory: rows.map((r) => ({
      date: r.date,
      close: parseFloat(r.close as string),
      normalizedPct: parseFloat(
        (((parseFloat(r.close as string) - priceStart) / priceStart) * 100).toFixed(3)
      ),
    })),
  });
});

export default financialRouter;
