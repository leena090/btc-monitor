/**
 * CollectSnapshot 조립 모듈
 * raw 데이터 수집 결과 → scoring-engine의 CollectSnapshot 형식으로 변환
 *
 * 목적: cron/collect에서 raw API 응답을 그대로 전달하면
 *       scoring-engine 어댑터가 필요로 하는 처리된 필드가 없음.
 *       이 모듈이 중간에서 MA 계산, 추세 판별, 필드 매핑을 담당.
 */

import type {
  CollectSnapshot,
  BinanceData as SnapshotBinanceData,
  FearGreedData as SnapshotFearGreedData,
  CoinbasePremiumData as SnapshotCoinbasePremiumData,
  MacroData as SnapshotMacroData,
  OnchainData as SnapshotOnchainData,
  TradingViewIndicators,
  PerplexityData as SnapshotPerplexityData,
  BollingerBandResult as SnapshotBollingerResult,
} from '@/lib/scoring/snapshot-types';

import type { BinanceData } from '../data-sources/binance';
import type { FearGreedData } from '../data-sources/fear-greed';
import type { CoinbasePremiumData } from '../data-sources/coinbase';
import type { MacroData } from '../data-sources/macro';
import type { OnchainData } from '../data-sources/onchain';
import type { PerplexityData } from '../data-sources/perplexity';
import type { BollingerBandResult } from '../indicators/bollinger';
import { extractClosePrices } from '../data-sources/binance';

// ──────────────────────────────────────────────
// 이동평균 계산 헬퍼
// ──────────────────────────────────────────────

/** 단순이동평균(SMA) 계산 */
function sma(prices: number[], period: number): number {
  const slice = prices.slice(-period);
  if (slice.length < period) return 0;
  return slice.reduce((a, b) => a + b, 0) / period;
}

/** 이동평균 기울기 판별 (최근 5봉 기준) */
function isMaRising(prices: number[], period: number): boolean {
  const recent5 = prices.slice(-5);
  if (recent5.length < 5) return false;
  const maFirst = sma(prices.slice(0, prices.length - 4), period);
  const maLast = sma(prices, period);
  return maLast > maFirst;
}

// ──────────────────────────────────────────────
// Binance raw → SnapshotBinanceData
// ──────────────────────────────────────────────

function assembleBinanceData(raw: BinanceData): SnapshotBinanceData {
  const closes = extractClosePrices(raw.dailyKlines);
  const price = raw.ticker.price;

  // MA 계산
  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, 50);
  const ma100 = sma(closes, 100);
  const ma200 = sma(closes, 200);

  // MA 기울기
  const ma20Rising = isMaRising(closes, 20);
  const ma50Rising = isMaRising(closes, 50);
  const ma200Rising = isMaRising(closes, 200);

  // 거래량 이상 탐지 (최근 20봉 평균 대비)
  const volumes = raw.dailyKlines.map(k => parseFloat(String(k[5])));
  const avgVol20 = sma(volumes, 20);
  const latestVol = volumes[volumes.length - 1] ?? 0;
  const volRatio = avgVol20 > 0 ? latestVol / avgVol20 : 1;
  const volumeAnomaly: 0 | 1 | 2 =
    volRatio > 2.0 ? 2 : volRatio > 1.3 ? 1 : 0;

  // CVD 근사치 (종가-시가 방향으로 추정 — 실제 CVD는 tick 데이터 필요)
  // 최근 5봉의 방향성으로 근사
  const recentCloses = closes.slice(-5);
  const recentOpens = raw.dailyKlines.slice(-5).map(k => parseFloat(String(k[1])));
  const bullCount = recentCloses.filter((c, i) => c > recentOpens[i]).length;
  const spotCvdUp = bullCount >= 3;
  const spotCvdStrength: 0 | 1 | 2 =
    bullCount === 5 ? 2 : bullCount >= 3 ? 1 : 0;

  return {
    price,
    priceChange24hPct: raw.ticker.priceChangePct,
    ma20,
    ma50,
    ma100,
    ma200,
    ma20Rising,
    ma50Rising,
    ma200Rising,
    // CME 갭: 정확한 값은 Perplexity 수집 후 별도 처리 — 기본 none
    cmeGap: 'none',
    spotCvdUp,
    spotCvdStrength,
    volumeAnomaly,
    fetchedAt: raw.fetchedAt,
  };
}

