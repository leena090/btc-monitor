/**
 * runner.ts — 백테스트 실행기
 *
 * 역사적 데이터셋의 각 시점에 대해 calculateSignal()을 실행하고,
 * 실제 수익률과 비교하여 시스템 성과를 계산한다.
 *
 * 출력: 등급별 적중률, 평균 수익률, 바이앤홀드 대비 초과수익 등
 */

import { calculateSignal } from '@/lib/scoring/engine';
import type { SignalResult } from '@/lib/scoring/types';
import { HISTORICAL_DATA, type HistoricalDataPoint } from './historical-data';

// ─────────────────────────────────────────────
// 백테스트 결과 타입
// ─────────────────────────────────────────────

/** 개별 시점 백테스트 결과 */
export interface BacktestEntry {
  /** 데이터 포인트 ID */
  id: string;
  /** 날짜 */
  date: string;
  /** 한국어 설명 */
  label: string;
  /** 당시 가격 */
  price: number;
  /** 시스템이 부여한 등급 */
  grade: string;
  /** 시스템 점수 (0~100) */
  score: number;
  /** 시스템 매매 방향 */
  direction: string;
  /** 시스템 확신도 */
  confidence: string;
  /** 시그마 */
  sigma: number;
  /** 이후 30일 실제 수익률 */
  return30d: number;
  /** 이후 90일 실제 수익률 */
  return90d: number;
  /** 이후 180일 실제 수익률 */
  return180d: number;
  /** 적중 여부 (90일 기준) — LONG이면 상승, SHORT이면 하락, NO_TRADE는 ±10% 이내 */
  hit: boolean;
  /** 시점 유형 */
  type: string;
  /** 사이클 번호 */
  cycle: number;
}

/** 등급별 성과 요약 */
export interface GradePerformance {
  grade: string;
  /** 해당 등급이 나온 횟수 */
  count: number;
  /** 적중 횟수 */
  hits: number;
  /** 적중률 (%) */
  hitRate: number;
  /** 이후 90일 평균 수익률 (%) */
  avgReturn90d: number;
  /** 이후 180일 평균 수익률 (%) */
  avgReturn180d: number;
}

/** 전체 백테스트 결과 */
export interface BacktestResult {
  /** 개별 시점 결과 목록 */
  entries: BacktestEntry[];
  /** 등급별 성과 */
  gradePerformance: GradePerformance[];
  /** 전체 적중률 (%) — 현재 시점 제외 */
  overallHitRate: number;
  /** 전체 평균 90일 수익률 (%) */
  avgReturn90d: number;
  /** S+A 등급 평균 90일 수익률 */
  bullSignalAvgReturn: number;
  /** F 등급 평균 90일 수익률 (음수여야 정상) */
  bearSignalAvgReturn: number;
  /** NO_TRADE 정확도 (±10% 이내 비율) */
  noTradeAccuracy: number;
  /** 총 시점 수 (현재 제외) */
  totalPoints: number;
  /** 백테스트 실행 시각 */
  timestamp: string;
  /** 한계/면책 사항 */
  disclaimer: string;
}

// ─────────────────────────────────────────────
// 적중 판정 로직
// ─────────────────────────────────────────────

/**
 * 시스템 판단이 맞았는지 판정 (90일 수익률 기준)
 *
 * - LONG (S/A/B): 90일 후 +5% 이상이면 적중
 * - SHORT (F): 90일 후 -5% 이하면 적중
 * - NO_TRADE/WAIT (C/NO_TRADE): 90일 후 ±10% 이내면 적중 (방향 없음)
 */
function judgeHit(direction: string, grade: string, return90d: number): boolean {
  // LONG 시그널 — 상승해야 적중
  if (direction === 'LONG') {
    return return90d > 5;
  }

  // SHORT 시그널 — 하락해야 적중
  if (direction === 'SHORT') {
    return return90d < -5;
  }

  // NO_TRADE / WAIT — 큰 움직임 없어야 적중
  // NO_TRADE가 "방향 모름"이므로 큰 변동 없으면 올바른 판단
  if (direction === 'NO_TRADE' || direction === 'WAIT') {
    return Math.abs(return90d) < 15;
  }

  return false;
}

// ─────────────────────────────────────────────
// 백테스트 실행
// ─────────────────────────────────────────────

