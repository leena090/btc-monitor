/**
 * 알림 조건 정의 (12가지)
 * btc-50b 스킬 기반 — RSI 매크로, 등급 변경, 온체인 이상 등
 * 각 조건은 cooldown(초)과 함께 중복 방지 적용
 */

import type { SignalResult, RsiMacroInput, OnchainInput } from '@/lib/scoring/types';

// ──────────────────────────────────────────────
// 알림 타입 열거
// ──────────────────────────────────────────────
export type AlertType =
  | 'rsi_macro_bottom'      // 1. 주봉 RSI 40~50 + 월봉 > 40
  | 'rsi_bull_breakout'     // 2. 주봉 RSI 50 돌파 (직전 40~50)
  | 'rsi_bear_regime'       // 3. 월봉 RSI < 40 진입
  | 'score_spike'           // 4. 최종 점수 ±10 이상 변동
  | 'grade_change'          // 5. 등급 변경
  | 'extreme_fear'          // 6. 공포탐욕 ≤ 20
  | 'price_shock'           // 7. 가격 ±5% (24h)
  | 'funding_extreme'       // 8. 펀딩비 극단값
  | 'whale_inflow_spike'    // 9. 고래 거래소 입금 급증
  | 'miner_outflow_spike'   // 10. 채굴자 대량 유출
  | 'exchange_reserve_drop' // 11. 거래소 BTC 보유량 급감
  | 'mvrv_below_one'        // 12. MVRV < 1 진입
  | 'squeeze_alert'         // 13. 숏/롱 스퀴즈 발생
  | 'price_surge_3pct';     // 14. 3% 이상 급등

// ──────────────────────────────────────────────
// 알림 조건 인터페이스
// ──────────────────────────────────────────────
export interface AlertCondition {
  /** 알림 타입 고유 식별자 */
  type: AlertType;
  /** 한국어 알림 제목 */
  title: string;
  /** 쿨다운 시간 (초) — 동일 알림 재발송 방지 */
  cooldownSeconds: number;
  /** 알림 우선순위 (높을수록 중요) */
  priority: 1 | 2 | 3;
}

