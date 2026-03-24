/**
 * 데이터 수집 Snapshot 타입 정의
 * architect가 제공하는 수집 결과를 scoring engine 입력으로 변환하기 위한 중간 타입
 *
 * 데이터 플로우:
 *   cron/collect → snapshot 객체 → POST /api/score → adapter → ScoringInput → calculateSignal()
 */

// ─────────────────────────────────────────────
// Tier A: Binance (가격, 거래량, 기술 지표)
// ─────────────────────────────────────────────
export interface BinanceData {
  /** 현재 BTC/USDT 가격 */
  price: number;
  /** 24시간 변동률 (%) */
  priceChange24hPct: number;
  /** MA20 (20일 단순 이동평균) */
  ma20: number;
  /** MA50 */
  ma50: number;
  /** MA100 */
  ma100: number;
  /** MA200 */
  ma200: number;
  /** MA20 기울기 (상승=true) */
  ma20Rising: boolean;
  /** MA50 기울기 */
  ma50Rising: boolean;
  /** MA200 기울기 */
  ma200Rising: boolean;
  /** CME 갭: 'above'=현재가 위, 'below'=아래, 'none'=없음 */
  cmeGap: 'above' | 'below' | 'none';
  /** 현물 CVD 방향 (상승=true) */
  spotCvdUp: boolean;
  /** 현물 CVD 강도 (0=약, 1=보통, 2=강) */
  spotCvdStrength: 0 | 1 | 2;
  /** 거래량 이상 (0=감소, 1=보통, 2=급증) */
  volumeAnomaly: 0 | 1 | 2;
  /** 업데이트 시각 */
  fetchedAt: string; // ISO 8601
}

export interface BollingerBandResult {
  /** 볼린저 상단 */
  upper: number;
  /** 볼린저 중단 (MA20) */
  middle: number;
  /** 볼린저 하단 */
  lower: number;
  fetchedAt: string;
}

// ─────────────────────────────────────────────
// Tier A: Fear & Greed
// ─────────────────────────────────────────────
export interface FearGreedData {
  /** 공포탐욕 지수 (0~100) */
  value: number;
  /** "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed" */
  label: string;
  fetchedAt: string;
}

// ─────────────────────────────────────────────
// Tier A: Coinbase Premium
// ─────────────────────────────────────────────
export interface CoinbasePremiumData {
  /** 코인베이스 vs 바이낸스 가격 괴리 (%) */
  premiumPct: number;
  /** 추세: 'rising' | 'falling' | 'flat' */
  trend: 'rising' | 'falling' | 'flat';
  fetchedAt: string;
}

// ─────────────────────────────────────────────
// Tier A/B: Macro (DXY, SPX 등)
// ─────────────────────────────────────────────
export interface MacroData {
  /** DXY 상태: 'break_up' | 'break_down' | 'uptrend' | 'downtrend' | 'sideways' */
  dxyStatus: 'break_up' | 'break_down' | 'uptrend' | 'downtrend' | 'sideways';
  /** 10Y 실질금리 (%) */
  realYield: number;
  /** 실질금리 추세: 'rising' | 'falling' | 'sideways' */
  realYieldTrend: 'rising' | 'falling' | 'sideways';
  /** SPX-BTC 30일 상관관계 (-1 ~ +1) */
  spxBtcCorrelation: number;
  /** SPX 추세 방향 (상승=true) */
  spxTrendUp: boolean;
  /** 연준 사이클: 'cutting' | 'cut_start' | 'hold' | 'hiking' */
  fedCycle: 'cutting' | 'cut_start' | 'hold' | 'hiking';
  fetchedAt: string;
}

// ─────────────────────────────────────────────
// Tier A+: Onchain (CryptoQuant 또는 무료 대안)
// ─────────────────────────────────────────────
export interface OnchainData {
  /** MVRV 비율 */
  mvrv: number;
  /** 단기 보유자 원가 ($) */
  sthCostBasis: number;
  /** 거래소 BTC 보유량 30일 변화율 (%) */
  exchangeReserveChange30d: number;
  /** 해시리본 상태: 'pink' | 'normal' | 'cross' */
  hashRibbonStatus: 'pink' | 'normal' | 'cross';
  /** Days Destroyed 이상 여부 */
  daysDestroyedAnomaly: boolean;
  fetchedAt: string;
}