// ──────────────────────────────────────────────
// FearGreed raw → SnapshotFearGreedData
// ──────────────────────────────────────────────

function assembleFearGreedData(raw: FearGreedData): SnapshotFearGreedData {
  return {
    value: raw.value,
    label: raw.label,
    fetchedAt: raw.fetchedAt,
  };
}

// ──────────────────────────────────────────────
// Coinbase raw → SnapshotCoinbasePremiumData
// ──────────────────────────────────────────────

function assembleCoinbaseData(raw: CoinbasePremiumData): SnapshotCoinbasePremiumData {
  // direction → trend 변환
  const trend: 'rising' | 'falling' | 'flat' =
    raw.direction === 'positive' ? 'rising' :
    raw.direction === 'negative' ? 'falling' : 'flat';

  return {
    premiumPct: raw.premiumPct,
    trend,
    fetchedAt: raw.fetchedAt,
  };
}

// ──────────────────────────────────────────────
// Macro raw → SnapshotMacroData
// ──────────────────────────────────────────────

function assembleMacroData(raw: MacroData): SnapshotMacroData {
  // SPX 추세 방향
  const spxTrendUp = raw.spx.trend === 'up';

  // DXY 상태: tradingview indicators.py에서 수집 예정
  // macro.ts는 SPX만 수집 → DXY 기본값 sideways
  const dxyStatus: SnapshotMacroData['dxyStatus'] = 'sideways';

  return {
    dxyStatus,
    // 10Y 실질금리: 별도 소스 없음 → 현재 기본값 (추후 FRED API 추가 예정)
    realYield: 1.8,
    realYieldTrend: 'sideways',
    spxBtcCorrelation: raw.btcSpxCorrelation,
    spxTrendUp,
    // 연준 사이클: 현재 금리 동결 상태 (2026.3 기준)
    fedCycle: 'hold',
    fetchedAt: raw.fetchedAt,
  };
}

// ──────────────────────────────────────────────
// Onchain raw → SnapshotOnchainData
// ──────────────────────────────────────────────

function assembleOnchainData(
  raw: OnchainData,
  perplexityRaw?: PerplexityData | null
): SnapshotOnchainData {
  // MVRV: onchain.ts는 직접 수집 없음 → Perplexity 값 사용, 없으면 중립값
  const mvrv = perplexityRaw?.onchain?.mvrvRatio ?? 2.0;

  // 해시리본 상태 변환
  const hashRibbonStatus: 'pink' | 'normal' | 'cross' =
    raw.hashRate.isHashRibbonPink ? 'pink' : 'normal';

  // 거래소 보유량 추세 → % 변환 (추정)
  const reserveTrendPct: number =
    raw.hashRate.trend === 'up' ? -1 :  // 해시레이트 상승 = 보유량 감소 경향 (근사)
    raw.hashRate.trend === 'down' ? 1 : 0;

  return {
    mvrv,
    // STH 원가: CryptoQuant API 필요 → Perplexity 수집 또는 기본 추정값
    sthCostBasis: 0, // 0 = 데이터 없음 (스코어링에서 중립 처리)
    exchangeReserveChange30d: reserveTrendPct,
    hashRibbonStatus,
    daysDestroyedAnomaly: false, // 데이터 소스 없음 → 기본 false
    fetchedAt: raw.fetchedAt,
  };
}

// ──────────────────────────────────────────────
// TradingView Python 응답 → TradingViewIndicators
// ──────────────────────────────────────────────

/** /api/indicators.py 응답 타입 */
interface RawTradingViewResponse {
  success: boolean;
  btc?: {
    rsi_daily: number;
    rsi_weekly: number;
    rsi_monthly: number;
    adx: number;
    adx_plus_di: number;
    adx_minus_di: number;
    macd_daily: number;
    macd_signal_daily: number;
  };
  dxy?: {
    dxy_close: number;
    dxy_sma50: number;
    dxy_recommendation: string;
  };
  fetchedAt: string;
}

/**
 * /api/indicators.py 호출 + TradingViewIndicators 조립
 * 실패 시 중립값 폴백
 */
