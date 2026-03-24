/**
 * 카테고리 7: 온체인 강화 (가중치 12%)
 * 채점 기준: signal-scoring-algorithm.md Cat7 기준
 *
 * 서브항목:
 *  - MVRV 비율: -5 ~ +5
 *  - STH 원가 대비: -5 ~ +2
 *  - 거래소 BTC 보유량 추이: -3 ~ +3
 *  - 해시리본 상태: 0 ~ +4
 *  - Days Destroyed: -2 ~ 0
 *
 * 원점수 합계 → 최대 +10 / 최소 -10
 */

import type { CategoryScore, OnchainInput } from '../types';

/**
 * MVRV 비율 점수 계산
 * < 1.0: +5 (미실현 손실 — 역사적 극단 바닥)
 * 1.0~2.0: +3
 * 2.0~3.5: 0 (중립)
 * 3.5~5.0: -3 (과열)
 * > 5.0: -5 (역사적 천장 근처)
 */
function scoreMvrv(mvrv: number): { score: number; detail: string } {
  if (mvrv < 1.0) {
    return { score: 5, detail: `MVRV(${mvrv.toFixed(2)}): <1.0 미실현 손실 → 역사적 극단 바닥 → +5` };
  } else if (mvrv < 2.0) {
    return { score: 3, detail: `MVRV(${mvrv.toFixed(2)}): 1.0~2.0 정상 범위 → +3` };
  } else if (mvrv < 3.5) {
    return { score: 0, detail: `MVRV(${mvrv.toFixed(2)}): 2.0~3.5 중립 → 0` };
  } else if (mvrv < 5.0) {
    return { score: -3, detail: `MVRV(${mvrv.toFixed(2)}): 3.5~5.0 과열 구간 → -3` };
  } else {
    return { score: -5, detail: `MVRV(${mvrv.toFixed(2)}): >5.0 역사적 천장 근처 → -5` };
  }
}

/**
 * STH 원가 대비 점수 계산 (단기 보유자 손익 상태)
 *
 * 현재가 > STH 원가 + 10%: +2 (단기 보유자 수익 — 매도 압력 없음)
 * 현재가 ≈ STH 원가 (±10%): 0
 * 현재가 < STH 원가 - 10%: -3 (단기 보유자 손실 — 패닉셀 위험)
 * 현재가 < STH 원가 - 20%: -5 (대규모 패닉셀 임박)
 */
function scoreSth(input: OnchainInput): { score: number; detail: string } {
  const { currentPrice, sthCostBasis } = input;
  const diffPct = ((currentPrice - sthCostBasis) / sthCostBasis) * 100;

  if (diffPct > 10) {
    return { score: 2, detail: `STH 원가($${sthCostBasis.toFixed(0)}): 현재가 +${diffPct.toFixed(1)}% 위 → 매도 압력 없음 → +2` };
  } else if (diffPct >= -10) {
    return { score: 0, detail: `STH 원가($${sthCostBasis.toFixed(0)}): 현재가 ±10% (${diffPct.toFixed(1)}%) → 중립 → 0` };
  } else if (diffPct >= -20) {
    return { score: -3, detail: `STH 원가($${sthCostBasis.toFixed(0)}): 현재가 ${diffPct.toFixed(1)}% 하락 → 패닉셀 위험 → -3` };
  } else {
    return { score: -5, detail: `STH 원가($${sthCostBasis.toFixed(0)}): 현재가 ${diffPct.toFixed(1)}% 하락 → 대규모 패닉셀 임박 → -5` };
  }
}

/**
 * 거래소 BTC 보유량 추이 점수 계산 (30일 기준)
 *
 * 지속 하락 (-3%+): +3 (매도 압력 감소 — 강세)
 * 횡보 (±1%): 0
 * 증가 (+3%+): -3 (매도 압력 증가 — 약세)
 */
function scoreExchangeReserve(changePercent: number): { score: number; detail: string } {
  if (changePercent <= -3) {
    return { score: 3, detail: `거래소 BTC 보유량: ${changePercent.toFixed(1)}% 감소 → 매도 압력 감소, 강세 → +3` };
  } else if (changePercent < 1 && changePercent > -1) {
    return { score: 0, detail: `거래소 BTC 보유량: ${changePercent.toFixed(1)}% 횡보 → 0` };
  } else if (changePercent >= 3) {
    return { score: -3, detail: `거래소 BTC 보유량: +${changePercent.toFixed(1)}% 증가 → 매도 압력 증가, 약세 → -3` };
  } else if (changePercent > 0) {
    return { score: -1, detail: `거래소 BTC 보유량: +${changePercent.toFixed(1)}% 소폭 증가 → -1` };
  } else {
    return { score: 1, detail: `거래소 BTC 보유량: ${changePercent.toFixed(1)}% 소폭 감소 → +1` };
  }
}

/**
 * 해시리본 상태 점수 계산
 *
 * 핑크존 (30DMA < 60DMA = 채굴자 항복): +4 ← 역사적 바닥 신호
 * 정상 (30DMA > 60DMA): 0
 * 해시리본 크로스 직후 (핑크→정상 전환): +3 (회복 시작)
 */
function scoreHashRibbon(status: OnchainInput['hashRibbonStatus']): { score: number; detail: string } {
  switch (status) {
    case 'pink':
      return { score: 4, detail: `해시리본: 핑크존 (30DMA < 60DMA) → 채굴자 항복 = 역사적 바닥 신호 → +4` };
    case 'cross':
      return { score: 3, detail: `해시리본: 크로스 직후 (핑크→정상 전환) → 회복 시작 → +3` };
    default:
      return { score: 0, detail: `해시리본: 정상 (30DMA > 60DMA) → 0` };
  }
}

/**
 * Days Destroyed 이상 점수 계산
 * 급증 (역사적 상위 10%): -2 (장기 보유자 대규모 매도)
 * 정상: 0
 */
function scoreDaysDestroyed(anomaly: boolean): { score: number; detail: string } {
  if (anomaly) {
    return { score: -2, detail: `Days Destroyed: 급증 (역사적 상위 10%) → 장기 보유자 대규모 매도 → -2` };
  }
  return { score: 0, detail: `Days Destroyed: 정상 → 0` };
}

/**
 * 카테고리 7 최종 점수 계산
 */
export function scoreOnchain(input: OnchainInput): CategoryScore {
  const mvrv = scoreMvrv(input.mvrv);
  const sth = scoreSth(input);
  const reserve = scoreExchangeReserve(input.exchangeReserveChange30d);
  const hashRibbon = scoreHashRibbon(input.hashRibbonStatus);
  const daysDestroyed = scoreDaysDestroyed(input.daysDestroyedAnomaly);

  // 이론 최대 = 5+2+3+4+0=14, 최소 = -5-5-3+0-2=-15 → 클램핑
  const rawTotal = mvrv.score + sth.score + reserve.score + hashRibbon.score + daysDestroyed.score;
  const rawScore = Math.max(-10, Math.min(10, rawTotal));

  const weightedScore = rawScore * 0.12;

  return {
    id: 7,
    name: '온체인 강화',
    weight: 0.12,
    rawScore,
    weightedScore,
    details: [mvrv.detail, sth.detail, reserve.detail, hashRibbon.detail, daysDestroyed.detail],
    dataFreshness: input.dataFreshness,
  };
}