// ──────────────────────────────────────────────
// 12가지 알림 조건 상수 정의
// ──────────────────────────────────────────────
export const ALERT_CONDITIONS: Record<AlertType, AlertCondition> = {
  // ★ RSI 매크로 바닥 시그널 — 역사적 적중률 80%+
  rsi_macro_bottom: {
    type: 'rsi_macro_bottom',
    title: '★ RSI 매크로 바닥 시그널',
    cooldownSeconds: 7 * 24 * 60 * 60,  // 7일
    priority: 3,
  },
  // ★★ RSI 불장 확정 돌파 — 40~50에서 50 돌파
  rsi_bull_breakout: {
    type: 'rsi_bull_breakout',
    title: '★★ RSI 불장 확정 돌파',
    cooldownSeconds: 7 * 24 * 60 * 60,  // 7일
    priority: 3,
  },
  // ⚠️ 베어 레짐 진입 — 월봉 RSI < 40
  rsi_bear_regime: {
    type: 'rsi_bear_regime',
    title: '⚠️ 베어 레짐 진입',
    cooldownSeconds: 30 * 24 * 60 * 60, // 30일
    priority: 3,
  },
  // 📊 스코어 급변 — ±10 이상 변동
  score_spike: {
    type: 'score_spike',
    title: '📊 스코어 급변',
    cooldownSeconds: 4 * 60 * 60,       // 4시간
    priority: 2,
  },
  // 🔔 등급 변경 — 예: C → B
  grade_change: {
    type: 'grade_change',
    title: '🔔 등급 변경',
    cooldownSeconds: 4 * 60 * 60,       // 4시간
    priority: 2,
  },
  // 🟢 극단적 공포 — 공포탐욕 ≤ 20
  extreme_fear: {
    type: 'extreme_fear',
    title: '🟢 극단적 공포 — 역발상 매수 구간',
    cooldownSeconds: 24 * 60 * 60,      // 24시간
    priority: 2,
  },
  // ⚡ 급등/급락 알림 — 24h ±5%
  price_shock: {
    type: 'price_shock',
    title: '⚡ 급등/급락 알림',
    cooldownSeconds: 6 * 60 * 60,       // 6시간
    priority: 1,
  },
  // 💰 펀딩비 극단 — < -0.05% or > +0.1%
  funding_extreme: {
    type: 'funding_extreme',
    title: '💰 펀딩비 극단',
    cooldownSeconds: 8 * 60 * 60,       // 8시간
    priority: 2,
  },
  // 🐋 고래 거래소 입금 급증 — whale-ratio 전일 대비 +15%
  whale_inflow_spike: {
    type: 'whale_inflow_spike',
    title: '🐋 고래 거래소 입금 급증 — 매도 압력 경고',
    cooldownSeconds: 12 * 60 * 60,      // 12시간
    priority: 2,
  },
  // ⛏️ 채굴자 대량 유출 — 전일 대비 +20%
  miner_outflow_spike: {
    type: 'miner_outflow_spike',
    title: '⛏️ 채굴자 대량 매도 — 항복 신호 감시',
    cooldownSeconds: 24 * 60 * 60,      // 24시간
    priority: 2,
  },
  // 🏦 거래소 BTC 보유량 급감 — 전일 대비 -2%
  exchange_reserve_drop: {
    type: 'exchange_reserve_drop',
    title: '🏦 거래소 이탈 가속 — 축적 신호',
    cooldownSeconds: 24 * 60 * 60,      // 24시간
    priority: 2,
  },
  // 📉 MVRV < 1 진입 — 역사적 바닥
  mvrv_below_one: {
    type: 'mvrv_below_one',
    title: '📉 MVRV < 1 — 역사적 바닥 구간 진입',
    cooldownSeconds: 7 * 24 * 60 * 60,  // 7일
    priority: 3,
  },
  // 💥 숏/롱 스퀴즈 발생 — 펀딩비 극단 + 가격 급변 동시 발생
  squeeze_alert: {
    type: 'squeeze_alert',
    title: '💥 스퀴즈 발생',
    cooldownSeconds: 4 * 60 * 60,       // 4시간
    priority: 3,
  },
  // 🚀 3% 이상 급등 — 24h 기준
  price_surge_3pct: {
    type: 'price_surge_3pct',
    title: '🚀 3% 이상 급등',
    cooldownSeconds: 4 * 60 * 60,       // 4시간
    priority: 2,
  },
};

// ──────────────────────────────────────────────
// 알림 평가 결과 인터페이스
// ──────────────────────────────────────────────
export interface AlertEvaluation {
  /** 발동된 알림 타입 */
  type: AlertType;
  /** 텔레그램 메시지 본문 (한국어 + 이모지) */
  message: string;
  /** 중복 방지용 식별자 (날짜 등 해시) */
  dedupIdentifier: string;
}

// ──────────────────────────────────────────────
// 온체인 알림 입력 데이터 (Tier A+)
// ──────────────────────────────────────────────
export interface OnchainAlertInput {
  /** 고래 거래소 비율 — 전일 대비 변화율 (%) */
  whaleRatioChangePct: number;
  /** 채굴자 유출량 — 전일 대비 변화율 (%) */
  minerOutflowChangePct: number;
  /** 거래소 BTC 보유량 — 전일 대비 변화율 (%) */
  exchangeReserveChangePct: number;
  /** 현재 MVRV 비율 */
  mvrv: number;
  /** 직전 MVRV 비율 (변화 감지용) */
  mvrvPrev: number;
}