export async function fetchTradingViewIndicators(
  baseUrl: string,
  prevRsiWeekly?: number
): Promise<TradingViewIndicators & { dxyStatus?: string }> {
  const fallback: TradingViewIndicators & { dxyStatus?: string } = {
    rsiDaily: 50,
    rsiWeekly: 50,
    rsiMonthly: 50,
    rsiWeeklyPrev: 50,
    adx: 20,
    adxTrendUp: true,
    dxyStatus: 'sideways',
    fetchedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(`${baseUrl}/api/indicators`, { method: 'GET' });
    if (!res.ok) return fallback;

    const data: RawTradingViewResponse = await res.json();
    if (!data.success || !data.btc) return fallback;

    const { btc, dxy } = data;

    // DXY 상태 판별
    let dxyStatus: SnapshotMacroData['dxyStatus'] = 'sideways';
    if (dxy) {
      const dxyRec = dxy.dxy_recommendation;
      if (dxyRec === 'STRONG_BUY') dxyStatus = 'break_up';
      else if (dxyRec === 'BUY') dxyStatus = 'uptrend';
      else if (dxyRec === 'STRONG_SELL') dxyStatus = 'break_down';
      else if (dxyRec === 'SELL') dxyStatus = 'downtrend';
    }

    return {
      rsiDaily: btc.rsi_daily,
      rsiWeekly: btc.rsi_weekly,
      rsiMonthly: btc.rsi_monthly,
      // 직전 주봉 RSI: Redis에서 이전값 읽어와야 정확 — 현재는 인수로 전달받음
      rsiWeeklyPrev: prevRsiWeekly ?? btc.rsi_weekly,
      adx: btc.adx,
      adxTrendUp: btc.adx_plus_di > btc.adx_minus_di,
      dxyStatus,
      fetchedAt: data.fetchedAt,
    };
  } catch (err) {
    console.error('[Assemble] TradingView 지표 수집 실패 (폴백):', err);
    return fallback;
  }
}

// ──────────────────────────────────────────────
// Perplexity raw → SnapshotPerplexityData
// ──────────────────────────────────────────────

function assemblePerplexityData(raw: PerplexityData): SnapshotPerplexityData {
  const avgFunding =
    (raw.derivatives.fundingRateBinance +
      raw.derivatives.fundingRateBybit +
      raw.derivatives.fundingRateOkx) / 3;

  return {
    // 파생상품
    fundingRate: avgFunding,
    oiChangePercent: raw.derivatives.openInterest24hChange,
    priceUp: true, // 실시간 방향 — Binance ticker에서 보완 필요
    shortLiquidationAbove: 0, // Perplexity 파싱 추가 필요
    longLiquidationBelow: 0,
    topTraderLongPct: raw.derivatives.longShortRatioTop,
    // 옵션
    dealerNetGamma: 'neutral',
    gammaWallPrice: 0,
    putCallRatio: raw.options.putCallRatio,
    maxPainPrice: 0,
    expiryHoursRemaining: 48,
    // ETF
    etf7dNetFlowM: raw.etf.weeklyFlowUSD / 1_000_000,
    cmePrice: 0,
    cmeDaysToExpiry: 14,
    // CVD
    derivativeCvdUp: true,
    derivativeCvdStrength: 1,
    // 자금 흐름
    stablecoinTrend: 'flat',
    // 군중
    naverSearchAnomaly: false,
    naverSearchLow: false,
    kimchiPremium: 0,
    fetchedAt: raw.fetchedAt,
  };
}

// ──────────────────────────────────────────────
// Bollinger raw → SnapshotBollingerResult
// ──────────────────────────────────────────────

function assembleBollingerData(raw: BollingerBandResult): SnapshotBollingerResult {
  return {
    upper: raw.upper,
    middle: raw.middle,
    lower: raw.lower,
    fetchedAt: new Date().toISOString(),
  };
}

// ──────────────────────────────────────────────
// 메인 조립 함수
// ──────────────────────────────────────────────

export interface RawCollectedData {
  binance: BinanceData | null;
  fearGreed: FearGreedData | null;
  coinbase: CoinbasePremiumData | null;
  macro: MacroData | null;
  onchain: OnchainData | null;
  perplexity: PerplexityData | null;
  bollinger: BollingerBandResult | null;
  tradingView: TradingViewIndicators & { dxyStatus?: string };
}

// 중립값 기본 스냅샷 — 데이터 수집 실패 시 폴백
const NEUTRAL_TIMESTAMP = new Date().toISOString();

function neutralBinance(): SnapshotBinanceData {
  return {
    price: 0, priceChange24hPct: 0, ma20: 0, ma50: 0, ma100: 0, ma200: 0,
    ma20Rising: false, ma50Rising: false, ma200Rising: false,
    cmeGap: 'none', spotCvdUp: false, spotCvdStrength: 0, volumeAnomaly: 0,
    fetchedAt: NEUTRAL_TIMESTAMP,
  };
}