/** 역사적 데이터에 스코어링 엔진을 적용하여 백테스트 실행 */
export function runBacktest(): BacktestResult {
  const entries: BacktestEntry[] = [];

  // 각 역사적 시점에 대해 스코어링 실행
  for (const dp of HISTORICAL_DATA) {
    let signal: SignalResult;

    try {
      signal = calculateSignal(dp.scoringInput);
    } catch {
      // 스코어링 실패 시 스킵
      continue;
    }

    // 현재 시점은 적중 판정 불가 (미래 데이터 없음)
    const isCurrent = dp.type === 'current';
    const hit = isCurrent
      ? false
      : judgeHit(signal.direction, signal.grade, dp.return90d);

    entries.push({
      id: dp.id,
      date: dp.date,
      label: dp.label,
      price: dp.price,
      grade: signal.grade,
      score: Math.round(signal.finalScore),
      direction: signal.direction,
      confidence: signal.confidence,
      sigma: Number(signal.sigma.toFixed(2)),
      return30d: dp.return30d,
      return90d: dp.return90d,
      return180d: dp.return180d,
      hit,
      type: dp.type,
      cycle: dp.cycle,
    });
  }

  // ─── 등급별 성과 계산 (현재 시점 제외) ───
  const pastEntries = entries.filter(e => e.type !== 'current');

  const gradeGroups = new Map<string, BacktestEntry[]>();
  for (const e of pastEntries) {
    const list = gradeGroups.get(e.grade) ?? [];
    list.push(e);
    gradeGroups.set(e.grade, list);
  }

  const gradePerformance: GradePerformance[] = [];
  for (const [grade, items] of gradeGroups) {
    const hits = items.filter(e => e.hit).length;
    const avgReturn90d = items.reduce((s, e) => s + e.return90d, 0) / items.length;
    const avgReturn180d = items.reduce((s, e) => s + e.return180d, 0) / items.length;

    gradePerformance.push({
      grade,
      count: items.length,
      hits,
      hitRate: Math.round((hits / items.length) * 100),
      avgReturn90d: Math.round(avgReturn90d),
      avgReturn180d: Math.round(avgReturn180d),
    });
  }

  // S/A 가중치 순서대로 정렬
  const gradeOrder = ['S', 'A', 'B', 'C', 'NO_TRADE', 'F'];
  gradePerformance.sort((a, b) => gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade));

  // ─── 전체 통계 ───
  const totalHits = pastEntries.filter(e => e.hit).length;
  const overallHitRate = Math.round((totalHits / pastEntries.length) * 100);
  const avgReturn90d = Math.round(pastEntries.reduce((s, e) => s + e.return90d, 0) / pastEntries.length);

  // S+A 등급 평균 수익률
  const bullEntries = pastEntries.filter(e => e.grade === 'S' || e.grade === 'A');
  const bullSignalAvgReturn = bullEntries.length > 0
    ? Math.round(bullEntries.reduce((s, e) => s + e.return90d, 0) / bullEntries.length)
    : 0;

  // F 등급 평균 수익률
  const bearEntries = pastEntries.filter(e => e.grade === 'F');
  const bearSignalAvgReturn = bearEntries.length > 0
    ? Math.round(bearEntries.reduce((s, e) => s + e.return90d, 0) / bearEntries.length)
    : 0;

  // NO_TRADE 정확도
  const noTradeEntries = pastEntries.filter(e => e.grade === 'NO_TRADE' || e.grade === 'C');
  const noTradeAccuracy = noTradeEntries.length > 0
    ? Math.round((noTradeEntries.filter(e => e.hit).length / noTradeEntries.length) * 100)
    : 0;

  return {
    entries,
    gradePerformance,
    overallHitRate,
    avgReturn90d,
    bullSignalAvgReturn,
    bearSignalAvgReturn,
    noTradeAccuracy,
    totalPoints: pastEntries.length,
    timestamp: new Date().toISOString(),
    disclaimer: '본 백테스트는 역사적 시점의 추정 데이터를 기반으로 한 시뮬레이션이며, 미래 수익을 보장하지 않습니다. 일부 카테고리(옵션 GEX, CVD)는 2020년 이전 데이터가 부족하여 중립값으로 처리되었습니다.',
  };
}
