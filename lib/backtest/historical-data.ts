/**
 * historical-data.ts — 비트코인 역사적 주요 시점 데이터셋
 *
 * 4번의 반감기 사이클에서 핵심 전환점 20개를 선별.
 * 각 시점에 대해 11카테고리 ScoringInput 추정값 + 이후 실제 수익률 기록.
 *
 * 데이터 소스: CoinGecko 역사 가격, Glassnode 온체인 지표,
 * TradingView RSI 차트, Alternative.me 공포탐욕 히스토리
 *
 * 주의: 일부 카테고리(옵션 GEX, CVD)는 2020년 이전 데이터가 부족하여 중립값 적용.
 * 이는 백테스트의 한계로 명시해야 함.
 */

import type { ScoringInput } from '@/lib/scoring/types';

// ─────────────────────────────────────────────
// 역사적 데이터 포인트 타입
// ─────────────────────────────────────────────

export interface HistoricalDataPoint {
  /** 시점 식별자 (예: "2018-12-bottom") */
  id: string;
  /** 시점 날짜 (ISO string) */
  date: string;
  /** 시점 설명 (한국어) */
  label: string;
  /** 당시 BTC 가격 (USD) */
  price: number;
  /** 이후 30일 수익률 (%) */
  return30d: number;
  /** 이후 90일 수익률 (%) */
  return90d: number;
  /** 이후 180일 수익률 (%) */
  return180d: number;
  /** 이후 365일 수익률 (%) */
  return365d: number;
  /** 11카테고리 스코어링 입력 — 당시 시장 상황 추정 */
  scoringInput: ScoringInput;
  /** 사이클 구분 (몇 번째 반감기) */
  cycle: 1 | 2 | 3 | 4;
  /** 시점 유형 */
  type: 'bottom' | 'halving' | 'rally' | 'top' | 'correction' | 'current';
}

// ─────────────────────────────────────────────
// 공통 기본값 생성 헬퍼
// ─────────────────────────────────────────────

/** 날짜 → Date 변환 */
const d = (iso: string) => new Date(iso);

/** 기본 PriceAction 입력 생성 — 핵심 값만 오버라이드 */
function makePriceAction(overrides: {
  currentPrice: number;
  ma20: number;
  ma50: number;
  ma200: number;
  adx?: number;
  adxTrendUp?: boolean;
  date: string;
}) {
  return {
    currentPrice: overrides.currentPrice,
    ma20: overrides.ma20,
    ma50: overrides.ma50,
    ma100: (overrides.ma50 + overrides.ma200) / 2,
    ma200: overrides.ma200,
    ma20Rising: overrides.currentPrice > overrides.ma20,
    ma50Rising: overrides.currentPrice > overrides.ma50,
    ma200Rising: overrides.ma20 > overrides.ma200,
    adx: overrides.adx ?? 25,
    adxTrendUp: overrides.adxTrendUp ?? overrides.currentPrice > overrides.ma50,
    bollingerUpper: overrides.currentPrice * 1.05,
    bollingerMiddle: overrides.ma20,
    bollingerLower: overrides.currentPrice * 0.95,
    cmeGap: 'none' as const,
    dataFreshness: d(overrides.date),
  };
}

/** 기본 RSI 입력 생성 */
function makeRsi(daily: number, weekly: number, monthly: number, weeklyPrev: number, date: string) {
  return {
    rsiDaily: daily,
    rsiWeekly: weekly,
    rsiMonthly: monthly,
    rsiWeeklyPrev: weeklyPrev,
    dataFreshness: d(date),
  };
}

/** 기본 파생상품 입력 — 중립 기본값 */
function makeDerivatives(overrides: {
  fundingRate?: number;
  oiChangePercent?: number;
  priceUp?: boolean;
  date: string;
}) {
  return {
    fundingRate: overrides.fundingRate ?? 0.01,
    oiChangePercent: overrides.oiChangePercent ?? 0,
    priceUp: overrides.priceUp ?? true,
    shortLiquidationAbove: 50,
    longLiquidationBelow: 50,
    topTraderLongPct: 52,
    dataFreshness: d(overrides.date),
  };
}

/** 중립 옵션/GEX 입력 (2020년 이전 데이터 부족) */
function makeOptionsNeutral(price: number, date: string) {
  return {
    dealerNetGamma: 'neutral' as const,
    gammaWallPrice: price,
    currentPrice: price,
    putCallRatio: 1.0,
    maxPainPrice: price,
    expiryHoursRemaining: 168,
    dataFreshness: d(date),
  };
}

/** ETF 유출입 (2024년 이전은 0으로 처리, ETF 미출시) */
function makeEtf(flowM: number, price: number, date: string) {
  return {
    etf7dNetFlowM: flowM,
    cmePrice: price * 1.001,
    spotPrice: price,
    cmeDaysToExpiry: 14,
    dataFreshness: d(date),
  };
}

