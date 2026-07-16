/**
 * Seed script for financial instruments and 365 days of price history.
 * Run: pnpm --filter @workspace/db run seed:financial
 */
import { db, pool } from "./index";
import { financialInstrumentsTable, financialPriceHistoryTable } from "./schema/financial";

interface InstrumentConfig {
  symbol: string;
  name: string;
  nameFa: string;
  unit: string;
  category: string;
  description: string;
  isCreativePick: number;
  startPrice: number;
  dailyDrift: number;   // % per day
  volatility: number;   // % std dev per day
}

const INSTRUMENTS: InstrumentConfig[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    nameFa: "بیت‌کوین",
    unit: "USD",
    category: "crypto",
    description: "Bitcoin / US Dollar",
    isCreativePick: 0,
    startPrice: 62000,
    dailyDrift: 0.06,
    volatility: 2.8,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    nameFa: "اتریوم",
    unit: "USD",
    category: "crypto",
    description: "Ethereum / US Dollar",
    isCreativePick: 0,
    startPrice: 3200,
    dailyDrift: 0.05,
    volatility: 3.2,
  },
  {
    symbol: "GOLD",
    name: "Gold",
    nameFa: "طلا",
    unit: "USD/oz",
    category: "commodity",
    description: "Gold Spot / US Dollar per troy ounce",
    isCreativePick: 0,
    startPrice: 2350,
    dailyDrift: 0.03,
    volatility: 0.8,
  },
  {
    symbol: "DXY",
    name: "US Dollar Index",
    nameFa: "شاخص دلار",
    unit: "Index",
    category: "index",
    description: "US Dollar Index — measures dollar vs basket of major currencies",
    isCreativePick: 0,
    startPrice: 105.2,
    dailyDrift: -0.01,
    volatility: 0.35,
  },
  {
    symbol: "COPPER",
    name: "Copper",
    nameFa: "مس",
    unit: "USD/lb",
    category: "commodity",
    description: "Copper Spot / US Dollar per pound — AI & EV revolution pick",
    isCreativePick: 1,
    startPrice: 4.15,
    dailyDrift: 0.045,
    volatility: 1.4,
  },
];

// Seeded pseudo-random number generator for reproducibility
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function gaussianRandom(rng: () => number): number {
  // Box-Muller transform
  const u1 = Math.max(rng(), 1e-10);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function generatePriceHistory(config: InstrumentConfig, days: number, seedBase: number) {
  const rng = seededRng(seedBase);
  const rows: Array<{
    symbol: string;
    date: string;
    open: string;
    high: string;
    low: string;
    close: string;
    changePct: string;
  }> = [];

  let price = config.startPrice;
  const today = new Date("2026-07-16");

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().substring(0, 10);

    // Daily return using geometric Brownian motion
    const dailyReturn = (config.dailyDrift / 100) + (config.volatility / 100) * gaussianRandom(rng);
    const open = price;
    price = price * (1 + dailyReturn);

    // Intraday high/low
    const intradayVol = config.volatility * 0.6;
    const high = Math.max(open, price) * (1 + Math.abs(gaussianRandom(rng)) * intradayVol / 200);
    const low = Math.min(open, price) * (1 - Math.abs(gaussianRandom(rng)) * intradayVol / 200);
    const close = price;

    const changePct = ((close - open) / open) * 100;

    rows.push({
      symbol: config.symbol,
      date: dateStr,
      open: open.toFixed(4),
      high: high.toFixed(4),
      low: low.toFixed(4),
      close: close.toFixed(4),
      changePct: changePct.toFixed(4),
    });
  }

  return rows;
}

async function main() {
  console.log("🌱 Seeding financial instruments...");

  // Clear existing data
  await db.delete(financialPriceHistoryTable);
  await db.delete(financialInstrumentsTable);

  // Insert instruments
  await db.insert(financialInstrumentsTable).values(
    INSTRUMENTS.map(({ symbol, name, nameFa, unit, category, description, isCreativePick }) => ({
      symbol,
      name,
      nameFa,
      unit,
      category,
      description,
      isCreativePick,
    }))
  );
  console.log(`✓ Inserted ${INSTRUMENTS.length} instruments`);

  // Insert price history (365 days each)
  for (let idx = 0; idx < INSTRUMENTS.length; idx++) {
    const cfg = INSTRUMENTS[idx];
    const rows = generatePriceHistory(cfg, 365, idx * 9973 + 1234);

    // Batch insert in chunks of 100
    for (let i = 0; i < rows.length; i += 100) {
      await db.insert(financialPriceHistoryTable).values(rows.slice(i, i + 100));
    }
    console.log(`✓ ${cfg.symbol}: ${rows.length} days of price history`);
  }

  console.log("✅ Financial seed complete");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