// ──────────────────────────────────────────────
// 알림 평가 함수 — 12가지 조건 검사
// 현재 스코어 결과 + RSI 데이터 + 이전 스코어를 비교하여
// 발동된 알림 목록을 반환
// ──────────────────────────────────────────────
export function evaluateAlertConditions(params: {
  /** 현재 스코어 결과 */
  current: SignalResult;
  /** 직전 스코어 결과 (최초 실행 시 null) */
  previous: SignalResult | null;
  /** RSI 데이터 (3타임프레임) */
  rsi: RsiMacroInput;
  /** 현재 BTC 가격 (USD) */
  currentPrice: number;
  /** 24시간 전 BTC 가격 (USD) — 변동률 계산용 */
  price24hAgo: number;
  /** 공포탐욕 지수 (0~100) */
  fearGreedIndex: number;
  /** 현재 펀딩비 (%) */
  fundingRate: number;
  /** 온체인 알림 입력 데이터 (있을 때만) */
  onchain?: OnchainAlertInput;
}): AlertEvaluation[] {
  const { current, previous, rsi, currentPrice, price24hAgo, fearGreedIndex, fundingRate, onchain } = params;
  const alerts: AlertEvaluation[] = [];

  // 오늘 날짜 문자열 (중복 방지 키에 사용)
  const today = new Date().toISOString().slice(0, 10);

  // ── 1. 주봉 RSI 40~50 + 월봉 > 40 (역사적 대세상승 전조) ──
  if (rsi.rsiWeekly >= 40 && rsi.rsiWeekly <= 50 && rsi.rsiMonthly > 40) {
    alerts.push({
      type: 'rsi_macro_bottom',
      message: [
        `${ALERT_CONDITIONS.rsi_macro_bottom.title}`,
        ``,
        `주봉 RSI: ${rsi.rsiWeekly.toFixed(1)} (40~50 구간)`,
        `월봉 RSI: ${rsi.rsiMonthly.toFixed(1)} (불장 레짐 ✅)`,
        `역사적 적중률: 80%+`,
        `현재가: $${currentPrice.toLocaleString()}`,
      ].join('\n'),
      dedupIdentifier: today,
    });
  }

  // ── 2. 주봉 RSI 50 돌파 (직전주 40~50에서 올라온 경우) ──
  if (
    rsi.rsiWeekly > 50 &&
    rsi.rsiWeeklyPrev >= 40 &&
    rsi.rsiWeeklyPrev <= 50
  ) {
    alerts.push({
      type: 'rsi_bull_breakout',
      message: [
        `${ALERT_CONDITIONS.rsi_bull_breakout.title}`,
        ``,
        `주봉 RSI: ${rsi.rsiWeeklyPrev.toFixed(1)} → ${rsi.rsiWeekly.toFixed(1)}`,
        `40~50 바닥 구간에서 50 돌파 확인!`,
        `월봉 RSI: ${rsi.rsiMonthly.toFixed(1)}`,
        `현재가: $${currentPrice.toLocaleString()}`,
      ].join('\n'),
      dedupIdentifier: today,
    });
  }

  // ── 3. 월봉 RSI < 40 진입 (베어 레짐) ──
  if (rsi.rsiMonthly < 40) {
    alerts.push({
      type: 'rsi_bear_regime',
      message: [
        `${ALERT_CONDITIONS.rsi_bear_regime.title}`,
        ``,
        `월봉 RSI: ${rsi.rsiMonthly.toFixed(1)} (< 40 — 베어 확인)`,
        `⚠️ 주봉 RSI 40~50 시그널 무효화됨`,
        `현재가: $${currentPrice.toLocaleString()}`,
      ].join('\n'),
      dedupIdentifier: new Date().toISOString().slice(0, 7), // 월 단위 dedup
    });
  }

  // ── 4. 최종 점수 ±10 이상 변동 ──
  if (previous) {
    const scoreDelta = current.finalScore - previous.finalScore;
    if (Math.abs(scoreDelta) >= 10) {
      const direction = scoreDelta > 0 ? '📈 상승' : '📉 하락';
      alerts.push({
        type: 'score_spike',
        message: [
          `${ALERT_CONDITIONS.score_spike.title}: ${previous.finalScore.toFixed(0)} → ${current.finalScore.toFixed(0)}`,
          ``,
          `변동폭: ${scoreDelta > 0 ? '+' : ''}${scoreDelta.toFixed(1)}점 (${direction})`,
          `등급: ${current.grade} | 방향: ${current.direction}`,
          `현재가: $${currentPrice.toLocaleString()}`,
        ].join('\n'),
        dedupIdentifier: `${Math.round(current.finalScore / 5) * 5}`, // 5점 단위 반올림
      });
    }
  }

  // ── 5. 등급 변경 ──
  if (previous && current.grade !== previous.grade) {
    // 등급 순서 판별 (업/다운그레이드)
    const gradeOrder = ['F', 'NO_TRADE', 'C', 'B', 'A', 'S'];
    const prevIdx = gradeOrder.indexOf(previous.grade);
    const currIdx = gradeOrder.indexOf(current.grade);
    const upgradeEmoji = currIdx > prevIdx ? '⬆️ 업그레이드' : '⬇️ 다운그레이드';

    alerts.push({
      type: 'grade_change',
      message: [
        `${ALERT_CONDITIONS.grade_change.title}`,
        ``,
        `${previous.grade} → ${current.grade} (${upgradeEmoji})`,
        `최종 점수: ${current.finalScore.toFixed(0)}점`,
        `방향: ${current.direction}`,
        `현재가: $${currentPrice.toLocaleString()}`,
      ].join('\n'),
      dedupIdentifier: `${previous.grade}_${current.grade}`,
    });
  }

  // ── 6. 공포탐욕 ≤ 20 (Extreme Fear) ──
  if (fearGreedIndex <= 20) {
    alerts.push({
      type: 'extreme_fear',
      message: [
        `${ALERT_CONDITIONS.extreme_fear.title}`,
        ``,
        `공포탐욕 지수: ${fearGreedIndex}/100 (극단적 공포)`,
        `역사적으로 매수 기회 구간`,
        `현재가: $${currentPrice.toLocaleString()}`,
      ].join('\n'),
      dedupIdentifier: today,
    });
  }

  // ── 7. 가격 ±5% (24h) ──
  if (price24hAgo > 0) {
    const priceChangePct = ((currentPrice - price24hAgo) / price24hAgo) * 100;
    if (Math.abs(priceChangePct) >= 5) {
      const emoji = priceChangePct > 0 ? '🚀 급등' : '💥 급락';
      alerts.push({
        type: 'price_shock',
        message: [
          `${ALERT_CONDITIONS.price_shock.title} — ${emoji}`,
          ``,
          `24h 변동: ${priceChangePct > 0 ? '+' : ''}${priceChangePct.toFixed(1)}%`,
          `$${price24hAgo.toLocaleString()} → $${currentPrice.toLocaleString()}`,
        ].join('\n'),
        dedupIdentifier: `${Math.round(priceChangePct)}pct`,
      });
    }
  }

  // ── 8. 펀딩비 극단값 ──
  if (fundingRate < -0.05 || fundingRate > 0.1) {
    const direction = fundingRate < 0
      ? '🟢 극음수 (숏 과밀 → 숏 스퀴즈 가능)'
      : '🔴 극양수 (롱 과밀 → 청산 위험)';
    alerts.push({
      type: 'funding_extreme',
      message: [
        `${ALERT_CONDITIONS.funding_extreme.title}`,
        ``,
        `현재 펀딩비: ${fundingRate > 0 ? '+' : ''}${fundingRate.toFixed(4)}%`,
        `${direction}`,
        `현재가: $${currentPrice.toLocaleString()}`,
      ].join('\n'),
      dedupIdentifier: `${fundingRate < 0 ? 'neg' : 'pos'}_${today}`,
    });
  }

  // ── 9. 고래 거래소 입금 급증 (whale-ratio 전일 대비 +15%) ──
  if (onchain && onchain.whaleRatioChangePct >= 15) {
    alerts.push({
      type: 'whale_inflow_spike',
      message: [
        `${ALERT_CONDITIONS.whale_inflow_spike.title}`,
        ``,
        `Whale Ratio 전일 대비: +${onchain.whaleRatioChangePct.toFixed(1)}%`,
        `대규모 고래 자금이 거래소로 이동 중`,
        `단기 매도 압력 상승 가능성 주의`,
        `현재가: $${currentPrice.toLocaleString()}`,
      ].join('\n'),
      dedupIdentifier: today,
    });
  }

  // ── 10. 채굴자 대량 유출 (전일 대비 +20%) ──
  if (onchain && onchain.minerOutflowChangePct >= 20) {
    alerts.push({
      type: 'miner_outflow_spike',
      message: [
        `${ALERT_CONDITIONS.miner_outflow_spike.title}`,
        ``,
        `채굴자 유출량 전일 대비: +${onchain.minerOutflowChangePct.toFixed(1)}%`,
        `채굴자 항복 or 운영비 매도 가능성`,
        `역사적으로 바닥 형성 시그널일 수 있음`,
        `현재가: $${currentPrice.toLocaleString()}`,
      ].join('\n'),
      dedupIdentifier: today,
    });
  }

  // ── 11. 거래소 BTC 보유량 급감 (전일 대비 -2%) ──
  if (onchain && onchain.exchangeReserveChangePct <= -2) {
    alerts.push({
      type: 'exchange_reserve_drop',
      message: [
        `${ALERT_CONDITIONS.exchange_reserve_drop.title}`,
        ``,
        `거래소 BTC 보유량 전일 대비: ${onchain.exchangeReserveChangePct.toFixed(1)}%`,
        `대량 BTC가 거래소에서 빠져나가는 중`,
        `장기 축적(HODL) 신호 가능`,
        `현재가: $${currentPrice.toLocaleString()}`,
      ].join('\n'),
      dedupIdentifier: today,
    });
  }

  // ── 12. MVRV < 1 진입 (미실현 손실 구간 — 역사적 바닥) ──
  if (onchain && onchain.mvrv < 1 && onchain.mvrvPrev >= 1) {
    alerts.push({
      type: 'mvrv_below_one',
      message: [
        `${ALERT_CONDITIONS.mvrv_below_one.title}`,
        ``,
        `MVRV: ${onchain.mvrv.toFixed(3)} (< 1.0 진입)`,
        `시장 전체가 미실현 손실 구간`,
        `역사적으로 장기 매수 최적 구간`,
        `현재가: $${currentPrice.toLocaleString()}`,
      ].join('\n'),
      dedupIdentifier: new Date().toISOString().slice(0, 7), // 월 단위 dedup
    });
  }

  // ── 13. 스퀴즈 발생 — 펀딩비 극단 + 가격 반대 방향 급변 ──
  if (price24hAgo > 0) {
    const priceChangePct = ((currentPrice - price24hAgo) / price24hAgo) * 100;
    // 숏 스퀴즈: 펀딩비 음수(숏 과밀) + 가격 급등 3%+
    const isShortSqueeze = fundingRate < -0.03 && priceChangePct >= 3;
    // 롱 스퀴즈: 펀딩비 양수(롱 과밀) + 가격 급락 3%+
    const isLongSqueeze = fundingRate > 0.05 && priceChangePct <= -3;

    if (isShortSqueeze || isLongSqueeze) {
      const squeezeType = isShortSqueeze ? '🟢 숏 스퀴즈' : '🔴 롱 스퀴즈';
      const desc = isShortSqueeze
        ? '숏 포지션 과밀 상태에서 가격 급등 → 숏 청산 연쇄 발생'
        : '롱 포지션 과밀 상태에서 가격 급락 → 롱 청산 연쇄 발생';
      alerts.push({
        type: 'squeeze_alert',
        message: [
          `${ALERT_CONDITIONS.squeeze_alert.title} — ${squeezeType}`,
          ``,
          `펀딩비: ${fundingRate > 0 ? '+' : ''}${fundingRate.toFixed(4)}%`,
          `24h 변동: ${priceChangePct > 0 ? '+' : ''}${priceChangePct.toFixed(1)}%`,
          `${desc}`,
          `현재가: $${currentPrice.toLocaleString()}`,
        ].join('\n'),
        dedupIdentifier: `${isShortSqueeze ? 'short' : 'long'}_${today}`,
      });
    }
  }

  // ── 14. 3% 이상 급등 (24h) ──
  if (price24hAgo > 0) {
    const priceChangePct = ((currentPrice - price24hAgo) / price24hAgo) * 100;
    if (priceChangePct >= 3) {
      alerts.push({
        type: 'price_surge_3pct',
        message: [
          `${ALERT_CONDITIONS.price_surge_3pct.title}`,
          ``,
          `24h 변동: +${priceChangePct.toFixed(1)}%`,
          `$${price24hAgo.toLocaleString()} → $${currentPrice.toLocaleString()}`,
          `상승 모멘텀 확인`,
        ].join('\n'),
        dedupIdentifier: `surge_${Math.floor(priceChangePct)}pct_${today}`,
      });
    }
  }

  return alerts;
}
