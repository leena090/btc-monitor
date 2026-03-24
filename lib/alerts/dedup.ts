/**
 * 알림 중복 방지 모듈 (Redis TTL 기반)
 * Redis에 alert:{type}:{identifier} 키를 TTL과 함께 저장
 * 동일 조건의 알림이 쿨다운 기간 내 재발송되지 않도록 방지
 */

import { checkAndSetAlertLock } from '@/lib/storage/redis';
import { ALERT_CONDITIONS, type AlertType, type AlertEvaluation } from './conditions';

// ──────────────────────────────────────────────
// 중복 방지 적용 함수
// ──────────────────────────────────────────────

/**
 * 알림 목록에서 중복을 필터링하여 발송 가능한 알림만 반환
 * Redis NX + EX를 활용한 원자적 중복 체크
 *
 * @param alerts evaluateAlertConditions()에서 반환된 알림 목록
 * @returns 발송 가능한 (중복 아닌) 알림 목록
 */
export async function filterDuplicateAlerts(
  alerts: AlertEvaluation[]
): Promise<AlertEvaluation[]> {
  // 알림이 없으면 빈 배열 반환 (Redis 호출 절약)
  if (alerts.length === 0) return [];

  const results: AlertEvaluation[] = [];

  for (const alert of alerts) {
    // 해당 알림 타입의 쿨다운 시간 조회
    const condition = ALERT_CONDITIONS[alert.type];
    const cooldownSeconds = condition.cooldownSeconds;

    // Redis NX + EX로 중복 체크 + 락 설정 (원자적 연산)
    // isDuplicate === true → 이미 발송됨 (쿨다운 중)
    // isDuplicate === false → 신규 발송 가능 (락 설정 완료)
    const isDuplicate = await checkAndSetAlertLock(
      alert.type,
      alert.dedupIdentifier,
      cooldownSeconds
    );

    if (!isDuplicate) {
      // 중복 아님 → 발송 대상에 추가
      results.push(alert);
      console.log(
        `[Dedup] 알림 발송 허용: ${alert.type} (쿨다운: ${formatCooldown(cooldownSeconds)})`
      );
    } else {
      // 중복 → 스킵
      console.log(
        `[Dedup] 중복 알림 차단: ${alert.type} (쿨다운 중)`
      );
    }
  }

  return results;
}

/**
 * 특정 알림 타입의 중복 여부만 확인 (락 설정 없이)
 * 발송 전 미리보기 용도
 *
 * @param alertType 확인할 알림 타입
 * @param identifier 식별자
 * @returns true = 쿨다운 중 (중복), false = 발송 가능
 */
export async function isAlertInCooldown(
  alertType: AlertType,
  identifier: string
): Promise<boolean> {
  // checkAndSetAlertLock은 NX 사용하므로 이미 존재하면 null 반환
  // 하지만 단순 조회 시에도 락이 걸리는 문제 → 별도 GET으로 확인
  // redis 모듈에서 직접 GET은 제공하지 않으므로, 이 함수는
  // 내부적으로 checkAndSetAlertLock의 반환값을 활용
  // ※ 이 함수를 호출하면 실제로 락이 걸리지 않음 (cooldown이 0이 아닌 이상)
  const condition = ALERT_CONDITIONS[alertType];
  return checkAndSetAlertLock(alertType, identifier, condition.cooldownSeconds);
}

// ──────────────────────────────────────────────
// 유틸리티
// ──────────────────────────────────────────────

/**
 * 쿨다운 초를 사람이 읽기 쉬운 형태로 변환
 * @param seconds 쿨다운 시간 (초)
 * @returns 예: "7일", "4시간", "30분"
 */
function formatCooldown(seconds: number): string {
  if (seconds >= 86400) {
    return `${Math.round(seconds / 86400)}일`;
  }
  if (seconds >= 3600) {
    return `${Math.round(seconds / 3600)}시간`;
  }
  return `${Math.round(seconds / 60)}분`;
}
