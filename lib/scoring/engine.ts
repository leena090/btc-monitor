/**
 * 스코어링 엔진 — 최종 점수 계산
 * signal-scoring-algorithm.md v5 FINAL 기준
 *
 * 처리 순서:
 *  1. 11카테고리 원점수 계산
 *  2. 가중합 계산 (Σ rawScore_i × weight_i)
 *  3. 정규화 기본 점수: ((가중합 + 10) / 20) × 100
 *  4. 보너스 적용 (RSI 매크로 + 피보나치 컨플루언스)
 *  5. 표준편차(σ) 계산 → 신뢰도 + NO TRADE 조건
 *  6. 등급 결정 (σ > 4.0이면 1단계 하향)
 *  7. 트레이드 셋업 카드 생성 (B 이상, NO TRADE 아닐 때)
 */

import type {
  ScoringInput,
  SignalResult,
  CategoryScore,
  TradeSetup,
  Grade,
} from './types';

import { scorePriceAction } from './categories/cat1-price-action';
import { scoreRsiMacro } from './categories/cat2-rsi-macro';
import { scoreDerivatives } from './categories/cat3-derivatives';
import { scoreOptionsGex } from './categories/cat4-options-gex';
import { scoreEtfFlows } from './categories/cat5-etf-flows';
import { scoreCvd } from './categories/cat6-cvd';
import { scoreOnchain } from './categories/cat7-onchain';
import { scoreMacro } from './categories/cat8-macro';
import { scoreCycleFib } from './categories/cat9-cycle-fib';
import { scoreFundFlows } from './categories/cat10-fund-flows';
import { scoreCrowd } from './categories/cat11-crowd';
import { calculateBonuses } from './bonuses';

// ─────────────────────────────────────────────
// 등급 정의
// ─────────────────────────────────────────────
/** 등급별 점수 범위 */
const GRADE_THRESHOLDS = {
  S: 90,  // 90~100
  A: 75,  // 75~89
  B: 60,  // 60~74
  C: 50,  // 50~59
  // F: 0~39 (NO TRADE 조건 없을 때)
} as const;

/** 점수에서 등급 계산 */
function gradeFromScore(score: number): Grade {
  if (score >= GRADE_THRESHOLDS.S) return 'S';
  if (score >= GRADE_THRESHOLDS.A) return 'A';
  if (score >= GRADE_THRESHOLDS.B) return 'B';
  if (score >= GRADE_THRESHOLDS.C) return 'C';
  return 'F';
}

/** σ > 4.0 시 등급 1단계 하향 */
function downgradeOneLevel(grade: Grade): Grade {
  switch (grade) {
    case 'S':  return 'A';
    case 'A':  return 'B';
    case 'B':  return 'C';
    case 'C':  return 'F';
    default:   return grade; // F, NO_TRADE는 하향 없음
  }
}

// ─────────────────────────────────────────────
// 표준편차 계산
// ─────────────────────────────────────────────
/**
 * 11개 카테고리 rawScore의 표본 표준편차 계산
 * Python statistics.stdev() 와 동일하게 N-1로 나눔 (표본 분산)
 * NO TRADE 임계값(σ > 3.5) 및 등급 하향(σ > 4.0) 판단에 직접 영향
 */
function calculateSigma(categories: CategoryScore[]): number {
  const scores = categories.map(c => c.rawScore);
  const n = scores.length;
  if (n <= 1) return 0; // 1개 이하일 때 분산 없음
  const mean = scores.reduce((sum, s) => sum + s, 0) / n;
  // 표본 분산: N-1로 나눔 (Bessel 보정 — Python statistics.stdev와 동일)
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / (n - 1);
  return Math.sqrt(variance);
}

// ─────────────────────────────────────────────
// 트레이드 셋업 카드 생성
// ─────────────────────────────────────────────
/**
 * 트레이드 셋업 카드 계산
 * position-management.md + kelly-criterion.md 기준
 *
 * - 진입 존: 현재가 ±1%
 * - 손절: MA200 아래 3% 또는 Fib 0.786
 * - TP1/2/3: Fib 0.382/0.236/ATH 방향
 * - 켈리: 등급별 추정 승률 + Half-Kelly 계산
 */
