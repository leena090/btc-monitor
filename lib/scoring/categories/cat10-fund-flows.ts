/**
 * 카테고리 10: 자금 흐름 (가중치 6%)
 * 채점 기준: signal-scoring-algorithm.md Cat10 기준
 *
 * 서브항목:
 *  - 스테이블코인 총 시가총액 추세: -3 ~ +3
 *  - 코인베이스 프리미엄: -5 ~ +4
 *
 * 원점수 → 최대 +7 / 최소 -8 → -10~+10 정규화
 */

import type { CategoryScore, FundFlowsInput } from '../types';

/**
 * 스테이블코인 총 시총 추세 점수 계산 (USDT + USDC 합산)
 *
 * 30일 기준 증가 추세: +3 (잠재 매수 자금 대기)
 * 횡보: 0
 * 감소 추세: -3 (자금 이탈)
 */
function scoreStablecoinTrend(trend: FundFlowsInput['stablecoinTrend']): { score: number; detail: string } {
  switch (trend) {
    case 'up':
      return { score: 3, detail: `스테이블코인 시총: 증가 추세 → 잠재 매수 자금 대기 → +3` };
    case 'down':
      return { score: -3, detail: `스테이블코인 시총: 감소 추세 → 자금 이탈 → -3` };
    default:
      return { score: 0, detail: `스테이블코인 시총: 횡보 → 0` };
  }
}

/**
 * 코인베이스 프리미엄 점수 계산
 * 미국 기관 매수/매도 의향의 역발상 지표
 *
 * 양수 + 증가: +4 (미국 기관 매수 압력)
 * 양수 유지: +2
 * 중립 (±0.1%): 0
 * 음수: -3 (미국 기관 매도)
 * 음수 + 증가 음수: -5
 */
function scoreCoinbasePremium(input: FundFlowsInput): { score: number; detail: string } {
  const { coinbasePremium, coinbasePremiumTrend } = input;

  if (coinbasePremium > 0.1 && coinbasePremiumTrend === 'rising') {
    return { score: 4, detail: `코인베이스 프리미엄(${coinbasePremium.toFixed(3)}%): 양수+증가 → 미국 기관 강한 매수 → +4` };
  } else if (coinbasePremium > 0.1) {
    return { score: 2, detail: `코인베이스 프리미엄(${coinbasePremium.toFixed(3)}%): 양수 유지 → 기관 매수 우위 → +2` };
  } else if (coinbasePremium >= -0.1 && coinbasePremium <= 0.1) {
    return { score: 0, detail: `코인베이스 프리미엄(${coinbasePremium.toFixed(3)}%): 중립 → 0` };
  } else if (coinbasePremium < -0.1 && coinbasePremiumTrend === 'falling') {
    return { score: -5, detail: `코인베이스 프리미엄(${coinbasePremium.toFixed(3)}%): 음수+악화 → 미국 기관 강한 매도 → -5` };
  } else {
    return { score: -3, detail: `코인베이스 프리미엄(${coinbasePremium.toFixed(3)}%): 음수 → 기관 매도 우위 → -3` };
  }
}

/**
 * 카테고리 10 최종 점수 계산
 * 최대 +7, 최소 -8 → -10~+10 정규화
 */
export function scoreFundFlows(input: FundFlowsInput): CategoryScore {
  const stablecoin = scoreStablecoinTrend(input.stablecoinTrend);
  const coinbase = scoreCoinbasePremium(input);

  const rawTotal = stablecoin.score + coinbase.score;

  // +7 ~ -8 범위를 -10~+10으로 정규화
  const normalized = rawTotal >= 0
    ? (rawTotal / 7) * 10
    : (rawTotal / 8) * 10;
  const rawScore = Math.max(-10, Math.min(10, normalized));

  const weightedScore = rawScore * 0.06;

  return {
    id: 10,
    name: '자금 흐름',
    weight: 0.06,
    rawScore,
    weightedScore,
    details: [stablecoin.detail, coinbase.detail],
    dataFreshness: input.dataFreshness,
  };
}
