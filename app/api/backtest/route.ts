/**
 * GET /api/backtest — 백테스트 실행 API
 * 역사적 20개 시점에 스코어링 엔진을 적용하여 성과 계산
 * 결과는 정적이므로 캐시 가능
 */

import { NextResponse } from 'next/server';
import { runBacktest } from '@/lib/backtest/runner';

export async function GET() {
  try {
    // 백테스트 실행 — 20개 시점 × calculateSignal()
    const result = runBacktest();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '백테스트 실행 실패',
    }, { status: 500 });
  }
}
