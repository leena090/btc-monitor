'use client';

/**
 * Skeleton — 로딩 스켈레톤 컴포넌트
 * 데이터 폴링 중 화면 깜빡임 방지를 위한 플레이스홀더
 */

interface Props {
  className?: string;
}

// 기본 스켈레톤 블록
export function Skeleton({ className = '' }: Props) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ background: 'rgba(255,255,255,0.06)' }}
    />
  );
}

// 카드형 스켈레톤
export function CardSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="rounded-xl border border-white/8 p-5 animate-pulse"
         style={{ background: '#12121a', height }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 w-24 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-3 w-16 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
      {/* 본문 라인들 */}
      <div className="space-y-3">
        <div className="h-8 w-full rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="h-4 w-3/4 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="h-4 w-1/2 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
    </div>
  );
}

// 대시보드 전체 로딩 스켈레톤
export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* PriceHeader 스켈레톤 */}
      <CardSkeleton height={72} />

      {/* ScoreGauge + RSI + Cycle 스켈레톤 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardSkeleton height={240} />
        <CardSkeleton height={240} />
        <CardSkeleton height={240} />
      </div>

      {/* CategoryBreakdown 스켈레톤 */}
      <CardSkeleton height={360} />

      {/* Whale + Miner + Onchain 스켈레톤 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardSkeleton height={200} />
        <CardSkeleton height={200} />
        <CardSkeleton height={200} />
      </div>

      {/* TradeSetup 스켈레톤 */}
      <CardSkeleton height={200} />

      {/* AlertHistory + DataFreshness 스켈레톤 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardSkeleton height={280} />
        <CardSkeleton height={280} />
      </div>
    </div>
  );
}
