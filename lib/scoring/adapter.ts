/**
 * Snapshot → ScoringInput 어댑터
 *
 * architect의 데이터 수집 결과(CollectSnapshot)를
 * 스코어링 엔진 입력(ScoringInput)으로 변환하는 단일 함수.
 *
 * 각 카테고리 입력 타입에 맞게 필드를 매핑하고,
 * 데이터 없을 시 중립값(0 또는 기본값)을 채워 engine이 안전하게 동작하도록 한다.
 */

import type {
  ScoringInput,
  SignalResult,
  RsiData,
  WhaleData,
  MinerData,
  OnchainData as OnchainUiData,
  CycleData,
  DataFreshnessItem,
} from './types';
import type { CollectSnapshot } from './snapshot-types';

// 사이클 상수 — btc-cycle-map.md 기준 (2026.3 현재)
// architect의 cycle-data 모듈이 준비되면 import로 교체 가능
const CYCLE_HIGH = 126200;   // 2025.10 ATH
const CYCLE_LOW  = 15500;    // 2022.11 저점
const LAST_HALVING_DATE = new Date('2024-04-19T00:00:00Z');

/** 마지막 반감기 이후 경과 개월 수 계산 */
function monthsSinceHalving(): number {
  const now = new Date();
  const diffMs = now.getTime() - LAST_HALVING_DATE.getTime();
  return diffMs / (1000 * 60 * 60 * 24 * 30.44); // 평균 월 일수
}

/** ATH 대비 하락률 계산 (%) */
function drawdownFromAth(currentPrice: number): number {
  return ((CYCLE_HIGH - currentPrice) / CYCLE_HIGH) * 100;
}

/**
 * CollectSnapshot → ScoringInput 변환
 *
 * @param snap - cron/collect에서 생성된 전체 수집 데이터
 * @returns ScoringInput — calculateSignal()에 직접 전달 가능
 */
export function snapshotToScoringInput(snap: CollectSnapshot): ScoringInput {
  const { binance, fearGreed, coinbase, macro, onchain } = snap.tierA;
  const { tradingview } = snap.tierB;
  const { bollinger } = snap.tierB2;
  const { perplexity } = snap.tierC;

  const now = new Date();

  return {
    // ─── Cat1: 가격 액션 & 추세 ───
    cat1: {
      currentPrice:     binance.price,
      ma20:             binance.ma20,
      ma50:             binance.ma50,
      ma100:            binance.ma100,
      ma200:            binance.ma200,
      ma20Rising:       binance.ma20Rising,
      ma50Rising:       binance.ma50Rising,
      ma200Rising:      binance.ma200Rising,
      adx:              tradingview.adx,
      adxTrendUp:       tradingview.adxTrendUp,
      bollingerUpper:   bollinger.upper,
      bollingerMiddle:  bollinger.middle,
      bollingerLower:   bollinger.lower,
      cmeGap:           binance.cmeGap,
      dataFreshness:    new Date(binance.fetchedAt),
    },

    // ─── Cat2: RSI 매크로 사이클 ───
    cat2: {
      rsiDaily:        tradingview.rsiDaily,
      rsiWeekly:       tradingview.rsiWeekly,
      rsiMonthly:      tradingview.rsiMonthly,
      rsiWeeklyPrev:   tradingview.rsiWeeklyPrev,
      dataFreshness:   new Date(tradingview.fetchedAt),
    },

    // ─── Cat3: 파생상품 + 청산 ───
    cat3: {
      fundingRate:             perplexity.fundingRate,
      oiChangePercent:         perplexity.oiChangePercent,
      priceUp:                 perplexity.priceUp,
      shortLiquidationAbove:   perplexity.shortLiquidationAbove,
      longLiquidationBelow:    perplexity.longLiquidationBelow,
      topTraderLongPct:        perplexity.topTraderLongPct,
      dataFreshness:           new Date(perplexity.fetchedAt),
    },

    // ─── Cat4: 옵션 시장 GEX ───
    cat4: {
      dealerNetGamma:        perplexity.dealerNetGamma,
      gammaWallPrice:        perplexity.gammaWallPrice,
      currentPrice:          binance.price,
      putCallRatio:          perplexity.putCallRatio,
      maxPainPrice:          perplexity.maxPainPrice,
      expiryHoursRemaining:  perplexity.expiryHoursRemaining,
      dataFreshness:         new Date(perplexity.fetchedAt),
    },

    // ─── Cat5: ETF 유출입 + 베이시스 ───
    cat5: {
      etf7dNetFlowM:    perplexity.etf7dNetFlowM,
      cmePrice:         perplexity.cmePrice,
      spotPrice:        binance.price,
      cmeDaysToExpiry:  perplexity.cmeDaysToExpiry,
      dataFreshness:    new Date(perplexity.fetchedAt),
    },

    // ─── Cat6: CVD + 거래량 구조 ───
    cat6: {
      spotCvdUp:              binance.spotCvdUp,
      derivativeCvdUp:        perplexity.derivativeCvdUp,
      priceUp:                perplexity.priceUp,
      spotCvdStrength:        binance.spotCvdStrength,
      derivativeCvdStrength:  perplexity.derivativeCvdStrength,
      volumeAnomaly:          binance.volumeAnomaly,
      dataFreshness:          new Date(binance.fetchedAt),
    },

    // ─── Cat7: 온체인 강화 ───
    cat7: {
      mvrv:                      onchain.mvrv,
      sthCostBasis:              onchain.sthCostBasis,
      currentPrice:              binance.price,
      exchangeReserveChange30d:  onchain.exchangeReserveChange30d,
      hashRibbonStatus:          onchain.hashRibbonStatus,
      daysDestroyedAnomaly:      onchain.daysDestroyedAnomaly,
      dataFreshness:             new Date(onchain.fetchedAt),
    },

    // ─── Cat8: 매크로 오버레이 ───
    cat8: {
      dxyStatus:        macro.dxyStatus,
      realYield:        macro.realYield,
      realYieldTrend:   macro.realYieldTrend,
      spxBtcCorrelation: macro.spxBtcCorrelation,
      spxTrendUp:       macro.spxTrendUp,
      fedCycle:         macro.fedCycle,
      dataFreshness:    new Date(macro.fetchedAt),
    },

    // ─── Cat9: 4년 사이클 + 피보나치 ───
    cat9: {
      monthsSinceHalving: monthsSinceHalving(),
      currentPrice:       binance.price,
      cycleHigh:          CYCLE_HIGH,
      cycleLow:           CYCLE_LOW,
      drawdownFromAth:    drawdownFromAth(binance.price),
      dataFreshness:      now,  // 하드코딩 데이터 — 현재 시각으로 표시
    },

    // ─── Cat10: 자금 흐름 ───
    cat10: {
      stablecoinTrend:       perplexity.stablecoinTrend,
      coinbasePremium:       coinbase.premiumPct,
      coinbasePremiumTrend:  coinbase.trend,
      dataFreshness:         new Date(coinbase.fetchedAt),
    },

    // ─── Cat11: 군중 역발상 ───
    cat11: {
      fearGreedIndex:      fearGreed.value,
      naverSearchAnomaly:  perplexity.naverSearchAnomaly,
      naverSearchLow:      perplexity.naverSearchLow,
      kimchiPremium:       perplexity.kimchiPremium,
      dataFreshness:       new Date(fearGreed.fetchedAt),
    },
  };
}