/** CVD 입력 */
function makeCvd(spotUp: boolean, derivUp: boolean, priceUp: boolean, date: string) {
  return {
    spotCvdUp: spotUp,
    derivativeCvdUp: derivUp,
    priceUp,
    spotCvdStrength: (spotUp ? 1 : 0) as 0 | 1 | 2,
    derivativeCvdStrength: (derivUp ? 1 : 0) as 0 | 1 | 2,
    volumeAnomaly: 1 as 0 | 1 | 2,
    dataFreshness: d(date),
  };
}

/** 온체인 입력 */
function makeOnchain(overrides: {
  mvrv: number;
  sthCostBasis: number;
  currentPrice: number;
  exchangeReserveChange30d: number;
  hashRibbonStatus?: 'pink' | 'normal' | 'cross';
  date: string;
}) {
  return {
    mvrv: overrides.mvrv,
    sthCostBasis: overrides.sthCostBasis,
    currentPrice: overrides.currentPrice,
    exchangeReserveChange30d: overrides.exchangeReserveChange30d,
    hashRibbonStatus: overrides.hashRibbonStatus ?? 'normal',
    daysDestroyedAnomaly: false,
    dataFreshness: d(overrides.date),
  };
}

/** 매크로 입력 */
function makeMacro(overrides: {
  dxyStatus?: 'uptrend' | 'downtrend' | 'sideways' | 'break_up' | 'break_down';
  realYield?: number;
  spxTrendUp?: boolean;
  fedCycle?: 'cutting' | 'hold' | 'hiking' | 'cut_start';
  date: string;
}) {
  return {
    dxyStatus: overrides.dxyStatus ?? 'sideways',
    realYield: overrides.realYield ?? 1.5,
    realYieldTrend: 'sideways' as const,
    spxBtcCorrelation: 0.3,
    spxTrendUp: overrides.spxTrendUp ?? true,
    fedCycle: overrides.fedCycle ?? 'hold',
    dataFreshness: d(overrides.date),
  };
}

/** 사이클+피보나치 입력 */
function makeCycleFib(months: number, price: number, high: number, low: number, date: string) {
  return {
    monthsSinceHalving: months,
    currentPrice: price,
    cycleHigh: high,
    cycleLow: low,
    drawdownFromAth: ((high - price) / high) * 100,
    dataFreshness: d(date),
  };
}

/** 자금흐름 입력 */
function makeFundFlows(stableTrend: 'up' | 'down' | 'flat', premium: number, date: string) {
  return {
    stablecoinTrend: stableTrend,
    coinbasePremium: premium,
    coinbasePremiumTrend: premium > 0 ? 'rising' as const : 'falling' as const,
    dataFreshness: d(date),
  };
}

/** 군중 역발상 입력 */
function makeCrowd(fgi: number, naverHigh: boolean, naverLow: boolean, kimchi: number, date: string) {
  return {
    fearGreedIndex: fgi,
    naverSearchAnomaly: naverHigh,
    naverSearchLow: naverLow,
    kimchiPremium: kimchi,
    dataFreshness: d(date),
  };
}

// ─────────────────────────────────────────────
// 20개 역사적 데이터 포인트
// ─────────────────────────────────────────────

