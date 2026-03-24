/**
 * 카테고리 2: RSI 매크로 사이클 (가중치 8%)
 * 채점 기준: signal-scoring-algorithm.md Cat2 + rsi-cycle-patterns.md
 *
 * Cardwell RSI 범위 규칙 적용:
 *  - 불장에서 RSI 40~50 = 진정한 지지대 (전통적 30 기준 아님)
 *
 * 서브항목:
 *  - 일봉 RSI(14): -2 ~ +3
 *  - 주봉 RSI(14): -3 ~ +5 (핵심 타임프레임)
 *  - 월봉 RSI(14): -5 ~ +3 (레짐 필터)
 *
 * 카테고리 원점수 = (일봉 + 주봉 + 월봉 점수) / 3 → 정규화
 */

import type { CategoryScore, RsiMacroInput } from '../types';

/**
 * 일봉 RSI 점수 계산
 * 30 이하: +3 (과매도 — 단기 반등 임박)
 * 30~45: +2
 * 45~60: +1 (중립)
 * 60~75: 0
 * 75 이상: -2 (과매수)
 */
function scoreDailyRsi(rsi: number): { score: number; detail: string } {
  if (rsi <= 30) {
    return { score: 3, detail: `일봉 RSI(${rsi.toFixed(1)}): 과매도 ≤30 → +3 (단기 반등 임박)` };
  } else if (rsi <= 45) {
    return { score: 2, detail: `일봉 RSI(${rsi.toFixed(1)}): 30~45 저점 구간 → +2` };
  } else if (rsi <= 60) {
    return { score: 1, detail: `일봉 RSI(${rsi.toFixed(1)}): 45~60 중립 → +1` };
  } else if (rsi <= 75) {
    return { score: 0, detail: `일봉 RSI(${rsi.toFixed(1)}): 60~75 → 0` };
  } else {
    return { score: -2, detail: `일봉 RSI(${rsi.toFixed(1)}): ≥75 과매수 → -2` };
  }
}

/**
 * 주봉 RSI 점수 계산 — 핵심 타임프레임
 * 40 이하: +2 (깊은 과매도)
 * 40~50: +5 ← 역사적 대세상승 전조 구간 (핵심!)
 * 50~60: +3 (건강한 상승)
 * 60~70: +1
 * 70 이상: -3 (주봉 과매수 — 조정 임박)
 */
function scoreWeeklyRsi(rsi: number): { score: number; detail: string } {
  if (rsi < 40) {
    return { score: 2, detail: `주봉 RSI(${rsi.toFixed(1)}): <40 깊은 과매도 → +2` };
  } else if (rsi <= 50) {
    // 역사적 5/5 성공 케이스 구간
    return { score: 5, detail: `주봉 RSI(${rsi.toFixed(1)}): 40~50 ★역사적 대세상승 전조 구간! → +5` };
  } else if (rsi <= 60) {
    return { score: 3, detail: `주봉 RSI(${rsi.toFixed(1)}): 50~60 건강한 상승 → +3` };
  } else if (rsi <= 70) {
    return { score: 1, detail: `주봉 RSI(${rsi.toFixed(1)}): 60~70 → +1` };
  } else {
    return { score: -3, detail: `주봉 RSI(${rsi.toFixed(1)}): ≥70 과매수 — 조정 임박 → -3` };
  }
}

/**
 * 월봉 RSI 점수 계산 — 레짐 필터
 * 40 이하: -5 (베어 레짐 확인 — 주봉 40~50 무효화!)
 * 40~50: +2 (불장 저점 레짐)
 * 50~65: +3 (불장 건강)
 * 65 이상: -1 (월봉 과열 시작)
 */
function scoreMonthlyRsi(rsi: number): { score: number; detail: string } {
  if (rsi < 40) {
    return { score: -5, detail: `월봉 RSI(${rsi.toFixed(1)}): <40 ⚠️베어 레짐 — 주봉 40~50 신호 무효! → -5` };
  } else if (rsi <= 50) {
    return { score: 2, detail: `월봉 RSI(${rsi.toFixed(1)}): 40~50 불장 저점 레짐 → +2` };
  } else if (rsi <= 65) {
    return { score: 3, detail: `월봉 RSI(${rsi.toFixed(1)}): 50~65 불장 건강 레짐 → +3` };
  } else {
    return { score: -1, detail: `월봉 RSI(${rsi.toFixed(1)}): ≥65 월봉 과열 시작 → -1` };
  }
}

/**
 * 카테고리 2 최종 점수 계산
 * 원점수 = (일봉 + 주봉 + 월봉 점수) / 3 → -10 ~ +10 정규화
 *
 * 이론 최대: (3 + 5 + 3) / 3 = 3.67
 * -10~+10 스케일에서 최대 점수를 활용하도록
 * 평균값 × (10/5) 적용 (최대 평균 3.67 → 최대 원점수 ~7.34)
 */
export function scoreRsiMacro(input: RsiMacroInput): CategoryScore {
  const daily = scoreDailyRsi(input.rsiDaily);
  const weekly = scoreWeeklyRsi(input.rsiWeekly);
  const monthly = scoreMonthlyRsi(input.rsiMonthly);

  // 3타임프레임 평균 계산
  const avgRawScore = (daily.score + weekly.score + monthly.score) / 3;

  // 최대 평균점수 = (3+5+3)/3 = 3.67, 최소 = (-2-3-5)/3 = -3.33
  // -10 ~ +10으로 정규화: avgRawScore / 3.67 * 10
  const normalized = avgRawScore / 3.67 * 10;
  const rawScore = Math.max(-10, Math.min(10, normalized));

  const weightedScore = rawScore * 0.08;

  return {
    id: 2,
    name: 'RSI 매크로 사이클',
    weight: 0.08,
    rawScore,
    weightedScore,
    details: [
      daily.detail,
      weekly.detail,
      monthly.detail,
      `평균 원점수: ${avgRawScore.toFixed(2)} → 정규화: ${rawScore.toFixed(2)}`,
    ],
    dataFreshness: input.dataFreshness,
  };
}
