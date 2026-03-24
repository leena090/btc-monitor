'use client';

/**
 * Skeleton — 로딩 스켈레톤 컴포넌트 (라이트 핀테크)
 */

interface Props {
  className?: string;
}

export function Skeleton({ className = '' }: Props) {
  return (
    <div
      className={`animate-pulse rounded-2xl ${className}`}
      style={{ background: 'rgba(0,0,0,0.04)' }}
    />
  );
}

export function CardSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="card-fintech p-5 animate-pulse" style={{ height }}>
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 w-24 rounded-full" style={{ background: 'rgba(0,0,0,0.06)' }} />
        <div className="h-3 w-16 rounded-full" style={{ background: 'rgba(0,0,0,0.06)' }} />
      </div>
      <div className="space-y-3">
        <div className="h-8 w-full rounded-xl" style={{ background: 'rgba(0,0,0,0.04)' }} />
        <div className="h-4 w-3/4 rounded-xl" style={{ background: 'rgba(0,0,0,0.04)' }} />
        <div className="h-4 w-1/2 rounded-xl" style={{ background: 'rgba(0,0,0,0.04)' }} />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <CardSkeleton height={72} />
      <div className="card-fintech p-8 animate-pulse">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-36 h-36 rounded-full" style={{ background: 'rgba(0,0,0,0.04)' }} />
          <div className="flex-1 space-y-3">
            <div className="h-8 w-3/4 rounded-xl" style={{ background: 'rgba(0,0,0,0.06)' }} />
            <div className="h-4 w-full rounded-xl" style={{ background: 'rgba(0,0,0,0.04)' }} />
            <div className="h-10 w-48 rounded-2xl" style={{ background: 'rgba(0,0,0,0.04)' }} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CardSkeleton height={160} />
        <CardSkeleton height={160} />
        <CardSkeleton height={160} />
      </div>
      <div className="space-y-2">
        <CardSkeleton height={48} />
        <CardSkeleton height={48} />
      </div>
    </div>
  );
}
