/**
 * 카테고리 11: 군중 역발상 (가중치 4%)
 * 채점 기준: signal-scoring-algorithm.md Cat11 기준
 *
 * 역발상 원칙: 군중이 틀린다. 극단적 심리 = 반전 신호.
 *
 * 서브항목:
 *  - 공포탐욕 지수 (역발상): -4 ~ +5
 *  - 네이버 검색량 FOMO 지표: -3 ~ +2
 *  - 김치 프리미엄: -2 ~ +1
 *
 * 원점수 → 최대 +7 / 최소 -7 → -10~+10 정규화
 */

import type { CategoryScore, CrowdInput } from '../types';

/**
 * 공포탐욕 지수 역발상 점수 계산 (Alternative.me 기준)
 *
 * Extreme Fear (0~25): +5 (남들이 두려울 때 욕심)
 * Fear (26~45): +3
 * Neutral (46~55): 0
 * Greed (56~74): -2
 * Extreme Greed (75~100): -4 (남들이 욕심낼 때 두려움)
 */
function scoreFearGreed(index: number): { score: number; detail: string } {
  if (index <= 25) {
    return { score: 5, detail: `공포탐욕(${index}): Extreme Fear → 역발상 매수 기회 → +5` };
  } else if (index <= 45) {
    return { score: 3, detail: `공포탐욕(${index}): Fear → 역발상 우호 → +3` };
  } else if (index <= 55) {
    return { score: 0, detail: `공포탐욕(${index}): Neutral → 0` };
  } else if (index <= 74) {
    return { score: -2, detail: `공포탐욕(${index}): Greed → 군중 과열 경고 → -2` };
  } else {
    return { score: -4, detail: `공포탐욕(${index}): Extreme Greed → 역발상 매도 신호 → -4` };
  }
}

/**
 * 네이버 검색량 FOMO 지표 점수 계산
 *
 * "비트코인" 검색량 급증 (역대 상위 20%): -3 (소매 FOMO = 경고)
 * 정상: 0
 * 급감 (관심 없음): +2 (역발상 기회)
 */
function scoreNaverSearch(input: CrowdInput): { score: number; detail: string } {
  if (input.naverSearchAnomaly) {
    return { score: -3, detail: `네이버 검색량: 급증 (역대 상위 20%) → 소매 FOMO 경고 → -3` };
  } else if (input.naverSearchLow) {
    return { score: 2, detail: `네이버 검색량: 급감 (관심 없음) → 역발상 매수 기회 → +2` };
  } else {
    return { score: 0, detail: `네이버 검색량: 정상 → 0` };
  }
}

/**
 * 김치 프리미엄 점수 계산
 * 한국 소매 투자자 과열도 지표
 *
 * 양수 + 5%+: -2 (과열 경고)
 * 정상: 0
 * 음수 (코리아 디스카운트): +1 (역발상 기회)
 */
function scoreKimchiPremium(premium: number): { score: number; detail: string } {
  if (premium >= 5) {
    return { score: -2, detail: `김치 프리미엄(${premium.toFixed(2)}%): 5%+ → 과열 경고, 국내 소매 FOMO → -2` };
  } else if (premium < 0) {
    return { score: 1, detail: `김치 프리미엄(${premium.toFixed(2)}%): 음수 (코리아 디스카운트) → 역발상 기회 → +1` };
  } else {
    return { score: 0, detail: `김치 프리미엄(${premium.toFixed(2)}%): 정상 → 0` };
  }
}

/**
 * 카테고리 11 최종 점수 계산
 * 원점수 최대 +7 / 최소 -7 → -10~+10 정규화
 */
export function scoreCrowd(input: CrowdInput): CategoryScore {
  const fearGreed = scoreFearGreed(input.fearGreedIndex);
  const naver = scoreNaverSearch(input);
  const kimchi = scoreKimchiPremium(input.kimchiPremium);

  const rawTotal = fearGreed.score + naver.score + kimchi.score;

  // +7 ~ -7 → -10~+10 정규화
  const normalized = (rawTotal / 7) * 10;
  const rawScore = Math.max(-10, Math.min(10, normalized));

  const weightedScore = rawScore * 0.04;

  return {
    id: 11,
    name: '군중 역발상',
    weight: 0.04,
    rawScore,
    weightedScore,
    details: [fearGreed.detail, naver.detail, kimchi.detail],
    dataFreshness: input.dataFreshness,
  };
}
