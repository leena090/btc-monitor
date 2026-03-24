/**
 * 카테고리 4: 옵션 시장 GEX (가중치 10%)
 * 채점 기준: signal-scoring-algorithm.md Cat4 + options-gex-guide.md
 *
 * 서브항목:
 *  - 딜러 넷 감마 방향: -2 ~ +3
 *  - 감마 월 위치: -2 ~ +2
 *  - 풋/콜 비율: -2 ~ +3
 *  - 맥스페인 위치 (만기 48h 이내에만): -2 ~ +2
 *
 * 원점수 합계 → 최대 +10 / 최소 -10
 */

import type { CategoryScore, OptionsGexInput } from '../types';

/**
 * 딜러 넷 감마 방향 점수 계산
 * 음의 감마 (딜러 short gamma): +3 (변동성 증폭 → 방향성 진입 유리)
 * 중립: 0
 * 양의 감마 (딜러 long gamma): -2 (변동성 억제 → 방향성 진입 자제)
 */
function scoreDealerGamma(input: OptionsGexInput): { score: number; detail: string } {
  switch (input.dealerNetGamma) {
    case 'negative':
      return { score: 3, detail: `딜러 넷 감마: 음수 (short gamma) → 변동성 증폭, 방향성 진입 유리 → +3` };
    case 'positive':
      return { score: -2, detail: `딜러 넷 감마: 양수 (long gamma) → 변동성 억제, 방향성 진입 자제 → -2` };
    default:
      return { score: 0, detail: `딜러 넷 감마: 중립 → 0` };
  }
}

/**
 * 감마 월 위치 점수 계산
 * 현재가가 감마 월 아래 + 위쪽 대규모 감마 월: +2 (위 자석)
 * 현재가가 감마 월 위 + 아래쪽 대규모 감마 월: -2 (아래 자석)
 * 핀 존 (만기 48h 이내): 0 (중립 — 만기 끝나면 방향성 출현)
 */
function scoreGammaWall(input: OptionsGexInput): { score: number; detail: string } {
  const { gammaWallPrice, currentPrice, expiryHoursRemaining } = input;

  // 만기 48h 이내: 핀 존 (중립 처리)
  if (expiryHoursRemaining <= 48) {
    return { score: 0, detail: `감마 월: 만기 ${expiryHoursRemaining}h 이내 핀 존 → 0 (만기 후 방향성 출현)` };
  }

  if (currentPrice < gammaWallPrice) {
    return { score: 2, detail: `감마 월: 현재가(${currentPrice.toFixed(0)}) < 감마월(${gammaWallPrice.toFixed(0)}) → 위쪽 자석 → +2` };
  } else {
    return { score: -2, detail: `감마 월: 현재가(${currentPrice.toFixed(0)}) > 감마월(${gammaWallPrice.toFixed(0)}) → 아래쪽 자석 → -2` };
  }
}

/**
 * 풋/콜 비율 점수 계산 (역발상 해석)
 * > 1.5 (풋 압도적): +3 (역발상 매수)
 * 1.0~1.5: +1
 * 0.7~1.0: 0
 * < 0.7 (콜 압도적): -2 (역발상 매도)
 */
function scorePutCallRatio(input: OptionsGexInput): { score: number; detail: string } {
  const { putCallRatio } = input;

  if (putCallRatio > 1.5) {
    return { score: 3, detail: `풋/콜 비율(${putCallRatio.toFixed(2)}): 풋 압도적 → 역발상 매수 신호 → +3` };
  } else if (putCallRatio >= 1.0) {
    return { score: 1, detail: `풋/콜 비율(${putCallRatio.toFixed(2)}): 풋 우세 → +1` };
  } else if (putCallRatio >= 0.7) {
    return { score: 0, detail: `풋/콜 비율(${putCallRatio.toFixed(2)}): 중립 (0.7~1.0) → 0` };
  } else {
    return { score: -2, detail: `풋/콜 비율(${putCallRatio.toFixed(2)}): 콜 압도적 → 역발상 매도 신호 → -2` };
  }
}

/**
 * 맥스페인 위치 점수 계산 (만기 48h 이내에만 적용)
 * 맥스페인 > 현재가: +2 (위로 수렴)
 * 맥스페인 < 현재가: -2 (아래로 수렴)
 * 만기 48h 초과: 0 (미적용)
 */
function scoreMaxPain(input: OptionsGexInput): { score: number; detail: string } {
  const { maxPainPrice, currentPrice, expiryHoursRemaining } = input;

  // 만기 48h 초과: 맥스페인 미적용
  if (expiryHoursRemaining > 48) {
    return { score: 0, detail: `맥스페인: 만기 ${expiryHoursRemaining}h 초과 → 미적용 → 0` };
  }

  if (maxPainPrice > currentPrice) {
    return { score: 2, detail: `맥스페인($${maxPainPrice.toFixed(0)}) > 현재가($${currentPrice.toFixed(0)}) → 위로 수렴 → +2` };
  } else {
    return { score: -2, detail: `맥스페인($${maxPainPrice.toFixed(0)}) < 현재가($${currentPrice.toFixed(0)}) → 아래로 수렴 → -2` };
  }
}

/**
 * 카테고리 4 최종 점수 계산
 */
export function scoreOptionsGex(input: OptionsGexInput): CategoryScore {
  const gamma = scoreDealerGamma(input);
  const gammaWall = scoreGammaWall(input);
  const pcr = scorePutCallRatio(input);
  const maxPain = scoreMaxPain(input);

  // 이론 최대 = 3+2+3+2=10, 최소 = -2-2-2-2=-8
  const rawTotal = gamma.score + gammaWall.score + pcr.score + maxPain.score;
  const rawScore = Math.max(-10, Math.min(10, rawTotal));

  const weightedScore = rawScore * 0.10;

  return {
    id: 4,
    name: '옵션 시장 GEX',
    weight: 0.10,
    rawScore,
    weightedScore,
    details: [gamma.detail, gammaWall.detail, pcr.detail, maxPain.detail],
    dataFreshness: input.dataFreshness,
  };
}
