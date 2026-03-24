/**
 * verdict.ts — 등급 → 한국어 판단 문구 + 도박사 감각 언어 매핑
 * 50대 퇴직금 투자자가 3초 안에 "사야 하나, 말아야 하나" 판단 가능하도록
 * 모든 기술 용어를 일상 한국어로 변환
 */

import type { Grade, SignalResult, WhaleData, MinerData, RsiData, CycleData, OnchainData } from '@/lib/scoring/types';

// ─────────────────────────────────────────────
// 등급별 최종 판단 (HeroVerdict용)
// ─────────────────────────────────────────────

export interface VerdictInfo {
  /** 메인 한줄 판단 — 가장 큰 텍스트 */
  headline: string;
  /** 부연 설명 — 왜 이런 판단인지 1문장 */
  reason: string;
  /** 행동 지침 — 구체적으로 뭘 해야 하는지 */
  action: string;
  /** 신호등 색상 (hex) */
  color: string;
  /** 배경 그라데이션 색상 (rgba) */
  bgGradient: string;
  /** 펄스 애니메이션 여부 (S, F 등급만) */
  pulse: boolean;
  /** 이모지 아이콘 */
  icon: string;
}

/** 등급별 판단 문구 매핑 — 도박사의 확신을 담은 언어 */
export const VERDICT_MAP: Record<Grade, VerdictInfo> = {
  S: {
    headline: '지금이 기회입니다',
    reason: '모든 지표가 강한 매수 신호를 보내고 있습니다',
    action: '적극 매수 — 확신이 높은 구간',
    color: '#00ff88',
    bgGradient: 'rgba(0, 255, 136, 0.08)',
    pulse: true,
    icon: '🟢',
  },
  A: {
    headline: '매수 유리한 구간',
    reason: '대부분의 지표가 긍정적입니다',
    action: '분할 매수 시작 — 좋은 진입 타이밍',
    color: '#4ade80',
    bgGradient: 'rgba(74, 222, 128, 0.06)',
    pulse: false,
    icon: '🟢',
  },
  B: {
    headline: '조금 더 지켜보세요',
    reason: '긍정 신호가 있지만 확신이 부족합니다',
    action: '소량만 매수 또는 대기 — 서두르지 마세요',
    color: '#f59e0b',
    bgGradient: 'rgba(245, 158, 11, 0.06)',
    pulse: false,
    icon: '🟡',
  },
  C: {
    headline: '신중하게 접근하세요',
    reason: '혼재된 신호 — 리스크가 있는 구간입니다',
    action: '매수 보류 — 더 좋은 기회를 기다리세요',
    color: '#fb923c',
    bgGradient: 'rgba(251, 146, 60, 0.05)',
    pulse: false,
    icon: '🟠',
  },
  NO_TRADE: {
    headline: '지금은 쉬어가세요',
    reason: '시장 방향이 불분명합니다',
    action: '매매 금지 — 현금 보유가 최선',
    color: '#6b7280',
    bgGradient: 'rgba(107, 114, 128, 0.05)',
    pulse: false,
    icon: '⚪',
  },
  F: {
    headline: '위험 — 매수 금지',
    reason: '강한 하락 신호가 감지되었습니다',
    action: '절대 매수하지 마세요 — 손실 위험',
    color: '#ef4444',
    bgGradient: 'rgba(239, 68, 68, 0.08)',
    pulse: true,
    icon: '🔴',
  },
};

// ─────────────────────────────────────────────
// 확신도 → 도박사 감각 언어
// ─────────────────────────────────────────────

export interface ConfidenceVerdict {
  /** 한국어 레이블 */
  label: string;
  /** 도박사 감각 비유 */
  gambler: string;
  /** 색상 */
  color: string;
}

export const CONFIDENCE_VERDICT: Record<'high' | 'medium' | 'low', ConfidenceVerdict> = {
  high:   { label: '확신도 높음', gambler: '확실한 패',    color: '#00ff88' },
  medium: { label: '확신도 보통', gambler: '읽히는 중',    color: '#f59e0b' },
  low:    { label: '확신도 낮음', gambler: '안개 속',       color: '#ef4444' },
};

// ─────────────────────────────────────────────
// 시그마(분산) → 시장 합의도 (일반인 언어)
// ─────────────────────────────────────────────

export interface SigmaVerdict {
  label: string;
  color: string;
}

export function getSigmaVerdict(sigma: number): SigmaVerdict {
  if (sigma < 2)  return { label: '전문가 의견 일치',    color: '#00ff88' };
  if (sigma <= 4) return { label: '의견 엇갈림',          color: '#f59e0b' };
  return                  { label: '혼란스러운 시장',      color: '#ef4444' };
}

// ─────────────────────────────────────────────
// SignalSummary용 — 기술 데이터 → 일반인 언어 변환
// ─────────────────────────────────────────────

/** 시장 온도 요약 (RSI + 사이클 기반) */
export interface MarketTempSummary {
  /** 온도 라벨: 과열/적정/침체/냉각 */
  temp: string;
  /** 한줄 설명 */
  desc: string;
  /** 색상 */
  color: string;
  /** 반감기 관련 정보 (있을 때만) */
  cycleNote?: string;
}

