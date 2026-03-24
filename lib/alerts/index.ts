/**
 * 알림 시스템 통합 모듈
 * 조건 평가 → 중복 필터 → 텔레그램 발송 파이프라인
 * /api/cron/collect에서 스코어 계산 후 이 모듈을 호출
 */

import {
  evaluateAlertConditions,
  ALERT_CONDITIONS,
  type AlertEvaluation,
  type OnchainAlertInput,
} from './conditions';
import { filterDuplicateAlerts } from './dedup';
import { sendTelegramAlert } from './telegram';
import type { SignalResult, RsiMacroInput } from '@/lib/scoring/types';

// ──────────────────────────────────────────────
// 알림 파이프라인 실행 결과
// ──────────────────────────────────────────────
export interface AlertPipelineResult {
  /** 조건 평가에서 발동된 총 알림 수 */
  triggered: number;
  /** 중복 필터 통과한 알림 수 */
  afterDedup: number;
  /** 실제 텔레그램 발송 성공 수 */
  sent: number;
  /** 발송된 알림 타입 목록 */
  sentTypes: string[];
}

// ──────────────────────────────────────────────
// 전체 알림 파이프라인 실행
// ──────────────────────────────────────────────

/**
 * 알림 파이프라인 실행: 조건 평가 → 중복 필터 → 텔레그램 발송
 * /api/cron/collect 라우트에서 스코어 계산 완료 후 호출
 *
 * @param params 알림 평가에 필요한 모든 데이터
 * @returns 파이프라인 실행 결과 (트리거/필터/발송 건수)
 */
export async function runAlertPipeline(params: {
  current: SignalResult;
  previous: SignalResult | null;
  rsi: RsiMacroInput;
  currentPrice: number;
  price24hAgo: number;
  fearGreedIndex: number;
  fundingRate: number;
  onchain?: OnchainAlertInput;
}): Promise<AlertPipelineResult> {
  // 1단계: 12가지 조건 평가 → 발동된 알림 목록
  const triggered: AlertEvaluation[] = evaluateAlertConditions(params);
  console.log(`[Alert] ${triggered.length}개 알림 조건 발동`);

  // 2단계: Redis 기반 중복 필터링 (쿨다운 체크)
  const filtered: AlertEvaluation[] = await filterDuplicateAlerts(triggered);
  console.log(`[Alert] 중복 필터 후 ${filtered.length}개 발송 대상`);

  // 3단계: 텔레그램 순차 발송 (우선순위 높은 것 먼저)
  // priority 내림차순 정렬 (3=최고 → 1=최저)
  const sorted = [...filtered].sort((a, b) => {
    return (ALERT_CONDITIONS[b.type]?.priority ?? 0) - (ALERT_CONDITIONS[a.type]?.priority ?? 0);
  });

  let sentCount = 0;
  const sentTypes: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const alert = sorted[i];
    const ok = await sendTelegramAlert(alert.message);
    if (ok) {
      sentCount++;
      sentTypes.push(alert.type);
    }

    // 텔레그램 레이트 리밋 방지 (마지막 메시지 제외 1초 딜레이)
    if (i < sorted.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(`[Alert] 텔레그램 발송 완료: ${sentCount}/${filtered.length}건`);

  return {
    triggered: triggered.length,
    afterDedup: filtered.length,
    sent: sentCount,
    sentTypes,
  };
}

// 모듈 재export
export { evaluateAlertConditions, type AlertEvaluation, type OnchainAlertInput } from './conditions';
export { filterDuplicateAlerts } from './dedup';
export { sendTelegramAlert, sendMultipleAlerts, testBotConnection } from './telegram';
export { ALERT_CONDITIONS, type AlertType, type AlertCondition } from './conditions';
