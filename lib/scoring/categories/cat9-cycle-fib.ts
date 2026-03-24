/**
 * 카테고리 9: 4년 사이클 + 피보나치 (가중치 7%)
 * 채점 기준: signal-scoring-algorithm.md Cat9 + btc-cycle-map.md
 *
 * EW(엘리엇 파동)은 코딩하지 않음 (2024 Nature 연구: 통계적 증거 없음)
 * 대신 4년 반감기 사이클 + 피보나치 되돌림 + ATH 대비 하락률 사용
 *
 * 서브항목:
 *  - 반감기 경과 사이클 점수: +1 ~ +5
 *  - 피보나치 되돌림 위치: 0 ~ +5
 *  - ATH 대비 하락률: 0 ~ +5
 *  - S2F 레짐 (제한적): 0 ~ +1.5 × 0.5
 *
 * 원점수 합계 → 최대 +10 / 최소 -10
 */

import type { CategoryScore, CycleFibInput } from '../types';

/**
 * 반감기 경과 사이클 점수 계산
 *
 * 0~6개월 (초기 축적): +3
 * 6~18개월 (상승 가속): +5
 * 18~30개월 (후기/조정): +1 (현재 ~23개월)
 * 30~48개월 (바닥 형성): +2
 */
function scoreHalvingCycle(monthsSinceHalving: number): { score: number; detail: string } {
  if (monthsSinceHalving <= 6) {
    return { score: 3, detail: `반감기 경과(${monthsSinceHalving}개월): 초기 축적 페이즈 → +3` };
  } else if (monthsSinceHalving <= 18) {
    return { score: 5, detail: `반감기 경과(${monthsSinceHalving}개월): 상승 가속 페이즈 → +5` };
  } else if (monthsSinceHalving <= 30) {
    return { score: 1, detail: `반감기 경과(${monthsSinceHalving}개월): 후기/조정 페이즈 → +1` };
  } else {
    return { score: 2, detail: `반감기 경과(${monthsSinceHalving}개월): 바닥 형성 페이즈 → +2` };
  }
}

/**
 * 피보나치 되돌림 위치 점수 계산
 * 사이클 저점(cycleLow)과 고점(cycleHigh) 기준으로 현재 되돌림 레벨 계산
 *
 * 0.618 이상 되돌림 (현재가가 0.618 지지 근처 또는 이하): +5
 * 0.5 근처 (±5%): +3
 * 0.382 근처: +1
 * 0.236 이상 (고점 근처 — 되돌림 얕음): 0
 */
function scoreFibonacci(input: CycleFibInput): { score: number; detail: string } {
  const { currentPrice, cycleHigh, cycleLow } = input;
  const totalMove = cycleHigh - cycleLow;

  if (totalMove <= 0) {
    return { score: 0, detail: '피보나치: 사이클 데이터 없음 → 0' };
  }

  // 피보나치 되돌림 비율 계산 (1.0 = 고점에서 저점으로 100% 되돌림)
  // retracementLevel = (cycleHigh - currentPrice) / totalMove
  const retracementLevel = (cycleHigh - currentPrice) / totalMove;

  // Fib 레벨 정의 (되돌림 깊이 기준)
  const fib618 = 0.618;
  const fib5 = 0.500;
  const fib382 = 0.382;
  const fib236 = 0.236;

  if (retracementLevel >= fib618) {
    return { score: 5, detail: `피보나치: ${(retracementLevel * 100).toFixed(1)}% 되돌림 (Fib 0.618+ 이하) → 역사적 저가 구간 → +5` };
  } else if (Math.abs(retracementLevel - fib5) <= 0.05) {
    return { score: 3, detail: `피보나치: ${(retracementLevel * 100).toFixed(1)}% 되돌림 (Fib 0.5 근처 ±5%) → +3` };
  } else if (Math.abs(retracementLevel - fib382) <= 0.05) {
    return { score: 1, detail: `피보나치: ${(retracementLevel * 100).toFixed(1)}% 되돌림 (Fib 0.382 근처) → +1` };
  } else if (retracementLevel <= fib236) {
    return { score: 0, detail: `피보나치: ${(retracementLevel * 100).toFixed(1)}% 되돌림 (Fib 0.236 이상 — 얕은 조정) → 0` };
  } else {
    return { score: 1, detail: `피보나치: ${(retracementLevel * 100).toFixed(1)}% 되돌림 (중간 구간) → +1` };
  }
}

/**
 * ATH 대비 하락률 점수 계산
 *
 * -70%+: +5 (역사적 바닥 패턴)
 * -50~70%: +3
 * -30~50%: +1 (현재 -46% 근처)
 * -30% 미만: 0
 */
function scoreAthDrawdown(drawdownPct: number): { score: number; detail: string } {
  // drawdownPct는 양수 값 (예: 46 = -46%)
  const absDrawdown = Math.abs(drawdownPct);

  if (absDrawdown >= 70) {
    return { score: 5, detail: `ATH 대비 -${absDrawdown.toFixed(1)}%: 역사적 바닥 패턴 → +5` };
  } else if (absDrawdown >= 50) {
    return { score: 3, detail: `ATH 대비 -${absDrawdown.toFixed(1)}%: 깊은 조정 구간 → +3` };
  } else if (absDrawdown >= 30) {
    return { score: 1, detail: `ATH 대비 -${absDrawdown.toFixed(1)}%: 조정 구간 → +1` };
  } else {
    return { score: 0, detail: `ATH 대비 -${absDrawdown.toFixed(1)}%: 얕은 조정 → 0` };
  }
}

/**
 * S2F 레짐 점수 계산 (희소성 지표로만, 신뢰도 ×0.5 할인)
 *
 * 반감기 후 0~18개월: +1.5
 * 반감기 후 18~30개월: +0.5 (현재)
 * 반감기 후 30~48개월: +1.0
 * 신뢰도 할인 ×0.5 적용
 */
function scoreS2f(monthsSinceHalving: number): { score: number; detail: string } {
  let rawS2f: number;
  let label: string;

  if (monthsSinceHalving <= 18) {
    rawS2f = 1.5;
    label = '초기 불장 효과';
  } else if (monthsSinceHalving <= 30) {
    rawS2f = 0.5;
    label = '중기 (현재 페이즈)';
  } else {
    rawS2f = 1.0;
    label = '다음 반감기 기대감';
  }

  // 신뢰도 할인: S2F는 2021년 이후 빗나감 → ×0.5
  const discounted = rawS2f * 0.5;
  return {
    score: discounted,
    detail: `S2F 레짐(${monthsSinceHalving}개월, ${label}): 원점수 ${rawS2f} × 신뢰도 0.5 = ${discounted.toFixed(2)}`,
  };
}

/**
 * 카테고리 9 최종 점수 계산
 */
export function scoreCycleFib(input: CycleFibInput): CategoryScore {
  const halving = scoreHalvingCycle(input.monthsSinceHalving);
  const fib = scoreFibonacci(input);
  const drawdown = scoreAthDrawdown(input.drawdownFromAth);
  const s2f = scoreS2f(input.monthsSinceHalving);

  // 이론 최대 = 5+5+5+0.75=15.75 → 클램핑
  const rawTotal = halving.score + fib.score + drawdown.score + s2f.score;
  const rawScore = Math.max(-10, Math.min(10, rawTotal));

  const weightedScore = rawScore * 0.07;

  return {
    id: 9,
    name: '4년 사이클 + 피보나치',
    weight: 0.07,
    rawScore,
    weightedScore,
    details: [halving.detail, fib.detail, drawdown.detail, s2f.detail],
    dataFreshness: input.dataFreshness,
  };
}