export const HISTORICAL_DATA: HistoricalDataPoint[] = [
  // ═══════════════════════════════════════════
  // 사이클 2 (2016 반감기)
  // ═══════════════════════════════════════════
  {
    id: '2015-01-bottom',
    date: '2015-01-14',
    label: '2015년 1월 바닥 — 베어마켓 최저점',
    price: 178,
    return30d: 32,    // 30일 후 ~$235
    return90d: 35,    // 90일 후 ~$240
    return180d: 56,   // 6개월 후 ~$278
    return365d: 139,  // 1년 후 ~$425
    cycle: 2,
    type: 'bottom',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 178, ma20: 320, ma50: 350, ma200: 450, adx: 35, adxTrendUp: false, date: '2015-01-14' }),
      cat2: makeRsi(18, 28, 38, 26, '2015-01-14'),
      cat3: makeDerivatives({ fundingRate: -0.02, priceUp: false, date: '2015-01-14' }),
      cat4: makeOptionsNeutral(178, '2015-01-14'),
      cat5: makeEtf(0, 178, '2015-01-14'),
      cat6: makeCvd(false, false, false, '2015-01-14'),
      cat7: makeOnchain({ mvrv: 0.47, sthCostBasis: 300, currentPrice: 178, exchangeReserveChange30d: -3, hashRibbonStatus: 'pink', date: '2015-01-14' }),
      cat8: makeMacro({ dxyStatus: 'uptrend', fedCycle: 'hold', date: '2015-01-14' }),
      cat9: makeCycleFib(26, 178, 1163, 65, '2015-01-14'),
      cat10: makeFundFlows('flat', -0.5, '2015-01-14'),
      cat11: makeCrowd(12, false, true, 0, '2015-01-14'),
    },
  },
  {
    id: '2015-10-rsi-breakout',
    date: '2015-10-30',
    label: '2015년 10월 — RSI 주봉 50 돌파',
    price: 325,
    return30d: 30,
    return90d: 35,
    return180d: 105,
    return365d: 120,
    cycle: 2,
    type: 'rally',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 325, ma20: 270, ma50: 250, ma200: 260, adx: 28, date: '2015-10-30' }),
      cat2: makeRsi(62, 52, 44, 48, '2015-10-30'),
      cat3: makeDerivatives({ fundingRate: 0.01, priceUp: true, date: '2015-10-30' }),
      cat4: makeOptionsNeutral(325, '2015-10-30'),
      cat5: makeEtf(0, 325, '2015-10-30'),
      cat6: makeCvd(true, true, true, '2015-10-30'),
      cat7: makeOnchain({ mvrv: 1.2, sthCostBasis: 250, currentPrice: 325, exchangeReserveChange30d: -2, date: '2015-10-30' }),
      cat8: makeMacro({ dxyStatus: 'sideways', fedCycle: 'hold', date: '2015-10-30' }),
      cat9: makeCycleFib(39, 325, 1163, 178, '2015-10-30'),
      cat10: makeFundFlows('up', 0.5, '2015-10-30'),
      cat11: makeCrowd(38, false, false, 1, '2015-10-30'),
    },
  },
  {
    id: '2016-07-halving',
    date: '2016-07-09',
    label: '2016년 7월 — 2차 반감기',
    price: 650,
    return30d: -5,
    return90d: 0,
    return180d: 50,
    return365d: 285,
    cycle: 2,
    type: 'halving',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 650, ma20: 660, ma50: 550, ma200: 430, date: '2016-07-09' }),
      cat2: makeRsi(55, 62, 55, 60, '2016-07-09'),
      cat3: makeDerivatives({ fundingRate: 0.02, priceUp: true, date: '2016-07-09' }),
      cat4: makeOptionsNeutral(650, '2016-07-09'),
      cat5: makeEtf(0, 650, '2016-07-09'),
      cat6: makeCvd(true, true, true, '2016-07-09'),
      cat7: makeOnchain({ mvrv: 1.6, sthCostBasis: 450, currentPrice: 650, exchangeReserveChange30d: -1.5, date: '2016-07-09' }),
      cat8: makeMacro({ dxyStatus: 'sideways', fedCycle: 'hold', date: '2016-07-09' }),
      cat9: makeCycleFib(0, 650, 1163, 178, '2016-07-09'),
      cat10: makeFundFlows('up', 1.0, '2016-07-09'),
      cat11: makeCrowd(45, false, false, 2, '2016-07-09'),
    },
  },
  {
    id: '2017-12-top',
    date: '2017-12-17',
    label: '2017년 12월 — 사이클 2 ATH $19,783',
    price: 19783,
    return30d: -42,
    return90d: -50,
    return180d: -63,
    return365d: -83,
    cycle: 2,
    type: 'top',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 19783, ma20: 16000, ma50: 9000, ma200: 4500, adx: 50, date: '2017-12-17' }),
      cat2: makeRsi(92, 89, 78, 87, '2017-12-17'),
      cat3: makeDerivatives({ fundingRate: 0.15, oiChangePercent: 30, priceUp: true, date: '2017-12-17' }),
      cat4: makeOptionsNeutral(19783, '2017-12-17'),
      cat5: makeEtf(0, 19783, '2017-12-17'),
      cat6: makeCvd(false, true, true, '2017-12-17'),
      cat7: makeOnchain({ mvrv: 4.7, sthCostBasis: 12000, currentPrice: 19783, exchangeReserveChange30d: 5, date: '2017-12-17' }),
      cat8: makeMacro({ dxyStatus: 'downtrend', spxTrendUp: true, date: '2017-12-17' }),
      cat9: makeCycleFib(17, 19783, 19783, 178, '2017-12-17'),
      cat10: makeFundFlows('up', 3.5, '2017-12-17'),
      cat11: makeCrowd(95, true, false, 50, '2017-12-17'),
    },
  },

  // ═══════════════════════════════════════════
  // 사이클 3 (2020 반감기)
  // ═══════════════════════════════════════════
  {
    id: '2018-12-bottom',
    date: '2018-12-15',
    label: '2018년 12월 바닥 — 크립토 윈터 최저점',
    price: 3200,
    return30d: 8,
    return90d: 22,
    return180d: 200,
    return365d: 125,
    cycle: 3,
    type: 'bottom',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 3200, ma20: 3800, ma50: 5500, ma200: 7500, adx: 40, adxTrendUp: false, date: '2018-12-15' }),
      cat2: makeRsi(22, 25, 35, 23, '2018-12-15'),
      cat3: makeDerivatives({ fundingRate: -0.03, oiChangePercent: -20, priceUp: false, date: '2018-12-15' }),
      cat4: makeOptionsNeutral(3200, '2018-12-15'),
      cat5: makeEtf(0, 3200, '2018-12-15'),
      cat6: makeCvd(false, false, false, '2018-12-15'),
      cat7: makeOnchain({ mvrv: 0.75, sthCostBasis: 5000, currentPrice: 3200, exchangeReserveChange30d: -4, hashRibbonStatus: 'pink', date: '2018-12-15' }),
      cat8: makeMacro({ dxyStatus: 'uptrend', fedCycle: 'hiking', realYield: 2.5, date: '2018-12-15' }),
      cat9: makeCycleFib(29, 3200, 19783, 3200, '2018-12-15'),
      cat10: makeFundFlows('down', -2.0, '2018-12-15'),
      cat11: makeCrowd(10, false, true, -5, '2018-12-15'),
    },
  },
  {
    id: '2019-04-rsi-breakout',
    date: '2019-04-02',
    label: '2019년 4월 — RSI 주봉 50 돌파 랠리',
    price: 5000,
    return30d: 40,
    return90d: 160,
    return180d: 60,
    return365d: 40,
    cycle: 3,
    type: 'rally',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 5000, ma20: 4000, ma50: 3800, ma200: 5500, date: '2019-04-02' }),
      cat2: makeRsi(68, 55, 42, 47, '2019-04-02'),
      cat3: makeDerivatives({ fundingRate: 0.02, oiChangePercent: 15, priceUp: true, date: '2019-04-02' }),
      cat4: makeOptionsNeutral(5000, '2019-04-02'),
      cat5: makeEtf(0, 5000, '2019-04-02'),
      cat6: makeCvd(true, true, true, '2019-04-02'),
      cat7: makeOnchain({ mvrv: 1.1, sthCostBasis: 3800, currentPrice: 5000, exchangeReserveChange30d: -2, hashRibbonStatus: 'cross', date: '2019-04-02' }),
      cat8: makeMacro({ dxyStatus: 'sideways', fedCycle: 'hold', date: '2019-04-02' }),
      cat9: makeCycleFib(33, 5000, 19783, 3200, '2019-04-02'),
      cat10: makeFundFlows('up', 1.5, '2019-04-02'),
      cat11: makeCrowd(30, false, false, 2, '2019-04-02'),
    },
  },
  {
    id: '2020-03-covid-bottom',
    date: '2020-03-13',
    label: '2020년 3월 — 코로나 패닉 바닥',
    price: 4900,
    return30d: 42,
    return90d: 90,
    return180d: 120,
    return365d: 1100,
    cycle: 3,
    type: 'bottom',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 4900, ma20: 8500, ma50: 9000, ma200: 8800, adx: 55, adxTrendUp: false, date: '2020-03-13' }),
      cat2: makeRsi(15, 20, 40, 35, '2020-03-13'),
      cat3: makeDerivatives({ fundingRate: -0.06, oiChangePercent: -40, priceUp: false, date: '2020-03-13' }),
      cat4: makeOptionsNeutral(4900, '2020-03-13'),
      cat5: makeEtf(0, 4900, '2020-03-13'),
      cat6: makeCvd(false, false, false, '2020-03-13'),
      cat7: makeOnchain({ mvrv: 0.85, sthCostBasis: 7500, currentPrice: 4900, exchangeReserveChange30d: 8, hashRibbonStatus: 'pink', date: '2020-03-13' }),
      cat8: makeMacro({ dxyStatus: 'break_up', fedCycle: 'cut_start', realYield: 0, spxTrendUp: false, date: '2020-03-13' }),
      cat9: makeCycleFib(46, 4900, 13880, 3200, '2020-03-13'),
      cat10: makeFundFlows('down', -3.0, '2020-03-13'),
      cat11: makeCrowd(8, false, true, -8, '2020-03-13'),
    },
  },
  {
    id: '2020-05-halving',
    date: '2020-05-11',
    label: '2020년 5월 — 3차 반감기',
    price: 8600,
    return30d: 10,
    return90d: 35,
    return180d: 110,
    return365d: 560,
    cycle: 3,
    type: 'halving',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 8600, ma20: 8800, ma50: 7500, ma200: 8000, date: '2020-05-11' }),
      cat2: makeRsi(55, 56, 48, 50, '2020-05-11'),
      cat3: makeDerivatives({ fundingRate: 0.01, priceUp: true, date: '2020-05-11' }),
      cat4: makeOptionsNeutral(8600, '2020-05-11'),
      cat5: makeEtf(0, 8600, '2020-05-11'),
      cat6: makeCvd(true, true, true, '2020-05-11'),
      cat7: makeOnchain({ mvrv: 1.3, sthCostBasis: 7000, currentPrice: 8600, exchangeReserveChange30d: -2, date: '2020-05-11' }),
      cat8: makeMacro({ dxyStatus: 'downtrend', fedCycle: 'cutting', realYield: -1.0, spxTrendUp: true, date: '2020-05-11' }),
      cat9: makeCycleFib(0, 8600, 13880, 3200, '2020-05-11'),
      cat10: makeFundFlows('up', 0.5, '2020-05-11'),
      cat11: makeCrowd(38, false, false, 3, '2020-05-11'),
    },
  },
  {
    id: '2020-10-breakout',
    date: '2020-10-21',
    label: '2020년 10월 — PayPal 발표 + 상승 가속',
    price: 12800,
    return30d: 48,
    return90d: 150,
    return180d: 355,
    return365d: 380,
    cycle: 3,
    type: 'rally',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 12800, ma20: 11500, ma50: 10800, ma200: 9000, adx: 30, date: '2020-10-21' }),
      cat2: makeRsi(65, 62, 55, 58, '2020-10-21'),
      cat3: makeDerivatives({ fundingRate: 0.03, oiChangePercent: 20, priceUp: true, date: '2020-10-21' }),
      cat4: makeOptionsNeutral(12800, '2020-10-21'),
      cat5: makeEtf(0, 12800, '2020-10-21'),
      cat6: makeCvd(true, true, true, '2020-10-21'),
      cat7: makeOnchain({ mvrv: 1.5, sthCostBasis: 10500, currentPrice: 12800, exchangeReserveChange30d: -3, date: '2020-10-21' }),
      cat8: makeMacro({ dxyStatus: 'downtrend', fedCycle: 'cutting', realYield: -1.0, spxTrendUp: true, date: '2020-10-21' }),
      cat9: makeCycleFib(5, 12800, 13880, 3200, '2020-10-21'),
      cat10: makeFundFlows('up', 2.0, '2020-10-21'),
      cat11: makeCrowd(55, false, false, 5, '2020-10-21'),
    },
  },
  {
    id: '2021-04-top1',
    date: '2021-04-14',
    label: '2021년 4월 — 사이클 3 첫 번째 피크',
    price: 64800,
    return30d: -40,
    return90d: -45,
    return180d: -5,
    return365d: -35,
    cycle: 3,
    type: 'top',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 64800, ma20: 58000, ma50: 50000, ma200: 30000, adx: 45, date: '2021-04-14' }),
      cat2: makeRsi(85, 82, 72, 80, '2021-04-14'),
      cat3: makeDerivatives({ fundingRate: 0.12, oiChangePercent: 25, priceUp: true, date: '2021-04-14' }),
      cat4: makeOptionsNeutral(64800, '2021-04-14'),
      cat5: makeEtf(0, 64800, '2021-04-14'),
      cat6: makeCvd(false, true, true, '2021-04-14'),
      cat7: makeOnchain({ mvrv: 3.8, sthCostBasis: 48000, currentPrice: 64800, exchangeReserveChange30d: 4, date: '2021-04-14' }),
      cat8: makeMacro({ dxyStatus: 'downtrend', fedCycle: 'cutting', realYield: -1.5, spxTrendUp: true, date: '2021-04-14' }),
      cat9: makeCycleFib(11, 64800, 64800, 3200, '2021-04-14'),
      cat10: makeFundFlows('up', 3.0, '2021-04-14'),
      cat11: makeCrowd(88, true, false, 25, '2021-04-14'),
    },
  },
  {
    id: '2021-07-summer-bottom',
    date: '2021-07-20',
    label: '2021년 7월 — 중국 채굴 밴 바닥',
    price: 29800,
    return30d: 40,
    return90d: 110,
    return180d: 30,
    return365d: -25,
    cycle: 3,
    type: 'bottom',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 29800, ma20: 32000, ma50: 37000, ma200: 42000, adx: 30, adxTrendUp: false, date: '2021-07-20' }),
      cat2: makeRsi(30, 32, 55, 30, '2021-07-20'),
      cat3: makeDerivatives({ fundingRate: -0.02, oiChangePercent: -15, priceUp: false, date: '2021-07-20' }),
      cat4: makeOptionsNeutral(29800, '2021-07-20'),
      cat5: makeEtf(0, 29800, '2021-07-20'),
      cat6: makeCvd(false, false, false, '2021-07-20'),
      cat7: makeOnchain({ mvrv: 1.8, sthCostBasis: 35000, currentPrice: 29800, exchangeReserveChange30d: -5, hashRibbonStatus: 'pink', date: '2021-07-20' }),
      cat8: makeMacro({ dxyStatus: 'sideways', fedCycle: 'cutting', realYield: -1.0, spxTrendUp: true, date: '2021-07-20' }),
      cat9: makeCycleFib(14, 29800, 64800, 3200, '2021-07-20'),
      cat10: makeFundFlows('flat', -1.0, '2021-07-20'),
      cat11: makeCrowd(15, false, true, -2, '2021-07-20'),
    },
  },
  {
    id: '2021-11-top2',
    date: '2021-11-10',
    label: '2021년 11월 — 사이클 3 ATH $69,000',
    price: 69000,
    return30d: -18,
    return90d: -40,
    return180d: -57,
    return365d: -76,
    cycle: 3,
    type: 'top',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 69000, ma20: 62000, ma50: 55000, ma200: 45000, adx: 42, date: '2021-11-10' }),
      cat2: makeRsi(78, 72, 68, 70, '2021-11-10'),
      cat3: makeDerivatives({ fundingRate: 0.08, oiChangePercent: 18, priceUp: true, date: '2021-11-10' }),
      cat4: makeOptionsNeutral(69000, '2021-11-10'),
      cat5: makeEtf(0, 69000, '2021-11-10'),
      cat6: makeCvd(false, true, true, '2021-11-10'),
      cat7: makeOnchain({ mvrv: 3.2, sthCostBasis: 55000, currentPrice: 69000, exchangeReserveChange30d: 3, date: '2021-11-10' }),
      cat8: makeMacro({ dxyStatus: 'sideways', fedCycle: 'hold', realYield: -1.0, spxTrendUp: true, date: '2021-11-10' }),
      cat9: makeCycleFib(18, 69000, 69000, 3200, '2021-11-10'),
      cat10: makeFundFlows('up', 2.5, '2021-11-10'),
      cat11: makeCrowd(84, true, false, 30, '2021-11-10'),
    },
  },

  // ═══════════════════════════════════════════
  // 사이클 4 (2024 반감기)
  // ═══════════════════════════════════════════
  {
    id: '2022-06-luna-bottom',
    date: '2022-06-18',
    label: '2022년 6월 — LUNA/3AC 패닉 바닥',
    price: 17600,
    return30d: 24,
    return90d: 12,
    return180d: -5,
    return365d: 72,
    cycle: 4,
    type: 'bottom',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 17600, ma20: 22000, ma50: 30000, ma200: 40000, adx: 45, adxTrendUp: false, date: '2022-06-18' }),
      cat2: makeRsi(20, 22, 38, 25, '2022-06-18'),
      cat3: makeDerivatives({ fundingRate: -0.05, oiChangePercent: -35, priceUp: false, date: '2022-06-18' }),
      cat4: makeOptionsNeutral(17600, '2022-06-18'),
      cat5: makeEtf(0, 17600, '2022-06-18'),
      cat6: makeCvd(false, false, false, '2022-06-18'),
      cat7: makeOnchain({ mvrv: 0.82, sthCostBasis: 28000, currentPrice: 17600, exchangeReserveChange30d: 6, hashRibbonStatus: 'pink', date: '2022-06-18' }),
      cat8: makeMacro({ dxyStatus: 'uptrend', fedCycle: 'hiking', realYield: 2.0, spxTrendUp: false, date: '2022-06-18' }),
      cat9: makeCycleFib(25, 17600, 69000, 15500, '2022-06-18'),
      cat10: makeFundFlows('down', -2.5, '2022-06-18'),
      cat11: makeCrowd(6, false, true, -8, '2022-06-18'),
    },
  },
  {
    id: '2022-11-ftx-bottom',
    date: '2022-11-21',
    label: '2022년 11월 — FTX 붕괴 최종 바닥',
    price: 15500,
    return30d: 8,
    return90d: 45,
    return180d: 70,
    return365d: 140,
    cycle: 4,
    type: 'bottom',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 15500, ma20: 17000, ma50: 20000, ma200: 25000, adx: 40, adxTrendUp: false, date: '2022-11-21' }),
      cat2: makeRsi(25, 28, 36, 30, '2022-11-21'),
      cat3: makeDerivatives({ fundingRate: -0.04, oiChangePercent: -30, priceUp: false, date: '2022-11-21' }),
      cat4: makeOptionsNeutral(15500, '2022-11-21'),
      cat5: makeEtf(0, 15500, '2022-11-21'),
      cat6: makeCvd(false, false, false, '2022-11-21'),
      cat7: makeOnchain({ mvrv: 0.72, sthCostBasis: 20000, currentPrice: 15500, exchangeReserveChange30d: 5, hashRibbonStatus: 'pink', date: '2022-11-21' }),
      cat8: makeMacro({ dxyStatus: 'break_down', fedCycle: 'hiking', realYield: 2.5, spxTrendUp: false, date: '2022-11-21' }),
      cat9: makeCycleFib(31, 15500, 69000, 15500, '2022-11-21'),
      cat10: makeFundFlows('down', -3.0, '2022-11-21'),
      cat11: makeCrowd(8, false, true, -10, '2022-11-21'),
    },
  },
  {
    id: '2023-01-rsi-recovery',
    date: '2023-01-13',
    label: '2023년 1월 — RSI 주봉 40~50 진입',
    price: 19200,
    return30d: 20,
    return90d: 50,
    return180d: 55,
    return365d: 120,
    cycle: 4,
    type: 'rally',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 19200, ma20: 17500, ma50: 17000, ma200: 22000, date: '2023-01-13' }),
      cat2: makeRsi(72, 48, 40, 35, '2023-01-13'),
      cat3: makeDerivatives({ fundingRate: 0.01, oiChangePercent: 10, priceUp: true, date: '2023-01-13' }),
      cat4: makeOptionsNeutral(19200, '2023-01-13'),
      cat5: makeEtf(0, 19200, '2023-01-13'),
      cat6: makeCvd(true, true, true, '2023-01-13'),
      cat7: makeOnchain({ mvrv: 0.95, sthCostBasis: 18000, currentPrice: 19200, exchangeReserveChange30d: -4, hashRibbonStatus: 'cross', date: '2023-01-13' }),
      cat8: makeMacro({ dxyStatus: 'break_down', fedCycle: 'hiking', realYield: 2.0, spxTrendUp: true, date: '2023-01-13' }),
      cat9: makeCycleFib(33, 19200, 69000, 15500, '2023-01-13'),
      cat10: makeFundFlows('up', 1.0, '2023-01-13'),
      cat11: makeCrowd(25, false, true, -3, '2023-01-13'),
    },
  },
  {
    id: '2023-10-etf-anticipation',
    date: '2023-10-24',
    label: '2023년 10월 — ETF 승인 기대감 랠리',
    price: 34000,
    return30d: 12,
    return90d: 35,
    return180d: 90,
    return365d: 110,
    cycle: 4,
    type: 'rally',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 34000, ma20: 28500, ma50: 27000, ma200: 28000, adx: 35, date: '2023-10-24' }),
      cat2: makeRsi(72, 65, 52, 55, '2023-10-24'),
      cat3: makeDerivatives({ fundingRate: 0.04, oiChangePercent: 20, priceUp: true, date: '2023-10-24' }),
      cat4: makeOptionsNeutral(34000, '2023-10-24'),
      cat5: makeEtf(0, 34000, '2023-10-24'),
      cat6: makeCvd(true, true, true, '2023-10-24'),
      cat7: makeOnchain({ mvrv: 1.4, sthCostBasis: 27000, currentPrice: 34000, exchangeReserveChange30d: -3, date: '2023-10-24' }),
      cat8: makeMacro({ dxyStatus: 'sideways', fedCycle: 'hold', realYield: 2.0, spxTrendUp: true, date: '2023-10-24' }),
      cat9: makeCycleFib(42, 34000, 69000, 15500, '2023-10-24'),
      cat10: makeFundFlows('up', 2.0, '2023-10-24'),
      cat11: makeCrowd(65, false, false, 8, '2023-10-24'),
    },
  },
  {
    id: '2024-03-ath',
    date: '2024-03-14',
    label: '2024년 3월 — 사이클 4 중간 ATH $73,800',
    price: 73800,
    return30d: -10,
    return90d: -12,
    return180d: -18,
    return365d: -5,
    cycle: 4,
    type: 'top',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 73800, ma20: 65000, ma50: 55000, ma200: 38000, adx: 40, date: '2024-03-14' }),
      cat2: makeRsi(82, 78, 65, 75, '2024-03-14'),
      cat3: makeDerivatives({ fundingRate: 0.08, oiChangePercent: 15, priceUp: true, date: '2024-03-14' }),
      cat4: makeOptionsNeutral(73800, '2024-03-14'),
      cat5: makeEtf(500, 73800, '2024-03-14'),
      cat6: makeCvd(true, true, true, '2024-03-14'),
      cat7: makeOnchain({ mvrv: 2.8, sthCostBasis: 50000, currentPrice: 73800, exchangeReserveChange30d: 2, date: '2024-03-14' }),
      cat8: makeMacro({ dxyStatus: 'sideways', fedCycle: 'hold', realYield: 1.8, spxTrendUp: true, date: '2024-03-14' }),
      cat9: makeCycleFib(-1, 73800, 73800, 15500, '2024-03-14'),
      cat10: makeFundFlows('up', 2.5, '2024-03-14'),
      cat11: makeCrowd(82, true, false, 15, '2024-03-14'),
    },
  },
  {
    id: '2024-04-halving',
    date: '2024-04-20',
    label: '2024년 4월 — 4차 반감기',
    price: 64000,
    return30d: -2,
    return90d: -5,
    return180d: 50,
    return365d: 10,
    cycle: 4,
    type: 'halving',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 64000, ma20: 66000, ma50: 62000, ma200: 42000, date: '2024-04-20' }),
      cat2: makeRsi(50, 55, 60, 58, '2024-04-20'),
      cat3: makeDerivatives({ fundingRate: 0.02, priceUp: false, date: '2024-04-20' }),
      cat4: makeOptionsNeutral(64000, '2024-04-20'),
      cat5: makeEtf(200, 64000, '2024-04-20'),
      cat6: makeCvd(false, true, false, '2024-04-20'),
      cat7: makeOnchain({ mvrv: 2.2, sthCostBasis: 55000, currentPrice: 64000, exchangeReserveChange30d: -1, date: '2024-04-20' }),
      cat8: makeMacro({ dxyStatus: 'uptrend', fedCycle: 'hold', realYield: 2.0, spxTrendUp: true, date: '2024-04-20' }),
      cat9: makeCycleFib(0, 64000, 73800, 15500, '2024-04-20'),
      cat10: makeFundFlows('up', 1.0, '2024-04-20'),
      cat11: makeCrowd(55, false, false, 5, '2024-04-20'),
    },
  },
  {
    id: '2024-12-ath2',
    date: '2024-12-17',
    label: '2024년 12월 — 사이클 4 ATH $108,000',
    price: 108000,
    return30d: -12,
    return90d: -35,
    return180d: 0,  // 아직 모름 — 추정
    return365d: 0,  // 아직 모름
    cycle: 4,
    type: 'top',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 108000, ma20: 98000, ma50: 85000, ma200: 65000, adx: 38, date: '2024-12-17' }),
      cat2: makeRsi(80, 75, 68, 73, '2024-12-17'),
      cat3: makeDerivatives({ fundingRate: 0.06, oiChangePercent: 12, priceUp: true, date: '2024-12-17' }),
      cat4: makeOptionsNeutral(108000, '2024-12-17'),
      cat5: makeEtf(800, 108000, '2024-12-17'),
      cat6: makeCvd(false, true, true, '2024-12-17'),
      cat7: makeOnchain({ mvrv: 3.1, sthCostBasis: 80000, currentPrice: 108000, exchangeReserveChange30d: 3, date: '2024-12-17' }),
      cat8: makeMacro({ dxyStatus: 'uptrend', fedCycle: 'cutting', realYield: 1.5, spxTrendUp: true, date: '2024-12-17' }),
      cat9: makeCycleFib(8, 108000, 108000, 15500, '2024-12-17'),
      cat10: makeFundFlows('up', 3.0, '2024-12-17'),
      cat11: makeCrowd(88, true, false, 20, '2024-12-17'),
    },
  },
  {
    id: '2025-03-current',
    date: '2025-03-24',
    label: '2025년 3월 — 현재 (NO_TRADE)',
    price: 70200,
    return30d: 0,   // 미래 — 알 수 없음
    return90d: 0,
    return180d: 0,
    return365d: 0,
    cycle: 4,
    type: 'current',
    scoringInput: {
      cat1: makePriceAction({ currentPrice: 70200, ma20: 82000, ma50: 88000, ma200: 75000, adx: 22, adxTrendUp: false, date: '2025-03-24' }),
      cat2: makeRsi(50, 36, 45, 38, '2025-03-24'),
      cat3: makeDerivatives({ fundingRate: 0.005, oiChangePercent: -5, priceUp: false, date: '2025-03-24' }),
      cat4: makeOptionsNeutral(70200, '2025-03-24'),
      cat5: makeEtf(-200, 70200, '2025-03-24'),
      cat6: makeCvd(false, false, false, '2025-03-24'),
      cat7: makeOnchain({ mvrv: 1.8, sthCostBasis: 85000, currentPrice: 70200, exchangeReserveChange30d: 1, date: '2025-03-24' }),
      cat8: makeMacro({ dxyStatus: 'sideways', fedCycle: 'hold', realYield: 1.8, spxTrendUp: false, date: '2025-03-24' }),
      cat9: makeCycleFib(23, 70200, 108000, 15500, '2025-03-24'),
      cat10: makeFundFlows('flat', -0.5, '2025-03-24'),
      cat11: makeCrowd(32, false, false, 2, '2025-03-24'),
    },
  },
];