export function getMarketTemp(rsi?: RsiData, cycle?: CycleData): MarketTempSummary {
  // RSI 기반 온도 판단
  if (!rsi) {
    return { temp: '측정 중', desc: '데이터 수집 중입니다', color: '#6b7280' };
  }

  const weeklyRsi = rsi.weekly;
  let temp: string;
  let desc: string;
  let color: string;

  if (weeklyRsi >= 70) {
    temp = '🔥 과열';
    desc = '시장이 너무 뜨겁습니다 — 조정 가능성';
    color = '#ef4444';
  } else if (weeklyRsi >= 55) {
    temp = '☀️ 따뜻함';
    desc = '시장이 활발합니다 — 상승 추세';
    color = '#4ade80';
  } else if (weeklyRsi >= 40) {
    temp = '🌤️ 적정';
    desc = '시장이 안정적입니다';
    color = '#f59e0b';
  } else if (weeklyRsi >= 30) {
    temp = '❄️ 냉각';
    desc = '시장이 식고 있습니다 — 매수 기회 탐색';
    color = '#3b82f6';
  } else {
    temp = '🧊 극저온';
    desc = '극도의 공포 — 역사적 매수 기회일 수 있음';
    color = '#00ff88';
  }

  // 반감기 사이클 노트
  let cycleNote: string | undefined;
  if (cycle) {
    const months = Math.round(cycle.monthsSinceHalving);
    cycleNote = `반감기 ${months}개월째 · ${cycle.daysUntilNextHalving}일 후 다음 반감기`;
  }

  return { temp, desc, color, cycleNote };
}

/** 큰손 동향 요약 (고래 + 채굴자 기반) */
export interface BigPlayerSummary {
  /** 한줄 요약 */
  headline: string;
  /** 부연 설명 */
  desc: string;
  /** 색상 */
  color: string;
  /** 방향 아이콘 */
  icon: string;
}

export function getBigPlayerSummary(whale?: WhaleData, miner?: MinerData): BigPlayerSummary {
  if (!whale && !miner) {
    return { headline: '데이터 수집 중', desc: '큰손 데이터를 기다리는 중입니다', color: '#6b7280', icon: '⏳' };
  }

  // 고래 방향 우선, 채굴자로 보완
  const whaleDir = whale?.direction ?? 'neutral';
  const minerMpi = miner?.mpi ?? 0;

  // 고래가 사고 있고 + 채굴자도 보유 중
  if (whaleDir === 'buy' && minerMpi < 0.5) {
    return {
      headline: '큰손이 사고 있습니다',
      desc: '고래와 채굴자 모두 축적 중 — 강한 긍정 신호',
      color: '#00ff88',
      icon: '💰',
    };
  }

  // 고래가 팔고 있고 + 채굴자도 유출
  if (whaleDir === 'sell' && minerMpi >= 2) {
    return {
      headline: '큰손이 팔고 있습니다',
      desc: '고래 매도 + 채굴자 대규모 유출 — 경계 필요',
      color: '#ef4444',
      icon: '⚠️',
    };
  }

  // 고래 매수, 채굴자 중립~매도
  if (whaleDir === 'buy') {
    return {
      headline: '고래가 축적 중',
      desc: '대형 투자자가 BTC를 사들이고 있습니다',
      color: '#4ade80',
      icon: '🐋',
    };
  }

  // 고래 매도
  if (whaleDir === 'sell') {
    return {
      headline: '고래 매도 감지',
      desc: '거래소로 대량 입금 — 매도 압력 증가',
      color: '#f59e0b',
      icon: '🐋',
    };
  }

  // 중립
  return {
    headline: '큰손 관망 중',
    desc: '고래와 채굴자 모두 뚜렷한 방향 없음',
    color: '#94a3b8',
    icon: '👀',
  };
}

/** 매매 타이밍 요약 (tradeSetup 기반) */
export interface TimingSummary {
  /** 한줄 요약 */
  headline: string;
  /** 가격 정보 */
  priceInfo?: string;
  /** 색상 */
  color: string;
  /** 아이콘 */
  icon: string;
}

export function getTimingSummary(
  data: Pick<SignalResult, 'grade' | 'direction' | 'tradeSetup' | 'noTradeReason'>
): TimingSummary {
  // NO_TRADE이면 대기 안내
  if (data.grade === 'NO_TRADE' || data.direction === 'NO_TRADE' || data.direction === 'WAIT') {
    return {
      headline: '매매 대기',
      priceInfo: data.noTradeReason ?? '현재 진입 조건이 충족되지 않았습니다',
      color: '#6b7280',
      icon: '⏸️',
    };
  }

  // F 등급이면 위험 경고
  if (data.grade === 'F') {
    return {
      headline: '매수 금지 구간',
      priceInfo: '하락 신호가 우세합니다 — 진입하지 마세요',
      color: '#ef4444',
      icon: '🚫',
    };
  }

  // tradeSetup이 있으면 가격 정보 표시
  if (data.tradeSetup) {
    const s = data.tradeSetup;
    const dir = s.direction === 'LONG' ? '매수' : '매도';
    const entry = `$${s.entryZone.low.toLocaleString()} ~ $${s.entryZone.high.toLocaleString()}`;
    const sl = `$${s.stopLoss.toLocaleString()}`;
    const tp1 = `$${s.tp1.toLocaleString()}`;

    return {
      headline: `${dir} 진입 가능`,
      priceInfo: `진입: ${entry}\n손절: ${sl} · 1차목표: ${tp1}`,
      color: s.direction === 'LONG' ? '#00ff88' : '#ef4444',
      icon: s.direction === 'LONG' ? '📈' : '📉',
    };
  }

  // tradeSetup 없지만 등급 괜찮으면
  return {
    headline: '매매 준비 중',
    priceInfo: '진입 조건을 모니터링하고 있습니다',
    color: '#f59e0b',
    icon: '🔍',
  };
}
