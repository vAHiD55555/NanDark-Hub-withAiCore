/**
 * Live market data service.
 * Sources:
 *  - CoinGecko (free, no key) → current BTC/ETH prices
 *  - Yahoo Finance (unofficial, no key) → OHLC history for all 5 instruments
 * In-memory cache avoids hammering APIs on every request.
 * Falls back gracefully if any upstream is unavailable.
 */

export interface OhlcPoint {
  date: string;       // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  changePct: number;  // % vs previous close
  normalizedPct: number; // % vs period start (set by caller)
}

export interface LiveSummary {
  symbol: string;
  price: number;
  change24h: number;
  change7d: number;
  change30d: number;
  high24h: number;
  low24h: number;
  source: "live" | "cached" | "fallback";
}

// ── Cache ──────────────────────────────────────────────────────────────────

const cache = new Map<string, { data: unknown; expiresAt: number }>();

function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.data as T;
}

const PRICE_TTL   = 3 * 60 * 1000;  // 3 min for live prices
const HISTORY_TTL = 60 * 60 * 1000; // 1 hour for OHLC history

// ── HTTP helper ────────────────────────────────────────────────────────────

async function safeFetch(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
        Referer: "https://finance.yahoo.com",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

// ── Yahoo Finance symbol map ───────────────────────────────────────────────

const YF_SYMBOLS: Record<string, string> = {
  BTC:    "BTC-USD",
  ETH:    "ETH-USD",
  GOLD:   "GC=F",
  DXY:    "DX-Y.NYB",
  COPPER: "HG=F",
  SILVER: "SI=F",
};

const YF_RANGE: Record<number, string> = {
  7:   "5d",
  30:  "1mo",
  90:  "3mo",
  365: "1y",
};

function daysToRange(days: number): string {
  if (days <= 7)   return "5d";
  if (days <= 30)  return "1mo";
  if (days <= 90)  return "3mo";
  return "1y";
}

// ── Yahoo Finance: OHLC history ────────────────────────────────────────────

export async function fetchYahooHistory(
  symbol: string,
  days: number
): Promise<OhlcPoint[] | null> {
  const yfSym = YF_SYMBOLS[symbol];
  if (!yfSym) return null;

  const range = daysToRange(days);
  const cacheKey = `yf_history_${symbol}_${range}`;
  const cached = getCache<OhlcPoint[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=1d&range=${range}`;
    const res = await safeFetch(url);
    if (!res.ok) return null;

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};
    const opens: number[]  = quote.open  ?? [];
    const highs: number[]  = quote.high  ?? [];
    const lows: number[]   = quote.low   ?? [];
    const closes: number[] = quote.close ?? [];

    const points: OhlcPoint[] = [];
    let prevClose: number | null = null;

    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (c == null || isNaN(c)) { prevClose = prevClose; continue; }
      const changePct = prevClose != null ? ((c - prevClose) / prevClose) * 100 : 0;
      points.push({
        date:         new Date(timestamps[i] * 1000).toISOString().substring(0, 10),
        open:         opens[i]  ?? c,
        high:         highs[i]  ?? c,
        low:          lows[i]   ?? c,
        close:        c,
        changePct:    parseFloat(changePct.toFixed(4)),
        normalizedPct: 0, // filled by caller
      });
      prevClose = c;
    }

    // Fill normalizedPct relative to period start
    if (points.length > 0) {
      const base = points[0].close;
      for (const p of points) {
        p.normalizedPct = parseFloat((((p.close - base) / base) * 100).toFixed(3));
      }
    }

    if (points.length > 0) setCache(cacheKey, points, HISTORY_TTL);
    return points.length > 0 ? points : null;
  } catch {
    return null;
  }
}

// ── Yahoo Finance: current price + 24h meta ────────────────────────────────

interface YfMeta {
  price:   number;
  high24h: number;
  low24h:  number;
}

async function fetchYahooMeta(symbol: string): Promise<YfMeta | null> {
  const yfSym = YF_SYMBOLS[symbol];
  if (!yfSym) return null;

  const cacheKey = `yf_meta_${symbol}`;
  const cached = getCache<YfMeta>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=1d&range=5d`;
    const res = await safeFetch(url);
    if (!res.ok) return null;

    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;

    const data: YfMeta = {
      price:   meta.regularMarketPrice,
      high24h: meta.regularMarketDayHigh ?? meta.regularMarketPrice,
      low24h:  meta.regularMarketDayLow  ?? meta.regularMarketPrice,
    };
    setCache(cacheKey, data, PRICE_TTL);
    return data;
  } catch {
    return null;
  }
}

// ── CoinGecko: current crypto prices ──────────────────────────────────────

interface CgPrices {
  BTC: number;
  ETH: number;
  BTCChange24h: number;
  ETHChange24h: number;
}

async function fetchCoinGeckoPrices(): Promise<CgPrices | null> {
  const cacheKey = "cg_prices";
  const cached = getCache<CgPrices>(cacheKey);
  if (cached) return cached;

  try {
    const url =
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true";
    const res = await safeFetch(url);
    if (!res.ok) return null;

    const json = await res.json();
    const data: CgPrices = {
      BTC:          json.bitcoin?.usd,
      ETH:          json.ethereum?.usd,
      BTCChange24h: json.bitcoin?.usd_24h_change ?? 0,
      ETHChange24h: json.ethereum?.usd_24h_change ?? 0,
    };
    if (!data.BTC || !data.ETH) return null;
    setCache(cacheKey, data, PRICE_TTL);
    return data;
  } catch {
    return null;
  }
}

// ── Public API: build LiveSummary for one symbol ───────────────────────────

export async function buildLiveSummary(symbol: string): Promise<Omit<LiveSummary, "source"> | null> {
  // Get history for 30 days to compute 7d / 30d changes
  const history = await fetchYahooHistory(symbol, 30);

  // For current price prefer CoinGecko for crypto (more real-time)
  let price: number | null = null;
  let change24h = 0;
  let high24h = 0;
  let low24h = 0;

  if (symbol === "BTC" || symbol === "ETH") {
    const cg = await fetchCoinGeckoPrices();
    if (cg) {
      price    = symbol === "BTC" ? cg.BTC : cg.ETH;
      change24h = symbol === "BTC" ? cg.BTCChange24h : cg.ETHChange24h;
    }
  }

  // Yahoo Finance meta for high/low and as fallback price
  const meta = await fetchYahooMeta(symbol);
  if (meta) {
    high24h = meta.high24h;
    low24h  = meta.low24h;
    if (price == null) {
      price    = meta.price;
      // compute change24h from history
      if (history && history.length >= 2) {
        const prev = history[history.length - 2].close;
        change24h = prev > 0 ? ((meta.price - prev) / prev) * 100 : 0;
      }
    }
  }

  if (price == null) return null;

  // Compute 7d and 30d changes from history
  let change7d  = 0;
  let change30d = 0;
  if (history && history.length > 0) {
    const last = price; // use live price as "now"
    const p7  = history.length >= 7  ? history[history.length - 7].close  : history[0].close;
    const p30 = history[0].close;
    change7d  = p7  > 0 ? ((last - p7)  / p7)  * 100 : 0;
    change30d = p30 > 0 ? ((last - p30) / p30) * 100 : 0;
  }

  return {
    symbol,
    price:    parseFloat(price.toFixed(4)),
    change24h: parseFloat(change24h.toFixed(2)),
    change7d:  parseFloat(change7d.toFixed(2)),
    change30d: parseFloat(change30d.toFixed(2)),
    high24h:   parseFloat(high24h.toFixed(4)),
    low24h:    parseFloat(low24h.toFixed(4)),
  };
}