// ─────────────────────────────────────────────
// 반감기 사이클 요약 데이터 (CycleTimeline용)
// ─────────────────────────────────────────────

export interface HalvingCycleSummary {
  /** 반감기 번호 */
  number: 1 | 2 | 3 | 4;
  /** 반감기 날짜 */
  halvingDate: string;
  /** 반감기 시 가격 */
  halvingPrice: number;
  /** ATH 날짜 */
  athDate: string;
  /** ATH 가격 */
  athPrice: number;
  /** 반감기 → ATH 경과 개월 */
  monthsToAth: number;
  /** 반감기 → ATH 수익률 (%) */
  returnToAth: number;
  /** 사이클 최저점 가격 */
  cycleLow: number;
  /** ATH → 최저점 하락률 (%) */
  maxDrawdown: number;
}

export const HALVING_CYCLES: HalvingCycleSummary[] = [
  {
    number: 1,
    halvingDate: '2012-11-28',
    halvingPrice: 12,
    athDate: '2013-11-29',
    athPrice: 1163,
    monthsToAth: 12,
    returnToAth: 9592,
    cycleLow: 65,
    maxDrawdown: -94,
  },
  {
    number: 2,
    halvingDate: '2016-07-09',
    halvingPrice: 650,
    athDate: '2017-12-17',
    athPrice: 19783,
    monthsToAth: 17,
    returnToAth: 2944,
    cycleLow: 178,
    maxDrawdown: -84,
  },
  {
    number: 3,
    halvingDate: '2020-05-11',
    halvingPrice: 8600,
    athDate: '2021-11-10',
    athPrice: 69000,
    monthsToAth: 18,
    returnToAth: 702,
    cycleLow: 3200,
    maxDrawdown: -77,
  },
  {
    number: 4,
    halvingDate: '2024-04-20',
    halvingPrice: 64000,
    athDate: '2025-10-06',
    athPrice: 126198,
    monthsToAth: 18,  // 리서치 확인: 17.8개월 (2025-10-06)
    returnToAth: 97,   // $64K → $126K
    cycleLow: 15500,
    maxDrawdown: -46,  // 126K → 68K (2026-03 현재)
  },
];
