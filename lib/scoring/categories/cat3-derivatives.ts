/**
 * 카테고리 3: 파생상품 + 청산 (가중치 15%)
 * 채점 기준: signal-scoring-algorithm.md Cat3 기준
 *
 * 역발상 원칙: 극단적 포지션 = 반대 방향 시그널
 *
 * 서브항목:
 *  - 펀딩비 역발상: -4 ~ +5
 *  - OI 미결제약정: -3 ~ +3
 *  - 전방향 청산 클러스터: -3 ~ +3
 *  - 롱/숏 비율 역발상: -3 ~ +3
 *
 * 원점수 합계 → 최대 +10 / 최소 -10
 */

import type { CategoryScore, DerivativesInput } from '../types';

/**
 * 펀딩비 점수 계산 (역발상 해석)
 * 극음수 (< -0.05%): +5 ← 과도한 숏 → 숏 스퀴즈 가능 (불 신호)
 * 음수 (-0.05% ~ -0.01%): +3
 * 중립 (-0.01% ~ +0.02%): +1
 * 양수 (+0.02% ~ +0.05%): -1
 * 극양수 (> +0.05%): -4 ← 과도한 레버리지 롱 → 청산 위험
 */
function scoreFundingRate(rate: number): { score: number; detail: string } {
  if (rate < -0.05) {
    return { score: 5, detail: `펀딩비(${rate.toFixed(4)}%): 극단적 음수 → 숏 스퀴즈 임박 → +5` };
  } else if (rate < -0.01) {
    return { score: 3, detail: `펀딩비(${rate.toFixed(4)}%): 음수 구간 → 숏 우세 역발상 → +3` };
  } else if (rate <= 0.02) {
    return { score: 1, detail: `펀딩비(${rate.toFixed(4)}%): 중립 → +1` };
  } else if (rate <= 0.05) {
    return { score: -1, detail: `펀딩비(${rate.toFixed(4)}%): 양수 구간 → 롱 과열 주의 → -1` };
  } else {
    return { score: -4, detail: `펀딩비(${rate.toFixed(4)}%): 극단적 양수 → 레버리지 롱 청산 위험 → -4` };
  }
}

/**
 * OI 미결제약정 점수 계산
 * OI 감소 + 가격 하락: +2 (청산 완료 → 저점 가능)
 * OI 증가 + 가격 상승: +3 (추세 확인)
 * OI 증가 + 가격 하락: -3 (공매도 증가)
 * OI 급감 (24h -10%+): +2 (강제청산 완료)
 */
function scoreOI(input: DerivativesInput): { score: number; detail: string } {
  const { oiChangePercent, priceUp } = input;
  const oiIncreasing = oiChangePercent > 0;

  // OI 급감 (강제 청산 완료)
  if (oiChangePercent <= -10) {
    return { score: 2, detail: `OI 급감(${oiChangePercent.toFixed(1)}%): 강제 청산 완료 신호 → +2` };
  }

  if (oiIncreasing && priceUp) {
    return { score: 3, detail: `OI 증가(${oiChangePercent.toFixed(1)}%) + 가격 상승: 추세 확인 → +3` };
  } else if (!oiIncreasing && !priceUp) {
    return { score: 2, detail: `OI 감소(${oiChangePercent.toFixed(1)}%) + 가격 하락: 청산 완료 → 저점 가능 → +2` };
  } else if (oiIncreasing && !priceUp) {
    return { score: -3, detail: `OI 증가(${oiChangePercent.toFixed(1)}%) + 가격 하락: 공매도 증가 → -3` };
  } else {
    // OI 감소 + 가격 상승 = 숏 커버링 랠리 (중립)
    return { score: 0, detail: `OI 감소(${oiChangePercent.toFixed(1)}%) + 가격 상승: 숏 커버링 → 0` };
  }
}

/**
 * 전방향 청산 클러스터 점수 계산
 * 현재가 위 대규모 숏 청산 ($500M+): +3 (위쪽 가격 자석)
 * 현재가 아래 대규모 롱 청산 ($500M+): -3 (아래쪽 가격 자석)
 * 양방향 균등: 0
 */
function scoreLiquidationClusters(input: DerivativesInput): { score: number; detail: string } {
  const { shortLiquidationAbove, longLiquidationBelow } = input;
  const THRESHOLD_M = 500; // $500M 기준

  const shortDominant = shortLiquidationAbove >= THRESHOLD_M;
  const longDominant = longLiquidationBelow >= THRESHOLD_M;

  if (shortDominant && !longDominant) {
    return { score: 3, detail: `청산 클러스터: 위쪽 숏 청산 $${shortLiquidationAbove}M (위쪽 자석) → +3` };
  } else if (longDominant && !shortDominant) {
    return { score: -3, detail: `청산 클러스터: 아래쪽 롱 청산 $${longLiquidationBelow}M (아래쪽 자석) → -3` };
  } else if (shortDominant && longDominant) {
    // 양방향 균등 → 중립
    return { score: 0, detail: `청산 클러스터: 양방향 균등 ($${shortLiquidationAbove}M↑ / $${longLiquidationBelow}M↓) → 0` };
  } else {
    return { score: 0, detail: `청산 클러스터: $500M 이하 (영향력 낮음) → 0` };
  }
}

/**
 * 롱/숏 비율 역발상 점수 계산
 * 탑 트레이더 극단적 숏 (65%+): +3
 * 탑 트레이더 극단적 롱 (65%+): -3
 * 중립: 0
 */
function scoreLongShortRatio(input: DerivativesInput): { score: number; detail: string } {
  const { topTraderLongPct } = input;
  const topTraderShortPct = 100 - topTraderLongPct;

  if (topTraderShortPct >= 65) {
    return { score: 3, detail: `탑 트레이더 숏 ${topTraderShortPct.toFixed(1)}% (극단적 숏) → 역발상 매수 → +3` };
  } else if (topTraderLongPct >= 65) {
    return { score: -3, detail: `탑 트레이더 롱 ${topTraderLongPct.toFixed(1)}% (극단적 롱) → 역발상 매도 → -3` };
  } else {
    return { score: 0, detail: `탑 트레이더 롱 ${topTraderLongPct.toFixed(1)}% / 숏 ${topTraderShortPct.toFixed(1)}% (중립) → 0` };
  }
}

/**
 * 카테고리 3 최종 점수 계산
 * 서브항목 합계 클램핑 → -10 ~ +10
 */
export function scoreDerivatives(input: DerivativesInput): CategoryScore {
  const funding = scoreFundingRate(input.fundingRate);
  const oi = scoreOI(input);
  const liq = scoreLiquidationClusters(input);
  const lsr = scoreLongShortRatio(input);

  // 이론 최대 = 5+3+3+3 = 14 → 클램핑
  const rawTotal = funding.score + oi.score + liq.score + lsr.score;
  const rawScore = Math.max(-10, Math.min(10, rawTotal));

  const weightedScore = rawScore * 0.15;

  return {
    id: 3,
    name: '파생상품 + 청산',
    weight: 0.15,
    rawScore,
    weightedScore,
    details: [funding.detail, oi.detail, liq.detail, lsr.detail],
    dataFreshness: input.dataFreshness,
  };
}
