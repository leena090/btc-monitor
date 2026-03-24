/**
 * POST /api/score
 * 스코어링 엔진 API 라우트
 *
 * cron/collect에서 수집한 CollectSnapshot을 받아 → ScoringInput으로 변환 →
 * calculateSignal() 실행 → SignalResult 반환
 *
 * 요청 형식: POST body = CollectSnapshot (JSON)
 * 응답 형식: SignalResult (JSON)
 *
 * 데이터 플로우:
 *   cron/collect → POST /api/score → adapter → engine → SignalResult → Redis 저장
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateSignal } from '@/lib/scoring/engine';
import { snapshotToScoringInput, checkDataFreshness } from '@/lib/scoring/adapter';
import type { CollectSnapshot } from '@/lib/scoring/snapshot-types';
import type { SignalResult } from '@/lib/scoring/types';

// QStash 서명 검증 (보안: 외부에서 직접 호출 방지)
// architect의 QStash 미들웨어가 준비되면 연동
function verifyQStashSignature(req: NextRequest): boolean {
  // 개발 환경에서는 서명 건너뜀
  if (process.env.NODE_ENV === 'development') return true;

  const signature = req.headers.get('upstash-signature');
  const secret = process.env.QSTASH_CURRENT_SIGNING_KEY;

  if (!signature || !secret) return false;
  // TODO: architect의 @upstash/qstash verifySignatureEdge 연동
  return true;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // ── 1. 서명 검증 ──
    if (!verifyQStashSignature(req)) {
      return NextResponse.json(
        { error: 'Unauthorized — invalid QStash signature' },
        { status: 401 }
      );
    }

    // ── 2. 요청 파싱 ──
    let snap: CollectSnapshot;
    try {
      snap = (await req.json()) as CollectSnapshot;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body — CollectSnapshot 형식 필요' },
        { status: 400 }
      );
    }

    // ── 3. 데이터 신선도 검증 ──
    const staleFields = checkDataFreshness(snap);
    if (staleFields.length > 0) {
      console.warn(`[score] 오래된 데이터 감지: ${staleFields.join(', ')}`);
      // 경고만 기록, 계산은 계속 진행 (이전 캐시값으로 일부 채워질 수 있음)
    }

    // ── 4. Snapshot → ScoringInput 변환 ──
    const input = snapshotToScoringInput(snap);

    // ── 5. 스코어링 엔진 실행 ──
    const result: SignalResult = calculateSignal(input);

    // ── 6. 응답 반환 (Redis 저장은 cron/collect에서 처리) ──
    return NextResponse.json({
      success: true,
      result,
      staleDataWarning: staleFields.length > 0 ? staleFields : undefined,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    console.error('[score] 스코어링 엔진 오류:', message);
    return NextResponse.json(
      { error: `스코어링 실패: ${message}` },
      { status: 500 }
    );
  }
}

// GET /api/score — 직접 호출 차단
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'POST /api/score 엔드포인트. CollectSnapshot JSON body 전송 필요.' },
    { status: 405 }
  );
}