// ─────────────────────────────────────────────
// Tier C: Perplexity (파생상품, 옵션, ETF)
// ─────────────────────────────────────────────
export interface PerplexityData {
  /** 펀딩비 (%) — 바이낸스/바이비트 평균 */
  fundingRate: number;
  /** OI 24h 변화율 (%) */
  oiChangePercent: number;
  /** 가격 방향 (상승=true) */
  priceUp: boolean;
  /** 현재가 위 숏 청산 클러스터 ($M) */
  shortLiquidationAbove: number;
  /** 현재가 아래 롱 청산 클러스터 ($M) */
  longLiquidationBelow: number;
  /** 탑 트레이더 롱 비율 (%) */
  topTraderLongPct: number;
  // ─── 옵션 데이터 ───
  /** 딜러 넷 감마 방향 */
  dealerNetGamma: 'positive' | 'negative' | 'neutral';
  /** 감마 월 가격 */
  gammaWallPrice: number;
  /** 풋/콜 비율 */
  putCallRatio: number;
  /** 맥스페인 가격 */
  maxPainPrice: number;
  /** 만기까지 남은 시간 (시간) */
  expiryHoursRemaining: number;
  // ─── ETF 데이터 ───
  /** ETF 7일 누적 순유입 ($M, 음수=유출) */
  etf7dNetFlowM: number;
  /** CME 선물 가격 */
  cmePrice: number;
  /** CME 선물 만기까지 남은 일수 */
  cmeDaysToExpiry: number;
  // ─── 파생 CVD ───
  /** 파생 CVD 방향 (상승=true) */
  derivativeCvdUp: boolean;
  /** 파생 CVD 강도 */
  derivativeCvdStrength: 0 | 1 | 2;
  // ─── 자금 흐름 ───
  /** 스테이블코인 시총 추세 */
  stablecoinTrend: 'up' | 'down' | 'flat';
  // ─── 군중 ───
  /** 네이버 검색량 급증 여부 */
  naverSearchAnomaly: boolean;
  /** 네이버 검색량 급감 여부 */
  naverSearchLow: boolean;
  /** 김치 프리미엄 (%) */
  kimchiPremium: number;
  // ─── 고래/채굴자 (Perplexity AI 분석 결과) ───
  /** 고래 거래소 입금 강도 */
  whaleExchangeInflow: 'high' | 'normal' | 'low';
  /** 채굴자 유출 강도 */
  minerOutflow: 'spike' | 'normal' | 'low';
  fetchedAt: string;
}

// ─────────────────────────────────────────────
// TradingView 지표 (Python /api/indicators.py)
// ─────────────────────────────────────────────
export interface TradingViewIndicators {
  /** 일봉 RSI(14) */
  rsiDaily: number;
  /** 주봉 RSI(14) */
  rsiWeekly: number;
  /** 월봉 RSI(14) */
  rsiMonthly: number;
  /** 직전 주봉 RSI (50 돌파 감지용) */
  rsiWeeklyPrev: number;
  /** ADX(14) */
  adx: number;
  /** ADX 추세 방향 (상승=true, DI+ > DI-) */
  adxTrendUp: boolean;
  fetchedAt: string;
}

// ─────────────────────────────────────────────
// 전체 Snapshot (cron/collect에서 생성)
// ─────────────────────────────────────────────
export interface CollectSnapshot {
  tierA: {
    binance: BinanceData;
    fearGreed: FearGreedData;
    coinbase: CoinbasePremiumData;
    macro: MacroData;
    onchain: OnchainData;
  };
  tierB: {
    tradingview: TradingViewIndicators;
  };
  tierB2: {
    bollinger: BollingerBandResult;
  };
  tierC: {
    perplexity: PerplexityData;
  };
}