// ─────────────────────────────────────────────
// RSI 레짐 판별 헬퍼
// ─────────────────────────────────────────────
function rsiRegime(monthly: number): 'bull' | 'bear' | 'neutral' {
  if (monthly > 50) return 'bull';
  if (monthly < 40) return 'bear';
  return 'neutral';
}

// ─────────────────────────────────────────────
// MVRV 상태 판별 헬퍼
// ─────────────────────────────────────────────
function mvrvStatus(mvrv: number): 'undervalued' | 'fair' | 'overvalued' | 'bubble' {
  if (mvrv < 1)   return 'undervalued';
  if (mvrv < 2)   return 'fair';
  if (mvrv < 3.5) return 'overvalued';
  return 'bubble';
}

// ─────────────────────────────────────────────
// 사이클 페이즈 판별 헬퍼
// ─────────────────────────────────────────────
function cyclePhase(months: number): {
  phase: CycleData['phase'];
  phaseLabel: string;
} {
  if (months <= 6)  return { phase: 'accumulation', phaseLabel: '초기 축적 (0~6개월)' };
  if (months <= 18) return { phase: 'bull_run',     phaseLabel: '상승 가속 (6~18개월)' };
  if (months <= 30) return { phase: 'late_cycle',   phaseLabel: '후기/조정 (18~30개월)' };
  return             { phase: 'bear_bottom',         phaseLabel: '바닥 형성 (30~48개월)' };
}

// ─────────────────────────────────────────────
// 피보나치 레벨 레이블 헬퍼
// ─────────────────────────────────────────────
function fibLevelLabel(currentPrice: number, cycleHigh: number, cycleLow: number): string {
  const total = cycleHigh - cycleLow;
  if (total <= 0) return 'N/A';
  const retracement = (cycleHigh - currentPrice) / total;
  if (retracement >= 0.618) return 'Fib 0.618+ (깊은 할인)';
  if (retracement >= 0.47 && retracement <= 0.53) return 'Fib 0.5 (황금 중간)';
  if (retracement >= 0.36 && retracement <= 0.40) return 'Fib 0.382 (일반 조정)';
  if (retracement <= 0.236) return 'Fib 0.236 이하 (얕은 조정)';
  return `Fib ${(retracement * 100).toFixed(1)}%`;
}

