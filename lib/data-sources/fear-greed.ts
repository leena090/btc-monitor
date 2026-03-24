/**
 * Alternative.me 공포탐욕 지수 수집 모듈 (Tier A)
 * API: https://api.alternative.me/fng/
 * 키 불필요, 1일 1회 업데이트 (실제로는 매 5분 크론에서 수집하되 캐시 활용)
 */

const FEAR_GREED_API = 'https://api.alternative.me/fng/';

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────

/** 공포탐욕 지수 레이블 */
export type FearGreedLabel =
  | 'Extreme Fear'
  | 'Fear'
  | 'Neutral'
  | 'Greed'
  | 'Extreme Greed';

/** 공포탐욕 데이터 */
export interface FearGreedData {
  value: number;           // 0~100
  label: FearGreedLabel;   // 텍스트 레이블
  timestamp: number;       // Unix timestamp
  fetchedAt: string;       // 수집 시각
}

// ──────────────────────────────────────────────
// 메인 수집 함수
// ──────────────────────────────────────────────

/**
 * Alternative.me 공포탐욕 지수 조회
 * 응답 형식: { data: [{ value: "25", value_classification: "Extreme Fear", timestamp: "..." }] }
 */
export async function fetchFearGreed(): Promise<FearGreedData> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${FEAR_GREED_API}?limit=1&format=json`, {
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Fear&Greed API HTTP ${res.status}`);
    }

    const json = await res.json();
    const item = json.data?.[0];

    if (!item) {
      throw new Error('Fear&Greed API 응답 데이터 없음');
    }

    return {
      value: parseInt(item.value, 10),
      label: item.value_classification as FearGreedLabel,
      timestamp: parseInt(item.timestamp, 10),
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ──────────────────────────────────────────────
// 스코어링 헬퍼 (카테고리 11 — 군중 역발상)
// ──────────────────────────────────────────────

/**
 * 공포탐욕 지수 → 역발상 점수 변환
 * 역발상 원칙: 극단적 공포 = 매수 기회, 극단적 탐욕 = 매도 경고
 * @param value 0~100
 * @returns 원점수 -10~+10 범위
 */
export function fearGreedToScore(value: number): number {
  if (value <= 25) return 5;      // Extreme Fear → +5 (역발상 매수)
  if (value <= 45) return 3;      // Fear → +3
  if (value <= 55) return 0;      // Neutral → 0
  if (value <= 74) return -2;     // Greed → -2
  return -4;                      // Extreme Greed → -4 (역발상 매도)
}

/**
 * 극단적 공포 알림 조건 체크 (조건 #6)
 * @param value 공포탐욕 지수
 */
export function isExtremeFeear(value: number): boolean {
  return value <= 20;
}
