/**
 * /api/history — 스코어 히스토리 조회 (Redis SCORE_HISTORY 리스트)
 * 최근 288개 (24시간 × 5분 간격) 반환
 * Redis 없으면 빈 배열 반환 (모의 데이터는 프론트에서 처리)
 */

import { NextRequest, NextResponse } from 'next/server';

// Next.js 캐시 비활성화 — 항상 최신 히스토리 반환
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Redis 스코어 히스토리 키 (redis.ts 상수와 동일)
const SCORE_HISTORY_KEY = 'btc:score:history';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    // count 쿼리 파라미터 (기본 288 = 24시간)
    const url = new URL(req.url);
    const count = Math.min(parseInt(url.searchParams.get('count') || '288', 10), 576);

    if (upstashUrl && upstashToken) {
      try {
        const { Redis } = await import('@upstash/redis');
        const redis = new Redis({ url: upstashUrl, token: upstashToken });

        // LRANGE로 최신 N개 조회 (LPUSH이므로 index 0이 가장 최신)
        const items = await redis.lrange(SCORE_HISTORY_KEY, 0, count - 1);

        // 문자열이면 JSON 파싱, 객체면 그대로
        const parsed = items.map((item: unknown) => {
          if (typeof item === 'string') {
            try { return JSON.parse(item); } catch { return item; }
          }
          return item;
        });

        // LPUSH이므로 최신순 → 역순 정렬 (오래된 것 먼저)
        const chronological = [...parsed].reverse();

        return NextResponse.json({
          success: true,
          count: chronological.length,
          data: chronological,
        });
      } catch (redisError) {
        console.error('[api/history] Redis 조회 실패:', redisError);
        return NextResponse.json({ success: true, count: 0, data: [] });
      }
    }

    // Redis 미설정 → 빈 배열 (프론트에서 모의 데이터로 폴백)
    return NextResponse.json({ success: true, count: 0, data: [] });
  } catch (error) {
    console.error('[api/history] 오류:', error);
    return NextResponse.json(
      { success: false, count: 0, data: [], error: '히스토리 조회 실패' },
      { status: 500 }
    );
  }
}