function buildTradeSetup(
  input: ScoringInput,
  grade: Grade,
  direction: 'LONG' | 'SHORT'
): TradeSetup | undefined {
  // B 미만 또는 NO TRADE/F 등급은 셋업 미제공
  if (grade === 'NO_TRADE' || grade === 'F' || grade === 'C') {
    return undefined;
  }

  const currentPrice = input.cat1.currentPrice;
  const ma200 = input.cat1.ma200;
  const cycleHigh = input.cat9.cycleHigh;
  const cycleLow = input.cat9.cycleLow;
  const totalMove = cycleHigh - cycleLow;

  // 피보나치 가격 레벨 계산
  const fib382Price = cycleHigh - totalMove * 0.382;  // TP1 목표
  const fib236Price = cycleHigh - totalMove * 0.236;  // TP2 목표

  // 진입 존: 현재가 ±1% (low/high 객체)
  const entryZone = {
    low:  Math.round(currentPrice * 0.99),
    high: Math.round(currentPrice * 1.01),
  };

  let stopLoss: number;
  let tp1: number;
  let tp2: number;
  let tp3: number;

  if (direction === 'LONG') {
    // 손절: MA200 -3% 또는 Fib 0.786 (더 높은 쪽 = 더 안전)
    const sl_ma200 = ma200 * 0.97;
    const sl_fib786 = cycleHigh - totalMove * 0.786;
    stopLoss = Math.max(sl_ma200, sl_fib786);  // 더 높은 쪽을 손절선으로 (덜 위험)

    // TP1: Fib 0.382 방향 (가장 가까운 저항)
    tp1 = Math.max(fib382Price, currentPrice * 1.05);
    // TP2: Fib 0.236 방향
    tp2 = Math.max(fib236Price, currentPrice * 1.12);
    // TP3: ATH 방향
    tp3 = cycleHigh;
  } else {
    // SHORT 방향 (역방향)
    stopLoss = currentPrice * 1.03;
    tp1 = currentPrice * 0.92;
    tp2 = currentPrice * 0.85;
    tp3 = cycleLow;
  }

  // ─── 켈리 공식 ───
  // 등급별 추정 승률 (kelly-criterion.md)
  const winRateByGrade: Record<Exclude<Grade, 'NO_TRADE' | 'F'>, number> = {
    S: 0.72,  // 0.70~0.75 중간값
    A: 0.65,  // 0.62~0.68 중간값
    B: 0.57,  // 0.55~0.60 중간값
    C: 0.48,  // 0.45~0.52 중간값 (거래 권장 안 함)
  };

  const p = winRateByGrade[grade as keyof typeof winRateByGrade] ?? 0.5;

  // 손익비 (TP1 기준)
  const profit = Math.abs(tp1 - currentPrice) / currentPrice;
  const loss = Math.abs(stopLoss - currentPrice) / currentPrice;
  const b = loss > 0 ? profit / loss : 1.0;  // 나누기 오류 방지

  // Full Kelly: f* = (p × b - (1-p)) / b
  const fullKelly = (p * b - (1 - p)) / b;
  // Half-Kelly 적용 (BTC 변동성 특성 반영)
  const halfKelly = Math.max(0, fullKelly * 0.5);
  const kellyPct = Math.round(halfKelly * 100 * 10) / 10;  // 소수점 1자리

  // 기대값 (EV) 계산
  const ev = (p * profit * 100) - ((1 - p) * loss * 100);
  const expectedValue = Math.round(ev * 100) / 100;

  const riskRewardRatio = Math.round(b * 100) / 100;

  return {
    direction,
    entryZone,
    stopLoss: Math.round(stopLoss),
    tp1: Math.round(tp1),
    tp2: Math.round(tp2),
    tp3: Math.round(tp3),
    kellyPct,
    expectedValue,
    riskRewardRatio,
    timeExit7d: '50% 청산 후 관망 또는 손절선 강화 검토',
    timeExit14d: '전량 청산 권고 — 시나리오 시간 무효',
  };
}

// ─────────────────────────────────────────────
// 방향 결정
// ─────────────────────────────────────────────
/**
 * 최종 점수와 카테고리 점수 기반 매매 방향 결정
 *
 * 60점+ → LONG
 * 40점 이하 → SHORT (F등급)
 * 40~60 → WAIT
 * NO_TRADE → NO_TRADE
 */
function determineDirection(
  finalScore: number,
  grade: Grade
): 'LONG' | 'SHORT' | 'WAIT' | 'NO_TRADE' {
  if (grade === 'NO_TRADE') return 'NO_TRADE';
  if (finalScore >= 60) return 'LONG';
  if (finalScore <= 39) return 'SHORT';
  return 'WAIT';
}

// ─────────────────────────────────────────────
// 메인 엔진 함수
// ─────────────────────────────────────────────
/**
 * 11카테고리 스코어링 엔진 — 최종 진입점
 *
 * @param input - 11카테고리 전체 입력 데이터
 * @returns SignalResult — 최종 스코어링 결과
 *
 * 데이터 없을 시 rawScore = 0 (neutral) 처리 — 각 카테고리 모듈에서 처리
 */
