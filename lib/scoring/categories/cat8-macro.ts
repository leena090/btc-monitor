/**
 * 카테고리 8: 매크로 오버레이 (가중치 8%)
 * 채점 기준: signal-scoring-algorithm.md Cat8 기준
 *
 * 2022년 교훈: 매크로 없이 기술적 분석만으로는 실패
 *
 * 서브항목:
 *  - DXY 방향: -4 ~ +4
 *  - 10Y 실질금리 (TIPS): -5 ~ +3
 *  - SPX-BTC 30일 상관관계: -4 ~ +2
 *  - 연준 금리 사이클: -3 ~ +3
 *
 * 원점수 합계 → 최대 +10 / 최소 -10
 */

import type { CategoryScore, MacroInput } from '../types';

/**
 * DXY (달러인덱스) 방향 점수 계산
 * DXY MA50 하향 돌파: +4 (달러 약세 = BTC 강세)
 * DXY 하락 추세: +2
 * DXY 횡보: 0
 * DXY 상승 추세: -2
 * DXY MA50 상향 돌파: -4 (달러 강세 = BTC 약세)
 */
function scoreDxy(status: MacroInput['dxyStatus']): { score: number; detail: string } {
  switch (status) {
    case 'break_down':
      return { score: 4, detail: `DXY: MA50 하향 돌파 → 달러 약세 가속, BTC 강세 촉매 → +4` };
    case 'downtrend':
      return { score: 2, detail: `DXY: 하락 추세 → 달러 약세, BTC 우호적 → +2` };
    case 'sideways':
      return { score: 0, detail: `DXY: 횡보 → 매크로 중립 → 0` };
    case 'uptrend':
      return { score: -2, detail: `DXY: 상승 추세 → 달러 강세, BTC 역풍 → -2` };
    case 'break_up':
      return { score: -4, detail: `DXY: MA50 상향 돌파 → 달러 강세 가속, BTC 강한 역풍 → -4` };
  }
}

/**
 * 10Y 실질금리 (TIPS) 점수 계산
 *
 * 하락 추세 (< 1%): +3
 * 횡보 (1~2%): 0
 * 상승 추세 (> 2%): -3
 * 급등 (> 2.5%): -5 (BTC 밸류에이션 압박 심각)
 */
function scoreRealYield(realYield: number, trend: MacroInput['realYieldTrend']): { score: number; detail: string } {
  if (realYield > 2.5) {
    return { score: -5, detail: `실질금리(${realYield.toFixed(2)}%): >2.5% 급등 → BTC 밸류에이션 압박 심각 → -5` };
  } else if (trend === 'rising' || realYield > 2.0) {
    return { score: -3, detail: `실질금리(${realYield.toFixed(2)}%): 상승 추세 → BTC 역풍 → -3` };
  } else if (realYield >= 1.0 && realYield <= 2.0 && trend === 'sideways') {
    return { score: 0, detail: `실질금리(${realYield.toFixed(2)}%): 횡보 (1~2%) → 중립 → 0` };
  } else if (trend === 'falling' || realYield < 1.0) {
    return { score: 3, detail: `실질금리(${realYield.toFixed(2)}%): 하락 추세 → BTC 밸류에이션 지지 → +3` };
  } else {
    return { score: 0, detail: `실질금리(${realYield.toFixed(2)}%): 중립 → 0` };
  }
}

/**
 * SPX-BTC 30일 상관관계 점수 계산
 *
 * 상관 < 0.3 (독립적): +2 (크립토 고유 요인 집중 — 좋음)
 * 상관 0.3~0.7: 0
 * 상관 > 0.7 (위험자산 레짐): -1 (SPX 방향이 BTC에 영향)
 * 상관 > 0.7 + SPX 하락 추세: -4 (매크로 역풍)
 */
function scoreSpxCorrelation(input: MacroInput): { score: number; detail: string } {
  const { spxBtcCorrelation, spxTrendUp } = input;

  if (spxBtcCorrelation < 0.3) {
    return { score: 2, detail: `SPX-BTC 상관(${spxBtcCorrelation.toFixed(2)}): 독립적 → 크립토 고유 요인 주도 → +2` };
  } else if (spxBtcCorrelation <= 0.7) {
    return { score: 0, detail: `SPX-BTC 상관(${spxBtcCorrelation.toFixed(2)}): 중간 상관 → 중립 → 0` };
  } else if (spxBtcCorrelation > 0.7 && !spxTrendUp) {
    return { score: -4, detail: `SPX-BTC 상관(${spxBtcCorrelation.toFixed(2)}): 높음 + SPX 하락 → 매크로 강한 역풍 → -4` };
  } else {
    return { score: -1, detail: `SPX-BTC 상관(${spxBtcCorrelation.toFixed(2)}): 높음 (위험자산 레짐) → -1` };
  }
}

/**
 * 연준 금리 사이클 점수 계산
 *
 * 금리 인하 사이클 시작: +3
 * 금리 인하 중: +2
 * 금리 동결: 0
 * 금리 인상 사이클: -3
 */
function scoreFedCycle(cycle: MacroInput['fedCycle']): { score: number; detail: string } {
  switch (cycle) {
    case 'cut_start':
      return { score: 3, detail: `연준 사이클: 금리 인하 시작 → BTC에 강한 촉매 → +3` };
    case 'cutting':
      return { score: 2, detail: `연준 사이클: 금리 인하 중 → BTC 우호적 환경 → +2` };
    case 'hold':
      return { score: 0, detail: `연준 사이클: 금리 동결 → 중립 → 0` };
    case 'hiking':
      return { score: -3, detail: `연준 사이클: 금리 인상 중 → BTC 강한 역풍 → -3` };
  }
}

/**
 * 카테고리 8 최종 점수 계산
 */
export function scoreMacro(input: MacroInput): CategoryScore {
  const dxy = scoreDxy(input.dxyStatus);
  const realYield = scoreRealYield(input.realYield, input.realYieldTrend);
  const spx = scoreSpxCorrelation(input);
  const fed = scoreFedCycle(input.fedCycle);

  // 이론 최대 = 4+3+2+3=12, 최소 = -4-5-4-3=-16 → 클램핑
  const rawTotal = dxy.score + realYield.score + spx.score + fed.score;
  const rawScore = Math.max(-10, Math.min(10, rawTotal));

  const weightedScore = rawScore * 0.08;

  return {
    id: 8,
    name: '매크로 오버레이',
    weight: 0.08,
    rawScore,
    weightedScore,
    details: [dxy.detail, realYield.detail, spx.detail, fed.detail],
    dataFreshness: input.dataFreshness,
  };
}
