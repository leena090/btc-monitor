/**
 * Binance REST API 데이터 수집 모듈 (Tier A)
 * 수집 항목:
 *  - 현재가, 24h 고/저, 거래량
 *  - 일봉/주봉/월봉 klines 각 200개 (RSI/MACD/MA 계산용)
 * 키 불필요: Binance 공개 엔드포인트 사용
 */

// data-api.binance.vision: 공개 데이터 전용 엔드포인트 (IP 제한 없음, Vercel 호환)
// api.binance.com은 일부 클라우드 IP 차단 → vision 엔드포인트로 대체
const BINANCE_BASE = 'https://data-api.binance.vision/api/v3';
const SYMBOL = 'BTCUSDT';

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────

/** Binance 24시간 티커 데이터 */
export interface BinanceTicker {
  symbol: string;
  price: number;          // 현재가
  priceChange: number;    // 24h 가격 변화량
  priceChangePct: number; // 24h 변화율 (%)
  high24h: number;        // 24h 고가
  low24h: number;         // 24h 저가
  volume24h: number;      // 24h 거래량 (BTC)
  quoteVolume24h: number; // 24h 거래대금 (USDT)
  openPrice: number;      // 24h 시가
}

/** Binance kline 캔들 데이터 (배열 형식)
 *  [시가시간, 시가, 고가, 저가, 종가, 거래량, 종가시간, 거래대금, 체결횟수, 매수거래량, 매수거래대금, 무시]
 */
export type BinanceKline = [
  number, // 0: 시가 시간 (ms)
  string, // 1: 시가
  string, // 2: 고가
  string, // 3: 저가
  string, // 4: 종가
  string, // 5: 거래량 (BTC)
  number, // 6: 종가 시간 (ms)
  string, // 7: 거래대금 (USDT)
  number, // 8: 체결 횟수
  string, // 9: 매수 거래량
  string, // 10: 매수 거래대금
  string  // 11: 무시
];

/** 수집된 Binance 전체 데이터 */
export interface BinanceData {
  ticker: BinanceTicker;
  dailyKlines: BinanceKline[];   // 일봉 200개
  weeklyKlines: BinanceKline[];  // 주봉 200개
  monthlyKlines: BinanceKline[]; // 월봉 200개
  fetchedAt: string;             // 수집 시각 ISO8601
}

// ──────────────────────────────────────────────
// 내부 유틸 함수
// ──────────────────────────────────────────────

/**
 * fetch 래퍼 — 타임아웃 + 에러 처리 공통화
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${url}`);
    }
    return res;
  } finally {
    clearTimeout(id);
  }
}

// ──────────────────────────────────────────────
// 24시간 티커 수집
// ──────────────────────────────────────────────

/**
 * BTCUSDT 24시간 통계 조회
 * 엔드포인트: GET /api/v3/ticker/24hr?symbol=BTCUSDT
 */
async function fetchTicker(): Promise<BinanceTicker> {
  const url = `${BINANCE_BASE}/ticker/24hr?symbol=${SYMBOL}`;
  const res = await fetchWithTimeout(url);
  const data = await res.json();

  return {
    symbol: data.symbol,
    price: parseFloat(data.lastPrice),
    priceChange: parseFloat(data.priceChange),
    priceChangePct: parseFloat(data.priceChangePercent),
    high24h: parseFloat(data.highPrice),
    low24h: parseFloat(data.lowPrice),
    volume24h: parseFloat(data.volume),
    quoteVolume24h: parseFloat(data.quoteVolume),
    openPrice: parseFloat(data.openPrice),
  };
}

// ──────────────────────────────────────────────
// klines (캔들) 수집
// ──────────────────────────────────────────────

/**
 * Binance klines 조회
 * 엔드포인트: GET /api/v3/klines
 * @param interval '1d' | '1w' | '1M'
 * @param limit 최대 1000개 (기본 200개)
 */
async function fetchKlines(
  interval: '1d' | '1w' | '1M',
  limit = 200
): Promise<BinanceKline[]> {
  const url = `${BINANCE_BASE}/klines?symbol=${SYMBOL}&interval=${interval}&limit=${limit}`;
  const res = await fetchWithTimeout(url, 10000); // klines는 10초 타임아웃
  return res.json();
}

// ──────────────────────────────────────────────
// 메인 수집 함수
// ──────────────────────────────────────────────

/**
 * Binance 전체 데이터 병렬 수집
 * 에러 시 이전값 폴백 없이 throw (상위에서 처리)
 */
export async function fetchBinanceData(): Promise<BinanceData> {
  // 4개 요청 병렬 실행 (티커 + 일봉/주봉/월봉)
  const [ticker, dailyKlines, weeklyKlines, monthlyKlines] = await Promise.all([
    fetchTicker(),
    fetchKlines('1d', 200),
    fetchKlines('1w', 200),
    fetchKlines('1M', 200),
  ]);

  return {
    ticker,
    dailyKlines,
    weeklyKlines,
    monthlyKlines,
    fetchedAt: new Date().toISOString(),
  };
}

// ──────────────────────────────────────────────
// 헬퍼: 종가 배열 추출 (지표 계산용)
// ──────────────────────────────────────────────

/**
 * klines 배열에서 종가(close) 숫자 배열 추출
 * trading-signals 라이브러리 입력 형식
 */
export function extractClosePrices(klines: BinanceKline[]): number[] {
  return klines.map((k) => parseFloat(k[4]));
}

/**
 * klines 배열에서 거래량 숫자 배열 추출
 */
export function extractVolumes(klines: BinanceKline[]): number[] {
  return klines.map((k) => parseFloat(k[5]));
}
