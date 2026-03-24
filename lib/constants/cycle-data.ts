/**
 * BTC 반감기 사이클 + 피보나치 레벨 하드코딩
 * 출처: btc-cycle-map.md v5 FINAL (2026-03-23 승인)
 * 갱신 주기: 월 1회 수동 업데이트 (Tier D 데이터)
 */

// ──────────────────────────────────────────────
// 반감기 날짜 (역대 + 예정)
// ──────────────────────────────────────────────
export const HALVING_DATES = {
  // 역대 반감기 (실제 발생)
  halving2012: new Date('2012-11-28'),
  halving2016: new Date('2016-07-09'),
  halving2020: new Date('2020-05-11'),
  halving2024: new Date('2024-04-19'), // 마지막 반감기

  // 다음 반감기 (예상)
  halving2028: new Date('2028-04-01'), // 약 2028년 4월 예상
} as const;

// 현재 사이클 기준점
export const CURRENT_HALVING = HALVING_DATES.halving2024;

// ──────────────────────────────────────────────
// 사이클 ATH 기록
// ──────────────────────────────────────────────
export const CYCLE_ATHS: Array<{
  halvingDate: Date;
  athPrice: number;
  athDate: Date;
  monthsAfterHalving: number;
}> = [
  {
    halvingDate: HALVING_DATES.halving2012,
    athPrice: 1163,
    athDate: new Date('2013-12-01'),
    monthsAfterHalving: 13,
  },
  {
    halvingDate: HALVING_DATES.halving2016,
    athPrice: 19783,
    athDate: new Date('2017-12-01'),
    monthsAfterHalving: 17,
  },
  {
    halvingDate: HALVING_DATES.halving2020,
    athPrice: 69000,
    athDate: new Date('2021-11-01'),
    monthsAfterHalving: 18,
  },
  {
    halvingDate: HALVING_DATES.halving2024,
    athPrice: 126200,
    athDate: new Date('2025-10-01'),
    monthsAfterHalving: 18,
  },
];

// ──────────────────────────────────────────────
// 현재 사이클 피보나치 레벨 (2022~2025 사이클)
// 기준: 저점 $15,500 (2022.11) ~ 고점 $126,200 (2025.10)
// ──────────────────────────────────────────────
export const FIBONACCI_LEVELS = {
  // 피보나치 되돌림 레벨 (조정 시 지지/저항)
  retracement: {
    level0:   126200,  // 0.000 — ATH 고점
    level236: 100100,  // 0.236 — 얕은 조정
    level382:  83900,  // 0.382 — 일반 조정
    level500:  70850,  // 0.500 — 황금 중간 (현재 근처)
    level618:  57800,  // 0.618 — 황금비 조정 (강한 지지)
    level786:  39400,  // 0.786 — 깊은 조정
    level1000: 15500,  // 1.000 — 시작 저점
  },

  // 파동 기준점
  waveStart: 15500,   // 파동 (V) 시작
  waveEnd:  126200,   // 파동 (V) 고점 (ATH)
  totalMove: 110700,  // 총 상승폭
} as const;

// ──────────────────────────────────────────────
// 주요 지지/저항 레벨 (2026.3 기준)
// ──────────────────────────────────────────────
export const KEY_LEVELS = {
  // 지지 레벨 (아래에서 위로)
  support: [
    { price: 57800, label: 'Fib 0.618 황금비', strength: 'strong' },
    { price: 63000, label: '200주 이평선 + 실현가격', strength: 'medium' },
    { price: 68000, label: 'Fib 0.5 + 이전 이평선 클러스터', strength: 'current' },
  ],

  // 저항 레벨 (위로)
  resistance: [
    { price: 74000, label: '이전 ATH (2024.3) + 심리적 저항', strength: 'medium' },
    { price: 83900, label: 'Fib 0.382 — 조정 완료 신호', strength: 'medium' },
    { price: 100500, label: '심리적 + Fib 0.236', strength: 'medium' },
    { price: 126200, label: 'ATH — 사이클 고점', strength: 'strong' },
  ],
} as const;

// ──────────────────────────────────────────────
// 사이클 페이즈 계산 헬퍼
// ──────────────────────────────────────────────

