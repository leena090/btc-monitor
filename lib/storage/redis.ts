/**
 * Upstash Redis 클라이언트
 * 용도: 스코어 히스토리, 알림 중복 방지(TTL), 데이터 캐시
 * 무료 티어: 10K 명령/day → 5분 크론 기준 ~5K/day 사용 예상
 */

import { Redis } from '@upstash/redis';

// ──────────────────────────────────────────────
// Redis 클라이언트 초기화
// 환경변수는 반드시 .env.local에서 로드
// ──────────────────────────────────────────────
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default redis;

// ──────────────────────────────────────────────
// Redis 키 네임스페이스 상수
// ──────────────────────────────────────────────
export const REDIS_KEYS = {
  // 최신 스코어 결과 저장 (5분 크론마다 갱신)
  // 전 레이어 공통 상수 — 직접 문자열 사용 금지, 반드시 이 상수로 참조
  LATEST_SCORE: 'btc:score:latest',

  // 스코어 히스토리 리스트 (최근 288개 = 24시간 × 12회/hour)
  SCORE_HISTORY: 'btc:score:history',

  // 최신 데이터 스냅샷 (원시 데이터 캐시)
  LATEST_DATA: 'btc:data:latest',

  // Perplexity API 캐시 (TTL 30분)
  PERPLEXITY_CACHE: 'btc:cache:perplexity',

  // 알림 중복 방지 키 접두사 (btc:alert:{type}:{hash})
  ALERT_PREFIX: 'btc:alert',

  // 각 데이터 소스별 신선도 타임스탬프
  FRESHNESS_PREFIX: 'btc:freshness',
} as const;

// ──────────────────────────────────────────────
// 스코어 히스토리 관리 함수
// ──────────────────────────────────────────────

/**
 * 스코어 히스토리에 새 데이터 추가
 * 최대 288개 유지 (24시간치)
 * @param score JSON 직렬화 가능한 스코어 객체
 */
export async function pushScoreHistory(score: unknown): Promise<void> {
  const key = REDIS_KEYS.SCORE_HISTORY;
  // LPUSH: 리스트 왼쪽(최신)에 삽입
  await redis.lpush(key, JSON.stringify(score));
  // 288개 초과분 잘라내기 (오래된 데이터 제거)
  await redis.ltrim(key, 0, 287);
}

/**
 * 스코어 히스토리 조회
 * @param count 조회할 개수 (기본: 288 = 24시간)
 */
export async function getScoreHistory(count = 288): Promise<unknown[]> {
  const key = REDIS_KEYS.SCORE_HISTORY;
  const items = await redis.lrange(key, 0, count - 1);
  // 각 항목을 JSON 파싱 (문자열이면 파싱, 객체면 그대로)
  return items.map((item) =>
    typeof item === 'string' ? JSON.parse(item) : item
  );
}

// ──────────────────────────────────────────────
// 알림 중복 방지 함수
// ──────────────────────────────────────────────

/**
 * 알림 중복 여부 체크 + 발송 시 락 설정
 * @param alertType 알림 유형 (예: 'rsi_bottom', 'grade_change')
 * @param identifier 식별자 (예: 점수값, 등급 등)
 * @param ttlSeconds 쿨다운 시간 (초)
 * @returns true = 이미 발송됨(중복), false = 신규 발송 가능
 */
export async function checkAndSetAlertLock(
  alertType: string,
  identifier: string,
  ttlSeconds: number
): Promise<boolean> {
  const key = `${REDIS_KEYS.ALERT_PREFIX}:${alertType}:${identifier}`;
  // SET NX EX: 키 없을 때만 설정 (중복 방지)
  const result = await redis.set(key, '1', {
    nx: true,      // 존재하지 않을 때만 설정
    ex: ttlSeconds, // TTL(초) 설정
  });
  // result = 'OK' → 신규 설정 성공 (발송 가능)
  // result = null → 이미 존재 (중복 — 발송 차단)
  return result === null;
}

// ──────────────────────────────────────────────
// 데이터 신선도 관리
// ──────────────────────────────────────────────

/**
 * 데이터 소스 마지막 업데이트 시각 기록
 * @param sourceName 소스 이름 (예: 'binance', 'perplexity')
 */
export async function updateFreshness(sourceName: string): Promise<void> {
  const key = `${REDIS_KEYS.FRESHNESS_PREFIX}:${sourceName}`;
  await redis.set(key, Date.now().toString(), { ex: 3600 }); // 1시간 TTL
}

/**
 * 데이터 소스 신선도 조회
 * @param sourceName 소스 이름
 * @returns 마지막 업데이트 타임스탬프 (ms), 없으면 null
 */
export async function getFreshness(sourceName: string): Promise<number | null> {
  const key = `${REDIS_KEYS.FRESHNESS_PREFIX}:${sourceName}`;
  const val = await redis.get<string>(key);
  return val ? parseInt(val, 10) : null;
}

// ──────────────────────────────────────────────
// 캐시 유틸리티
// ──────────────────────────────────────────────

/**
 * TTL 기반 캐시 GET (Perplexity 30분 캐시용)
 * @param key Redis 키
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const val = await redis.get<string>(key);
  if (!val) return null;
  try {
    return typeof val === 'string' ? JSON.parse(val) : (val as T);
  } catch {
    return null;
  }
}

/**
 * TTL 기반 캐시 SET
 * @param key Redis 키
 * @param value 저장할 데이터
 * @param ttlSeconds TTL (초)
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
}
