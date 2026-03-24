/**
 * 볼린저밴드 계산 모듈 (Tier B2 — 자체 계산)
 * trading-signals npm 라이브러리 사용
 * 입력: Binance 일봉 klines 종가 배열
 * 출력: 상단/중단(MA20)/하단 + 현재가 위치 점수
 *
 * 참고: tradingview-ta는 BBPower만 제공 (상하단 없음)
 * → trading-signals로 직접 계산하여 정확한 위치 파악
 */

import { BollingerBands as BBIndicator } from 'trading-signals';

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────

/** 볼린저밴드 계산 결과 */
export interface BollingerBandResult {
  upper: number;    // 상단 밴드 (MA20 + 2σ)
  middle: number;   // 중단 밴드 (MA20)
  lower: number;    // 하단 밴드 (MA20 - 2σ)
  bandwidth: number; // 밴드폭 % = (upper - lower) / middle × 100
  position: number; // 현재가가 밴드 내 위치 (0=하단, 1=상단)
  currentPrice: number;
  signal: BollingerSignal;
}

/** 볼린저밴드 시그널 */
export type BollingerSignal =
  | 'lower_bounce'   // 하단 터치 후 반등 중
  | 'middle_support' // 중단 지지
  | 'upper_resistance' // 상단 근처 횡보
  | 'upper_breakout_reversal' // 상단 돌파 후 복귀 (과매수)
  | 'neutral';

// ──────────────────────────────────────────────
// 볼린저밴드 계산
// ──────────────────────────────────────────────

/**
 * 볼린저밴드(20, 2) 계산
 * @param closePrices 종가 배열 (오래된 순 → 최신 순)
 * @param period 기간 (기본: 20)
 * @param stdDevMultiplier 표준편차 배수 (기본: 2)
 * @returns 최신 볼린저밴드 값
 */
export function calculateBollingerBands(
  closePrices: number[],
  period = 20,
  stdDevMultiplier = 2
): BollingerBandResult {
  if (closePrices.length < period + 1) {
    throw new Error(
      `볼린저밴드 계산에 최소 ${period + 1}개 데이터 필요 (현재: ${closePrices.length}개)`
    );
  }

  // trading-signals BollingerBands 인스턴스 생성
  const bb = new BBIndicator(period, stdDevMultiplier);

  // 모든 종가를 순서대로 주입 (마지막 값만 결과 확정)
  for (let i = 0; i < closePrices.length - 1; i++) {
    bb.update(closePrices[i], false); // false = 중간 업데이트 (결과 미확정)
  }
  bb.update(closePrices[closePrices.length - 1], true); // true = 최종 확정

  // 최신 볼린저밴드 값 추출 (null 방어)
  const result = bb.getResult();
  if (!result) {
    throw new Error('볼린저밴드 계산 결과 null — 데이터 부족');
  }
  const upper = Number(Number(result.upper).toFixed(2));
  const middle = Number(Number(result.middle).toFixed(2));
  const lower = Number(Number(result.lower).toFixed(2));
  const currentPrice = closePrices[closePrices.length - 1];

  // 밴드폭 계산 (변동성 지표)
  const bandwidth = middle > 0 ? ((upper - lower) / middle) * 100 : 0;

  // 현재가 위치 (0~1, 0=하단, 1=상단)
  const range = upper - lower;
  const position = range > 0 ? (currentPrice - lower) / range : 0.5;

  // 시그널 판별 (이전 가격과 비교 필요)
  const prevPrice = closePrices[closePrices.length - 2];
  const signal = detectBollingerSignal(
    currentPrice,
    prevPrice,
    upper,
    middle,
    lower
  );

  return {
    upper,
    middle,
    lower,
    bandwidth: Number(bandwidth.toFixed(2)),
    position: Number(position.toFixed(4)),
    currentPrice,
    signal,
  };
}

// ──────────────────────────────────────────────
// 시그널 판별
// ──────────────────────────────────────────────

/**
 * 볼린저밴드 시그널 판별
 * 하단 터치 후 반등, 중단 지지, 상단 근처 등 확인
 */
function detectBollingerSignal(
  currentPrice: number,
  prevPrice: number,
  upper: number,
  middle: number,
  lower: number
): BollingerSignal {
  const bandRange = upper - lower;
  const lowerZone = lower + bandRange * 0.15;  // 하단 15% 구간
  const upperZone = upper - bandRange * 0.15;  // 상단 15% 구간

  // 하단 터치 후 반등 중: 직전가 < 하단이었다가 현재 하단 이상
  if (prevPrice <= lower && currentPrice > lower) {
    return 'lower_bounce';
  }

  // 상단 돌파 후 복귀: 직전가 >= 상단이었다가 현재 상단 아래
  if (prevPrice >= upper && currentPrice < upper) {
    return 'upper_breakout_reversal';
  }

  // 현재 하단 근처 (하단 15% 이내) — 반등 가능
  if (currentPrice <= lowerZone) {
    return 'lower_bounce';
  }

  // 현재 상단 근처 (상단 15% 이내) — 과매수 주의
  if (currentPrice >= upperZone) {
    return 'upper_resistance';
  }

  // 중단(MA20) 근처 (±10%) — 지지/저항
  const middleBuffer = middle * 0.10;
  if (
    currentPrice >= middle - middleBuffer &&
    currentPrice <= middle + middleBuffer
  ) {
    return 'middle_support';
  }

  return 'neutral';
}

// ──────────────────────────────────────────────
// 스코어링 헬퍼 (카테고리 1 — 가격 액션)
// ──────────────────────────────────────────────

/**
 * 볼린저밴드 시그널 → 카테고리 1 서브 점수
 */
export function bollingerToScore(signal: BollingerSignal): number {
  switch (signal) {
    case 'lower_bounce':
      return 2;   // 하단 터치 후 반등 = 과매도 반등 기회
    case 'middle_support':
      return 1;   // 중단 지지
    case 'upper_resistance':
      return -1;  // 상단 근처 횡보 = 과매수 주의
    case 'upper_breakout_reversal':
      return -2;  // 상단 돌파 후 복귀 = 강한 과매수 신호
    default:
      return 0;   // 중립
  }
}

// ──────────────────────────────────────────────
// 타임프레임별 볼린저밴드 일괄 계산
// ──────────────────────────────────────────────

/**
 * 일봉/주봉/월봉 종가에서 각 볼린저밴드 계산
 * @param dailyCloses 일봉 종가 배열 (최소 21개)
 */
export function calculateMultiTFBollinger(dailyCloses: number[]): {
  daily: BollingerBandResult | null;
} {
  let daily: BollingerBandResult | null = null;

  try {
    daily = calculateBollingerBands(dailyCloses);
  } catch (err) {
    console.error('[Bollinger] 일봉 계산 실패:', err);
  }

  return { daily };
}
