/**
 * 11카테고리 가중치 상수
 * signal-scoring-algorithm.md v5 FINAL 기준
 * 총합 = 1.00 (100%)
 */

// 각 카테고리 ID → 이름 + 가중치 매핑
export const CATEGORY_WEIGHTS = {
  // 카테고리 1: 가격 액션 & 추세 (12%)
  priceAction: 0.12,

  // 카테고리 2: RSI 매크로 사이클 (8%)
  rsiMacro: 0.08,

  // 카테고리 3: 파생상품 + 청산 (15%) — 가장 높은 가중치
  derivatives: 0.15,

  // 카테고리 4: 옵션 시장 GEX (10%)
  optionsGex: 0.10,

  // 카테고리 5: ETF 유출입 + 베이시스 (10%)
  etfFlows: 0.10,

  // 카테고리 6: CVD + 거래량 구조 (8%)
  cvdVolume: 0.08,

  // 카테고리 7: 온체인 강화 (12%)
  onchain: 0.12,

  // 카테고리 8: 매크로 오버레이 (8%)
  macro: 0.08,

  // 카테고리 9: 4년 사이클 + 피보나치 (7%)
  cycleFib: 0.07,

  // 카테고리 10: 자금 흐름 (6%)
  fundFlows: 0.06,

  // 카테고리 11: 군중 역발상 (4%)
  crowdContra: 0.04,
} as const;

// 가중치 합계 검증용 (= 1.00)
export const TOTAL_WEIGHT = Object.values(CATEGORY_WEIGHTS).reduce(
  (sum, w) => sum + w,
  0
);

// 카테고리 이름 (한국어 레이블)
export const CATEGORY_NAMES: Record<keyof typeof CATEGORY_WEIGHTS, string> = {
  priceAction: '가격 액션 & 추세',
  rsiMacro: 'RSI 매크로 사이클',
  derivatives: '파생상품 + 청산',
  optionsGex: '옵션 시장 GEX',
  etfFlows: 'ETF 유출입 + 베이시스',
  cvdVolume: 'CVD + 거래량 구조',
  onchain: '온체인',
  macro: '매크로 오버레이',
  cycleFib: '4년 사이클 + 피보나치',
  fundFlows: '자금 흐름',
  crowdContra: '군중 역발상',
};

// 카테고리 ID (1~11)
export const CATEGORY_IDS: Record<keyof typeof CATEGORY_WEIGHTS, number> = {
  priceAction: 1,
  rsiMacro: 2,
  derivatives: 3,
  optionsGex: 4,
  etfFlows: 5,
  cvdVolume: 6,
  onchain: 7,
  macro: 8,
  cycleFib: 9,
  fundFlows: 10,
  crowdContra: 11,
};

// 원점수 범위: -10 ~ +10
export const RAW_SCORE_MIN = -10;
export const RAW_SCORE_MAX = 10;

// 최종 점수 범위: 0 ~ 100
export const FINAL_SCORE_MIN = 0;
export const FINAL_SCORE_MAX = 100;

// 보너스 최대값
export const MAX_BONUS = 12;

// 등급 임계값
export const GRADE_THRESHOLDS = {
  S: 90,   // 90~100: 최대 포지션 즉시 진입
  A: 75,   // 75~89: 표준 포지션 즉시 진입
  B: 60,   // 60~74: 반 포지션 확인 대기
  C: 50,   // 50~59: 관망 현금 보유
  // F: 0~39: 반대 방향 검토
} as const;

// 분산도 임계값
export const SIGMA_HIGH = 4.0;   // σ > 4.0 → 신뢰도 낮음 + 한 등급 강제 하향
export const SIGMA_LOW = 2.0;    // σ < 2.0 → 신뢰도 높음
export const SIGMA_NO_TRADE = 3.5; // σ > 3.5 + 40~60점 → NO TRADE

// NO TRADE 구간
export const NO_TRADE_RANGE = { min: 40, max: 60 } as const;
