'use client';

/**
 * WhalePanel — 고래 거래소 입금 비율 + 방향 + 해석
 */

import type { WhaleData } from '@/lib/scoring/types';

interface Props {
  whale: WhaleData;
}

// 방향 배지 스타일
const DIRECTION_STYLES = {
  sell:    { icon: '↑', label: '매도 압력', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  buy:     { icon: '↓', label: '축적',      color: '#00ff88', bg: 'rgba(0,255,136,0.12)' },
  neutral: { icon: '→', label: '관망',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

// whale-ratio 상태 레이블
function getWhaleRatioStatus(ratio: number): { label: string; color: string } {
  if (ratio >= 0.6) return { label: '위험 — 매도 급증', color: '#ef4444' };
  if (ratio >= 0.4) return { label: '주의 — 높은 수준',  color: '#f59e0b' };
  if (ratio >= 0.2) return { label: '정상',               color: '#00ff88' };
  return { label: '저수준 — 축적 신호',                    color: '#3b82f6' };
}

export default function WhalePanel({ whale }: Props) {
  const dir = DIRECTION_STYLES[whale.direction];
  const ratioStatus = getWhaleRatioStatus(whale.whaleRatio);
  const changeIsPositive = whale.whaleRatioChange > 0;

  return (
    <div className="p-5 rounded-xl border border-white/5 h-full"
         style={{ background: '#12121a' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🐋</span>
          <h3 className="text-xs font-semibold tracking-widest"
              style={{ color: '#64748b' }}>
            고래 움직임
          </h3>
        </div>
        {/* 방향 배지 */}
        <span className="px-2 py-0.5 rounded text-xs font-bold"
              style={{ background: dir.bg, color: dir.color }}>
          {dir.icon} {dir.label}
        </span>
      </div>

      {/* whale-ratio 게이지 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs" style={{ color: '#94a3b8' }}>
            거래소 입금 비율 (whale-ratio)
          </span>
          <div className="flex items-center gap-2">
            {/* 전일 대비 변화 */}
            <span className="text-xs tabular-nums"
                  style={{ color: changeIsPositive ? '#ef4444' : '#00ff88' }}>
              {changeIsPositive ? '▲' : '▼'} {Math.abs(whale.whaleRatioChange).toFixed(3)}
            </span>
            {/* 현재 값 */}
            <span className="text-lg font-bold tabular-nums"
                  style={{ color: ratioStatus.color }}>
              {(whale.whaleRatio * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 비율 바 */}
        <div className="relative h-3 rounded-full overflow-hidden"
             style={{ background: 'rgba(255,255,255,0.06)' }}>
          {/* 위험 임계선 (60%) */}
          <div className="absolute top-0 bottom-0 w-px"
               style={{ left: '60%', background: 'rgba(239,68,68,0.4)' }} />
          {/* 주의 임계선 (40%) */}
          <div className="absolute top-0 bottom-0 w-px"
               style={{ left: '40%', background: 'rgba(245,158,11,0.4)' }} />
          {/* 채워진 바 */}
          <div className="absolute top-0 left-0 bottom-0 rounded-full transition-all duration-700"
               style={{
                 width: `${whale.whaleRatio * 100}%`,
                 background: ratioStatus.color,
                 opacity: 0.7,
               }} />
        </div>

        {/* 상태 레이블 */}
        <div className="mt-1 text-xs text-right" style={{ color: ratioStatus.color }}>
          {ratioStatus.label}
        </div>
      </div>

      {/* 거래소 입금량 */}
      <div className="flex items-center justify-between py-2 border-t border-white/5">
        <span className="text-xs" style={{ color: '#64748b' }}>거래소 입금량 (24h)</span>
        <span className="text-sm font-semibold tabular-nums"
              style={{ color: '#e2e8f0' }}>
          {whale.exchangeInflow.toLocaleString()} BTC
        </span>
      </div>

      {/* 해석 텍스트 */}
      <div className="mt-3 p-2.5 rounded-lg"
           style={{ background: 'rgba(255,255,255,0.03)' }}>
        <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
          {whale.interpretation}
        </p>
      </div>
    </div>
  );
}
