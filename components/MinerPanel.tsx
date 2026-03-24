'use client';

/**
 * MinerPanel — 채굴자 유출량 + MPI + 해시리본 상태
 */

import type { MinerData } from '@/lib/scoring/types';

interface Props {
  miner: MinerData;
}

// MPI 상태 해석
function getMpiStatus(mpi: number): { label: string; color: string; detail: string } {
  if (mpi >= 2)   return { label: '극도 고점',  color: '#ef4444', detail: '채굴자 대규모 매도 — 경계' };
  if (mpi >= 0.5) return { label: '보통 매도',  color: '#f59e0b', detail: '채굴자 일반적 수준 유출' };
  if (mpi >= -0.5) return { label: '중립',      color: '#94a3b8', detail: '채굴자 포지션 중립' };
  return { label: '저점 축적',  color: '#00ff88', detail: '채굴자 보유 — 매도 없음 (강세 신호)' };
}

export default function MinerPanel({ miner }: Props) {
  const mpiStatus = getMpiStatus(miner.mpi);

  return (
    <div className="p-5 rounded-xl border border-white/8 h-full"
         style={{ background: '#12121a' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">⛏️</span>
          <h3 className="text-xs font-semibold tracking-widest"
              style={{ color: '#64748b' }}>
            채굴자 움직임
          </h3>
        </div>
        {/* 해시리본 핑크존 여부 */}
        {miner.hashribbon ? (
          <span className="px-2 py-0.5 rounded text-xs font-bold animate-pulse"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
            핑크존 진입
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ background: 'rgba(0,255,136,0.08)', color: '#4ade80' }}>
            정상
          </span>
        )}
      </div>

      {/* MPI 게이지 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs" style={{ color: '#94a3b8' }}>
            MPI (채굴자 포지션 인덱스)
          </span>
          <span className="text-lg font-bold tabular-nums"
                style={{ color: mpiStatus.color }}>
            {miner.mpi.toFixed(2)}
          </span>
        </div>

        {/* MPI 바 (범위: -3 ~ +3, 중심 0) */}
        <div className="relative h-2 rounded-full overflow-hidden"
             style={{ background: 'rgba(255,255,255,0.06)' }}>
          {/* 중심선 (0) */}
          <div className="absolute top-0 bottom-0 w-px"
               style={{ left: '50%', background: 'rgba(255,255,255,0.2)' }} />
          {/* 위험 임계선 (2.0 → 83.3%) */}
          <div className="absolute top-0 bottom-0 w-px"
               style={{ left: '83.3%', background: 'rgba(239,68,68,0.3)' }} />
          {/* MPI 바 (0 기준 오른쪽/왼쪽) */}
          <div className="absolute top-0 bottom-0 rounded-full transition-all duration-700"
               style={{
                 left: miner.mpi >= 0 ? '50%' : `${50 + (miner.mpi / 3) * 50}%`,
                 width: `${Math.abs(miner.mpi / 3) * 50}%`,
                 background: mpiStatus.color,
                 opacity: 0.7,
               }} />
        </div>

        <div className="mt-1 text-xs" style={{ color: mpiStatus.color }}>
          {mpiStatus.label} — {mpiStatus.detail}
        </div>
      </div>

      {/* 지표 항목들 */}
      <div className="space-y-2.5">
        {/* 채굴자 유출량 */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#64748b' }}>유출량 (24h)</span>
          <span className="text-sm font-semibold tabular-nums"
                style={{ color: '#e2e8f0' }}>
            {miner.outflow.toLocaleString()} BTC
          </span>
        </div>

        {/* 채굴자 보유량 */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#64748b' }}>보유량</span>
          <span className="text-sm font-semibold tabular-nums"
                style={{ color: '#e2e8f0' }}>
            {(miner.reserve / 1000).toFixed(0)}K BTC
          </span>
        </div>

        {/* 해시레이트 */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#64748b' }}>해시레이트</span>
          <span className="text-sm font-semibold tabular-nums"
                style={{ color: '#e2e8f0' }}>
            {miner.hashrate} EH/s
          </span>
        </div>
      </div>

      {/* 해시리본 설명 */}
      <div className="mt-3 p-2.5 rounded-lg"
           style={{ background: 'rgba(255,255,255,0.03)' }}>
        <p className="text-xs" style={{ color: '#64748b' }}>
          해시리본 {miner.hashribbon
            ? '핑크존: 채굴자 항복 — 역사적 바닥 근접 신호'
            : '정상: 30일>60일 MA, 채굴 네트워크 건강'}
        </p>
      </div>
    </div>
  );
}