export function calculateSignal(input: ScoringInput): SignalResult {
  // ── 1단계: 11카테고리 원점수 계산 ──
  const categories: CategoryScore[] = [
    scorePriceAction(input.cat1),    // Cat1: 가격 액션 (12%)
    scoreRsiMacro(input.cat2),       // Cat2: RSI 매크로 (8%)
    scoreDerivatives(input.cat3),    // Cat3: 파생상품 (15%)
    scoreOptionsGex(input.cat4),     // Cat4: 옵션 GEX (10%)
    scoreEtfFlows(input.cat5),       // Cat5: ETF 유출입 (10%)
    scoreCvd(input.cat6),            // Cat6: CVD (8%)
    scoreOnchain(input.cat7),        // Cat7: 온체인 (12%)
    scoreMacro(input.cat8),          // Cat8: 매크로 (8%)
    scoreCycleFib(input.cat9),       // Cat9: 사이클 (7%)
    scoreFundFlows(input.cat10),     // Cat10: 자금 흐름 (6%)
    scoreCrowd(input.cat11),         // Cat11: 군중 역발상 (4%)
  ];

  // ── 2단계: 가중합 계산 ──
  // Σ(rawScore_i × weight_i) — 각 카테고리 모듈에서 이미 weightedScore 계산됨
  const weightedSum = categories.reduce((sum, c) => sum + c.weightedScore, 0);

  // ── 3단계: 정규화 기본 점수 ──
  // 공식: ((가중합 + 10) / 20) × 100
  // 가중합 범위: -10 ~ +10 → 0 ~ 100
  const normalizedBase = ((weightedSum + 10) / 20) * 100;
  const baseScore = Math.max(0, Math.min(100, normalizedBase));

  // ── 4단계: 보너스 계산 ──
  const bonuses = calculateBonuses(input.cat2, input.cat9);
  const totalBonus = Math.min(bonuses.rsiMacroBonus + bonuses.fibConfluenceBonus, 12);

  // 최종 점수: min(base + bonuses, 100)
  const finalScore = Math.min(baseScore + totalBonus, 100);

  // ── 5단계: 표준편차(σ) 계산 ──
  const sigma = calculateSigma(categories);

  // ── 6단계: 신뢰도 결정 ──
  let confidence: 'high' | 'medium' | 'low';
  if (sigma < 2.0) {
    confidence = 'high';   // 모든 카테고리가 같은 방향 = 강한 신호
  } else if (sigma > 4.0) {
    confidence = 'low';    // 카테고리들이 크게 엇갈림 = 불확실
  } else {
    confidence = 'medium';
  }

  // ── 7단계: NO TRADE 조건 확인 ──
  // 40~60점 + σ > 3.5 → 강제 NO TRADE
  let grade: Grade;
  let noTradeReason: string | undefined;

  if (finalScore >= 40 && finalScore <= 60 && sigma > 3.5) {
    grade = 'NO_TRADE';
    noTradeReason = `점수(${finalScore.toFixed(1)}점)가 중립 구간 40~60에 있고 카테고리 분산도(σ=${sigma.toFixed(2)})가 높습니다. 카테고리들이 서로 반대 방향으로 싸우는 상태 — "나는 모른다"가 정직한 답변. 현금이 가장 안전한 포지션.`;
  } else {
    // 기본 등급 계산
    const baseGrade = gradeFromScore(finalScore);

    // σ > 4.0 시 1단계 하향
    grade = sigma > 4.0 ? downgradeOneLevel(baseGrade) : baseGrade;
  }

  // ── 8단계: 매매 방향 결정 ──
  const direction = determineDirection(finalScore, grade);

  // ── 9단계: 트레이드 셋업 카드 생성 ──
  const tradeDirection = direction === 'LONG' ? 'LONG'
    : direction === 'SHORT' ? 'SHORT'
    : null;

  const tradeSetup = tradeDirection && grade !== 'NO_TRADE' && grade !== 'F'
    ? buildTradeSetup(input, grade, tradeDirection)
    : undefined;

  return {
    baseScore: Math.round(baseScore * 10) / 10,
    rsiMacroBonus: bonuses.rsiMacroBonus,
    fibConfluenceBonus: bonuses.fibConfluenceBonus,
    finalScore: Math.round(finalScore * 10) / 10,
    sigma: Math.round(sigma * 100) / 100,
    confidence,
    grade,
    direction,
    noTradeReason,
    categories,
    rsiAlert: bonuses.rsiAlert,
    tradeSetup,
    timestamp: new Date(),
  };
}

/**
 * 데이터 없음 처리 유틸리티
 * 카테고리 데이터가 없을 때 중립 CategoryScore 반환
 */
export function neutralCategory(
  id: number,
  name: string,
  weight: number,
  reason = '데이터 없음'
): CategoryScore {
  return {
    id,
    name,
    weight,
    rawScore: 0,
    weightedScore: 0,
    details: [`데이터 없음: ${reason} — 중립(0) 처리`],
    dataFreshness: new Date(0),  // epoch = 데이터 없음 표시
  };
}
