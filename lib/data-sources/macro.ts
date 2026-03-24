/**
 * 매크로 데이터 수집 모듈 (Tier B/C)
 * 수집 항목:
 *  - SPX (S&P 500): Yahoo Finance API → BTC와 30일 롤링 상관계수 계산
 * 참고: DXY는 tradingview-ta Python(/api/indicators.py)에서 수집
 */

const YAHOO_FINANCE_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────

/** 매크로 데이터 */
export interface MacroData {
  spx: {
    prices: number[];       // 30일 SPX 일별 종가
    currentPrice: number;   // 현재 SPX 가격
    trend: 'up' | 'down' | 'sideways'; // 추세
  };
  btcSpxCorrelation: number; // BTC-SPX 30일 상관계수 (-1 ~ +1)
  fetchedAt: string;
}

// ──────────────────────────────────────────────
// SPX 데이터 수집
// ──────────────────────────────────────────────

/**
 * Yahoo Finance에서 SPX 일봉 30일치 수집
 * 엔드포인트: /v8/finance/chart/^GSPC?interval=1d&range=35d
 */
async function fetchSPX(): Promise<number[]> {
  const url = `${YAHOO_FINANCE_BASE}/^GSPC?interval=1d&range=35d`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Yahoo Finance는 User-Agent가 없으면 403 반환할 수 있음
        'User-Agent': 'Mozilla/5.0 (compatible; btc-monitor/1.0)',
      },
    });

    if (!res.ok) {
      throw new Error(`Yahoo Finance API HTTP ${res.status}`);
    }

    const json = await res.json();
    // Yahoo Finance 응답 구조: result[0].indicators.quote[0].close
    const closes: number[] =
      json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];

    // null 값 제거 + 최근 30개만 반환
    return closes.filter((v) => v !== null).slice(-30);
  } finally {
    clearTimeout(timeout);
  }
}

// ──────────────────────────────────────────────
// 상관계수 계산
// ──────────────────────────────────────────────

/**
 * 피어슨 상관계수 계산 (30일 롤링)
 * @param x 배열 A (BTC 종가)
 * @param y 배열 B (SPX 종가)
 * @returns -1 ~ +1 상관계수
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  // 길이 맞추기 (짧은 쪽 기준)
  const xs = x.slice(-n);
  const ys = y.slice(-n);

  // 평균 계산
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  // 분자: Σ(xi - x̄)(yi - ȳ)
  let numerator = 0;
  // 분모: sqrt(Σ(xi - x̄)² × Σ(yi - ȳ)²)
  let sumSqX = 0;
  let sumSqY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    numerator += dx * dy;
    sumSqX += dx * dx;
    sumSqY += dy * dy;
  }

  const denominator = Math.sqrt(sumSqX * sumSqY);
  if (denominator === 0) return 0;

  return numerator / denominator;
}

/**
 * 추세 판별 (최근 5일 기준)
 */
function detectTrend(prices: number[]): 'up' | 'down' | 'sideways' {
  if (prices.length < 5) return 'sideways';
  const recent = prices.slice(-5);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const changePct = ((last - first) / first) * 100;

  if (changePct > 1.5) return 'up';
  if (changePct < -1.5) return 'down';
  return 'sideways';
}

// ──────────────────────────────────────────────
// 메인 수집 함수
// ──────────────────────────────────────────────

/**
 * 매크로 데이터 수집 + 상관계수 계산
 * @param btcPrices BTC 일봉 종가 배열 (상관계수 계산용)
 */
export async function fetchMacroData(btcPrices?: number[]): Promise<MacroData> {
  // SPX 30일 데이터 수집
  const spxPrices = await fetchSPX();

  // BTC-SPX 상관계수 계산
  let correlation = 0;
  if (btcPrices && btcPrices.length >= 10 && spxPrices.length >= 10) {
    correlation = pearsonCorrelation(btcPrices, spxPrices);
    // 소수점 3자리로 반올림
    correlation = Math.round(correlation * 1000) / 1000;
  }

  return {
    spx: {
      prices: spxPrices,
      currentPrice: spxPrices[spxPrices.length - 1] ?? 0,
      trend: detectTrend(spxPrices),
    },
    btcSpxCorrelation: correlation,
    fetchedAt: new Date().toISOString(),
  };
}

// ──────────────────────────────────────────────
// 스코어링 헬퍼 (카테고리 8 — 매크로 오버레이)
// ──────────────────────────────────────────────

/**
 * BTC-SPX 상관계수 → 매크로 점수 (일부)
 * 전체 카테고리 8 점수는 DXY + TIPS + SPX + 금리 사이클 합산
 */
export function spxCorrelationToScore(
  correlation: number,
  spxTrend: 'up' | 'down' | 'sideways'
): number {
  if (correlation > 0.7 && spxTrend === 'down') return -4; // 위험자산 레짐 + SPX 하락
  if (correlation > 0.7) return -1;                         // 위험자산 레짐
  if (correlation > 0.3) return 0;                          // 중간 상관
  return 2;                                                  // 독립적 (크립토 고유 요인)
}
