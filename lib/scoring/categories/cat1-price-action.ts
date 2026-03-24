/**
 * 카테고리 1: 가격 액션 & 추세 (가중치 12%)
 * 채점 기준: signal-scoring-algorithm.md Cat1 기준
 *
 * 서브항목:
 *  - MA 배열 점수 (5점 만점)
 *  - MA200 위치 (3점 만점)
 *  - ADX 추세 강도 (2점 만점)
 *  - 볼린저밴드 위치
 *  - CME 갭
 *
 * 원점수 합계 → 최대 +10 / 최소 -10
 */

import type { CategoryScore, PriceActionInput } from '../types';

/**
 * MA 배열 점수 계산
 * 완전 정배열(20>50>200, 모두 상승): +5
 * 단기>중기만 정배열: +3
 * 혼재/횡보: 0
 * 역배열(20<50<200): -5
 */
function scoreMaAlignment(input: PriceActionInput): { score: number; detail: string } {
  const { ma20, ma50, ma200, ma20Rising, ma50Rising, ma200Rising } = input;

  // 완전 정배열: MA20 > MA50 > MA200 + 모두 상승 기울기
  if (ma20 > ma50 && ma50 > ma200 && ma20Rising && ma50Rising && ma200Rising) {
    return { score: 5, detail: `MA 배열: 완전 정배열 (20>${ma50.toFixed(0)} > 50>${ma200.toFixed(0)} > 200, 모두 상승) → +5` };
  }

  // 단기>중기만 정배열 (MA20>MA50, MA200과 관계없음)
  if (ma20 > ma50 && ma20Rising && ma50Rising) {
    return { score: 3, detail: `MA 배열: 단기(${ma20.toFixed(0)})>중기(${ma50.toFixed(0)}) 정배열 → +3` };
  }

  // 역배열: 단기 < 중기 < 장기
  if (ma20 < ma50 && ma50 < ma200) {
    return { score: -5, detail: `MA 배열: 완전 역배열 (20<50<200) → -5` };
  }

  // 혼재/횡보
  return { score: 0, detail: `MA 배열: 혼재/횡보 → 0` };
}

/**
 * MA200 위치 점수 계산
 * 현재가 > MA200 + 5%: +3
 * 현재가 > MA200 ~ +5%: +1
 * 현재가 < MA200 ~ -5%: -1
 * 현재가 < MA200 - 5%: -3
 */
function scoreMa200Position(input: PriceActionInput): { score: number; detail: string } {
  const { currentPrice, ma200 } = input;
  // MA200 대비 현재가 괴리율 계산
  const diffPct = ((currentPrice - ma200) / ma200) * 100;

  if (diffPct > 5) {
    return { score: 3, detail: `MA200 위치: 현재가(${currentPrice.toFixed(0)}) > MA200(${ma200.toFixed(0)}) +${diffPct.toFixed(1)}% → +3` };
  } else if (diffPct >= 0) {
    return { score: 1, detail: `MA200 위치: 현재가 > MA200 +${diffPct.toFixed(1)}% (5% 미만) → +1` };
  } else if (diffPct >= -5) {
    return { score: -1, detail: `MA200 위치: 현재가 < MA200 ${diffPct.toFixed(1)}% (5% 이내) → -1` };
  } else {
    return { score: -3, detail: `MA200 위치: 현재가 < MA200 ${diffPct.toFixed(1)}% (5% 초과 하락) → -3` };
  }
}

/**
 * ADX 추세 강도 점수 계산
 * ADX > 30 + 상승 추세: +2
 * ADX > 25 중립: +1
 * ADX < 20 (추세 없음): 0
 * ADX > 30 + 하락 추세: -2
 */
