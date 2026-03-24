/**
 * /api/data — 프론트엔드용 최신 스코어링 데이터 반환
 * Redis에서 최신 결과를 읽어 JSON으로 응답.
 * Redis 미연결(개발/초기) 시 모의 데이터로 폴백.
 */

import { NextResponse } from 'next/server';
import type { ApiDataResponse } from '@/lib/scoring/types';
import { getMockSignalResult } from '@/lib/mock-data';

// lib/storage/redis.ts의 REDIS_KEYS.LATEST_SCORE와 반드시 동일해야 함
// 직접 문자열 사용 금지 — 상수 임포트로 교체 가능하나 dynamic import 제약으로 인라인 유지
const LATEST_SCORE_KEY = 'btc:score:latest' as const;

// Next.js 캐시 비활성화 — 항상 최신 데이터 반환
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(): Promise<NextResponse<ApiDataResponse>> {
  try {
    // Redis 연결 시도
    // 환경변수가 설정되지 않으면 모의 데이터로 폴백
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (upstashUrl && upstashToken) {
      // ─── Redis에서 최신 스코어링 결과 조회 ───
      try {
        const { Redis } = await import('@upstash/redis');
        const redis = new Redis({ url: upstashUrl, token: upstashToken });

        // 최신 스코어링 결과 조회 — architect의 REDIS_KEYS.LATEST_SCORE
        const result = await redis.get<object>(LATEST_SCORE_KEY);

        if (result) {
          return NextResponse.json({ success: true, data: result as never });
        }
      } catch (redisError) {
        console.error('[api/data] Redis 조회 실패, 모의 데이터 사용:', redisError);
      }
    }

    // ─── 폴백: 모의 데이터 반환 ───
    const mockData = getMockSignalResult();
    return NextResponse.json({ success: true, data: mockData });
  } catch (error) {
    console.error('[api/data] 오류:', error);
    return NextResponse.json(
      { success: false, data: null, error: '데이터 조회 실패' },
      { status: 500 }
    );
  }
}
