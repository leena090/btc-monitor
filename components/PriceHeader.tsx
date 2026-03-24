'use client';

/**
 * PriceHeader — 현재 BTC 가격 + 24h 변동률 + 마지막 업데이트 시각
 * 대시보드 최상단 헤더 컴포넌트
 */

import type { SignalResult } from '@/lib/scoring/types';

// page.tsx에서 ?? 0 폴백 후 전달 — 컴포넌트 내부에서는 항상 number로 처리
interface Props {
  data: {
    price: NonNullable<SignalResult['price']>;
    priceChange24h: NonNullable<SignalResult['priceChange24h']>;
    timestamp: SignalResult['timestamp'];
  };
}

export default function PriceHeader({ data }: Props) {
  // 24h 변동률 색상: 양수=초록, 음수=빨강
  const isPositive = data.priceChange24h >= 0;
  const changeColor = isPositive ? 'text-emerald-400' : 'text-red-400';
  const changeIcon = isPositive ? '▲' : '▼';

  // 마지막 업데이트 시각 포맷
  const lastUpdate = new Date(data.timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // BTC 가격 천단위 포맷
  const formattedPrice = data.price.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-3 rounded-xl border border-white/5"
         style={{ background: '#12121a' }}>

      {/* 왼쪽: 비트코인 레이블 */}
      <div className="flex items-center gap-3">
        {/* BTC 아이콘 */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full text-xl font-bold"
             style={{ background: 'rgba(247, 147, 26, 0.15)', color: '#f7931a' }}>
          ₿
        </div>
        <div>
          <div className="text-xs font-medium tracking-widest"
               style={{ color: '#94a3b8' }}>
            BITCOIN
          </div>
          <div className="text-xs" style={{ color: '#475569' }}>BTC / USDT</div>
        </div>
      </div>

      {/* 중앙: 현재 가격 (크게) */}
      <div className="flex flex-col items-start sm:items-center">
        <div className="text-3xl sm:text-4xl font-bold tracking-tight"
             style={{ color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
          ${formattedPrice}
        </div>
      </div>

      {/* 오른쪽: 변동률 + 업데이트 시각 */}
      <div className="flex flex-col items-start sm:items-end gap-1">
        {/* 24h 변동률 */}
        <div className={`text-lg font-semibold tabular-nums ${changeColor}`}>
          {changeIcon} {Math.abs(data.priceChange24h).toFixed(2)}%
          <span className="text-xs ml-1 opacity-70">24h</span>
        </div>

        {/* 마지막 업데이트 시각 */}
        <div className="flex items-center gap-1.5">
          {/* 실시간 상태 점 (초록) */}
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs" style={{ color: '#64748b' }}>
            {lastUpdate} 기준
          </span>
        </div>
      </div>
    </div>
  );
}