function neutralFearGreed(): SnapshotFearGreedData {
  return { value: 50, label: 'Neutral', fetchedAt: NEUTRAL_TIMESTAMP };
}

function neutralCoinbase(): SnapshotCoinbasePremiumData {
  return { premiumPct: 0, trend: 'flat', fetchedAt: NEUTRAL_TIMESTAMP };
}

function neutralMacro(): SnapshotMacroData {
  return {
    dxyStatus: 'sideways', realYield: 1.8, realYieldTrend: 'sideways',
    spxBtcCorrelation: 0.5, spxTrendUp: true, fedCycle: 'hold',
    fetchedAt: NEUTRAL_TIMESTAMP,
  };
}

function neutralOnchain(): SnapshotOnchainData {
  return {
    mvrv: 2.0, sthCostBasis: 0, exchangeReserveChange30d: 0,
    hashRibbonStatus: 'normal', daysDestroyedAnomaly: false,
    fetchedAt: NEUTRAL_TIMESTAMP,
  };
}

function neutralTradingView(): TradingViewIndicators {
  return {
    rsiDaily: 50, rsiWeekly: 50, rsiMonthly: 50, rsiWeeklyPrev: 50,
    adx: 20, adxTrendUp: true, fetchedAt: NEUTRAL_TIMESTAMP,
  };
}

function neutralPerplexity(): SnapshotPerplexityData {
  return {
    fundingRate: 0.01, oiChangePercent: 0, priceUp: true,
    shortLiquidationAbove: 0, longLiquidationBelow: 0, topTraderLongPct: 50,
    dealerNetGamma: 'neutral', gammaWallPrice: 0, putCallRatio: 1.0,
    maxPainPrice: 0, expiryHoursRemaining: 48,
    etf7dNetFlowM: 0, cmePrice: 0, cmeDaysToExpiry: 14,
    derivativeCvdUp: true, derivativeCvdStrength: 1,
    stablecoinTrend: 'flat',
    naverSearchAnomaly: false, naverSearchLow: false, kimchiPremium: 0,
    fetchedAt: NEUTRAL_TIMESTAMP,
  };
}

function neutralBollinger(): SnapshotBollingerResult {
  return { upper: 0, middle: 0, lower: 0, fetchedAt: NEUTRAL_TIMESTAMP };
}

/**
 * 수집된 raw 데이터를 CollectSnapshot으로 조립
 * 각 소스 null 시 중립값 폴백 처리
 */
export function assembleCollectSnapshot(raw: RawCollectedData): CollectSnapshot {
  const binance = raw.binance ? assembleBinanceData(raw.binance) : neutralBinance();
  const fearGreed = raw.fearGreed ? assembleFearGreedData(raw.fearGreed) : neutralFearGreed();
  const coinbase = raw.coinbase ? assembleCoinbaseData(raw.coinbase) : neutralCoinbase();

  let macro = raw.macro ? assembleMacroData(raw.macro) : neutralMacro();
  const tradingView = raw.tradingView ?? neutralTradingView();

  // TradingView에서 얻은 DXY 상태를 macro에 병합
  if ('dxyStatus' in tradingView && tradingView.dxyStatus) {
    macro = {
      ...macro,
      dxyStatus: tradingView.dxyStatus as SnapshotMacroData['dxyStatus'],
    };
  }

  const onchain = raw.onchain
    ? assembleOnchainData(raw.onchain, raw.perplexity)
    : neutralOnchain();

  const perplexity = raw.perplexity
    ? assemblePerplexityData(raw.perplexity)
    : neutralPerplexity();

  // priceUp 보정: binance ticker 방향으로 덮어씌우기
  if (raw.binance) {
    perplexity.priceUp = raw.binance.ticker.priceChange > 0;
  }

  const bollinger = raw.bollinger
    ? assembleBollingerData(raw.bollinger)
    : neutralBollinger();

  // tradingView에서 dxyStatus 제거 후 TradingViewIndicators만 추출
  const { dxyStatus: _removed, ...tvIndicators } = tradingView;

  return {
    tierA: { binance, fearGreed, coinbase, macro, onchain },
    tierB: { tradingview: tvIndicators as TradingViewIndicators },
    tierB2: { bollinger },
    tierC: { perplexity },
  };
}