/**
 * SignalResult에 UI 전용 필드 채우기
 *
 * calculateSignal()이 반환한 순수 스코어링 결과에
 * 대시보드 패널이 필요로 하는 price / rsi / whale / miner / onchain / cycle / dataFreshness 필드를 추가.
 *
 * cron/collect 라우트에서 호출:
 *   const signal = calculateSignal(input);
 *   const enriched = enrichSignalResult(signal, snap);
 *   await redis.set(REDIS_KEYS.LATEST_SCORE, JSON.stringify(enriched));
 */
export function enrichSignalResult(
  result: SignalResult,
  snap: CollectSnapshot
): SignalResult {
  const { binance, fearGreed, coinbase, macro, onchain } = snap.tierA;
  const { tradingview } = snap.tierB;
  const { perplexity } = snap.tierC;

  const months = monthsSinceHalving();
  const { phase, phaseLabel } = cyclePhase(months);

  // 다음 반감기: 2028년 4월 예상
  const nextHalving = new Date('2028-04-01T00:00:00Z');
  const daysUntilNextHalving = Math.round(
    (nextHalving.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // ─── RSI 패널 ───
  const rsi: RsiData = {
    daily:       tradingview.rsiDaily,
    weekly:      tradingview.rsiWeekly,
    monthly:     tradingview.rsiMonthly,
    regime:      rsiRegime(tradingview.rsiMonthly),
    macroBonus:  result.rsiMacroBonus,
    macroStatus: result.rsiAlert ?? '보너스 없음',
  };

  // ─── 고래 패널 ───
  // onchain 모듈에서 고래 비율을 직접 노출하지 않으므로
  // exchangeReserveChange30d 부호로 방향만 추정
  // WhaleData.direction: 'buy' | 'sell' | 'neutral' — 거래소 보유량 감소 = 매수 압력
  const whaleDirection =
    onchain.exchangeReserveChange30d <= -3 ? 'buy'
    : onchain.exchangeReserveChange30d >= 3 ? 'sell'
    : 'neutral';

  // Perplexity에서 가져온 고래/채굴자 레벨을 수치로 변환
  // 'high' | 'normal' | 'low' → 의미 있는 추정 수치
  const whaleInflowLevel = perplexity.whaleExchangeInflow;
  const whaleRatioEstimate =
    whaleInflowLevel === 'high' ? 0.65    // 위험 — 대량 입금
    : whaleInflowLevel === 'normal' ? 0.35 // 정상 수준
    : 0.15;                                 // 낮음 — 축적 신호

  const minerOutflowLevel = perplexity.minerOutflow;
  const minerMpiEstimate =
    minerOutflowLevel === 'spike' ? 2.5    // 대량 유출 — 매도 신호
    : minerOutflowLevel === 'normal' ? 0.2  // 정상
    : -0.5;                                  // 낮은 유출 — 보유 중 (강세)

  // 고래 방향: Perplexity 레벨 + 거래소 보유량 변화 종합 판단
  const whaleDir =
    whaleInflowLevel === 'high' ? 'sell'   // 대량 입금 = 매도 압력
    : whaleInflowLevel === 'low' ? 'buy'   // 적은 입금 = 축적
    : whaleDirection;                       // 중립이면 온체인 데이터로 폴백

  // 고래 해석 문구 생성 — 일반인이 이해할 수 있는 한국어
  const whaleInterpretation =
    whaleInflowLevel === 'high'
      ? '대형 투자자(고래)가 거래소에 대량 입금 중 — 매도 압력이 높아지고 있습니다. 주의가 필요합니다.'
    : whaleInflowLevel === 'low'
      ? '대형 투자자(고래)가 거래소에서 BTC를 빼내고 있습니다 — 장기 보유(축적) 신호로 긍정적입니다.'
    : `거래소 BTC 보유량 30일 변화: ${onchain.exchangeReserveChange30d.toFixed(1)}% — 특별한 움직임 없이 관망 중입니다.`;

  const whale: WhaleData = {
    exchangeInflow:    whaleRatioEstimate * 1000, // 추정 BTC 수량
    whaleRatio:        whaleRatioEstimate,
    whaleRatioChange:  0,
    interpretation:    whaleInterpretation,
    direction:         whaleDir as 'buy' | 'sell' | 'neutral',
  };

  // ─── 채굴자 패널 ───
  const miner: MinerData = {
    outflow:     minerOutflowLevel === 'spike' ? 500 : minerOutflowLevel === 'normal' ? 100 : 20,
    mpi:         minerMpiEstimate,
    reserve:     1800000, // 대략적 전체 채굴자 보유량 (약 180만 BTC)
    hashribbon:  onchain.hashRibbonStatus !== 'normal',
    hashrate:    0, // 별도 API 필요
  };

  // ─── 온체인 패널 ───
  const onchainUi: OnchainUiData = {
    mvrv:                  onchain.mvrv,
    mvrvStatus:            mvrvStatus(onchain.mvrv),
    sthRealizedPrice:      onchain.sthCostBasis,
    exchangeReserve:       0,      // 절대값은 별도 수집 필요
    exchangeReserveTrend:
      onchain.exchangeReserveChange30d < -1 ? 'down'
      : onchain.exchangeReserveChange30d > 1 ? 'up'
      : 'flat',
  };

  // ─── 사이클 패널 ───
  const cycle: CycleData = {
    monthsSinceHalving:   months,
    phase,
    phaseLabel,
    fibLevel:             fibLevelLabel(binance.price, CYCLE_HIGH, CYCLE_LOW),
    fibScore:             result.fibConfluenceBonus,
    athDrawdown:          drawdownFromAth(binance.price),
    nextHalvingDate:      nextHalving.toISOString().split('T')[0],
    daysUntilNextHalving,
  };

  // ─── 데이터 신선도 목록 ───
  const dataFreshness: DataFreshnessItem[] = [
    { source: 'binance',     label: 'Binance 가격/지표', lastUpdated: binance.fetchedAt,     updateFreq: '5분' },
    { source: 'fearGreed',   label: '공포탐욕 지수',     lastUpdated: fearGreed.fetchedAt,   updateFreq: '5분' },
    { source: 'coinbase',    label: '코인베이스 프리미엄', lastUpdated: coinbase.fetchedAt,  updateFreq: '5분' },
    { source: 'tradingview', label: 'TradingView RSI/ADX', lastUpdated: tradingview.fetchedAt, updateFreq: '5분' },
    { source: 'onchain',     label: '온체인 (MVRV/STH)', lastUpdated: onchain.fetchedAt,    updateFreq: '15분' },
    { source: 'macro',       label: '매크로 (DXY/SPX)',  lastUpdated: macro.fetchedAt,      updateFreq: '5분' },
    { source: 'perplexity',  label: '파생/옵션/ETF',     lastUpdated: perplexity.fetchedAt, updateFreq: '30분' },
  ];

  return {
    ...result,
    price:          binance.price,
    priceChange24h: binance.priceChange24hPct,
    rsi,
    whale,
    miner,
    onchain:        onchainUi,
    cycle,
    dataFreshness,
    // alertHistory는 cron/collect에서 Redis alert 히스토리 조회 후 별도 주입
  };
}

/**
 * 데이터 신선도 검증
 * 각 데이터 소스의 최대 허용 stale 시간을 확인
 *
 * @returns 만료된 데이터 소스 이름 목록 (비어있으면 모두 신선)
 */
export function checkDataFreshness(snap: CollectSnapshot): string[] {
  const stale: string[] = [];
  const now = Date.now();

  // Tier A: 5분 이내 (300,000 ms)
  const TIER_A_MAX_AGE = 5 * 60 * 1000;
  if (now - new Date(snap.tierA.binance.fetchedAt).getTime() > TIER_A_MAX_AGE) {
    stale.push('binance');
  }
  if (now - new Date(snap.tierA.fearGreed.fetchedAt).getTime() > TIER_A_MAX_AGE) {
    stale.push('fearGreed');
  }
  if (now - new Date(snap.tierA.coinbase.fetchedAt).getTime() > TIER_A_MAX_AGE) {
    stale.push('coinbase');
  }

  // Tier A+: 15분 이내 (900,000 ms)
  const TIER_A_PLUS_MAX_AGE = 15 * 60 * 1000;
  if (now - new Date(snap.tierA.onchain.fetchedAt).getTime() > TIER_A_PLUS_MAX_AGE) {
    stale.push('onchain');
  }

  // Tier B: 5분 이내 (TradingView 지표)
  if (now - new Date(snap.tierB.tradingview.fetchedAt).getTime() > TIER_A_MAX_AGE) {
    stale.push('tradingview');
  }

  // Tier C: 30분 이내 (1,800,000 ms)
  const TIER_C_MAX_AGE = 30 * 60 * 1000;
  if (now - new Date(snap.tierC.perplexity.fetchedAt).getTime() > TIER_C_MAX_AGE) {
    stale.push('perplexity');
  }

  return stale;
}
