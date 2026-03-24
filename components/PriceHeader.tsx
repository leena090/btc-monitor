'use client';

/**
 * PriceHeader — 현재 BTC 가격 + 24h 변동률 + 마지막 업데이트 시각
 * 라이트 핀테크 스타일
 */

import type { SignalResult } from '@/lib/scoring/types';

interface Props {
  data: {
    price: NonNullable<SignalResult['price']>;
    priceChange24h: NonNullable<SignalResult['priceChange24h']>;
    timestamp: SignalResult['timestamp'];
  };
}

export default function PriceHeader({ data }: Props) {
  // 24h 변동률 색상
  const isPositive = data.priceChange24h >= 0;
  const changeColor = isPositive ? '#00c471' : '#ef4444';
  const changeIcon = isPositive ? '▲' : '▼';

  // 마지막 업데이트 시각 포맷
  const lastUpdate = new Date(data.timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });

  // BTC 가격 천단위 포맷
  const formattedPrice = data.price.toLocaleString('en-US', {
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  });

  return (
    <div className="card-fintech flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4">
      {/* 왼쪽: 비트코인 레이블 */}
      <div className="flex items-center gap-3">
        {/* BTC 아이콘 — 그라데이션 원형 */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full text-xl font-bold text-white"
             style={{
               background: 'linear-gradient(135deg, #f7931a, #e8830e)',
               boxShadow: '0 4px 12px rgba(247,147,26,0.25)',
             }}>
          ₿
        </div>
        <div>
          <div className="text-sm font-bold" style={{ color: '#1a1d2e' }}>
            BITCOIN
          </div>
          <div className="text-xs" style={{ color: '#9098b1' }}>BTC / USDT · SPOT</div>
        </div>
      </div>

      {/* 중앙: 현재 가격 */}
      <div className="flex flex-col items-start sm:items-center">
        <div className="text-4xl sm:text-5xl font-black tracking-tight tabular-nums"
             style={{ color: '#1a1d2e' }}>
          ${formattedPrice}
        </div>
      </div>

      {/* 오른쪽: 변동률 + 업데이트 시각 */}
      <div className="flex flex-col items-start sm:items-end gap-1.5">
        {/* 24h 변동률 배지 */}
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-bold tabular-nums"
             style={{
               background: `${changeColor}10`,
               color: changeColor,
             }}>
          <span>{changeIcon}</span>
          <span>{Math.abs(data.priceChange24h).toFixed(2)}%</span>
          <span className="text-xs opacity-60 ml-0.5">24h</span>
        </div>

        {/* 마지막 업데이트 시각 */}
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00c471' }} />
          <span className="text-xs" style={{ color: '#9098b1' }}>
            {lastUpdate} 기준
          </span>
        </div>
      </div>
    </div>
  );
}