/**
 * 현재 반감기 경과 월수 계산
 * @returns 마지막 반감기(2024-04-19)로부터 경과된 개월 수
 */
export function getMonthsSinceHalving(): number {
  const now = new Date();
  const diff = now.getTime() - CURRENT_HALVING.getTime();
  const months = diff / (1000 * 60 * 60 * 24 * 30.44); // 평균 월 길이로 나눔
  return Math.floor(months);
}

/**
 * 사이클 페이즈 반환
 * 0~6개월: 초기 축적
 * 6~18개월: 상승 가속
 * 18~30개월: 후기/조정 (현재)
 * 30~48개월: 바닥 형성
 */
export function getCyclePhase(): {
  phase: 'accumulation' | 'bull_run' | 'late_cycle' | 'bear_bottom';
  label: string;
  score: number; // 기여 점수 (카테고리 9용)
} {
  const months = getMonthsSinceHalving();

  if (months <= 6) {
    return { phase: 'accumulation', label: '초기 축적', score: 3 };
  } else if (months <= 18) {
    return { phase: 'bull_run', label: '상승 가속', score: 5 };
  } else if (months <= 30) {
    return { phase: 'late_cycle', label: '후기/조정', score: 1 };
  } else {
    return { phase: 'bear_bottom', label: '바닥 형성', score: 2 };
  }
}

/**
 * 피보나치 되돌림 위치 점수 계산
 * @param currentPrice 현재 BTC 가격
 * @returns 피보나치 점수 (-10~+10 범위 내)
 */
export function getFibonacciScore(currentPrice: number): {
  score: number;
  level: string;
  pct: number; // ATH 대비 하락률
} {
  const { retracement } = FIBONACCI_LEVELS;

  // ATH 대비 하락률
  const pct = ((retracement.level0 - currentPrice) / retracement.level0) * 100;

  // 피보나치 위치 점수
  let score: number;
  let level: string;

  if (currentPrice <= retracement.level618) {
    score = 5; // 황금비 이하 — 역사적 저가 구간
    level = '0.618 이하 (깊은 조정)';
  } else if (currentPrice <= retracement.level500 * 1.05 && currentPrice >= retracement.level500 * 0.95) {
    score = 3; // 0.5 근처
    level = '0.5 근처';
  } else if (currentPrice <= retracement.level382) {
    score = 1; // 0.382 근처
    level = '0.382 근처';
  } else {
    score = 0; // 0.236 이상 — 고점 근처
    level = '0.236 이상 (고점 근처)';
  }

  return { score, level, pct };
}

/**
 * ATH 대비 하락률 점수
 * @param currentPrice 현재 가격
 */
export function getAthDrawdownScore(currentPrice: number): number {
  const drawdownPct = ((FIBONACCI_LEVELS.retracement.level0 - currentPrice) / FIBONACCI_LEVELS.retracement.level0) * 100;

  if (drawdownPct >= 70) return 5;       // -70%+ : 역사적 바닥 패턴
  if (drawdownPct >= 50) return 3;       // -50~70%
  if (drawdownPct >= 30) return 1;       // -30~50% (현재 -46%)
  return 0;                              // -30% 미만
}

// ──────────────────────────────────────────────
// S2F 레짐 (희소성 지표 — 제한적 사용)
// ──────────────────────────────────────────────
export const S2F_DATA = {
  // 2024 반감기 후 현황
  s2fRatio: 120,          // 현재 S2F 비율
  goldS2f: 59,            // 금의 S2F 비율
  modelPrice: 500000,     // S2F 모델 이론가
  currentDeviation: -86,  // 모델 대비 괴리 (%)

  // S2F 스코어 (신뢰도 50% 할인 적용)
  getScore: (monthsSinceHalving: number): number => {
    // 반감기 사이클 위치 점수
    let cycleScore: number;
    if (monthsSinceHalving <= 18) cycleScore = 3;
    else if (monthsSinceHalving <= 30) cycleScore = 1;
    else cycleScore = 2;

    // S2F 대비 가격 괴리 점수 (현재 13.6% 수준이므로 2점)
    const gapScore = 2; // 모델가의 25% 이하

    // 신뢰도 50% 할인 적용 (2021년 이후 빗나감 이력)
    return Math.round((cycleScore + gapScore) * 0.5);
  },
} as const;
