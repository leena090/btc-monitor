/**
 * 보너스 계산 모듈
 * signal-scoring-algorithm.md + rsi-cycle-patterns.md 기준
 *
 * 보너스 종류:
 *  1. RSI 매크로 보너스 (0 / +6 / +8)
 *     - 월봉 RSI > 40 (불장 레짐 확인) 필수 조건
 *     - 주봉 RSI 40~50 구간: +6 (★ 역사적 5/5 성공 케이스)
 *     - 주봉 RSI 막 50 돌파 (직전주 ≤ 50): +8 (★★ 불장 확정)
 *
 *  2. 피보나치 컨플루언스 보너스 (0 / +4)
 *     - 주봉 RSI 40~50 AND 현재가가 Fib 0.5~0.618 구간
 *
 * 전체 보너스 상한: min(rsiBonus + fibBonus, 12)
 */

import type { BonusResult, RsiMacroInput, CycleFibInput } from './types';

/**
 * RSI 매크로 보너스 계산
 *
 * 핵심 조건:
 *  1. 월봉 RSI > 40 (불장 레짐) → 주봉 RSI 신호 유효
 *  2a. 주봉 RSI 40~50: +6 보너스
 *  2b. 주봉 RSI 직전주 ≤ 50 + 현재 > 50: +8 보너스 (50 돌파 직후)
 *
 * 역사적 검증: 월봉 > 40 조건 하에 주봉 40~50 = 5/5 성공 (80%+ 신뢰)
 */
function calculateRsiMacroBonus(rsi: RsiMacroInput): {
  bonus: number;
  alert: string | undefined;
} {
  // 조건 0: 월봉 RSI > 40 (불장 레짐 확인) — 이 조건 없으면 보너스 없음
  if (rsi.rsiMonthly <= 40) {
    return {
      bonus: 0,
      alert: `⚠️ 월봉 RSI(${rsi.rsiMonthly.toFixed(1)}) ≤ 40 베어 레짐 — 주봉 RSI 40~50 신호 무효 (거짓 신호 3/3 재현 위험)`,
    };
  }

  // 조건 2b: 주봉 RSI 50 돌파 직후 (직전주 ≤ 50 + 현재 > 50) → +8
  if (rsi.rsiWeekly > 50 && rsi.rsiWeeklyPrev <= 50) {
    return {
      bonus: 8,
      alert: `★★ RSI 불장 확정 돌파! 주봉 RSI ${rsi.rsiWeeklyPrev.toFixed(1)} → ${rsi.rsiWeekly.toFixed(1)} (50 돌파) + 월봉 ${rsi.rsiMonthly.toFixed(1)} > 40 확인 → 풀 포지션 진입 구간`,
    };
  }

  // 조건 2a: 주봉 RSI 40~50 구간 → +6
  if (rsi.rsiWeekly >= 40 && rsi.rsiWeekly <= 50) {
    return {
      bonus: 6,
      alert: `★ RSI 매크로 바닥 시그널! 주봉 RSI(${rsi.rsiWeekly.toFixed(1)}) 40~50 + 월봉 RSI(${rsi.rsiMonthly.toFixed(1)}) > 40 — 역사적 5/5 성공, 평균 상승률 2155%`,
    };
  }

  // 조건 미해당 → 보너스 없음
  return { bonus: 0, alert: undefined };
}

/**
 * 피보나치 컨플루언스 보너스 계산
 *
 * 조건:
 *  - 주봉 RSI 40~50 (RSI 매크로 바닥 구간)
 *  - 현재가가 Fib 0.5 ~ 0.618 사이 (황금비 지지 구간)
 *
 * 두 조건 모두 충족 시 → +4
 */
function calculateFibConfluenceBonus(rsi: RsiMacroInput, cycle: CycleFibInput): {
  bonus: number;
  detail: string;
} {
  const weeklyRsiInZone = rsi.rsiWeekly >= 40 && rsi.rsiWeekly <= 50;

  if (!weeklyRsiInZone) {
    return { bonus: 0, detail: '피보나치 컨플루언스: 주봉 RSI 40~50 조건 미충족 → 0' };
  }

  const { currentPrice, cycleHigh, cycleLow } = cycle;
  const totalMove = cycleHigh - cycleLow;

  if (totalMove <= 0) {
    return { bonus: 0, detail: '피보나치 컨플루언스: 사이클 데이터 없음 → 0' };
  }

  // 피보나치 되돌림 레벨 계산 (1.0 = 최저점, 0 = 최고점)
  const retracementLevel = (cycleHigh - currentPrice) / totalMove;

  // 현재가가 Fib 0.5 ~ 0.618 사이인지 확인
  const fib500Price = cycleHigh - totalMove * 0.5;
  const fib618Price = cycleHigh - totalMove * 0.618;

  const inFibZone = currentPrice >= fib618Price && currentPrice <= fib500Price;

  if (inFibZone) {
    return {
      bonus: 4,
      detail: `피보나치 컨플루언스: 주봉 RSI(${rsi.rsiWeekly.toFixed(1)}) 40~50 + 현재가($${currentPrice.toFixed(0)}) Fib ${(retracementLevel * 100).toFixed(1)}% 되돌림 구간 → +4`,
    };
  }

  return {
    bonus: 0,
    detail: `피보나치 컨플루언스: 주봉 RSI 조건 충족 but 현재가($${currentPrice.toFixed(0)}) Fib 0.5~0.618 범위 밖 (${(retracementLevel * 100).toFixed(1)}% 되돌림) → 0`,
  };
}

/**
 * 전체 보너스 계산 (RSI 매크로 + 피보나치 컨플루언스)
 *
 * 최종 보너스 = min(rsiBonus + fibBonus, 12) — 상한 12점
 */
export function calculateBonuses(rsi: RsiMacroInput, cycle: CycleFibInput): BonusResult {
  const rsiResult = calculateRsiMacroBonus(rsi);
  const fibResult = calculateFibConfluenceBonus(rsi, cycle);

  // 보너스 상한(12) 적용은 engine.ts:calculateSignal()에서 수행
  return {
    rsiMacroBonus: rsiResult.bonus,
    fibConfluenceBonus: fibResult.bonus,
    rsiAlert: rsiResult.alert,
  };
}
