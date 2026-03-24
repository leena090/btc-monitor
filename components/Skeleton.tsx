'use client';

/**
 * Skeleton — 로딩 스켈레톤 컴포넌트
 * 3-Tier 레이아웃에 맞는 플레이스홀더
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

// 대시보드 전체 로딩 스켈레톤 — 3-Tier 레이아웃
export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* PriceHeader 스켈레톤 */}
      <CardSkeleton height={72} />

      {/* HeroVerdict 스켈레톤 — 가장 크게 */}
      <div className="rounded-2xl border border-white/8 p-8 animate-pulse"
           style={{ background: '#12121a' }}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* 게이지 자리 */}
          <div className="w-40 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
          {/* 텍스트 자리 */}
          <div className="flex-1 space-y-3">
            <div className="h-8 w-3/4 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="h-4 w-full rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <div className="h-10 w-48 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
          </div>
        </div>
      </div>

      {/* SignalSummary 3카드 스켈레톤 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CardSkeleton height={160} />
        <CardSkeleton height={160} />
        <CardSkeleton height={160} />
      </div>

      {/* 상세 분석 아코디언 스켈레톤 */}
      <div className="space-y-2">
        <CardSkeleton height={48} />
        <CardSkeleton height={48} />
        <CardSkeleton height={48} />
      </div>
    </div>
  );
}
