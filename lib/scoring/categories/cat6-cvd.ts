/**
 * 카테고리 6: CVD + 거래량 구조 (가중치 8%)
 * 채점 기준: signal-scoring-algorithm.md Cat6 기준
 *
 * 핵심: 현물 CVD가 파생 CVD보다 우선. 진짜 수요 vs 레버리지 수요 구분.
 *
 * 서브항목:
 *  - 현물 CVD 신호 (핵심): -4 ~ +5
 *  - 현물/파생 CVD 괴리: -2 ~ +2
 *  - 거래량 구조: -3 ~ +2
 *
 * 원점수 합계 → 최대 +10 / 최소 -10
 */

import type { CategoryScore, CvdInput } from '../types';

/**
 * 현물 CVD 핵심 신호 점수 계산
 *
 * 가격 ↑ + 현물 CVD ↑: +5 (건강한 랠리 — 진짜 매수)
 * 가격 ↓ + 현물 CVD ↑: +5 (축적 진행 — 바닥 형성) ← 역발상 핵심
 * 가격 ↑ + 현물 CVD ↓: -4 (레버리지 랠리 — 지속 불가)
 * 가격 ↓ + 현물 CVD ↓: -4 (진짜 매도 — 아직 바닥 아님)
 */
function scoreSpotCvd(input: CvdInput): { score: number; detail: string } {
  const { priceUp, spotCvdUp } = input;

  if (priceUp && spotCvdUp) {
    return { score: 5, detail: `현물 CVD: 가격↑ + CVD↑ → 건강한 랠리, 진짜 매수 확인 → +5` };
  } else if (!priceUp && spotCvdUp) {
    return { score: 5, detail: `현물 CVD: 가격↓ + CVD↑ → ★ 축적 진행 중! 바닥 형성 신호 → +5` };
  } else if (priceUp && !spotCvdUp) {
    return { score: -4, detail: `현물 CVD: 가격↑ + CVD↓ → 레버리지 기반 랠리, 지속 불가 → -4` };
  } else {
    // 가격↓ + CVD↓
    return { score: -4, detail: `현물 CVD: 가격↓ + CVD↓ → 진짜 매도 압력, 아직 바닥 아님 → -4` };
  }
}

/**
 * 현물/파생 CVD 괴리 점수 계산
 *
 * 현물 CVD 강 + 파생 CVD 약: +2 (진짜 수요 기반)
 * 현물 CVD 약 + 파생 CVD 강: -2 (레버리지 기반 = 불안정)
 * 균등: 0
 *
 * 강도 기준: spotCvdStrength, derivativeCvdStrength (0=약, 1=보통, 2=강)
 */
function scoreCvdDivergence(input: CvdInput): { score: number; detail: string } {
  const { spotCvdStrength, derivativeCvdStrength } = input;

  if (spotCvdStrength > derivativeCvdStrength) {
    return { score: 2, detail: `CVD 괴리: 현물(${spotCvdStrength}) > 파생(${derivativeCvdStrength}) → 진짜 수요 기반 → +2` };
  } else if (derivativeCvdStrength > spotCvdStrength) {
    return { score: -2, detail: `CVD 괴리: 현물(${spotCvdStrength}) < 파생(${derivativeCvdStrength}) → 레버리지 기반, 불안정 → -2` };
  } else {
    return { score: 0, detail: `CVD 괴리: 현물(${spotCvdStrength}) = 파생(${derivativeCvdStrength}) 균등 → 0` };
  }
}

/**
 * 거래량 구조 점수 계산
 *
 * 현물 거래량 급증(2) + 가격 상승: +2 (확신 있는 매수)
 * 거래량 감소(0) + 가격 하락: +1 (확신 없는 매도 = 악재 약화)
 * 거래량 급증(2) + 가격 하락: -3 (패닉셀)
 */
function scoreVolume(input: CvdInput): { score: number; detail: string } {
  const { volumeAnomaly, priceUp } = input;

  if (volumeAnomaly === 2 && priceUp) {
    return { score: 2, detail: `거래량: 급증 + 가격 상승 → 확신 있는 매수 → +2` };
  } else if (volumeAnomaly === 0 && !priceUp) {
    return { score: 1, detail: `거래량: 감소 + 가격 하락 → 확신 없는 매도 (악재 약화) → +1` };
  } else if (volumeAnomaly === 2 && !priceUp) {
    return { score: -3, detail: `거래량: 급증 + 가격 하락 → 패닉셀 신호 → -3` };
  } else {
    return { score: 0, detail: `거래량: 보통 거래량 → 0` };
  }
}

/**
 * 카테고리 6 최종 점수 계산
 */
export function scoreCvd(input: CvdInput): CategoryScore {
  const spotCvd = scoreSpotCvd(input);
  const divergence = scoreCvdDivergence(input);
  const volume = scoreVolume(input);

  // 이론 최대 = 5+2+2=9, 최소 = -4-2-3=-9
  const rawTotal = spotCvd.score + divergence.score + volume.score;
  const rawScore = Math.max(-10, Math.min(10, rawTotal));

  const weightedScore = rawScore * 0.08;

  return {
    id: 6,
    name: 'CVD + 거래량 구조',
    weight: 0.08,
    rawScore,
    weightedScore,
    details: [spotCvd.detail, divergence.detail, volume.detail],
    dataFreshness: input.dataFreshness,
  };
}