function scoreAdx(input: PriceActionInput): { score: number; detail: string } {
  const { adx, adxTrendUp } = input;

  if (adx > 30 && adxTrendUp) {
    return { score: 2, detail: `ADX(${adx.toFixed(1)}): 강한 추세(>30) + 상승 방향 → +2` };
  } else if (adx > 30 && !adxTrendUp) {
    return { score: -2, detail: `ADX(${adx.toFixed(1)}): 강한 추세(>30) + 하락 방향 → -2` };
  } else if (adx > 25) {
    return { score: 1, detail: `ADX(${adx.toFixed(1)}): 중간 추세(25~30) → +1` };
  } else {
    return { score: 0, detail: `ADX(${adx.toFixed(1)}): 추세 없음(<20) → 0` };
  }
}

/**
 * 볼린저밴드 위치 점수 계산
 * 하단 터치 후 반등 중: +2
 * 중단(MA20) 지지: +1
 * 상단 근처 횡보: -1
 * 상단 돌파 후 복귀: -2
 */
function scoreBollinger(input: PriceActionInput): { score: number; detail: string } {
  const { currentPrice, bollingerUpper, bollingerMiddle, bollingerLower } = input;

  // 밴드 폭 계산 (전체 범위 대비 현재가 위치 판단용)
  const bandWidth = bollingerUpper - bollingerLower;
  const positionInBand = (currentPrice - bollingerLower) / bandWidth;

  // 하단 근처 (하단 ~ 30% 내) → 반등 구간
  if (positionInBand <= 0.15) {
    return { score: 2, detail: `볼린저: 하단(${bollingerLower.toFixed(0)}) 터치/반등 구간 → +2` };
  } else if (positionInBand <= 0.45) {
    // 중단 근처 (30~45%)
    return { score: 1, detail: `볼린저: 중단(${bollingerMiddle.toFixed(0)}) 지지 구간 → +1` };
  } else if (positionInBand >= 0.85) {
    // 상단 근처 (85% 이상) — 상단 돌파 후 복귀 여부 확인
    if (currentPrice < bollingerUpper) {
      return { score: -2, detail: `볼린저: 상단 돌파 후 복귀 (과매수 신호) → -2` };
    }
    return { score: -1, detail: `볼린저: 상단(${bollingerUpper.toFixed(0)}) 근처 횡보 → -1` };
  } else {
    // 중간 구간
    return { score: 0, detail: `볼린저: 중간 구간 (${(positionInBand * 100).toFixed(0)}%) → 0` };
  }
}

/**
 * CME 갭 점수 계산
 * 미체결 CME 갭 위 있음 (상방 자석): +1
 * 미체결 CME 갭 아래 있음 (하방 자석): -1
 * 없음: 0
 */
function scoreCmeGap(input: PriceActionInput): { score: number; detail: string } {
  switch (input.cmeGap) {
    case 'above':
      return { score: 1, detail: `CME 갭: 현재가 위에 미체결 갭 (상방 자석) → +1` };
    case 'below':
      return { score: -1, detail: `CME 갭: 현재가 아래에 미체결 갭 (하방 자석) → -1` };
    default:
      return { score: 0, detail: `CME 갭: 미체결 갭 없음 → 0` };
  }
}

/**
 * 카테고리 1 최종 점수 계산
 * 서브항목 합계를 -10 ~ +10으로 클램핑
 */
export function scorePriceAction(input: PriceActionInput): CategoryScore {
  const ma = scoreMaAlignment(input);
  const ma200 = scoreMa200Position(input);
  const adx = scoreAdx(input);
  const bb = scoreBollinger(input);
  const cme = scoreCmeGap(input);

  // 원점수 합산 (자연 최대 = 5+3+2+2+1=13 → -10~+10으로 클램핑)
  const rawTotal = ma.score + ma200.score + adx.score + bb.score + cme.score;
  // 최대값 13 기준으로 -10~+10 정규화
  const rawScore = Math.max(-10, Math.min(10, rawTotal));

  const weightedScore = rawScore * 0.12;

  return {
    id: 1,
    name: '가격 액션 & 추세',
    weight: 0.12,
    rawScore,
    weightedScore,
    details: [ma.detail, ma200.detail, adx.detail, bb.detail, cme.detail],
    dataFreshness: input.dataFreshness,
  };
}
